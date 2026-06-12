import { loadJSON, saveJSON, uid } from "./storage";
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

const KEY = "tt-checklists";

export function loadChecklists(): Checklist[] {
  return loadJSON<Checklist[]>(KEY, []);
}

export function saveChecklists(lists: Checklist[]) {
  saveJSON(KEY, lists);
}

export function createChecklistForEvent(
  eventId: string,
  eventName: string,
  eventType: EventType
): Checklist {
  const checklist: Checklist = {
    id: uid(),
    eventId,
    eventName,
    eventType,
    items: TEMPLATES[eventType].map(t => ({ ...t, id: uid(), checked: false })),
    createdAt: new Date().toISOString(),
  };
  const lists = loadChecklists();
  lists.unshift(checklist);
  saveChecklists(lists);
  return checklist;
}

export function toggleItem(checklistId: string, itemId: string, user = "Staff"): Checklist[] {
  const lists = loadChecklists().map(list => {
    if (list.id !== checklistId) return list;
    return {
      ...list,
      items: list.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              checked: !item.checked,
              checkedAt: !item.checked ? new Date().toISOString() : undefined,
              checkedBy: !item.checked ? user : undefined,
            }
          : item
      ),
    };
  });
  saveChecklists(lists);
  return lists;
}

export function deleteChecklist(id: string): Checklist[] {
  const lists = loadChecklists().filter(l => l.id !== id);
  saveChecklists(lists);
  return lists;
}
