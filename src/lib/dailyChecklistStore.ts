import { uid } from "./storage";
import { supabase } from "@/services/supabase";

export interface DailyChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: string;
}

export interface DailyChecklist {
  date: string;
  items: DailyChecklistItem[];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

interface DailyChecklistItemRow {
  id: string;
  task: string;
  completed: boolean | null;
  completed_at: string | null;
  created_at: string;
}

function rowToItem(row: DailyChecklistItemRow): DailyChecklistItem {
  return {
    id: row.id,
    task: row.task,
    completed: row.completed ?? false,
    completedAt: row.completed_at ?? undefined,
  };
}

/**
 * Only ever queries/shows rows where date = today's local date - replicates
 * the old localStorage behavior of resetting to an empty list whenever the
 * stored date wasn't today.
 */
export async function loadDailyChecklist(): Promise<DailyChecklist> {
  const date = today();
  if (!supabase) return { date, items: [] };
  const { data, error } = await supabase
    .schema("coffee")
    .from("daily_checklist_items")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[dailyChecklistStore] load failed:", error.message);
    return { date, items: [] };
  }
  return { date, items: (data ?? []).map(rowToItem) };
}

export async function addDailyTask(task: string): Promise<DailyChecklist> {
  if (supabase) {
    const { error } = await supabase
      .schema("coffee")
      .from("daily_checklist_items")
      .insert({ id: uid(), date: today(), task, completed: false });
    if (error) console.warn("[dailyChecklistStore] addDailyTask failed:", error.message);
  }
  return loadDailyChecklist();
}

export async function toggleDailyTask(taskId: string): Promise<DailyChecklist> {
  if (supabase) {
    const checklist = await loadDailyChecklist();
    const item = checklist.items.find(i => i.id === taskId);
    const nextCompleted = !(item?.completed ?? false);
    const { error } = await supabase
      .schema("coffee")
      .from("daily_checklist_items")
      .update({ completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (error) console.warn("[dailyChecklistStore] toggleDailyTask failed:", error.message);
  }
  return loadDailyChecklist();
}

export async function removeDailyTask(taskId: string): Promise<DailyChecklist> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("daily_checklist_items").delete().eq("id", taskId);
    if (error) console.warn("[dailyChecklistStore] removeDailyTask failed:", error.message);
  }
  return loadDailyChecklist();
}

export async function clearCompletedDailyTasks(): Promise<DailyChecklist> {
  if (supabase) {
    const { error } = await supabase
      .schema("coffee")
      .from("daily_checklist_items")
      .delete()
      .eq("date", today())
      .eq("completed", true);
    if (error) console.warn("[dailyChecklistStore] clearCompletedDailyTasks failed:", error.message);
  }
  return loadDailyChecklist();
}
