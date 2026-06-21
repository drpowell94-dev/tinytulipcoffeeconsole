import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Coffee, MapPin, Trash2, History, Sparkles, Download, CheckCircle2, XCircle, Zap, TrendingUp, ChevronDown, Filter, Loader } from "lucide-react";
import LeadResponseAlert from "@/components/leads/LeadResponseAlert";
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
import { getCharlotteApartments } from "@/lib/propertyStore";
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
  preOrders: 0,
  estimatedRevenue: 0,
  contactName: "",
  contactPhone: "",
  notes: "",
  status: "confirmed" as EventStatus,
  propertyId: "" as string,
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

  // On load, pull any events that arrived in Supabase (e.g. via the Wix
  // receiver) and merge them into the local store.
  useEffect(() => {
    syncEventsFromSupabase().then(result => {
      if (result) {
        setEvents(loadEvents());
        if (result.created > 0 || result.updated > 0) {
          toast.success(`Synced: ${result.created} new, ${result.updated} updated`);
        }
      }
    });
  }, []);

  const handleImportWix = () => {
    setImporting(true);
    const { created, updated, errors } = importBundledWixEvents();
    setEvents(loadEvents());
    setImporting(false);

    if (created === 0 && updated === 0) {
      toast.info("All Wix events already imported");
    } else {
      const msg = `Imported ${created} new${updated ? `, updated ${updated}` : ""}. Events sorted by most recent.`;
      toast.success(msg);
    }

    if (errors > 0) {
      toast.error(`Skipped ${errors} invalid record(s) — check console`);
    }
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
      preOrders: form.preOrders,
      estimatedRevenue: form.estimatedRevenue || undefined,
      status: form.status,
      depositStatus: "pending",
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      propertyId: form.propertyId || undefined,
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
      <div key={event.id} className="space-y-2 sm:space-y-3">
        <div className="rounded-lg bg-muted/20 p-4 sm:p-6 hover:bg-muted/30 transition-colors space-y-3 sm:space-y-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2 sm:mb-3">
              <h3 className="font-body font-semibold text-foreground text-base">{event.name}</h3>
              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-body font-semibold", STATUS_STYLES[event.status])}>
                {event.status === "inquiry" ? "New Lead" : STATUS_LABELS[event.status]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-body space-y-1">
              <span className="block">{formatDate(event.dateStart)}</span>
              {days >= 0 && event.status !== "completed" && (
                <span className="text-accent font-semibold">
                  {days === 0 ? "Today" : `${days}d away`}
                </span>
              )}
              <span className="block">
                <MapPin className="inline mr-1" size={12} /> {event.location} • {EVENT_TYPE_LABELS[event.eventType]}
                {event.guestCount && ` • ${event.guestCount} guests`}
                {event.preOrders > 0 && ` • ${event.preOrders} pre-orders`}
              </span>
              {event.propertyId && (
                <span className="block text-accent/70">
                  📍 Property: {getCharlotteApartments().find(p => p.id === event.propertyId)?.name || "Unknown"}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
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
                {event.preOrders === 30 && (
                  <Link
                    to={`/events/${event.id}/counter`}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all flex-1 sm:flex-initial"
                  >
                    <Coffee size={14} strokeWidth={1.5} />
                    <span className="hidden sm:inline">Counter</span>
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(event)}
                  className="flex items-center justify-center gap-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors px-3 py-2 font-body font-semibold text-xs flex-1 sm:flex-initial"
                  aria-label={`Delete ${event.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Delete</span>
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
                className="w-full text-left flex items-center justify-between gap-2 text-sm font-body font-semibold text-accent hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                <span className="flex items-center gap-1">
                  {loadingLogistics[event.id] ? (
                    <Loader size={14} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Zap size={14} strokeWidth={2} />
                  )}
                  Supplies
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
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">Events</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-body mt-2">
            Pop-ups, farmers markets, catering with live drink counting
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-start sm:justify-end">
          <button
            onClick={handleImportWix}
            disabled={importing}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 text-foreground px-3 sm:px-4 py-2.5 sm:py-3 font-body font-semibold text-xs sm:text-sm active:scale-95 transition-all disabled:opacity-50 border border-border/30"
          >
            <Download size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Import from Wix</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowLeadForm(!showLeadForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-500/80 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 font-body font-semibold text-xs sm:text-sm active:scale-95 transition-all hover-scale"
          >
            <Plus size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Lead</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-accent to-orange-600 hover:from-orange-500 hover:to-orange-700 text-accent-foreground px-3 sm:px-4 py-2.5 sm:py-3 font-body font-semibold text-xs sm:text-sm active:scale-95 transition-all hover-scale shadow-lg shadow-accent/20"
          >
            <Plus size={16} strokeWidth={2} />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">Event</span>
          </button>
        </div>
      </div>

      {/* Lead response time alert */}
      <LeadResponseAlert userId="default-user" />

      {/* Quick lead form - always accessible */}
      {showLeadForm && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 p-5 space-y-3">
          <h3 className="font-body font-semibold text-foreground">Add New Lead</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Lead name is required");
              return;
            }
            const event = createEvent({
              name: form.name.trim(),
              eventType: "popup",
              dateStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              location: form.location.trim() || "TBD",
              preOrders: 0,
              status: "inquiry",
              depositStatus: "pending",
              contactPhone: form.contactPhone.trim() || undefined,
              notes: form.notes.trim() || undefined,
            });
            setEvents(loadEvents());
            setForm(EMPTY_FORM);
            setShowLeadForm(false);
            toast.success(`Lead "${event.name}" created`);
          }} className="space-y-3">
            <input
              className={input}
              placeholder="Lead name or company *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <input
              className={input}
              placeholder="Phone (optional)"
              value={form.contactPhone}
              onChange={e => setForm({ ...form, contactPhone: e.target.value })}
            />
            <input
              className={input}
              placeholder="Location (optional)"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
            <textarea
              className={input}
              placeholder="Notes (optional)"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
              >
                Add Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeadForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
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
            <select
              className={input}
              value={form.propertyId}
              onChange={e => setForm({ ...form, propertyId: e.target.value })}
            >
              <option value="">No property</option>
              {getCharlotteApartments().map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
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

      {/* Events and past sessions */}
      <div className="space-y-12">
        {/* Event list */}
        <div className="space-y-6">
          {/* Filter buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 -mx-4 sm:-mx-0 px-4 sm:px-0">
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
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-body font-semibold transition-colors whitespace-nowrap shrink-0 ${
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
          <div className="space-y-4 sm:space-y-5">
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

        {/* Past sessions at bottom */}
        <section className="space-y-4 border-t border-border/50 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-accent" />
              <h2 className="font-display text-lg text-foreground">Past Sessions ({history.length})</h2>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="rounded-lg bg-muted/15 p-8 text-center">
              <p className="font-body text-muted-foreground">No past sessions yet. Use the drink counter at an event to start tracking sessions.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {history.map(s => (
                <div key={s.id} className="rounded-lg bg-muted/20 p-5 space-y-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-body font-semibold text-foreground">{s.eventName}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div>
                      <p className="text-sm font-body text-muted-foreground">Drinks</p>
                      <p className="font-display text-xl text-foreground">{s.totalDrinks}</p>
                    </div>
                    <div>
                      <p className="text-sm font-body text-muted-foreground">Revenue</p>
                      <p className="font-display text-lg text-accent">{formatCurrency(s.totalRevenue)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
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
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-body text-xs font-semibold"
                      aria-label="Draft a recap post"
                    >
                      <Sparkles size={14} strokeWidth={1.75} />
                      Recap
                    </button>
                    <button
                      onClick={() => setHistory(deleteFromHistory(s.id))}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label="Delete session"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
