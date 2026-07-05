import { uid } from "./storage";
import { supabase } from "@/services/supabase";
import type { EventType } from "./eventStore";

export interface ChecklistTemplateItem {
  name: string;
  category: string;
}

export interface ChecklistItem extends ChecklistTemplateItem {
  id: string;
  checked: boolean;
  checkedAt?: string;
  checkedBy?: string;
}

export interface Checklist {
  id: string;
  eventId: string;
  eventName: string;
  eventType: EventType;
  items: ChecklistItem[];
  createdAt: string;
}

export const TEMPLATES: Record<EventType, ChecklistTemplateItem[]> = {
  catering: [
    { name: "Espresso machine", category: "Equipment" },
    { name: "Grinder (burr)", category: "Equipment" },
    { name: "Milk frother", category: "Equipment" },
    { name: "Scales & tamper", category: "Equipment" },
    { name: "Coffee beans", category: "Supplies" },
    { name: "Oat milk & whole milk", category: "Supplies" },
    { name: "Syrups (vanilla, caramel)", category: "Supplies" },
    { name: "Cups, lids, napkins", category: "Supplies" },
    { name: "Receipt book", category: "Documents" },
  ],
  farmers_market: [
    { name: "Tent / canopy", category: "Equipment" },
    { name: "Tent weights", category: "Equipment" },
    { name: "Folding table & chairs", category: "Equipment" },
    { name: "Display stand & signage", category: "Equipment" },
    { name: "Cold brew cans", category: "Supplies" },
    { name: "Cups, lids, napkins", category: "Supplies" },
    { name: "Ice & coolers", category: "Supplies" },
    { name: "Square reader", category: "Tech" },
    { name: "iPad / tablet", category: "Tech" },
    { name: "Market permit", category: "Documents" },
  ],
  popup: [
    { name: "Portable espresso machine", category: "Equipment" },
    { name: "Manual grinder", category: "Equipment" },
    { name: "Hot water thermos", category: "Equipment" },
    { name: "Pre-brewed coffee", category: "Supplies" },
    { name: "Cups, lids, napkins", category: "Supplies" },
    { name: "Square reader", category: "Tech" },
    { name: "Venue permission / permit", category: "Documents" },
  ],
  other: [
    { name: "Cups, lids, napkins", category: "Supplies" },
    { name: "Coffee supplies", category: "Supplies" },
    { name: "Payment reader", category: "Tech" },
  ],
};

interface ChecklistItemRow {
  id: string;
  name: string;
  category: string;
  checked: boolean | null;
  checked_at: string | null;
  checked_by: string | null;
  created_at: string;
}

interface ChecklistRow {
  id: string;
  event_id: string | null;
  event_name: string;
  event_type: string;
  created_at: string;
  checklist_items: ChecklistItemRow[] | null;
}

function rowToItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    checked: row.checked ?? false,
    checkedAt: row.checked_at ?? undefined,
    checkedBy: row.checked_by ?? undefined,
  };
}

function rowToChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    eventId: row.event_id ?? "",
    eventName: row.event_name,
    eventType: (row.event_type as EventType) ?? "other",
    createdAt: row.created_at,
    items: (row.checklist_items ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(rowToItem),
  };
}

export async function loadChecklists(): Promise<Checklist[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("coffee")
    .from("checklists")
    .select("*, checklist_items(*)")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[checklistStore] loadChecklists failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToChecklist);
}

export async function createChecklistForEvent(
  eventId: string,
  eventName: string,
  eventType: EventType
): Promise<Checklist> {
  const checklist: Checklist = {
    id: uid(),
    eventId,
    eventName,
    eventType,
    items: TEMPLATES[eventType].map(t => ({ ...t, id: uid(), checked: false })),
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.schema("coffee").from("checklists").insert({
      id: checklist.id,
      event_id: eventId,
      event_name: eventName,
      event_type: eventType,
    });
    if (error) {
      console.warn("[checklistStore] createChecklistForEvent failed:", error.message);
    } else {
      const rows = checklist.items.map(item => ({
        id: item.id,
        checklist_id: checklist.id,
        name: item.name,
        category: item.category,
        checked: false,
      }));
      const { error: itemsError } = await supabase.schema("coffee").from("checklist_items").insert(rows);
      if (itemsError) console.warn("[checklistStore] createChecklistForEvent items failed:", itemsError.message);
    }
  }

  return checklist;
}

export async function toggleItem(checklistId: string, itemId: string, user = "Staff"): Promise<Checklist[]> {
  if (supabase) {
    const lists = await loadChecklists();
    const item = lists.find(l => l.id === checklistId)?.items.find(i => i.id === itemId);
    const nextChecked = !(item?.checked ?? false);
    const { error } = await supabase
      .schema("coffee")
      .from("checklist_items")
      .update({
        checked: nextChecked,
        checked_at: nextChecked ? new Date().toISOString() : null,
        checked_by: nextChecked ? user : null,
      })
      .eq("id", itemId);
    if (error) console.warn("[checklistStore] toggleItem failed:", error.message);
  }
  return loadChecklists();
}

export async function deleteChecklist(id: string): Promise<Checklist[]> {
  if (supabase) {
    // checklist_items has ON DELETE CASCADE on checklist_id, but delete
    // explicitly first in case that constraint changes.
    await supabase.schema("coffee").from("checklist_items").delete().eq("checklist_id", id);
    const { error } = await supabase.schema("coffee").from("checklists").delete().eq("id", id);
    if (error) console.warn("[checklistStore] deleteChecklist failed:", error.message);
  }
  return loadChecklists();
}
