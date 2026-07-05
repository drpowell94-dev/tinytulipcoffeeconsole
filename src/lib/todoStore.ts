import { uid } from "./storage";
import { supabase } from "@/services/supabase";

export interface TodoItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}
// coffee.todo_items has no description/dueDate columns - those client-only
// fields from the old localStorage shape are dropped rather than invented.

export interface TodoList {
  id: string;
  name: string;
  items: TodoItem[];
  createdAt: string;
}

interface TodoItemRow {
  id: string;
  title: string;
  priority: string | null;
  completed: boolean | null;
  completed_at: string | null;
  created_at: string;
}

interface TodoListRow {
  id: string;
  name: string;
  created_at: string;
  todo_items: TodoItemRow[] | null;
}

function rowToItem(row: TodoItemRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    priority: (row.priority as TodoItem["priority"]) ?? "medium",
    completed: row.completed ?? false,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToList(row: TodoListRow): TodoList {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    items: (row.todo_items ?? [])
      .map(rowToItem)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function loadTodoLists(): Promise<TodoList[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("coffee")
    .from("todo_lists")
    .select("*, todo_items(*)")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[todoStore] loadTodoLists failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToList);
}

export async function createTodoList(name: string): Promise<TodoList[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("todo_lists").insert({ id: uid(), name: name.trim() });
    if (error) console.warn("[todoStore] createTodoList failed:", error.message);
  }
  return loadTodoLists();
}

export async function renameTodoList(listId: string, name: string): Promise<TodoList[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("todo_lists").update({ name: name.trim() }).eq("id", listId);
    if (error) console.warn("[todoStore] renameTodoList failed:", error.message);
  }
  return loadTodoLists();
}

export async function deleteTodoList(listId: string): Promise<TodoList[]> {
  if (supabase) {
    await supabase.schema("coffee").from("todo_items").delete().eq("list_id", listId);
    const { error } = await supabase.schema("coffee").from("todo_lists").delete().eq("id", listId);
    if (error) console.warn("[todoStore] deleteTodoList failed:", error.message);
  }
  return loadTodoLists();
}

export async function addTodoToList(
  listId: string,
  title: string,
  priority: "low" | "medium" | "high" = "medium"
): Promise<TodoList[]> {
  if (supabase) {
    const { error } = await supabase
      .schema("coffee")
      .from("todo_items")
      .insert({ id: uid(), list_id: listId, title: title.trim(), priority, completed: false });
    if (error) console.warn("[todoStore] addTodoToList failed:", error.message);
  }
  return loadTodoLists();
}

export async function toggleTodoInList(listId: string, itemId: string): Promise<TodoList[]> {
  if (supabase) {
    const lists = await loadTodoLists();
    const item = lists.find(l => l.id === listId)?.items.find(i => i.id === itemId);
    const nextCompleted = !(item?.completed ?? false);
    const { error } = await supabase
      .schema("coffee")
      .from("todo_items")
      .update({ completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
      .eq("id", itemId);
    if (error) console.warn("[todoStore] toggleTodoInList failed:", error.message);
  }
  return loadTodoLists();
}

export async function deleteTodoFromList(listId: string, itemId: string): Promise<TodoList[]> {
  if (supabase) {
    const { error } = await supabase.schema("coffee").from("todo_items").delete().eq("id", itemId);
    if (error) console.warn("[todoStore] deleteTodoFromList failed:", error.message);
  }
  return loadTodoLists();
}
