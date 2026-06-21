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

const STORAGE_KEY = "tiny_tulip_daily_checklist";

export function loadDailyChecklist(): DailyChecklist {
  if (typeof window === "undefined") {
    return { date: new Date().toISOString().split("T")[0], items: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { date: new Date().toISOString().split("T")[0], items: [] };
    }

    const parsed = JSON.parse(stored) as DailyChecklist;
    const today = new Date().toISOString().split("T")[0];

    if (parsed.date !== today) {
      return { date: today, items: [] };
    }

    return parsed;
  } catch (err) {
    console.error("Failed to load daily checklist:", err);
    return { date: new Date().toISOString().split("T")[0], items: [] };
  }
}

export function saveDailyChecklist(checklist: DailyChecklist): DailyChecklist {
  if (typeof window === "undefined") return checklist;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
    return checklist;
  } catch (err) {
    console.error("Failed to save daily checklist:", err);
    return checklist;
  }
}

export function addDailyTask(task: string): DailyChecklist {
  const checklist = loadDailyChecklist();
  const newItem: DailyChecklistItem = {
    id: `task-${Date.now()}`,
    task,
    completed: false,
  };
  checklist.items.push(newItem);
  return saveDailyChecklist(checklist);
}

export function toggleDailyTask(taskId: string): DailyChecklist {
  const checklist = loadDailyChecklist();
  const item = checklist.items.find(i => i.id === taskId);
  if (item) {
    item.completed = !item.completed;
    if (item.completed) {
      item.completedAt = new Date().toISOString();
    } else {
      item.completedAt = undefined;
    }
  }
  return saveDailyChecklist(checklist);
}

export function removeDailyTask(taskId: string): DailyChecklist {
  const checklist = loadDailyChecklist();
  checklist.items = checklist.items.filter(i => i.id !== taskId);
  return saveDailyChecklist(checklist);
}

export function clearCompletedDailyTasks(): DailyChecklist {
  const checklist = loadDailyChecklist();
  checklist.items = checklist.items.filter(i => !i.completed);
  return saveDailyChecklist(checklist);
}
