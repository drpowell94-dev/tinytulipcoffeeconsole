import { supabase } from "./supabase";
import { countByProduct, type OrderItem } from "@/lib/drinkStore";

let pending: number | undefined;

/**
 * Debounced background sync of live drink counts to Supabase.
 * No-op when Supabase isn't configured. Never blocks the tap UI —
 * failures are silent and the next tap retries.
 */
export function scheduleSync(eventId: string, orders: OrderItem[]) {
  if (!supabase) return;
  window.clearTimeout(pending);
  pending = window.setTimeout(async () => {
    const counts = countByProduct(orders);
    const rows = Object.entries(counts).map(([drinkType, quantity]) => ({
      event_id: eventId,
      drink_type: drinkType,
      quantity,
      last_updated: new Date().toISOString(),
    }));
    try {
      await supabase!.from("event_drink_counts").upsert(rows, { onConflict: "event_id,drink_type" });
    } catch {
      // Offline or table missing — localStorage remains source of truth.
    }
  }, 2500);
}

export async function archiveSessionRemote(session: {
  eventId: string;
  eventName: string;
  preOrders: number;
  totalDrinks: number;
  totalRevenue: number;
  extraSales: number;
  productCounts: Record<string, number>;
}) {
  if (!supabase) return;
  try {
    await supabase.from("event_sessions").insert({
      event_id: session.eventId,
      event_name: session.eventName,
      session_start: new Date().toISOString(),
      pre_orders: session.preOrders,
      total_sold: session.totalDrinks,
      total_revenue: session.totalRevenue,
      extra_sales: session.extraSales,
      product_counts: session.productCounts,
    });
  } catch {
    // Silent — local history already saved.
  }
}
