import { supabase, isSupabaseEnabled } from "./supabase";
import {
  importEvents,
  type TulipEvent,
  type EventType,
  type EventStatus,
} from "@/lib/eventStore";
import { uid } from "@/lib/storage";
import wixEvents from "@/data/wixEvents.json";

/** Raw Wix-shaped event record (matches the /v1/wix-receiver payload). */
export interface WixEventRecord {
  wixEventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: string;
  eventType?: EventType;
  status: "draft" | "published" | "cancelled";
}

const VALID_TYPES: EventType[] = ["catering", "popup", "farmers_market", "other"];

/**
 * Derive the app status for an event. Cancelled stays cancelled; otherwise an
 * event whose end (or start) is in the past is "completed", future is "confirmed".
 * Matches webhook receiver logic for consistency.
 */
function deriveStatus(record: {
  status: string;
  startDate: string;
  endDate?: string;
}): EventStatus {
  if (record.status === "cancelled") return "cancelled";
  const end = new Date(record.endDate || record.startDate).getTime();
  return end < Date.now() ? "completed" : "confirmed";
}

/**
 * Map Wix description field to app notes.
 * Wix "description" becomes app "notes" (user can edit separately).
 */
function mapDescriptionToNotes(wixDescription?: string): string | undefined {
  return wixDescription?.trim() || undefined;
}

/** Map a raw Wix record to the app's TulipEvent shape. */
export function mapWixToTulip(record: WixEventRecord): TulipEvent {
  const eventType =
    record.eventType && VALID_TYPES.includes(record.eventType)
      ? record.eventType
      : "other";
  return {
    id: record.wixEventId, // stable id so re-imports converge
    wixEventId: record.wixEventId,
    name: record.title.trim() || "Untitled Event",
    eventType,
    dateStart: new Date(record.startDate).toISOString(),
    dateEnd: record.endDate ? new Date(record.endDate).toISOString() : undefined,
    location: record.location?.trim() || "TBD",
    preOrders: 0,
    status: deriveStatus(record),
    depositStatus: "pending",
    notes: mapDescriptionToNotes(record.description),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Import the events bundled with the app (pulled from Wix via MCP).
 * Idempotent — safe to run repeatedly.
 */
export function importBundledWixEvents(): { created: number; updated: number } {
  const mapped = (wixEvents as WixEventRecord[]).map(mapWixToTulip);
  return importEvents(mapped);
}

/** Map a Supabase `events` row to a TulipEvent.
 *  Handles both Wix-sourced and manually-created events.
 */
function mapRowToTulip(row: Record<string, unknown>): TulipEvent {
  const status = (row.status as EventStatus) ?? "confirmed";
  const eventType = (row.event_type as EventType) ?? "other";

  // Use wix_event_id as stable ID when available (Wix-sourced events)
  // Fall back to database id for manual events
  const id = (row.wix_event_id as string) || (row.id as string) || uid();

  return {
    id,
    wixEventId: (row.wix_event_id as string) || undefined,
    name: (row.name as string) ?? "Untitled Event",
    eventType: VALID_TYPES.includes(eventType) ? eventType : "other",
    dateStart: new Date(row.date_start as string).toISOString(),
    dateEnd: row.date_end ? new Date(row.date_end as string).toISOString() : undefined,
    location: (row.location as string) ?? "TBD",
    preOrders: (row.pre_orders as number) ?? 0,
    estimatedRevenue: (row.estimated_revenue as number) || undefined,
    status,
    depositStatus: (row.deposit_status as "pending" | "paid") ?? "pending",
    // Prefer user's notes field; fall back to Wix description if no notes yet
    notes: (row.notes as string) || (row.description as string) || undefined,
    contactName: (row.contact_name as string) || undefined,
    contactEmail: (row.contact_email as string) || undefined,
    contactPhone: (row.contact_phone as string) || undefined,
    guestCount: (row.guest_count as number) || undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

/**
 * Pull events from Supabase (when configured) and merge them into the local
 * store. Returns null when Supabase isn't enabled, otherwise the merge counts.
 *
 * This happens automatically on app load to ensure the device always has the
 * latest events from the server (e.g., from Wix webhook syncs).
 */
export async function syncEventsFromSupabase(): Promise<
  { created: number; updated: number } | null
> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date_start", { ascending: true });

    if (error) {
      console.error("Failed to sync events from Supabase:", error.message);
      return null;
    }

    if (!data || data.length === 0) return { created: 0, updated: 0 };

    const result = importEvents(data.map(mapRowToTulip));
    console.log(
      `✓ Synced events from Supabase: ${result.created} new, ${result.updated} updated`
    );
    return result;
  } catch (err) {
    console.error("Sync error:", err);
    return null;
  }
}
