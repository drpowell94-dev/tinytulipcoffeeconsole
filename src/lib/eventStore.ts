import { uid } from "./storage";
import { supabase } from "@/services/supabase";

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
  /**
   * Sync tracking id. Either a bare Wix Events GUID (bundled historical
   * events) or a "wix-booking:<id>" tracking key for events that came from
   * the live Wix Bookings sync — the latter is NOT a real Wix Events GUID
   * and must never be sent to the Wix Events API directly.
   */
  wixEventId?: string;
  /**
   * The real Wix Events product GUID once this event has actually been
   * published there via "Publish to Wix" — kept separate from wixEventId so
   * publishing a booking-synced event doesn't clobber its Bookings tracking
   * id (which would break future re-sync dedup).
   */
  wixPublishedEventId?: string;
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

interface EventRow {
  id: string;
  name: string;
  venue_id: string | null;
  event_type: string | null;
  date_start: string | null;
  date_end: string | null;
  status: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pre_orders: number | null;
  estimated_revenue: number | null;
  deposit_status: string | null;
  wix_event_id: string | null;
  wix_published_event_id: string | null;
  address: string | null;
  location: string | null;
  guest_count: number | null;
  notes: string | null;
  property_id: string | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  day_of_parking: string | null;
  day_of_entry: string | null;
  day_of_setup_location: string | null;
  day_of_arrival_time: string | null;
  day_of_other_notes: string | null;
  created_at: string;
}

