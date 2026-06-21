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

const STORAGE_KEY = "tiny_tulip_todos";

export function loadTodos(): TodoItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("Failed to load todos:", err);
    return [];
  }
}

export function saveTodos(todos: TodoItem[]): TodoItem[] {
  if (typeof window === "undefined") return todos;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return todos;
  } catch (err) {
    console.error("Failed to save todos:", err);
    return todos;
  }
}

export function createTodo(
  title: string,
  priority: "low" | "medium" | "high" = "medium",
  description?: string,
  dueDate?: string
): TodoItem[] {
  const todos = loadTodos();
  const newTodo: TodoItem = {
    id: `todo-${Date.now()}`,
    title,
    description,
    priority,
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  return saveTodos(todos);
}

export function updateTodo(
  id: string,
  updates: Partial<TodoItem>
): TodoItem[] {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    Object.assign(todo, updates);
  }
  return saveTodos(todos);
}

export function toggleTodo(id: string): TodoItem[] {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    if (todo.completed) {
      todo.completedAt = new Date().toISOString();
    } else {
      todo.completedAt = undefined;
    }
  }
  return saveTodos(todos);
}

export function deleteTodo(id: string): TodoItem[] {
  const todos = loadTodos();
  return saveTodos(todos.filter(t => t.id !== id));
}

export function getTodosByPriority(priority: "low" | "medium" | "high"): TodoItem[] {
  return loadTodos().filter(t => !t.completed && t.priority === priority);
}

export function getOverdueTodos(): TodoItem[] {
  const today = new Date().toISOString().split("T")[0];
  return loadTodos().filter(t => !t.completed && t.dueDate && t.dueDate < today);
}

export function getCompletedTodos(): TodoItem[] {
  return loadTodos().filter(t => t.completed);
}
