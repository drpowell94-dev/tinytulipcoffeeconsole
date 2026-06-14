import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Coffee, MapPin, Trash2, History, Sparkles, Download, CheckCircle2, XCircle, Zap, TrendingUp, ChevronDown } from "lucide-react";
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
  const [tab, setTab] = useState<"upcoming" | "past" | "leads">("upcoming");

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
  const [leadQuickForm, setLeadQuickForm] = useState(false);
  const [quickLead, setQuickLead] = useState({ name: "", phone: "", notes: "" });

  const handleQuickAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLead.name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    const event = createEvent({
      name: quickLead.name.trim(),
      eventType: "popup",
      dateStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: "TBD",
      preOrders: 0,
      status: "inquiry",
      depositStatus: "pending",
      contactPhone: quickLead.phone.trim() || undefined,
      notes: quickLead.notes.trim() || undefined,
    });
    setEvents(loadEvents());
    setQuickLead({ name: "", phone: "", notes: "" });
    setLeadQuickForm(false);
    toast.success(`Lead "${event.name}" created`);
  };

  const renderEvent = (event: TulipEvent, showLogistics = false) => {
    const days = daysUntil(event.dateStart);
    return (
      <div key={event.id} className="space-y-3">
        <div
          className="rounded-lg bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
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
          <div className="flex items-center gap-2 shrink-0">
            {event.status === "inquiry" ? (
              <>
                <button
                  onClick={() => handleConvertLead(event)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 font-body font-semibold text-xs hover-scale active:scale-95 transition-all"
                >
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button
                  onClick={() => handleDeclineLead(event)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <XCircle size={16} strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Predictive logistics section */}
        {showLogistics && event.guestCount && (
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
            className="w-full text-left rounded-lg bg-accent/8 border border-accent/20 p-3.5 flex items-center justify-between gap-2 hover:bg-accent/12 transition-colors group"
          >
            <span className="flex items-center gap-2 text-sm font-body font-semibold text-accent">
              <Zap size={14} strokeWidth={2} /> Predicted Supply Needs
            </span>
            <ChevronDown size={16} className={`transition-transform ${expandedLogistics[event.id] ? "rotate-180" : ""}`} />
          </button>
        )}

        {expandedLogistics[event.id] && (
          <div className="rounded-lg bg-accent/8 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-body">
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Cups</p>
              <p className="text-foreground font-bold text-sm">{expandedLogistics[event.id].predictedCups}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Beans (lbs)</p>
              <p className="text-foreground font-bold text-sm">{expandedLogistics[event.id].predictedBeansLbs}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Milk (L)</p>
              <p className="text-foreground font-bold text-sm">{expandedLogistics[event.id].predictedMilkLiters}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Lids</p>
              <p className="text-foreground font-bold text-sm">{expandedLogistics[event.id].predictedLids}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Napkins</p>
              <p className="text-foreground font-bold text-sm">{expandedLogistics[event.id].predictedNapkins}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-accent/70">Confidence</p>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                expandedLogistics[event.id].confidence === "high" ? "bg-accent/20 text-accent" :
                expandedLogistics[event.id].confidence === "medium" ? "bg-accent/15 text-accent" :
                "bg-muted/30 text-muted-foreground"
              }`}>
                {expandedLogistics[event.id].confidence}
              </span>
            </div>
            <p className="col-span-2 sm:col-span-3 text-muted-foreground text-[10px] mt-1">
              {expandedLogistics[event.id].methodology}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Pop-ups, farmers markets, catering with live counting
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleImportWix}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg bg-muted/50 text-foreground px-4 py-2.5 font-body font-semibold text-sm hover:bg-muted/70 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download size={16} strokeWidth={2} /> Import from Wix
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2} /> New Event
          </button>
        </div>
      </div>

      {/* Lead response time alert */}
      <LeadResponseAlert userId="default-user" />

      {/* Quick leads section */}
      {pendingLeads.length > 0 && (
        <section className="rounded-lg border border-accent/20 bg-accent/8 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-foreground flex items-center gap-2">
                <TrendingUp size={18} className="text-accent" />
                Pending Leads ({pendingLeads.length})
              </h2>
              <p className="text-xs text-muted-foreground font-body mt-1">Inbound booking requests awaiting response</p>
            </div>
            <button
              onClick={() => setTab("leads")}
              className="text-xs font-body font-semibold text-accent hover:opacity-70 transition-opacity"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {pendingLeads.slice(0, 3).map(lead => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg bg-background/50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-body font-semibold text-sm text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(lead.dateStart)}{lead.location && ` • ${lead.location}`}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConvertLead(lead)}
                    className="flex items-center gap-1 rounded-lg bg-accent text-accent-foreground px-2.5 py-1.5 font-body font-semibold text-xs hover-scale active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={12} /> Accept
                  </button>
                  <button
                    onClick={() => handleDeclineLead(lead)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <XCircle size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick lead form */}
      {leadQuickForm && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 p-4 space-y-3">
          <form onSubmit={handleQuickAddLead} className="space-y-3">
            <input
              className={input}
              placeholder="Lead name or company *"
              value={quickLead.name}
              onChange={e => setQuickLead({ ...quickLead, name: e.target.value })}
              autoFocus
            />
            <input
              className={input}
              placeholder="Phone (optional)"
              value={quickLead.phone}
              onChange={e => setQuickLead({ ...quickLead, phone: e.target.value })}
            />
            <textarea
              className={input}
              placeholder="Quick notes (optional)"
              rows={2}
              value={quickLead.notes}
              onChange={e => setQuickLead({ ...quickLead, notes: e.target.value })}
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
                onClick={() => setLeadQuickForm(false)}
                className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingLeads.length === 0 && !leadQuickForm && (
        <button
          onClick={() => setLeadQuickForm(true)}
          className="w-full rounded-lg border-2 border-dashed border-accent/30 p-4 text-center hover:border-accent/50 hover:bg-accent/5 transition-all"
        >
          <p className="font-body font-semibold text-sm text-foreground">+ Add a New Lead</p>
          <p className="text-xs text-muted-foreground mt-1">Manually log incoming booking requests</p>
        </button>
      )}

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

      {/* Event list with tabs - always visible */}
      <div className="space-y-6">
        {/* Tabs - always visible */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: "upcoming" as const, label: `Upcoming (${upcoming.length})` },
            { id: "past" as const, label: `Past (${past.length})` },
            { id: "leads" as const, label: `Pending Leads (${pendingLeads.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-body font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-4">
          {tab === "upcoming" && upcoming.length > 0 && (
            <div className="space-y-4">
              {upcoming.map(e => renderEvent(e, true))}
            </div>
          )}

          {tab === "upcoming" && upcoming.length === 0 && (
            <div className="rounded-lg bg-muted/20 p-12 text-center">
              <TulipLogo size={44} className="mx-auto mb-3" />
              <p className="font-body text-muted-foreground">
                No upcoming events — create one or tap "Import from Wix"!
              </p>
            </div>
          )}

          {tab === "past" && past.length > 0 && (
            <div className="space-y-4">
              {past.map(e => renderEvent(e, false))}
            </div>
          )}

          {tab === "past" && past.length === 0 && (
            <p className="text-sm font-body text-muted-foreground py-6">
              No past events yet.
            </p>
          )}

          {tab === "leads" && pendingLeads.length > 0 && (
            <div className="space-y-4">
              {pendingLeads.map(e => renderEvent(e, false))}
            </div>
          )}

          {tab === "leads" && pendingLeads.length === 0 && (
            <p className="text-sm font-body text-muted-foreground py-6">
              No pending leads. When your booking form receives requests, they'll appear here.
            </p>
          )}
        </div>
      </div>

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
                      <div className="flex items-center gap-3 mt-2">
                        {Object.entries(s.productCounts).map(([id, count]) => (
                          <span key={id} className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                            <DrinkIcon id={id} size={18} className="text-muted-foreground" />
                            {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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
                        className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                        aria-label="Draft a recap post"
                        title="Draft recap post"
                      >
                        <Sparkles size={15} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setHistory(deleteFromHistory(s.id))}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete session"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
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
