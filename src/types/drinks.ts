/**
 * Drink Tracker Types
 *
 * Core types for the drink counter system.
 * Tracks drinks sold at events with pricing and add-ons support.
 */

export interface DrinkProduct {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
}

export interface DrinkAddOn {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  drinkId: string;
  price: number;
  addOns: string[];
  timestamp: Date;
}

export interface EventSession {
  eventId: string;
  eventName: string;
  eventDate?: string;
  preOrders: number;
  drinkCounts: Record<string, number>;
  totalSold: number;
  totalRevenue: number;
  extraSales: number;
  extraUnits: number;
  startTime: Date;
  orders: OrderItem[];
}

export interface SavedSession {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  preOrders: number;
  totalSold: number;
  totalRevenue: number;
  extraSales: number;
  extraUnits: number;
  productCounts: Record<string, number>;
  pin: string;
  savedAt: string;
}

export interface DrinkCount {
  eventId: string;
  drinkType: string;
  quantity: number;
  lastUpdated: Date;
  updatedBy?: string;
}

/**
 * Default drink products for Tiny Tulip Coffee
 */
export const DRINKS: DrinkProduct[] = [
  { id: "hot-coffee", name: "Hot Coffee", emoji: "☕", price: 5 },
  { id: "iced-coffee", name: "Iced Coffee", emoji: "🧋", price: 7 },
  { id: "cold-brew-can", name: "Cold Brew Can", emoji: "🥤", price: 7 },
  { id: "lemonade", name: "Lemonade", emoji: "🍋", price: 5 },
  { id: "chocolate-milk", name: "Chocolate Milk", emoji: "🍫", price: 5 },
];

/**
 * Optional add-ons for drinks
 */
export const DRINK_ADD_ONS: DrinkAddOn[] = [
  { id: "extra-syrup", name: "Extra Syrup", price: 0.50 },
  { id: "vanilla", name: "Vanilla", price: 0.50 },
  { id: "oat-milk", name: "Oat Milk", price: 0.75 },
  { id: "almond-milk", name: "Almond Milk", price: 0.75 },
];

/**
 * Helper to get drink by ID
 */
export function getDrinkById(id: string): DrinkProduct | undefined {
  return DRINKS.find(d => d.id === id);
}

/**
 * Helper to calculate revenue from drink counts
 */
export function calculateRevenue(counts: Record<string, number>): number {
  return Object.entries(counts).reduce((sum, [id, count]) => {
    const drink = getDrinkById(id);
    return sum + (drink?.price || 0) * count;
  }, 0);
}

/**
 * Helper to generate session summary
 */
export function generateSessionSummary(session: EventSession): string {
  const first = session.orders[0]?.timestamp;
  const last = session.orders[session.orders.length - 1]?.timestamp;
  const timeRange = first && last
    ? `${first.toLocaleTimeString()} – ${last.toLocaleTimeString()}`
    : "N/A";

  const breakdown = Object.entries(session.drinkCounts)
    .map(([id, count]) => {
      const drink = getDrinkById(id);
      return `  ${drink?.emoji} ${drink?.name}: ${count}`;
    })
    .join("\n");

  const eventLine = session.eventName
    ? `Event: ${session.eventName}\nPre-orders: ${session.preOrders}\n\n`
    : "";

  let extraLine = "";
  if (session.preOrders > 0 && session.extraUnits > 0) {
    extraLine = `\nExtra Sales: +${session.extraUnits} drinks (~$${session.extraSales.toFixed(2)})`;
  }

  return `🌷 Tiny Tulip Tracker — Session Summary\n\n${eventLine}Total Sold: ${session.totalSold}\nTime: ${timeRange}\n\n${breakdown}${extraLine}`;
}
