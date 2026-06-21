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
 * Validate a Wix event record has required fields.
 */
function isValidWixRecord(record: unknown): record is WixEventRecord {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.wixEventId === "string" &&
    typeof r.title === "string" &&
    typeof r.startDate === "string" &&
    typeof r.location === "string" &&
    (typeof r.status === "string" && ["draft", "published", "cancelled"].includes(r.status as string))
  );
}

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

/**
 * Derive the app status for an event. Cancelled stays cancelled; otherwise an
 * event whose end (or start) is in the past is "completed", future is "confirmed".
 */
function deriveStatus(record: {
  status: string;
  startDate: string;
  endDate?: string;
}): EventStatus {
  if (record.status === "cancelled") return "cancelled";
  const startDate = parseDate(record.startDate);
  const endDate = record.endDate ? parseDate(record.endDate) : null;
  const eventDate = (endDate || startDate)?.getTime() ?? Date.now();
  return eventDate < Date.now() ? "completed" : "confirmed";
}

/**
 * Generate estimated revenue based on event duration using actual Tiny Tulip Coffee pricing.
 * Grab & Go: 15 min from $200
 * Pop-Up: 2 hr from $300
 * Additional per-hour rates extrapolated from pricing structure
 */
function estimateRevenueFromDuration(startDate: Date, endDate?: Date): number {
  if (!endDate) {
    return 300; // 2-hour Pop-Up default
  }
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

  // Grab & Go tier: up to 30 minutes
  if (durationMinutes <= 30) return 200;

  // Short event tier: 30 min to 90 min
  if (durationMinutes <= 90) return 250;

  // Standard Pop-Up: 90 min to 180 min (2-3 hours)
  if (durationMinutes <= 180) return 300;

  // Extended Pop-Up: 180 min to 240 min (3-4 hours)
  if (durationMinutes <= 240) return 400;

  // Large event: 4+ hours
  return 500;
}

/** Map a raw Wix record to the app's TulipEvent shape. */
export function mapWixToTulip(record: WixEventRecord): TulipEvent {
  const startDate = parseDate(record.startDate) || new Date();
  const endDate = record.endDate ? parseDate(record.endDate) : undefined;
  const eventType =
    record.eventType && VALID_TYPES.includes(record.eventType)
      ? record.eventType
      : "other";
  const status = deriveStatus(record);
  const durationMinutes = endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 60) : 120;

  // Determine service type and included coffee count
  let preOrders = 30; // Default to Pop-Up
  if (durationMinutes <= 30) {
    preOrders = 25; // Grab & Go
  }

  const estimatedRevenue = status === "completed" ? estimateRevenueFromDuration(startDate, endDate) : 0;

  return {
    id: record.wixEventId, // stable id so re-imports converge
    wixEventId: record.wixEventId,
    name: (record.title?.trim() || "Untitled Event").substring(0, 255),
    eventType,
    dateStart: startDate.toISOString(),
    dateEnd: endDate?.toISOString(),
    location: (record.location?.trim() || "TBD").substring(0, 255),
    preOrders, // Included coffees: 25 (Grab & Go) or 30 (Pop-Up)
    estimatedRevenue,
    status,
    depositStatus: "pending",
    notes: (record.description?.trim() || undefined)?.substring(0, 1024),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Import the events bundled with the app (pulled from Wix via MCP).
 * Idempotent — safe to run repeatedly.
 * Validates all records and sorts by most recent first.
 */
export function importBundledWixEvents(): { created: number; updated: number; errors: number } {
  const events = Array.isArray(wixEvents) ? wixEvents : [];
  const valid: WixEventRecord[] = [];
  let errors = 0;

  for (const record of events) {
    if (isValidWixRecord(record)) {
      valid.push(record);
    } else {
      errors++;
      console.warn("Skipped invalid Wix record:", record);
    }
  }

  // Sort by most recent date (descending) before import
  valid.sort((a, b) => {
    const dateA = parseDate(a.startDate)?.getTime() ?? 0;
    const dateB = parseDate(b.startDate)?.getTime() ?? 0;
    return dateB - dateA;
  });

  const mapped = valid.map(mapWixToTulip);
  const result = importEvents(mapped);
  return { ...result, errors };
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
    notes: ((row.notes as string) || (row.description as string) || undefined)?.substring(0, 1024),
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