function rowToEvent(row: EventRow): TulipEvent {
  return {
    id: row.id,
    name: row.name,
    eventType: (row.event_type as EventType) ?? "other",
    dateStart: row.date_start ?? new Date().toISOString(),
    dateEnd: row.date_end ?? undefined,
    location: row.location ?? "",
    address: row.address ?? undefined,
    guestCount: row.guest_count ?? undefined,
    preOrders: row.pre_orders ?? 0,
    estimatedRevenue: row.estimated_revenue ?? undefined,
    status: (row.status as EventStatus) ?? "inquiry",
    depositStatus: (row.deposit_status as DepositStatus) ?? "pending",
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    wixEventId: row.wix_event_id ?? undefined,
    wixPublishedEventId: row.wix_published_event_id ?? undefined,
    venueId: row.venue_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    followUpNote: row.follow_up_note ?? undefined,
    dayOfParking: row.day_of_parking ?? undefined,
    dayOfEntry: row.day_of_entry ?? undefined,
    dayOfSetupLocation: row.day_of_setup_location ?? undefined,
    dayOfArrivalTime: row.day_of_arrival_time ?? undefined,
    dayOfOtherNotes: row.day_of_other_notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

/** Partial TulipEvent -> row payload, only including fields actually present. */
function eventToRow(e: Partial<TulipEvent>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (e.name !== undefined) row.name = e.name;
  if (e.eventType !== undefined) row.event_type = e.eventType;
  if (e.dateStart !== undefined) row.date_start = e.dateStart;
  if (e.dateEnd !== undefined) row.date_end = e.dateEnd ?? null;
  if (e.location !== undefined) row.location = e.location;
  if (e.address !== undefined) row.address = e.address ?? null;
  if (e.guestCount !== undefined) row.guest_count = e.guestCount ?? null;
  if (e.preOrders !== undefined) row.pre_orders = e.preOrders;
  if (e.estimatedRevenue !== undefined) row.estimated_revenue = e.estimatedRevenue ?? null;
  if (e.status !== undefined) row.status = e.status;
  if (e.depositStatus !== undefined) row.deposit_status = e.depositStatus;
  if (e.contactName !== undefined) row.contact_name = e.contactName ?? null;
  if (e.contactEmail !== undefined) row.contact_email = e.contactEmail ?? null;
  if (e.contactPhone !== undefined) row.contact_phone = e.contactPhone ?? null;
  if (e.notes !== undefined) row.notes = e.notes ?? null;
  if (e.wixEventId !== undefined) row.wix_event_id = e.wixEventId ?? null;
  if (e.wixPublishedEventId !== undefined) row.wix_published_event_id = e.wixPublishedEventId ?? null;
  if (e.venueId !== undefined) row.venue_id = e.venueId ?? null;
  if (e.propertyId !== undefined) row.property_id = e.propertyId ?? null;
  if (e.followUpDate !== undefined) row.follow_up_date = e.followUpDate ?? null;
  if (e.followUpNote !== undefined) row.follow_up_note = e.followUpNote ?? null;
  if (e.dayOfParking !== undefined) row.day_of_parking = e.dayOfParking ?? null;
  if (e.dayOfEntry !== undefined) row.day_of_entry = e.dayOfEntry ?? null;
  if (e.dayOfSetupLocation !== undefined) row.day_of_setup_location = e.dayOfSetupLocation ?? null;
  if (e.dayOfArrivalTime !== undefined) row.day_of_arrival_time = e.dayOfArrivalTime ?? null;
  if (e.dayOfOtherNotes !== undefined) row.day_of_other_notes = e.dayOfOtherNotes ?? null;
  if (e.createdAt !== undefined) row.created_at = e.createdAt;
  return row;
}

export async function loadEvents(): Promise<TulipEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("coffee")
    .from("events")
    .select("*")
    .order("date_start", { ascending: false });
  if (error) {
    console.warn("[eventStore] load failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEvent);
}

/** Bulk upsert — used by importEvents() and multi-record duplicate resolution. */
export async function saveEvents(events: TulipEvent[]): Promise<void> {
  if (!supabase || events.length === 0) return;
  const rows = events.map(e => ({ id: e.id, ...eventToRow(e) }));
  const { error } = await supabase.schema("coffee").from("events").upsert(rows, { onConflict: "id" });
  if (error) console.warn("[eventStore] saveEvents failed:", error.message);
}

export async function createEvent(data: Omit<TulipEvent, "id" | "createdAt">): Promise<TulipEvent> {
  const event: TulipEvent = { ...data, id: uid(), createdAt: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("events").insert({ id: event.id, ...eventToRow(event) });
    if (error) console.warn("[eventStore] createEvent failed:", error.message);
  }
  return event;
}

export async function updateEvent(id: string, patch: Partial<TulipEvent>): Promise<TulipEvent[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("events").update(eventToRow(patch)).eq("id", id);
    if (error) console.warn("[eventStore] updateEvent failed:", error.message);
  }
  return loadEvents();
}

export async function deleteEvent(id: string): Promise<TulipEvent[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("events").delete().eq("id", id);
    if (error) console.warn("[eventStore] deleteEvent failed:", error.message);
  }
  return loadEvents();
}

/**
 * Merge a batch of events into the store, keyed by wixEventId when present
 * (falling back to id). Existing rows are updated in place; new rows are added.
 * Returns the number of events created vs. updated.
 */
export async function importEvents(incoming: TulipEvent[]): Promise<{ created: number; updated: number }> {
  const existing = await loadEvents();
  const byKey = new Map(existing.map(e => [e.wixEventId ?? e.id, e]));

  let created = 0;
  let updated = 0;
  const toSave: TulipEvent[] = [];
  for (const ev of incoming) {
    const key = ev.wixEventId ?? ev.id;
    const match = byKey.get(key);
    if (!match) {
      toSave.push(ev);
      created++;
    } else {
      // Preserve the local id and any counting data already attached.
      toSave.push({ ...match, ...ev, id: match.id });
      updated++;
    }
  }

  await saveEvents(toSave);
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

/** Pure filter over an already-loaded events array (was: loaded internally). */
export function upcomingEvents(events: TulipEvent[], withinDays = 7): TulipEvent[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 86400000);
  return events
    .filter(e => {
      const d = new Date(e.dateStart);
      return d >= new Date(now.toDateString()) && d <= cutoff && e.status !== "cancelled";
    })
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
}
