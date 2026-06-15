import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Coffee, MapPin, Trash2, History, Sparkles, Download, CheckCircle2, XCircle, Zap, TrendingUp, ChevronDown, Filter, ClipboardCheck } from "lucide-react";
import LeadResponseAlert from "@/components/leads/LeadResponseAlert";
import EventChecklist from "@/components/events/EventChecklist";
import { toast } from "sonner";
import {
  loadEvents,
  createEvent,
  deleteEvent,
  updateEvent,
  EVENT_TYPE_LABELS,
  STATUS_LABELS,
  type TulipEvent,
  type EventType,
  type EventStatus,
} from "@/lib/eventStore";
import { importBundledWixEvents, syncEventsFromSupabase } from "@/services/eventService";
import { getPredictedNeeds, type PredictedNeeds } from "@/services/logisticsService";
import { createChecklistForEvent } from "@/lib/checklistStore";
import { loadHistory, deleteFromHistory, type SavedSession } from "@/lib/drinkStore";
import { savePost } from "@/lib/contentStore";
import { generateEventRecap } from "@/lib/blogWriter";
import { DrinkIcon, TulipLogo } from "@/components/drinks/DrinkIcon";
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
  guestCount: 0,
  preOrders: 0,
  estimatedRevenue: 0,
  contactName: "",
  contactPhone: "",
  notes: "",
  status: "confirmed" as EventStatus,
};

