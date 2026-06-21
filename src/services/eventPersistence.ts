import { supabase, isSupabaseEnabled } from "./supabase";
import type { TulipEvent } from "@/lib/eventStore";

/**
 * Persist an event to Supabase (optional).
 * If Supabase is enabled, upsert the event. Otherwise, silently no-op.
 * Used when creating or updating events locally.
 */
export async function persistEventToSupabase(
  event: TulipEvent
): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;

  try {
    const { error } = await supabase.from("events").upsert(
      {
        id: event.id,
        wix_event_id: event.wixEventId || null,
        name: event.name,
        description: null, // Wix description in webhook; user-editable notes stay in app
        notes: event.notes || null,
        date_start: event.dateStart,
        date_end: event.dateEnd || null,
        location: event.location,
        guest_count: event.guestCount || null,
        pre_orders: event.preOrders,
        estimated_revenue: event.estimatedRevenue || null,
        status: event.status,
        deposit_status: event.depositStatus,
        event_type: event.eventType,
        contact_name: event.contactName || null,
        contact_email: event.contactEmail || null,
        contact_phone: event.contactPhone || null,
        synced_from_wix: false, // User-created events are not from Wix
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("Failed to persist event to Supabase:", error.message);
      // Don't throw — allow offline operation
    }
  } catch (err) {
    console.warn("Event persistence error:", err);
    // Silently continue — user can still edit locally
  }
}

/**
 * Delete an event from Supabase (optional).
 */
export async function deleteEventFromSupabase(eventId: string): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;

  try {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      console.warn("Failed to delete event from Supabase:", error.message);
    }
  } catch (err) {
    console.warn("Event deletion error:", err);
  }
}
