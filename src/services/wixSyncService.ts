import wixEvents from "@/data/wixEvents.json";
import { importEvents, loadEvents, saveEvents, type TulipEvent } from "@/lib/eventStore";

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

  const events = (data.events || []) as TulipEvent[];

  // Drop the old bundled snapshot (replaced by live bookings) — only write if
  // some are actually present, to avoid a needless push on every load.
  const current = loadEvents();
  const cleaned = current.filter(e => !(e.wixEventId && BUNDLED_WIX_IDS.has(e.wixEventId)));
  if (cleaned.length !== current.length) saveEvents(cleaned);

  if (events.length === 0) return { created: 0, updated: 0 };
  return importEvents(events);
}
