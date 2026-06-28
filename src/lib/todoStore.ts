import { uid } from "./storage";

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TodoList {
  id: string;
  name: string;
  items: TodoItem[];
  createdAt: string;
}

const LISTS_KEY = "tiny_tulip_todo_lists";
const LEGACY_KEY = "tiny_tulip_todos";

export function loadTodoLists(): TodoList[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LISTS_KEY);
    if (stored) return JSON.parse(stored);
    // Migrate legacy flat todos into a "General" list
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const items: TodoItem[] = JSON.parse(legacy);
      if (items.length > 0) {
        const defaultList: TodoList = { id: uid(), name: "General", items, createdAt: new Date().toISOString() };
        saveTodoLists([defaultList]);
        return [defaultList];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveTodoLists(lists: TodoList[]): TodoList[] {
  if (typeof window === "undefined") return lists;
  try { localStorage.setItem(LISTS_KEY, JSON.stringify(lists)); } catch {}
  return lists;
}

export function createTodoList(name: string): TodoList[] {
  const lists = loadTodoLists();
  lists.push({ id: uid(), name: name.trim(), items: [], createdAt: new Date().toISOString() });
  return saveTodoLists(lists);
}

export function renameTodoList(listId: string, name: string): TodoList[] {
  return saveTodoLists(loadTodoLists().map(l => l.id === listId ? { ...l, name: name.trim() } : l));
}

export function deleteTodoList(listId: string): TodoList[] {
  return saveTodoLists(loadTodoLists().filter(l => l.id !== listId));
}

export function addTodoToList(listId: string, title: string, priority: "low" | "medium" | "high" = "medium"): TodoList[] {
  const lists = loadTodoLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return lists;
  list.items.push({ id: uid(), title: title.trim(), priority, completed: false, createdAt: new Date().toISOString() });
  return saveTodoLists(lists);
}

export function toggleTodoInList(listId: string, itemId: string): TodoList[] {
  const lists = loadTodoLists();
  const item = lists.find(l => l.id === listId)?.items.find(i => i.id === itemId);
  if (item) {
    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date().toISOString() : undefined;
  }
  return saveTodoLists(lists);
}

export function deleteTodoFromList(listId: string, itemId: string): TodoList[] {
  const lists = loadTodoLists();
  const list = lists.find(l => l.id === listId);
  if (list) list.items = list.items.filter(i => i.id !== itemId);
  return saveTodoLists(lists);
}

export function getOverdueInList(list: TodoList): TodoItem[] {
  const today = new Date().toISOString().split("T")[0];
  return list.items.filter(i => !i.completed && i.dueDate && i.dueDate < today);
}
