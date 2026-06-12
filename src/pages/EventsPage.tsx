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
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Events</h1>
          <p className="text-sm text-muted-foreground font-body">
            Pop-ups, farmers markets & catering — with live drink counting
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-sm">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
            📌 New Event
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className={input}
              placeholder="Event name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
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
              placeholder="Pre-orders (prepaid drinks)"
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
              placeholder="Client contact name"
              value={form.contactName}
              onChange={e => setForm({ ...form, contactName: e.target.value })}
            />
            <input
              className={input}
              placeholder="Client phone"
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary text-primary-foreground px-5 py-2 font-body font-semibold text-sm hover:opacity-90"
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl bg-muted/50 px-5 py-2 font-body font-semibold text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Event list */}
      {events.length === 0 && !showForm ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <span className="text-4xl">🌷</span>
          <p className="font-body text-muted-foreground mt-2">
            No events yet — create your first pop-up!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const days = daysUntil(event.dateStart);
            return (
              <div
                key={event.id}
                className="rounded-2xl bg-card border border-border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-body font-bold text-foreground">{event.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-body font-semibold", STATUS_STYLES[event.status])}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-1 flex items-center gap-1 flex-wrap">
                    <span>{formatDate(event.dateStart)}</span>
                    {days >= 0 && event.status !== "completed" && (
                      <span className="text-accent font-semibold">
                        · {days === 0 ? "Today!" : `in ${days} day${days === 1 ? "" : "s"}`}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <MapPin size={11} /> {event.location}
                    </span>
                    <span>· {EVENT_TYPE_LABELS[event.eventType]}</span>
                    {event.preOrders > 0 && <span>· {event.preOrders} pre-orders</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/events/${event.id}/counter`}
                    className="flex items-center gap-1.5 rounded-xl bg-accent text-accent-foreground px-4 py-2 font-body font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Coffee size={15} /> Open Counter
                  </Link>
                  <button
                    onClick={() => handleDelete(event)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label={`Delete ${event.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session history */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        >
          <span className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <History size={14} /> Past Sessions {history.length > 0 && `(${history.length})`}
          </span>
          <span className="text-muted-foreground text-sm">{showHistory ? "▾" : "▸"}</span>
        </button>
        {showHistory && (
          <div className="px-4 pb-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm font-body text-muted-foreground py-4 text-center">
                No saved sessions yet — end a counter session to archive it 🌷
              </p>
            ) : (
              history.map(s => (
                <div key={s.id} className="rounded-xl bg-muted/20 border border-border/50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body font-semibold text-sm text-foreground truncate">{s.eventName}</p>
                      <p className="text-xs font-body text-muted-foreground">
                        {new Date(s.date).toLocaleDateString()} · {s.totalDrinks} drinks · {formatCurrency(s.totalRevenue)}
                        {s.extraSales > 0 && ` · +${formatCurrency(s.extraSales)} extra`}
                      </p>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">
                        {Object.entries(s.productCounts)
                          .map(([id, count]) => `${getDrink(id)?.emoji ?? ""}${count}`)
                          .join("  ")}
                      </p>
                    </div>
                    <button
                      onClick={() => setHistory(deleteFromHistory(s.id))}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                      aria-label="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
