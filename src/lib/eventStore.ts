import { loadJSON, saveJSON, uid } from "./storage";

export type EventType = "catering" | "popup" | "farmers_market" | "other";
export type EventStatus = "inquiry" | "confirmed" | "completed" | "cancelled";
export type DepositStatus = "pending" | "paid";

export interface TulipEvent {
  id: string;
  name: string;
  eventType: EventType;
  dateStart: string; // ISO
  dateEnd?: string; // ISO
  location: string;
  /** Street address of the location (pulled from the venue address book). */
  address?: string;
  guestCount?: number;
  preOrders: number;
  estimatedRevenue?: number;
  status: EventStatus;
  depositStatus: DepositStatus;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  /** Wix Events ID when this event originated from / syncs with Wix. */
  wixEventId?: string;
  /** Stable link to a venue in the address book (resolved at sync time). */
  venueId?: string;
  /** Link to a tracked property/venue for recommendations. */
  propertyId?: string;
  followUpDate?: string;
  followUpNote?: string;
  dayOfParking?: string;
  dayOfEntry?: string;
  dayOfSetupLocation?: string;
  dayOfArrivalTime?: string;
  dayOfOtherNotes?: string;
  createdAt: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  catering: "Private Event",
  popup: "Pop-up",
  farmers_market: "Grab and Go",
  other: "Other",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  inquiry: "Inquiry",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const EVENTS_KEY = "tt-events";

export function loadEvents(): TulipEvent[] {
  return loadJSON<TulipEvent[]>(EVENTS_KEY, []);
}

export function saveEvents(events: TulipEvent[]) {
  saveJSON(EVENTS_KEY, events);
}

export function createEvent(data: Omit<TulipEvent, "id" | "createdAt">): TulipEvent {
  const event: TulipEvent = { ...data, id: uid(), createdAt: new Date().toISOString() };
  const events = loadEvents();
  events.unshift(event);
  saveEvents(events);
  return event;
}

export function updateEvent(id: string, patch: Partial<TulipEvent>): TulipEvent[] {
  const events = loadEvents().map(e => (e.id === id ? { ...e, ...patch } : e));
  saveEvents(events);
  return events;
}

export function deleteEvent(id: string): TulipEvent[] {
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
  return events;
}

/**
 * Merge a batch of events into the store, keyed by wixEventId when present
 * (falling back to id). Existing rows are updated in place; new rows are added.
 * Persists sorted by most recent date. Returns the number of events created vs. updated.
 */
export function importEvents(incoming: TulipEvent[]): { created: number; updated: number } {
  const existing = loadEvents();
  const byKey = new Map<string, number>();
  existing.forEach((e, i) => byKey.set(e.wixEventId ?? e.id, i));

  let created = 0;
  let updated = 0;
  for (const ev of incoming) {
    const key = ev.wixEventId ?? ev.id;
    const idx = byKey.get(key);
    if (idx === undefined) {
      existing.push(ev);
      byKey.set(key, existing.length - 1);
      created++;
    } else {
      // Preserve the local id and any counting data already attached.
      existing[idx] = { ...existing[idx], ...ev, id: existing[idx].id };
      updated++;
    }
  }

  // Sort by most recent date (descending) for consistent storage
  existing.sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  saveEvents(existing);
  return { created, updated };
}

export interface DuplicatePair {
  /** The live-synced booking — richer data (contact info), kept by default. */
  keep: TulipEvent;
  /** The bundled historical record for the same real-world event. */
  remove: TulipEvent;
}

/**
 * Find event pairs where one record came from the bundled historical Wix
 * Events snapshot (a bare-UUID wixEventId) and the other from the live Wix
 * Bookings sync (a "wix-booking:"-prefixed wixEventId), both at the same
 * venue on the same calendar day. That combination is a much stronger signal
 * than same-venue/same-day alone — it means the exact same real booking was
 * captured by two different Wix products, not just two events that happen to
 * coincide. The live record is recommended to keep since it carries contact
 * details the historical snapshot never had.
 */
export function findBundledLiveDuplicates(events: TulipEvent[]): DuplicatePair[] {
  const isLive = (e: TulipEvent) => e.wixEventId?.startsWith("wix-booking:") ?? false;
  const isBundled = (e: TulipEvent) => !!e.wixEventId && !isLive(e);

  const groups = new Map<string, TulipEvent[]>();
  for (const e of events) {
    if (e.status === "cancelled" || !e.venueId) continue;
    const key = `${e.venueId}|${e.dateStart.slice(0, 10)}`;
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }

  const pairs: DuplicatePair[] = [];
  for (const group of groups.values()) {
    const bundled = group.filter(isBundled);
    const live = group.filter(isLive);
    if (bundled.length === 0 || live.length === 0) continue;
    for (const b of bundled) pairs.push({ keep: live[0], remove: b });
  }
  return pairs;
}

export function upcomingEvents(withinDays = 7): TulipEvent[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 86400000);
  return loadEvents()
    .filter(e => {
      const d = new Date(e.dateStart);
      return d >= new Date(now.toDateString()) && d <= cutoff && e.status !== "cancelled";
    })
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
}
