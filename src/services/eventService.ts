import { supabase, isSupabaseEnabled } from "./supabase";
import {
  importEvents,
  type TulipEvent,
  type EventType,
  type EventStatus,
} from "@/lib/eventStore";
import { uid } from "@/lib/storage";

const VALID_TYPES: EventType[] = ["catering", "popup", "farmers_market", "other"];

/**
 * Safely parse ISO date string, returning null if invalid.
 */
function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/** Map a Supabase `events` row to a TulipEvent. */
function mapRowToTulip(row: Record<string, unknown>): TulipEvent {
  const status = (row.status as EventStatus) ?? "confirmed";
  const eventType = (row.event_type as EventType) ?? "other";
  const dateStart = parseDate(row.date_start as string) || new Date();
  const dateEnd = row.date_end ? parseDate(row.date_end as string) : undefined;

  return {
    id: (row.wix_event_id as string) || (row.id as string) || uid(),
    wixEventId: (row.wix_event_id as string) || undefined,
    name: ((row.name as string) ?? "Untitled Event").substring(0, 255),
    eventType: VALID_TYPES.includes(eventType) ? eventType : "other",
    dateStart: dateStart.toISOString(),
    dateEnd: dateEnd?.toISOString(),
    location: ((row.location as string) ?? "TBD").substring(0, 255),
    preOrders: Number.isFinite(row.pre_orders as number) ? (row.pre_orders as number) : 0,
    status,
    depositStatus: (row.deposit_status as "pending" | "paid") ?? "pending",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

/**
 * Pull events from Supabase (when configured) and merge them into the local
 * store. Returns null when Supabase isn't enabled, otherwise the merge counts.
 */
export async function syncEventsFromSupabase(): Promise<
  { created: number; updated: number } | null
> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date_start", { ascending: true });
  if (error) {
    console.error("Failed to sync events from Supabase:", error.message);
    return null;
  }
  if (!data || data.length === 0) return { created: 0, updated: 0 };

  const mapped = data.map(mapRowToTulip);
  return importEvents(mapped);
}
