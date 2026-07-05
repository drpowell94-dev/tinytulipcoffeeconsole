import { importEvents, type EventType, type TulipEvent } from "@/lib/eventStore";
import { loadVenues, resolveVenue, streetKey, buildVenueFromAddress, upsertVenues, type Venue } from "@/lib/venueStore";
import { geocodeAddress } from "@/services/geocodeService";
import { recordSyncStatus } from "@/lib/syncStatus";

// The serverless route caps its total Wix work at 9s (HANDLER_DEADLINE_MS in
// api/wix-sync.ts) so it can always respond with a real error. Wait well past
// that here so the server gets the chance to report what's actually wrong,
// instead of the client giving up first and hiding the real error behind a
// generic "timed out" with no information.
const SYNC_TIMEOUT_MS = 20000;

const CATEGORY_BY_TYPE: Record<EventType, Venue["defaultCategory"]> = {
  popup: "Pop Up",
  farmers_market: "Grab & Go",
  catering: "Private Event",
  other: "Pop Up",
};

/**
 * Link each incoming booking to a venue:
 *   - if it already matches one in the address book, stamp that venueId and
 *     backfill the street address;
 *   - if it doesn't but carries a real street address, geocode it and
 *     auto-create the venue in the address book, then stamp the new id.
 * This is what keeps the address book in step with real bookings without any
 * manual re-entry. New venues are built in memory and saved once at the end
 * (via upsertVenues) rather than one at a time — a batch of bookings can
 * introduce several new venues in one sync, and saving each individually
 * would fire that many independent async cloud pushes with no ordering
 * guarantee between them, risking one silently dropping another.
 */
async function stampAndCreateVenues(events: TulipEvent[]): Promise<TulipEvent[]> {
  const venues = await loadVenues();
  const newVenues: Venue[] = [];
  const out: TulipEvent[] = [];
  for (const ev of events) {
    let venue = resolveVenue(ev, venues);
    if (!venue) {
      const addr = ev.address || ev.location;
      // Only auto-create from a real street address (has a number) and a name.
      if (streetKey(addr) && (ev.name || ev.location)) {
        const geo = await geocodeAddress(addr);
        if (geo) {
          venue = buildVenueFromAddress({
            name: ev.name || addr.split(",")[0],
            formattedAddress: addr,
            lat: geo.lat,
            lng: geo.lng,
            defaultCategory: CATEGORY_BY_TYPE[ev.eventType] ?? "Pop Up",
          });
          venues.push(venue); // so later events in this batch match in-memory
          newVenues.push(venue);
        }
      }
    }
    out.push(
      venue
        ? { ...ev, venueId: venue.id, address: ev.address || venue.formattedAddress || undefined }
        : ev
    );
  }
  await upsertVenues(newVenues);
  return out;
}

export type WixSyncResult = { created: number; updated: number } | { error: string };

/**
 * Pull confirmed bookings from Wix (via the serverless route) and merge them
 * into the local event store as events. Booking events use a stable
 * `wix-booking:<id>` key, so re-syncing updates in place instead of duplicating.
 */
export async function syncBookingsFromWix(): Promise<WixSyncResult> {
  let data: { events?: TulipEvent[]; error?: string };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("/api/wix-sync", { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    data = await res.json();
    if (!res.ok) {
      const error = data.error || `HTTP ${res.status}`;
      recordSyncStatus({ ok: false, error });
      return { error };
    }
  } catch (err) {
    const error =
      err instanceof Error && err.name === "AbortError"
        ? `Timed out after ${SYNC_TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : "Network error";
    recordSyncStatus({ ok: false, error });
    return { error };
  }

  const events = await stampAndCreateVenues((data.events || []) as TulipEvent[]);
  recordSyncStatus({ ok: true });

  // Live Wix Bookings and the bundled historical Wix Events snapshot are
  // different, non-overlapping products/datasets (confirmed: none of the
  // bundled events' addresses appear in live bookings) — they never collide
  // on id, so there's no reason to delete one when the other arrives. This
  // used to clear the bundled snapshot on every successful sync, which
  // silently erased real historical event counts (e.g. a venue's past-event
  // stats) the moment live syncing started working.
  if (events.length === 0) return { created: 0, updated: 0 };
  return await importEvents(events);
}
