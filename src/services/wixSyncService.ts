import wixEvents from "@/data/wixEvents.json";
import { importEvents, loadEvents, saveEvents, type TulipEvent } from "@/lib/eventStore";
import { loadVenues, resolveVenue } from "@/lib/venueStore";

/**
 * Attach a stable venueId to each incoming booking (and backfill its street
 * address from the matched venue when the booking didn't carry one), so every
 * downstream feature — publish, venue stats, recommendations — links by id
 * instead of guessing from strings.
 */
function stampVenues(events: TulipEvent[]): TulipEvent[] {
  const venues = loadVenues();
  if (venues.length === 0) return events;
  return events.map(ev => {
    const venue = resolveVenue(ev, venues);
    if (!venue) return ev;
    return {
      ...ev,
      venueId: venue.id,
      address: ev.address || venue.formattedAddress || undefined,
    };
  });
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

  const events = stampVenues((data.events || []) as TulipEvent[]);

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
