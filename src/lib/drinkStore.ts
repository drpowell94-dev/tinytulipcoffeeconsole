import { loadJSON, saveJSON, removeKey, uid } from "./storage";
import { supabase } from "@/services/supabase";

export interface DrinkProduct {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export const DRINKS: DrinkProduct[] = [
  { id: "hot-coffee", name: "Hot Coffee", emoji: "☕", price: 5 },
  { id: "iced-coffee", name: "Iced Coffee", emoji: "🧋", price: 7 },
  { id: "cold-brew-can", name: "Cold Brew Can", emoji: "🥤", price: 7 },
  { id: "lemonade", name: "Lemonade", emoji: "🍋", price: 5 },
  { id: "chocolate-milk", name: "Chocolate Milk", emoji: "🍫", price: 5 },
];

export function getDrink(id: string): DrinkProduct | undefined {
  return DRINKS.find(d => d.id === id);
}

export interface OrderItem {
  id: string;
  product: string;
  price: number;
  timestamp: string; // ISO
}

export interface SavedSession {
  id: string;
  eventId: string;
  eventName: string;
  date: string;
  preOrders: number;
  totalDrinks: number;
  totalRevenue: number;
  extraSales: number;
  productCounts: Record<string, number>;
}
// coffee.sessions/coffee.product_counts only store the aggregate totals -
// the individual timestamped orders (OrderItem[]) have no home in the cloud
// schema and are dropped on archive (confirmed nothing reads them back).

// Active session orders are keyed per-event so a barista can pause one
// event's counter and open another without losing counts. This is the LIVE
// per-event order log - it was never cloud-synced before this migration and
// stays exactly as-is: local-only, synchronous, keyed by eventId.
const sessionKey = (eventId: string) => `tt-session-${eventId}`;

export function loadSession(eventId: string): OrderItem[] {
  return loadJSON<OrderItem[]>(sessionKey(eventId), []);
}

export function saveSession(eventId: string, orders: OrderItem[]) {
  saveJSON(sessionKey(eventId), orders);
}

export function clearSession(eventId: string) {
  removeKey(sessionKey(eventId));
}

export function newOrder(productId: string): OrderItem {
  const product = getDrink(productId);
  return {
    id: uid(),
    product: productId,
    price: product?.price ?? 0,
    timestamp: new Date().toISOString(),
  };
}

export function countByProduct(orders: OrderItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.product] = (counts[o.product] || 0) + 1;
  return counts;
}

export function totalRevenue(orders: OrderItem[]): number {
  return orders.reduce((sum, o) => sum + o.price, 0);
}

export function extraSales(orders: OrderItem[], preOrders: number): { units: number; revenue: number } {
  if (preOrders <= 0 || orders.length <= preOrders) return { units: 0, revenue: 0 };
  const extras = orders.slice(preOrders);
  return { units: extras.length, revenue: extras.reduce((s, o) => s + o.price, 0) };
}

interface SessionRow {
  id: string;
  event_id: string;
  event_name: string | null;
  total_drinks: number | null;
  total_revenue: number | null;
  pre_orders: number | null;
  extra_sales: number | null;
  created_at: string;
  product_counts: Array<{ product: string; quantity: number }> | null;
}

function rowToSession(row: SessionRow): SavedSession {
  const productCounts: Record<string, number> = {};
  for (const pc of row.product_counts ?? []) productCounts[pc.product] = pc.quantity;
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name ?? "",
    date: row.created_at,
    preOrders: row.pre_orders ?? 0,
    totalDrinks: row.total_drinks ?? 0,
    totalRevenue: row.total_revenue ?? 0,
    extraSales: row.extra_sales ?? 0,
    productCounts,
  };
}

export async function loadHistory(): Promise<SavedSession[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("coffee")
    .from("sessions")
    .select("*, product_counts(product, quantity)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[drinkStore] loadHistory failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSession);
}

export async function archiveSession(
  eventId: string,
  eventName: string,
  preOrders: number,
  orders: OrderItem[]
): Promise<SavedSession | null> {
  if (orders.length === 0) return null;
  const extra = extraSales(orders, preOrders);
  const counts = countByProduct(orders);
  const saved: SavedSession = {
    id: uid(),
    eventId,
    eventName: eventName || "Untitled Event",
    date: new Date().toISOString(),
    preOrders,
    totalDrinks: orders.length,
    totalRevenue: totalRevenue(orders),
    extraSales: extra.revenue,
    productCounts: counts,
  };

  if (supabase) {
    const { data, error } = await supabase
      .schema("coffee")
      .from("sessions")
      .insert({
        event_id: eventId,
        event_name: saved.eventName,
        total_drinks: saved.totalDrinks,
        total_revenue: saved.totalRevenue,
        pre_orders: preOrders,
        extra_sales: extra.revenue,
      })
      .select()
      .single();
    if (error) {
      console.warn("[drinkStore] archiveSession failed:", error.message);
    } else if (data) {
      saved.id = data.id;
      saved.date = data.created_at;
      const rows = Object.entries(counts).map(([product, quantity]) => ({
        session_id: data.id,
        product,
        quantity,
      }));
      if (rows.length > 0) {
        const { error: countsError } = await supabase.schema("coffee").from("product_counts").insert(rows);
        if (countsError) console.warn("[drinkStore] archiveSession product_counts failed:", countsError.message);
      }
    }
  }
  return saved;
}

export async function deleteFromHistory(id: string): Promise<SavedSession[]> {
  if (supabase) {
    await supabase.schema("coffee").from("product_counts").delete().eq("session_id", id);
    const { error } = await supabase.schema("coffee").from("sessions").delete().eq("id", id);
    if (error) console.warn("[drinkStore] deleteFromHistory failed:", error.message);
  }
  return loadHistory();
}

export function generateSummary(eventName: string, preOrders: number, orders: OrderItem[]): string {
  if (orders.length === 0) return "No sales this session.";
  const first = new Date(orders[0].timestamp);
  const last = new Date(orders[orders.length - 1].timestamp);
  const timeRange = `${first.toLocaleTimeString()} – ${last.toLocaleTimeString()}`;

  const counts = countByProduct(orders);
  const breakdown = Object.entries(counts)
    .map(([id, count]) => {
      const p = getDrink(id);
      return `  ${p?.emoji} ${p?.name}: ${count}`;
    })
    .join("\n");

  const eventLine = eventName ? `Event: ${eventName}\nPre-orders: ${preOrders}\n\n` : "";
  const extra = extraSales(orders, preOrders);
  const extraLine = extra.units > 0 ? `\nExtra Sales: +${extra.units} drinks (~$${extra.revenue})` : "";

  return `🌷 Tiny Tulip Tracker — Session Summary\n\n${eventLine}Total Sold: ${orders.length}\nTime: ${timeRange}\n\n${breakdown}${extraLine}`;
}
