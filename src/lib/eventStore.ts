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
  createdAt: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  catering: "Catering",
  popup: "Pop-up",
  farmers_market: "Farmers Market",
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
 * Returns the number of events created vs. updated.
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
  saveEvents(existing);
  return { created, updated };
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
