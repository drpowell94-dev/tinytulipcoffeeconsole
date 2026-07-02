import wixEvents from "@/data/wixEvents.json";
import { importEvents, loadEvents, saveEvents, type EventType, type TulipEvent } from "@/lib/eventStore";
import { loadVenues, resolveVenue, streetKey, createVenueFromAddress, type Venue } from "@/lib/venueStore";
import { geocodeAddress } from "@/services/geocodeService";

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
 * manual re-entry.
 */
async function stampAndCreateVenues(events: TulipEvent[]): Promise<TulipEvent[]> {
  const venues = loadVenues();
  const out: TulipEvent[] = [];
  for (const ev of events) {
    let venue = resolveVenue(ev, venues);
    if (!venue) {
      const addr = ev.address || ev.location;
      // Only auto-create from a real street address (has a number) and a name.
      if (streetKey(addr) && (ev.name || ev.location)) {
        const geo = await geocodeAddress(addr);
        if (geo) {
          venue = createVenueFromAddress({
            name: ev.name || addr.split(",")[0],
            formattedAddress: addr,
            lat: geo.lat,
            lng: geo.lng,
            defaultCategory: CATEGORY_BY_TYPE[ev.eventType] ?? "Pop Up",
          });
          venues.push(venue); // so later events in this batch match in-memory
        }
      }
    }
    out.push(
      venue
        ? { ...ev, venueId: venue.id, address: ev.address || venue.formattedAddress || undefined }
        : ev
    );
  }
  return out;
}

// IDs of the old bundled Wix-Events snapshot. Live bookings supersede these, so
// they're cleared on sync to avoid duplicates. Events published via Convert
// (their own Wix id) and user-created events (no wixEventId) are preserved.
const BUNDLED_WIX_IDS = new Set((wixEvents as Array<{ wixEventId: string }>).map(e => e.wixEventId));

export type WixSyncResult = { created: number; updated: number } | { error: string };

/**
 * Pull confirmed bookings from Wix (via the serverless route) and merge them
 * into the local event store as events. Booking events use a stable
 * `wix-booking:<id>` key, so re-syncing updates in place instead of duplicating.
 */
export async function syncBookingsFromWix(): Promise<WixSyncResult> {
  let data: { events?: TulipEvent[]; error?: string };
  try {
    const res = await fetch("/api/wix-sync");
    data = await res.json();
    if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }

  const events = await stampAndCreateVenues((data.events || []) as TulipEvent[]);

  // If the fetch came back with no bookings (e.g. the key can't read Bookings
  // yet), do NOT touch existing events — never leave the user with nothing.
  if (events.length === 0) return { created: 0, updated: 0 };

  // We have live bookings — now it's safe to drop the old bundled snapshot they
  // replace. User-created and Convert-published events are preserved.
  const current = loadEvents();
  const cleaned = current.filter(e => !(e.wixEventId && BUNDLED_WIX_IDS.has(e.wixEventId)));
  if (cleaned.length !== current.length) saveEvents(cleaned);

  return importEvents(events);
}
