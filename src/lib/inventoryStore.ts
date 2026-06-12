import { loadJSON, saveJSON, uid } from "./storage";

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  supplier?: string;
  lastRestocked?: string;
}

const KEY = "tt-inventory";

const SEED: InventoryItem[] = [
  { id: "beans", name: "Coffee Beans", unit: "bags", quantity: 12, reorderLevel: 4 },
  { id: "oat-milk", name: "Oat Milk", unit: "cartons", quantity: 8, reorderLevel: 6 },
  { id: "whole-milk", name: "Whole Milk", unit: "gallons", quantity: 5, reorderLevel: 3 },
  { id: "cups-12oz", name: "12oz Cups", unit: "boxes", quantity: 3, reorderLevel: 2 },
  { id: "lids", name: "Lids", unit: "boxes", quantity: 4, reorderLevel: 2 },
];

export function loadInventory(): InventoryItem[] {
  const items = loadJSON<InventoryItem[] | null>(KEY, null);
  if (items === null) {
    saveJSON(KEY, SEED);
    return SEED;
  }
  return items;
}

export function saveInventory(items: InventoryItem[]) {
  saveJSON(KEY, items);
}

export function addItem(data: Omit<InventoryItem, "id">): InventoryItem[] {
  const items = loadInventory();
  items.push({ ...data, id: uid() });
  saveInventory(items);
  return items;
}

export function updateItem(id: string, patch: Partial<InventoryItem>): InventoryItem[] {
  const items = loadInventory().map(i => (i.id === id ? { ...i, ...patch } : i));
  saveInventory(items);
  return items;
}

export function removeItem(id: string): InventoryItem[] {
  const items = loadInventory().filter(i => i.id !== id);
  saveInventory(items);
  return items;
}

export function lowStockItems(): InventoryItem[] {
  return loadInventory().filter(i => i.quantity <= i.reorderLevel);
}
