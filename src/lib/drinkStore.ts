import { loadJSON, saveJSON, removeKey, uid } from "./storage";

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
  orders: OrderItem[];
}

// Active session orders are keyed per-event so a barista can pause one
// event's counter and open another without losing counts.
const sessionKey = (eventId: string) => `tt-session-${eventId}`;
const HISTORY_KEY = "tt-session-history";

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

export function loadHistory(): SavedSession[] {
  return loadJSON<SavedSession[]>(HISTORY_KEY, []);
}

export function archiveSession(
  eventId: string,
  eventName: string,
  preOrders: number,
  orders: OrderItem[]
): SavedSession | null {
  if (orders.length === 0) return null;
  const extra = extraSales(orders, preOrders);
  const saved: SavedSession = {
    id: uid(),
    eventId,
    eventName: eventName || "Untitled Event",
    date: new Date().toISOString(),
    preOrders,
    totalDrinks: orders.length,
    totalRevenue: totalRevenue(orders),
    extraSales: extra.revenue,
    productCounts: countByProduct(orders),
    orders,
  };
  const history = loadHistory();
  history.unshift(saved);
  saveJSON(HISTORY_KEY, history.slice(0, 100));
  return saved;
}

export function deleteFromHistory(id: string): SavedSession[] {
  const history = loadHistory().filter(s => s.id !== id);
  saveJSON(HISTORY_KEY, history);
  return history;
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
