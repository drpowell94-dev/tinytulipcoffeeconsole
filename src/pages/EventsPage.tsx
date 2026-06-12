import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Coffee, MapPin, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import {
  loadEvents,
  createEvent,
  deleteEvent,
  EVENT_TYPE_LABELS,
  STATUS_LABELS,
  type TulipEvent,
  type EventType,
  type EventStatus,
} from "@/lib/eventStore";
import { createChecklistForEvent } from "@/lib/checklistStore";
import { loadHistory, deleteFromHistory, getDrink, type SavedSession } from "@/lib/drinkStore";
import { cn, formatCurrency, formatDate, daysUntil } from "@/lib/utils";

const STATUS_STYLES: Record<EventStatus, string> = {
  inquiry: "bg-muted/50 text-foreground",
  confirmed: "bg-accent/15 text-accent",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const EMPTY_FORM = {
  name: "",
  eventType: "popup" as EventType,
  dateStart: "",
  location: "",
  preOrders: 0,
  estimatedRevenue: 0,
  contactName: "",
  contactPhone: "",
  notes: "",
};

export default function EventsPage() {
  const [events, setEvents] = useState<TulipEvent[]>(() => loadEvents());
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory());
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dateStart) {
      toast.error("Event name and date are required");
      return;
    }
    const event = createEvent({
      name: form.name.trim(),
      eventType: form.eventType,
      dateStart: new Date(form.dateStart).toISOString(),
      location: form.location.trim() || "TBD",
      preOrders: form.preOrders,
      estimatedRevenue: form.estimatedRevenue || undefined,
      status: "confirmed",
      depositStatus: "pending",
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    createChecklistForEvent(event.id, event.name, event.eventType);
    setEvents(loadEvents());
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success(`"${event.name}" created — packing checklist auto-generated 🌷`);
  };

  const handleDelete = (event: TulipEvent) => {
    setEvents(deleteEvent(event.id));
    toast(`Deleted "${event.name}"`);
  };

  const input =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Pop-ups, farmers markets, catering with live counting
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} strokeWidth={2} /> New
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg bg-muted/20 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className={input}
              placeholder="Event name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <select
              className={input}
              value={form.eventType}
              onChange={e => setForm({ ...form, eventType: e.target.value as EventType })}
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              className={input}
              type="datetime-local"
              value={form.dateStart}
              onChange={e => setForm({ ...form, dateStart: e.target.value })}
            />
            <input
              className={input}
              placeholder="Location"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Pre-orders (drinks)"
              value={form.preOrders || ""}
              onChange={e => setForm({ ...form, preOrders: parseInt(e.target.value) || 0 })}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Estimated revenue ($)"
              value={form.estimatedRevenue || ""}
              onChange={e => setForm({ ...form, estimatedRevenue: parseInt(e.target.value) || 0 })}
            />
            <input
              className={input}
              placeholder="Contact name"
              value={form.contactName}
              onChange={e => setForm({ ...form, contactName: e.target.value })}
            />
            <input
              className={input}
              placeholder="Contact phone"
              value={form.contactPhone}
              onChange={e => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
          <textarea
            className={input}
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-muted/50 px-6 py-2.5 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Event list */}
      {events.length === 0 && !showForm ? (
        <div className="rounded-lg bg-muted/20 p-12 text-center">
          <span className="text-4xl block mb-3">🌷</span>
          <p className="font-body text-muted-foreground">
            No events yet — create your first pop-up!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const days = daysUntil(event.dateStart);
            return (
              <div
                key={event.id}
                className="rounded-lg bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-body font-semibold text-foreground text-base">{event.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-body font-semibold", STATUS_STYLES[event.status])}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body space-y-1">
                    <span>{formatDate(event.dateStart)}</span>
                    {days >= 0 && event.status !== "completed" && (
                      <span className="text-accent font-semibold ml-2">
                        {days === 0 ? "Today" : `${days}d away`}
                      </span>
                    )}
                    <span className="block">
                      <MapPin className="inline mr-1" size={12} /> {event.location} • {EVENT_TYPE_LABELS[event.eventType]}
                      {event.preOrders > 0 && ` • ${event.preOrders} pre-orders`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/events/${event.id}/counter`}
                    className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
                  >
                    <Coffee size={16} strokeWidth={1.5} />
                    <span className="hidden sm:inline">Counter</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(event)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Delete ${event.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session history */}
      <section className="space-y-3">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between text-left font-body text-xs font-semibold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <History size={14} /> Past Sessions {history.length > 0 && `(${history.length})`}
          </span>
          <span className="text-sm">{showHistory ? "▾" : "▸"}</span>
        </button>
        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm font-body text-muted-foreground py-6 text-center">
                No saved sessions yet — end a counter session to archive it
              </p>
            ) : (
              history.map(s => (
                <div key={s.id} className="rounded-lg bg-muted/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-body font-semibold text-sm text-foreground truncate">{s.eventName}</p>
                      <p className="text-xs font-body text-muted-foreground mt-1">
                        {new Date(s.date).toLocaleDateString()} · {s.totalDrinks} drinks · {formatCurrency(s.totalRevenue)}
                        {s.extraSales > 0 && ` · +${formatCurrency(s.extraSales)}`}
                      </p>
                      <p className="text-xs font-body text-muted-foreground mt-1">
                        {Object.entries(s.productCounts)
                          .map(([id, count]) => `${getDrink(id)?.emoji ?? ""}${count}`)
                          .join(" ")}
                      </p>
                    </div>
                    <button
                      onClick={() => setHistory(deleteFromHistory(s.id))}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      aria-label="Delete session"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