export default function EventsPage() {
  const [events, setEvents] = useState<TulipEvent[]>(() => loadEvents());
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory());
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedLogistics, setExpandedLogistics] = useState<Record<string, PredictedNeeds>>({});
  const [loadingLogistics, setLoadingLogistics] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "leads">("upcoming");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [checklistEvent, setChecklistEvent] = useState<TulipEvent | null>(null);

  // On load, pull any events that arrived in Supabase (e.g. via the Wix
  // receiver) and merge them into the local store.
  useEffect(() => {
    syncEventsFromSupabase().then(result => {
      if (result && result.created > 0) {
        setEvents(loadEvents());
        toast.success(`Synced ${result.created} event(s) from Wix`);
      }
    });
  }, []);

  const handleImportWix = () => {
    setImporting(true);
    const { created, updated } = importBundledWixEvents();
    setEvents(loadEvents());
    setImporting(false);
    toast.success(
      `Imported ${created} new event(s)${updated ? `, updated ${updated}` : ""} from Wix`
    );
  };

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
      guestCount: form.guestCount || undefined,
      preOrders: form.preOrders,
      estimatedRevenue: form.estimatedRevenue || undefined,
      status: form.status,
      depositStatus: "pending",
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    if (form.status === "confirmed") {
      createChecklistForEvent(event.id, event.name, event.eventType);
    }
    setEvents(loadEvents());
    setForm(EMPTY_FORM);
    setShowForm(false);
    const statusLabel = form.status === "inquiry" ? "lead" : "event";
    toast.success(`"${event.name}" created as ${statusLabel}${form.status === "confirmed" ? " — packing checklist auto-generated" : ""}`);
  };

  const handleDelete = (event: TulipEvent) => {
    setEvents(deleteEvent(event.id));
    toast(`Deleted "${event.name}"`);
  };

  const input =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

  // Split into upcoming (today or later) and past, each sensibly sorted.
  const upcoming = events
    .filter(e => daysUntil(e.dateStart) >= 0)
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
  const past = events
    .filter(e => daysUntil(e.dateStart) < 0)
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));

  const handleConvertLead = (lead: TulipEvent) => {
    updateEvent(lead.id, { status: "confirmed" });
    setEvents(loadEvents());
    toast.success(`"${lead.name}" moved to confirmed`);
  };

  const handleDeclineLead = (lead: TulipEvent) => {
    handleDelete(lead);
    toast(`Declined lead: "${lead.name}"`);
  };

  const pendingLeads = events.filter(e => e.status === "inquiry");

  const renderEvent = (event: TulipEvent) => {
    const days = daysUntil(event.dateStart);
    return (
      <div key={event.id} className="space-y-3">
        <div className="rounded-lg bg-muted/20 p-5 hover:bg-muted/30 transition-colors space-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-body font-semibold text-foreground text-base">{event.name}</h3>
              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-body font-semibold", STATUS_STYLES[event.status])}>
                {event.status === "inquiry" ? "New Lead" : STATUS_LABELS[event.status]}
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
                {event.guestCount && ` • ${event.guestCount} guests`}
                {event.preOrders > 0 && ` • ${event.preOrders} pre-orders`}
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {event.status === "inquiry" ? (
              <>
                <button
                  onClick={() => handleConvertLead(event)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 font-body font-semibold text-xs hover-scale active:scale-95 transition-all"
                >
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button
                  onClick={() => handleDeclineLead(event)}
                  className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Decline ${event.name}`}
                >
                  <XCircle size={16} strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to={`/events/${event.id}/counter`}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all sm:justify-start"
                >
                  <Coffee size={16} strokeWidth={1.5} />
                  <span>Counter</span>
                </Link>
                <button
                  onClick={() => setChecklistEvent(event)}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-muted/50 text-foreground px-4 py-2.5 font-body font-semibold text-sm hover:bg-muted/70 active:scale-95 transition-all sm:justify-start"
                >
                  <ClipboardCheck size={16} strokeWidth={1.5} />
                  <span>Checklist</span>
                </button>
                <button
                  onClick={() => handleDelete(event)}
                  className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors sm:ml-auto"
                  aria-label={`Delete ${event.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>

          {/* Predictive logistics section - nested in card */}
          {event.guestCount && (
            <div className="border-t border-border/50 pt-3">
              <button
                onClick={() => {
                  if (expandedLogistics[event.id]) {
                    setExpandedLogistics(prev => {
                      const next = { ...prev };
                      delete next[event.id];
                      return next;
                    });
                  } else if (!loadingLogistics[event.id]) {
                    setLoadingLogistics(prev => ({ ...prev, [event.id]: true }));
                    getPredictedNeeds(event)
                      .then(needs => {
                        setExpandedLogistics(prev => ({ ...prev, [event.id]: needs }));
                      })
                      .catch(() => toast.error("Failed to load predicted needs"))
                      .finally(() => setLoadingLogistics(prev => ({ ...prev, [event.id]: false })));
                  }
                }}
                disabled={loadingLogistics[event.id]}
                className="w-full text-left flex items-center justify-between gap-2 text-sm font-body font-semibold text-accent hover:opacity-70 transition-opacity"
              >
                <span className="flex items-center gap-1">
                  <Zap size={14} strokeWidth={2} /> Supplies
                </span>
                <ChevronDown size={16} className={`transition-transform ${expandedLogistics[event.id] ? "rotate-180" : ""}`} />
              </button>

              {expandedLogistics[event.id] && (
                <div className="mt-3 p-3 rounded bg-accent/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-body">
                  <div>
                    <p className="text-accent/70 font-semibold">Cups</p>
                    <p className="text-foreground font-bold">{expandedLogistics[event.id].predictedCups}</p>
                  </div>
                  <div>
                    <p className="text-accent/70 font-semibold">Beans (lbs)</p>
                    <p className="text-foreground font-bold">{expandedLogistics[event.id].predictedBeansLbs}</p>
                  </div>
                  <div>
                    <p className="text-accent/70 font-semibold">Milk (L)</p>
                    <p className="text-foreground font-bold">{expandedLogistics[event.id].predictedMilkLiters}</p>
                  </div>
                  <div>
                    <p className="text-accent/70 font-semibold">Lids</p>
                    <p className="text-foreground font-bold">{expandedLogistics[event.id].predictedLids}</p>
                  </div>
                  <div>
                    <p className="text-accent/70 font-semibold">Napkins</p>
                    <p className="text-foreground font-bold">{expandedLogistics[event.id].predictedNapkins}</p>
                  </div>
                  <div>
                    <p className="text-accent/70 font-semibold">Confidence</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      expandedLogistics[event.id].confidence === "high" ? "bg-accent/20 text-accent" :
                      expandedLogistics[event.id].confidence === "medium" ? "bg-accent/15 text-accent" :
                      "bg-muted/30 text-muted-foreground"
                    }`}>
                      {expandedLogistics[event.id].confidence}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Pop-ups, farmers markets, catering with live counting
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleImportWix}
            disabled={importing}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-muted/50 text-foreground px-3 sm:px-4 py-2.5 font-body font-semibold text-xs sm:text-sm hover:bg-muted/70 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download size={16} strokeWidth={2} />
            <span className="sm:hidden">Import</span>
            <span className="hidden sm:inline">Import from Wix</span>
          </button>
          <button
            onClick={() => setShowLeadForm(!showLeadForm)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-3 sm:px-4 py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2} /> Add Lead
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground px-3 sm:px-4 py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2} /> New Event
          </button>
        </div>
      </div>

      {/* Lead response time alert */}
      <LeadResponseAlert userId="default-user" />

      {/* Quick lead form - always accessible */}
      {showLeadForm && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-body font-semibold text-foreground">New Lead / Booking Inquiry</h3>
            <button
              onClick={() => setShowLeadForm(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Lead name is required");
              return;
            }
            const event = createEvent({
              name: form.name.trim(),
              eventType: (form.eventType as EventType) || "popup",
              dateStart: form.dateStart ? new Date(form.dateStart).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              location: form.location.trim() || "TBD",
              preOrders: form.preOrders || 0,
              estimatedRevenue: form.estimatedRevenue || 0,
              status: "inquiry",
              depositStatus: "pending",
              contactName: form.contactName.trim() || undefined,
              contactPhone: form.contactPhone.trim() || undefined,
              notes: form.notes.trim() || undefined,
            });
            setEvents(loadEvents());
            setForm(EMPTY_FORM);
            setShowLeadForm(false);
            toast.success(`Lead "${event.name}" created — view in Leads tab to accept or decline`);
          }} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className={input}
                placeholder="Client name or company *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                autoFocus
                required
              />
              <input
                className={input}
                type="email"
                placeholder="Email (optional)"
                value={form.contactName}
                onChange={e => setForm({ ...form, contactName: e.target.value })}
              />
              <input
                className={input}
                placeholder="Phone"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
              <input
                className={input}
                type="number"
                min={1}
                placeholder="Guest count"
                value={form.preOrders || ""}
                onChange={e => {
                  const num = parseInt(e.target.value, 10);
                  setForm({ ...form, preOrders: isNaN(num) ? 0 : Math.max(0, num) });
                }}
              />
              <input
                className={input}
                type="datetime-local"
                placeholder="Event date"
                value={form.dateStart}
                onChange={e => setForm({ ...form, dateStart: e.target.value })}
              />
              <select
                className={input}
                value={form.eventType}
                onChange={e => setForm({ ...form, eventType: e.target.value as EventType })}
              >
                <option value="popup">Pop-up</option>
                <option value="farmers_market">Farmers Market</option>
                <option value="catering">Catering</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <input
                className={input}
                placeholder="Location (address or neighborhood)"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <textarea
              className={input}
              placeholder="Special requests or notes"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
              >
                Create Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeadForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-lg bg-muted/50 px-4 py-2.5 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg bg-muted/20 p-5 space-y-4">
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
            <select
              className={input}
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as EventStatus })}
            >
              <option value="inquiry">📝 Lead (Inquiry)</option>
              <option value="confirmed">✓ Confirmed</option>
              <option value="completed">✓✓ Completed</option>
              <option value="cancelled">✗ Cancelled</option>
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
              placeholder="Guest count (for supply estimates)"
              value={form.guestCount || ""}
              onChange={e => {
                const num = parseInt(e.target.value, 10);
                setForm({ ...form, guestCount: isNaN(num) ? 0 : Math.max(0, num) });
              }}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Pre-orders (drinks)"
              value={form.preOrders || ""}
              onChange={e => {
                const num = parseInt(e.target.value, 10);
                setForm({ ...form, preOrders: isNaN(num) ? 0 : Math.max(0, num) });
              }}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Estimated revenue ($)"
              value={form.estimatedRevenue || ""}
              onChange={e => {
                const num = parseInt(e.target.value, 10);
                setForm({ ...form, estimatedRevenue: isNaN(num) ? 0 : Math.max(0, num) });
              }}
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

      {/* Event list with session history sidebar */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main event list */}
        <div className="space-y-6">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-4 sm:-mx-0 px-4 sm:px-0">
            <Filter size={16} className="text-muted-foreground shrink-0" />
            {[
              { id: "all" as const, label: "All", count: events.length },
              { id: "upcoming" as const, label: "Upcoming", count: upcoming.length },
              { id: "leads" as const, label: "Leads", count: pendingLeads.length },
              { id: "past" as const, label: "Past", count: past.length },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-body font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === f.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/35"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* Unified event+lead list */}
          <div className="space-y-4">
            {filter === "all" && events.length > 0 && (
              <div className="space-y-4">
                {events
                  .sort((a, b) => {
                    // Sort by: leads first, then upcoming, then past
                    const aIsLead = a.status === "inquiry" ? 0 : 1;
                    const bIsLead = b.status === "inquiry" ? 0 : 1;
                    if (aIsLead !== bIsLead) return aIsLead - bIsLead;
                    return a.dateStart.localeCompare(b.dateStart);
                  })
                  .map(e => renderEvent(e))}
              </div>
            )}

            {filter === "upcoming" && upcoming.length > 0 && (
              <div className="space-y-4">
                {upcoming.map(e => renderEvent(e))}
              </div>
            )}

            {filter === "leads" && pendingLeads.length > 0 && (
              <div className="space-y-4">
                {pendingLeads.map(e => renderEvent(e))}
              </div>
            )}

            {filter === "past" && past.length > 0 && (
              <div className="space-y-4">
                {past.map(e => renderEvent(e))}
              </div>
            )}

            {((filter === "all" && events.length === 0) ||
              (filter === "upcoming" && upcoming.length === 0) ||
              (filter === "leads" && pendingLeads.length === 0) ||
              (filter === "past" && past.length === 0)) && (
              <div className="rounded-lg bg-muted/20 p-12 text-center">
                <TulipLogo size={44} className="mx-auto mb-3" />
                <p className="font-body text-muted-foreground">
                  {filter === "all" && "No events yet — create one or tap 'Import from Wix'!"}
                  {filter === "upcoming" && "No upcoming events — create one or tap 'Import from Wix'!"}
                  {filter === "leads" && "No pending leads. When your booking form receives requests, they'll appear here."}
                  {filter === "past" && "No past events yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Session history sidebar */}
        <div className="rounded-lg bg-muted/20 p-5 h-fit space-y-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest">
              Past Sessions ({history.length})
            </p>
          </div>
          {history.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground">None yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map(s => (
                <div key={s.id} className="rounded-lg bg-background/50 p-3 border border-border">
                  <p className="font-body font-semibold text-xs text-foreground truncate">{s.eventName}</p>
                  <p className="text-[10px] font-body text-muted-foreground mt-1">
                    {new Date(s.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-body text-foreground font-bold mt-1">
                    {s.totalDrinks} drinks · {formatCurrency(s.totalRevenue)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => {
                        const recap = generateEventRecap(s);
                        savePost({
                          title: recap.title,
                          template: "community-update",
                          tone: "friendly",
                          keywords: "",
                          body: recap.body,
                          status: "draft",
                        });
                        toast.success("Recap draft created — find it in Content");
                      }}
                      className="p-1 rounded text-accent hover:bg-accent/10 transition-colors shrink-0"
                      aria-label="Draft a recap post"
                      title="Draft recap"
                    >
                      <Sparkles size={13} strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => setHistory(deleteFromHistory(s.id))}
                      className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      aria-label="Delete session"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {checklistEvent && (
        <EventChecklist event={checklistEvent} onClose={() => setChecklistEvent(null)} />
      )}
    </div>
  );
}
