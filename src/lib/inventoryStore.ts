import { uid } from "./storage";
import { supabase } from "@/services/supabase";

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  supplier?: string;
  lastRestocked?: string;
}

function rowToItem(row: {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  supplier: string | null;
  last_restocked: string | null;
}): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    quantity: row.quantity,
    reorderLevel: row.reorder_level,
    supplier: row.supplier ?? undefined,
    lastRestocked: row.last_restocked ?? undefined,
  };
}

export async function loadInventory(): Promise<InventoryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.schema("coffee").from("inventory").select("*").order("name");
  if (error) {
    console.warn("[inventoryStore] load failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

export async function addItem(data: Omit<InventoryItem, "id">): Promise<InventoryItem[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("inventory").insert({
      id: uid(),
      name: data.name,
      unit: data.unit,
      quantity: data.quantity,
      reorder_level: data.reorderLevel,
      supplier: data.supplier ?? null,
      last_restocked: data.lastRestocked ?? null,
    });
    if (error) console.warn("[inventoryStore] addItem failed:", error.message);
  }
  return loadInventory();
}

export async function updateItem(id: string, patch: Partial<InventoryItem>): Promise<InventoryItem[]> {
  if (supabase) {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.unit !== undefined) update.unit = patch.unit;
    if (patch.quantity !== undefined) update.quantity = patch.quantity;
    if (patch.reorderLevel !== undefined) update.reorder_level = patch.reorderLevel;
    if (patch.supplier !== undefined) update.supplier = patch.supplier ?? null;
    if (patch.lastRestocked !== undefined) update.last_restocked = patch.lastRestocked ?? null;
    const { error } = await supabase.schema("coffee").from("inventory").update(update).eq("id", id);
    if (error) console.warn("[inventoryStore] updateItem failed:", error.message);
  }
  return loadInventory();
}

export async function removeItem(id: string): Promise<InventoryItem[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("inventory").delete().eq("id", id);
    if (error) console.warn("[inventoryStore] removeItem failed:", error.message);
  }
  return loadInventory();
}

export async function lowStockItems(): Promise<InventoryItem[]> {
  const items = await loadInventory();
  return items.filter(i => i.quantity <= i.reorderLevel);
}
