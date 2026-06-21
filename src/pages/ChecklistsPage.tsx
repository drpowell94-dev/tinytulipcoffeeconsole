import { useState, useMemo } from "react";
import { Trash2, Printer, ClipboardList, Plus, X, Trash, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  loadChecklists,
  toggleItem,
  deleteChecklist,
  type Checklist,
} from "@/lib/checklistStore";
import {
  loadDailyChecklist,
  addDailyTask,
  toggleDailyTask,
  removeDailyTask,
  clearCompletedDailyTasks,
  type DailyChecklist,
} from "@/lib/dailyChecklistStore";
import {
  loadTodos,
  createTodo,
  toggleTodo,
  deleteTodo,
  getOverdueTodos,
  type TodoItem,
} from "@/lib/todoStore";
import { EVENT_TYPE_LABELS } from "@/lib/eventStore";
import { formatTime } from "@/lib/utils";

type TabType = "events" | "daily" | "todos";

export default function ChecklistsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("events");
  const [eventLists, setEventLists] = useState<Checklist[]>(() => loadChecklists());
  const [openEventId, setOpenEventId] = useState<string | null>(eventLists[0]?.id ?? null);
  const [dailyChecklist, setDailyChecklist] = useState<DailyChecklist>(() => loadDailyChecklist());
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodos());
  const [newDailyTask, setNewDailyTask] = useState("");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");

  const openEvent = useMemo(() => eventLists.find(l => l.id === openEventId) ?? null, [eventLists, openEventId]);
  const overdueTodos = getOverdueTodos();
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const handleAddDailyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDailyTask.trim()) return;
    setDailyChecklist(addDailyTask(newDailyTask));
    setNewDailyTask("");
  };

  const handleToggleDailyTask = (taskId: string) => {
    setDailyChecklist(toggleDailyTask(taskId));
  };

  const handleRemoveDailyTask = (taskId: string) => {
    setDailyChecklist(removeDailyTask(taskId));
  };

  const handleClearCompleted = () => {
    const count = dailyChecklist.items.filter(i => i.completed).length;
    if (count === 0) {
      toast("No completed tasks to clear");
      return;
    }
    setDailyChecklist(clearCompletedDailyTasks());
    toast(`Cleared ${count} completed task(s)`);
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    setTodos(createTodo(newTodoTitle, newTodoPriority));
    setNewTodoTitle("");
    toast.success("To-do added");
  };

  const handleToggleTodo = (id: string) => {
    setTodos(toggleTodo(id));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(deleteTodo(id));
    toast("To-do deleted");
  };

  const handleEventToggle = (checklistId: string, itemId: string) => {
    setEventLists(toggleItem(checklistId, itemId));
  };

  const handleDeleteEvent = (list: Checklist) => {
    const next = deleteChecklist(list.id);
    setEventLists(next);
    if (openEventId === list.id) setOpenEventId(next[0]?.id ?? null);
    toast(`Deleted checklist for "${list.eventName}"`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-foreground">Checklists</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Event prep, daily tasks, and to-do list
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-3 font-body font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Event Prep {eventLists.length > 0 && `(${eventLists.length})`}
        </button>
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-3 font-body font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "daily"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Daily Tasks {dailyChecklist.items.length > 0 && `(${dailyChecklist.items.filter(i => !i.completed).length})`}
        </button>
        <button
          onClick={() => setActiveTab("todos")}
          className={`px-4 py-3 font-body font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "todos"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          To-Do List {activeTodos.length > 0 && `(${activeTodos.length})`}
        </button>
      </div>

      {/* Content */}
      {activeTab === "events" && (
        <div>
          {eventLists.length === 0 ? (
            <div className="rounded-lg bg-muted/20 p-12 text-center">
              <ClipboardList size={40} strokeWidth={1.25} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-body text-muted-foreground">
                No event checklists yet. Create an event and its packing list appears here.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-[240px_1fr] gap-6">
              {/* Event selector */}
              <div className="space-y-2">
                {eventLists.map(list => {
                  const done = list.items.filter(i => i.checked).length;
                  return (
                    <button
                      key={list.id}
                      onClick={() => setOpenEventId(list.id)}
                      className={`w-full text-left rounded-lg p-4 sm:p-5 transition-colors ${
                        openEventId === list.id ? "bg-accent text-accent-foreground" : "bg-muted/20 hover:bg-muted/35 text-foreground"
                      }`}
                    >
                      <p className="font-body font-semibold text-sm truncate">{list.eventName}</p>
                      <p className={`text-xs font-body mt-1 ${openEventId === list.id ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                        {EVENT_TYPE_LABELS[list.eventType]} • {done}/{list.items.length}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Active event */}
              {openEvent && (
                <div className="rounded-lg bg-muted/15 p-5">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl text-foreground">{openEvent.eventName}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrint}
                        className="p-2 rounded-lg text-foreground/60 hover:bg-muted/30 transition-colors"
                        aria-label="Print checklist"
                      >
                        <Printer size={18} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(openEvent)}
                        className="p-2 rounded-lg text-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete checklist"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <EventProgress checklist={openEvent} />

                  <div className="space-y-6">
                    {Array.from(new Set(openEvent.items.map(i => i.category))).map(category => (
                      <div key={category}>
                        <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                          {category}
                        </p>
                        <div className="space-y-2">
                          {openEvent.items
                            .filter(i => i.category === category)
                            .map(item => (
                              <label
                                key={item.id}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                                  item.checked ? "bg-accent/10" : "bg-muted/20 hover:bg-muted/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleEventToggle(openEvent.id, item.id)}
                                  className="accent-accent w-5 h-5 shrink-0"
                                />
                                <span
                                  className={`font-body text-sm flex-1 transition-all ${
                                    item.checked
                                      ? "text-muted-foreground/60 opacity-60"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {item.checked && item.checkedAt && (
                                  <span className="text-[10px] font-body text-muted-foreground/70 shrink-0 whitespace-nowrap">
                                    ✓ {item.checkedBy} · {formatTime(new Date(item.checkedAt))}
                                  </span>
                                )}
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Add task form */}
          <form onSubmit={handleAddDailyTask} className="flex gap-2">
            <input
              type="text"
              value={newDailyTask}
              onChange={e => setNewDailyTask(e.target.value)}
              placeholder="Add today's task..."
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Tasks */}
          {dailyChecklist.items.length === 0 ? (
            <div className="rounded-lg bg-muted/20 p-8 text-center">
              <p className="font-body text-muted-foreground">
                No tasks added yet. Add something to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyChecklist.items.map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    task.completed ? "bg-accent/10" : "bg-muted/20 hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleDailyTask(task.id)}
                    className="accent-accent w-5 h-5 shrink-0"
                  />
                  <span
                    className={`font-body text-sm flex-1 transition-all ${
                      task.completed
                        ? "text-muted-foreground/60 opacity-60"
                        : "text-foreground"
                    }`}
                  >
                    {task.task}
                  </span>
                  {task.completed && task.completedAt && (
                    <span className="text-[10px] font-body text-muted-foreground/70 shrink-0">
                      ✓ {formatTime(new Date(task.completedAt))}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveDailyTask(task.id)}
                    className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors rounded"
                    aria-label="Delete task"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {dailyChecklist.items.some(i => i.completed) && (
                <button
                  onClick={handleClearCompleted}
                  className="w-full px-4 py-2 text-xs font-body font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear completed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "todos" && (
        <div className="space-y-6">
          {/* Add todo form */}
          <form onSubmit={handleAddTodo} className="space-y-3">
            <input
              type="text"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <div className="flex gap-2">
              <select
                value={newTodoPriority}
                onChange={e => setNewTodoPriority(e.target.value as "low" | "medium" | "high")}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </form>

          {/* Overdue alert */}
          {overdueTodos.length > 0 && (
            <div className="flex gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-body font-semibold text-sm text-destructive">
                  {overdueTodos.length} overdue to-do(s)
                </p>
                <p className="text-xs text-muted-foreground font-body mt-1">
                  Complete or reschedule to stay on track
                </p>
              </div>
            </div>
          )}

          {/* Active todos */}
          {activeTodos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-body font-semibold text-sm text-foreground">To Do</h3>
              <div className="space-y-2">
                {activeTodos.map(todo => (
                  <div
                    key={todo.id}
                    className={`flex items-start gap-3 rounded-lg p-4 ${
                      todo.priority === "high"
                        ? "bg-destructive/8"
                        : todo.priority === "medium"
                          ? "bg-accent/8"
                          : "bg-muted/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleTodo(todo.id)}
                      className="accent-accent w-5 h-5 shrink-0 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-sm text-foreground">{todo.title}</p>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground font-body mt-1">{todo.description}</p>
                      )}
                      {todo.dueDate && (
                        <p className="text-xs text-muted-foreground font-body mt-1">Due: {new Date(todo.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold ${
                        todo.priority === "high"
                          ? "bg-destructive/20 text-destructive"
                          : todo.priority === "medium"
                            ? "bg-accent/20 text-accent"
                            : "bg-muted/30 text-muted-foreground"
                      }`}>
                        {todo.priority}
                      </span>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors rounded"
                        aria-label="Delete to-do"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed todos */}
          {completedTodos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-body font-semibold text-sm text-muted-foreground">Completed ({completedTodos.length})</h3>
              <div className="space-y-1">
                {completedTodos.map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 rounded-lg p-3 bg-accent/5"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggleTodo(todo.id)}
                      className="accent-accent w-5 h-5 shrink-0"
                    />
                    <span className="font-body text-sm text-muted-foreground/60 opacity-60 flex-1 line-through">
                      {todo.title}
                    </span>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete to-do"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTodos.length === 0 && completedTodos.length === 0 && (
            <div className="rounded-lg bg-muted/20 p-8 text-center">
              <p className="font-body text-muted-foreground">
                No to-dos yet. Add something to get started.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventProgress({ checklist }: { checklist: Checklist }) {
  const done = checklist.items.filter(i => i.checked).length;
  const pct = checklist.items.length > 0 ? Math.round((done / checklist.items.length) * 100) : 0;
  return (
    <div className="mb-6">
      <div className="w-full h-px rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs font-body text-muted-foreground mt-2 text-right">
        {done}/{checklist.items.length} packed {pct === 100 && "✓ complete"}
      </p>
    </div>
  );
}
