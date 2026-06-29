import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Coffee, MapPin, Trash2, History, Sparkles, Download, CheckCircle2, XCircle, Zap, TrendingUp, ChevronDown, Filter, Loader, Pencil, Bell, Building2, Upload } from "lucide-react";
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
import {
  loadVenues,
  findVenueByName,
  upsertVenue,
  deleteVenue,
  type Venue,
} from "@/lib/venueStore";
import { publishToWix } from "@/services/wixPublishService";
import { uploadLogoToWix } from "@/services/wixUploadService";

const EMPTY_VENUE_FORM = {
  name: "",
  streetNumber: "",
  streetName: "",
  apt: "",
  city: "Charlotte",
  state: "NC",
  zip: "",
  formattedAddress: "",
  lat: "",
  lng: "",
  defaultStartTime: "09:00",
  defaultCategory: "Pop Up" as Venue["defaultCategory"],
  logoUrl: "",
  logoMediaId: "",
  logoW: 1200,
  logoH: 630,
};

// Default pre-ordered drinks by event type: 30 for a Pop-up, 25 for Grab and
// Go. These prefill the form when the type changes, and stay editable.
const PREORDER_DEFAULTS: Record<EventType, number> = {
  popup: 30,
  farmers_market: 25,
  catering: 30,
  other: 30,
};

// Map a venue's Wix category to the app's event type, so selecting a property
// can prefill the right event type (and its pre-order default).
function categoryToEventType(category: Venue["defaultCategory"]): EventType {
  switch (category) {
    case "Pop Up":
      return "popup";
    case "Grab & Go":
    case "Market":
      return "farmers_market";
    case "Private Event":
      return "catering";
    default:
      return "popup";
  }
}

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
  startTime: "09:00",
  location: "",
  address: "",
  preOrders: 30,
  estimatedRevenue: 0,
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  status: "confirmed" as EventStatus,
  propertyId: "" as string,
  followUpDate: "",
  followUpNote: "",
  dayOfParking: "",
  dayOfEntry: "",
  dayOfSetupLocation: "",
  dayOfArrivalTime: "",
  dayOfOtherNotes: "",
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [converting, setConverting] = useState<Record<string, boolean>>({});
  const [publishNeedsLogo, setPublishNeedsLogo] = useState<Record<string, boolean>>({});
  const [uploadingLogo, setUploadingLogo] = useState<Record<string, boolean>>({});
  const [showVenueManager, setShowVenueManager] = useState(false);
  const [venues, setVenues] = useState<Venue[]>(() => loadVenues());
  const [venueForm, setVenueForm] = useState(EMPTY_VENUE_FORM);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const venueManagerRef = useRef<HTMLElement | null>(null);

  // When the Venue Manager opens, scroll it into view so it's obvious it opened
  // (the panel lives below the event list).
  useEffect(() => {
    if (showVenueManager) {
      venueManagerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showVenueManager]);

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
    if (!form.location.trim()) {
      toast.error("Location (the event) is required");
      return;
    }
    const event = createEvent({
      // Same mapping as the lead flow: the location/property is the event's
      // name (title + venue match); the Name field is the contact person.
      name: form.location.trim(),
      eventType: form.eventType,
      dateStart: form.dateStart
        ? new Date(`${form.dateStart}T${form.startTime || "09:00"}:00`).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: form.location.trim(),
      address: form.address.trim() || undefined,
      preOrders: form.preOrders,
      status: form.status,
      depositStatus: "pending",
      contactName: form.name.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
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

  // Shared by both forms' Location field: when the typed value matches a known
  // venue, prefill the event start time with that venue's default.
  const handleLocationChange = (value: string) => {
    const venue = findVenueByName(value);
    setForm(f => ({
      ...f,
      location: value,
      ...(venue ? { startTime: venue.defaultStartTime, address: venue.formattedAddress } : {}),
    }));
  };

  // Property dropdown: selecting a venue autofills all the relevant fields
  // (location, event type, start time, and the matching pre-order default).
  const handleSelectProperty = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    if (!venue) return;
    const eventType = categoryToEventType(venue.defaultCategory);
    setForm(f => ({
      ...f,
      location: venue.name,
      address: venue.formattedAddress,
      eventType,
      startTime: venue.defaultStartTime,
      preOrders: PREORDER_DEFAULTS[eventType],
    }));
  };

  // Resolve the currently-selected venue id from the location field so the
  // dropdown reflects the chosen property.
  const selectedVenueId =
    venues.find(v => v.name.toLowerCase() === form.location.trim().toLowerCase())?.id ?? "";

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

  // Push the event payload to Wix and store the returned ID. Re-publishing an
  // event that already has a wixEventId sends a PATCH ("Update Wix").
  const doPublish = async (event: TulipEvent, venue: Venue) => {
    setConverting(prev => ({ ...prev, [event.id]: true }));
    try {
      const { wixEventId } = await publishToWix({
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          dateStart: event.dateStart,
          notes: event.notes,
          wixEventId: event.wixEventId,
        },
        venue,
      });
      updateEvent(event.id, { wixEventId });
      setEvents(loadEvents());
      toast.success(event.wixEventId ? `"${event.name}" updated on Wix` : `"${event.name}" published to Wix!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Wix publish failed: ${message}`);
    } finally {
      setConverting(prev => ({ ...prev, [event.id]: false }));
    }
  };

  // "Publish to Wix" entry point. Resolves the venue, then:
  //  - no venue → open the venue manager prefilled
  //  - venue missing a logo → reveal an inline photo picker (upload then publish)
  //  - venue ready → publish straight away
  const handlePublishToWix = (event: TulipEvent) => {
    const venue = findVenueByName(event.location);
    if (!venue) {
      toast.error(`No venue found for "${event.location}". Add it below to publish.`);
      setShowVenueManager(true);
      setVenueForm(f => ({ ...f, name: event.location }));
      setShowAddVenue(true);
      return;
    }
    if (!venue.logoUrl) {
      toast.info(`"${venue.name}" has no photo yet — add one to publish.`);
      setPublishNeedsLogo(prev => ({ ...prev, [event.id]: true }));
      return;
    }
    doPublish(event, venue);
  };

  // Photo picked for a venue with no logo: upload to Wix, save the URL onto the
  // venue, then publish the event in the same step.
  const handleLogoPicked = async (event: TulipEvent, file: File) => {
    const venue = findVenueByName(event.location);
    if (!venue) {
      toast.error("Venue disappeared — re-add it below.");
      return;
    }
    setUploadingLogo(prev => ({ ...prev, [event.id]: true }));
    try {
      const logo = await uploadLogoToWix(file);
      const updatedVenue = upsertVenue({ ...venue, ...logo });
      setVenues(loadVenues());
      setPublishNeedsLogo(prev => ({ ...prev, [event.id]: false }));
      toast.success(`Photo uploaded for "${venue.name}"`);
      await doPublish(event, updatedVenue);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Upload failed: ${message}`);
    } finally {
      setUploadingLogo(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const handleAddVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueForm.name.trim() || !venueForm.formattedAddress.trim()) {
      toast.error("Venue name and address are required");
      return;
    }
    if (!venueForm.lat || !venueForm.lng) {
      toast.error("Lat/lng are required for Wix geocoding");
      return;
    }

    // Logo is optional — if blank, you'll be prompted to upload at publish time.
    let mediaId = venueForm.logoMediaId.trim();
    if (!mediaId && venueForm.logoUrl.includes("wixstatic.com/media/")) {
      mediaId = venueForm.logoUrl.split("/media/")[1]?.split("?")[0] ?? "";
    }

    const venue = upsertVenue({
      // When editing, keep the original id so we update in place even if the
      // name changes; otherwise a new id is derived from the name.
      ...(editingVenueId ? { id: editingVenueId } : {}),
      name: venueForm.name.trim(),
      streetNumber: venueForm.streetNumber.trim(),
      streetName: venueForm.streetName.trim(),
      apt: venueForm.apt.trim(),
      city: venueForm.city.trim(),
      state: venueForm.state.trim(),
      zip: venueForm.zip.trim(),
      formattedAddress: venueForm.formattedAddress.trim(),
      lat: parseFloat(venueForm.lat),
      lng: parseFloat(venueForm.lng),
      defaultStartTime: venueForm.defaultStartTime,
      defaultCategory: venueForm.defaultCategory,
      logoUrl: venueForm.logoUrl.trim(),
      logoMediaId: mediaId,
      logoW: venueForm.logoW,
      logoH: venueForm.logoH,
    });

    setVenues(loadVenues());
    setVenueForm(EMPTY_VENUE_FORM);
    setShowAddVenue(false);
    setEditingVenueId(null);
    toast.success(`Venue "${venue.name}" saved`);
  };

  // Open the venue form prefilled with an existing venue for editing.
  const startEditVenue = (venue: Venue) => {
    setEditingVenueId(venue.id);
    setVenueForm({
      name: venue.name,
      streetNumber: venue.streetNumber,
      streetName: venue.streetName,
      apt: venue.apt,
      city: venue.city,
      state: venue.state,
      zip: venue.zip,
      formattedAddress: venue.formattedAddress,
      lat: String(venue.lat),
      lng: String(venue.lng),
      defaultStartTime: venue.defaultStartTime,
      defaultCategory: venue.defaultCategory,
      logoUrl: venue.logoUrl,
      logoMediaId: venue.logoMediaId,
      logoW: venue.logoW,
      logoH: venue.logoH,
    });
    setShowAddVenue(true);
  };

  const pendingLeads = events.filter(e => e.status === "inquiry");

  const handleEdit = (event: TulipEvent) => {
    setEditingId(event.id);
    setEditForm({
      name: event.name,
      eventType: event.eventType,
      dateStart: event.dateStart ? new Date(event.dateStart).toISOString().slice(0, 16) : "",
      startTime: event.dateStart
        ? new Date(event.dateStart).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
        : "09:00",
      location: event.location,
      address: event.address || "",
      preOrders: event.preOrders,
      estimatedRevenue: event.estimatedRevenue || 0,
      contactName: event.contactName || "",
      contactEmail: event.contactEmail || "",
      contactPhone: event.contactPhone || "",
      notes: event.notes || "",
      status: event.status,
      propertyId: event.propertyId || "",
      followUpDate: event.followUpDate || "",
      followUpNote: event.followUpNote || "",
      dayOfParking: event.dayOfParking || "",
      dayOfEntry: event.dayOfEntry || "",
      dayOfSetupLocation: event.dayOfSetupLocation || "",
      dayOfArrivalTime: event.dayOfArrivalTime || "",
      dayOfOtherNotes: event.dayOfOtherNotes || "",
    });
  };

  const handleSaveEdit = (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    updateEvent(eventId, {
      name: editForm.name.trim(),
      eventType: editForm.eventType,
      dateStart: editForm.dateStart ? new Date(editForm.dateStart).toISOString() : undefined,
      location: editForm.location.trim() || "TBD",
      address: editForm.address.trim() || undefined,
      preOrders: editForm.preOrders,
      estimatedRevenue: editForm.estimatedRevenue || undefined,
      status: editForm.status,
      contactName: editForm.contactName.trim() || undefined,
      contactEmail: editForm.contactEmail.trim() || undefined,
      contactPhone: editForm.contactPhone.trim() || undefined,
      notes: editForm.notes.trim() || undefined,
      propertyId: editForm.propertyId || undefined,
      followUpDate: editForm.followUpDate || undefined,
      followUpNote: editForm.followUpNote.trim() || undefined,
      dayOfParking: editForm.dayOfParking.trim() || undefined,
      dayOfEntry: editForm.dayOfEntry.trim() || undefined,
      dayOfSetupLocation: editForm.dayOfSetupLocation.trim() || undefined,
      dayOfArrivalTime: editForm.dayOfArrivalTime || undefined,
      dayOfOtherNotes: editForm.dayOfOtherNotes.trim() || undefined,
    });
    setEvents(loadEvents());
    setEditingId(null);
    toast.success("Event updated");
  };

  const renderEvent = (event: TulipEvent) => {
    const days = daysUntil(event.dateStart);

    // Edit mode — show inline form instead of card
    if (editingId === event.id) {
      return (
        <div key={event.id} className="rounded-lg bg-muted/20 p-4 sm:p-5 space-y-3 overflow-hidden">
          <form onSubmit={e => handleSaveEdit(e, event.id)} className="space-y-3">
            <select className={input} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as EventStatus })}>
              <option value="inquiry">📝 Lead</option>
              <option value="confirmed">✓ Confirmed</option>
              <option value="completed">✓✓ Completed</option>
              <option value="cancelled">✗ Cancelled</option>
            </select>
            <input
              className={input}
              placeholder="Location"
              list="venue-options-edit"
              value={editForm.location}
              onChange={e => {
                const venue = findVenueByName(e.target.value);
                setEditForm({ ...editForm, location: e.target.value, ...(venue ? { address: venue.formattedAddress } : {}) });
              }}
              autoFocus
            />
            <datalist id="venue-options-edit">
              {venues.map(v => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
            <input className={input} placeholder="Address (autofills from the property)" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            <input className={input} placeholder="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            <input className={input} placeholder="Email" type="email" value={editForm.contactEmail} onChange={e => setEditForm({ ...editForm, contactEmail: e.target.value })} />
            <input className={input} placeholder="Phone" value={editForm.contactPhone} onChange={e => setEditForm({ ...editForm, contactPhone: e.target.value })} />
            <div className="space-y-1 overflow-hidden">
              <label className="block text-xs font-body font-semibold text-foreground">Date</label>
              <input className={input + " max-w-full"} type="datetime-local" style={{ WebkitAppearance: "none", maxWidth: "100%" }} value={editForm.dateStart} onChange={e => setEditForm({ ...editForm, dateStart: e.target.value })} />
            </div>
            <textarea className={input} placeholder="Notes" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            {(editForm.status === "confirmed" || editForm.status === "completed") && (
              <>
                <p className="text-xs font-body font-semibold text-muted-foreground">Day-of details</p>
                <input className={input} placeholder="Event start time" value={editForm.dayOfArrivalTime} onChange={e => setEditForm({ ...editForm, dayOfArrivalTime: e.target.value })} />
                <input className={input} placeholder="Setup location" value={editForm.dayOfSetupLocation} onChange={e => setEditForm({ ...editForm, dayOfSetupLocation: e.target.value })} />
                <input className={input} placeholder="Parking" value={editForm.dayOfParking} onChange={e => setEditForm({ ...editForm, dayOfParking: e.target.value })} />
                <input className={input} placeholder="Entry" value={editForm.dayOfEntry} onChange={e => setEditForm({ ...editForm, dayOfEntry: e.target.value })} />
              </>
            )}
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all">Save</button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div key={event.id} className="space-y-2 sm:space-y-3">
        <div className="rounded-lg bg-muted/20 p-4 sm:p-6 hover:bg-muted/30 transition-colors space-y-3 sm:space-y-4">
          {/* Header row: content left, pencil top-right */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2 sm:mb-3">
                <h3 className="font-body font-semibold text-foreground text-base">{event.name}</h3>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-body font-semibold", STATUS_STYLES[event.status])}>
                  {event.status === "inquiry" ? "New Lead" : STATUS_LABELS[event.status]}
                </span>
                {event.wixEventId && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-body font-semibold bg-purple-500/10 text-purple-600">
                    Wix ✓
                  </span>
                )}
                {event.followUpDate && event.status === "inquiry" && days >= 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-semibold bg-blue-500/10 text-blue-600">
                    <Bell size={10} /> Follow-up {new Date(event.followUpDate).toLocaleDateString()}
                  </span>
                )}
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
                {event.address && (
                  <span className="block text-muted-foreground/70 pl-4">{event.address}</span>
                )}
                {event.propertyId && (
                  <span className="block text-accent/70">
                    📍 Property: {getCharlotteApartments().find(p => p.id === event.propertyId)?.name || "Unknown"}
                  </span>
                )}
                {event.followUpNote && event.status === "inquiry" && days >= 0 && (
                  <span className="block text-muted-foreground italic">{event.followUpNote}</span>
                )}
                {(event.status === "confirmed" || event.status === "completed") && (
                  <span className="block pt-1 text-foreground/60">
                    {`⏰ ${event.dayOfArrivalTime || "—"} · 📍 ${event.dayOfSetupLocation || "—"} · 🅿️ ${event.dayOfParking || "—"} · 🔑 ${event.dayOfEntry || "—"}`}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => handleEdit(event)}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 transition-colors"
              aria-label={`Edit ${event.name}`}
            >
              <Pencil size={15} strokeWidth={1.5} />
            </button>
          </div>

          {/* Action buttons */}
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
                {event.preOrders > 0 && (
                  <Link
                    to={`/events/${event.id}/counter`}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-2 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all"
                  >
                    <Coffee size={14} strokeWidth={1.5} />
                    <span className="hidden sm:inline">Counter</span>
                  </Link>
                )}
                {event.status === "confirmed" && (
                  <button
                    onClick={() => handlePublishToWix(event)}
                    disabled={converting[event.id] || uploadingLogo[event.id]}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 text-white px-3 py-2 font-body font-semibold text-xs sm:text-sm hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {converting[event.id] ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} strokeWidth={1.75} />
                    )}
                    <span className="hidden sm:inline">
                      {converting[event.id] ? "Publishing…" : event.wixEventId ? "Update Wix" : "Publish to Wix"}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(event)}
                  className="flex items-center justify-center gap-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors px-3 py-2 font-body font-semibold text-xs border border-border hover:border-destructive ml-auto"
                  aria-label={`Delete ${event.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>

          {/* Inline photo picker — shown when publishing a venue with no logo */}
          {publishNeedsLogo[event.id] && (
            <div className="rounded-lg border border-dashed border-purple-400/50 bg-purple-500/5 p-3 space-y-2">
              <p className="text-xs font-body text-foreground">
                <strong>{event.location}</strong> needs a photo before it can go on Wix.
                Pick an image — it uploads to your Wix Media and publishes the event.
              </p>
              <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-purple-600 text-white px-3 py-2 font-body font-semibold text-xs w-fit hover:bg-purple-700 transition-colors">
                {uploadingLogo[event.id] ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {uploadingLogo[event.id] ? "Uploading…" : "Choose photo & publish"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo[event.id]}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoPicked(event, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Predictive logistics section */}
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

        {/* Day-of logistics expanded panel */}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">Events</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-body mt-2">
            Pop-ups, farmers markets, private events with live drink counting
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-start sm:justify-end">
          <button
            onClick={() => setShowVenueManager(v => !v)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 text-foreground px-3 sm:px-4 py-2.5 sm:py-3 font-body font-semibold text-xs sm:text-sm active:scale-95 transition-all border border-border/30"
          >
            <Building2 size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Venues ({venues.length})</span>
            <span className="sm:hidden">Venues</span>
          </button>
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
        <div className="rounded-lg bg-accent/8 border border-accent/20 p-5 space-y-3 overflow-hidden">
          <h3 className="font-body font-semibold text-foreground">Add New Lead</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.location.trim()) {
              toast.error("Location (the lead) is required");
              return;
            }
            const event = createEvent({
              // The location/property IS the lead's name (card title + venue match);
              // the "Name" field is the contact person at that property.
              name: form.location.trim(),
              eventType: form.eventType,
              dateStart: form.dateStart
                ? new Date(`${form.dateStart}T${form.startTime || "09:00"}:00`).toISOString()
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              location: form.location.trim(),
              address: form.address.trim() || undefined,
              preOrders: form.preOrders,
              status: "inquiry",
              depositStatus: "pending",
              contactName: form.name.trim() || undefined,
              contactEmail: form.contactEmail.trim() || undefined,
              contactPhone: form.contactPhone.trim() || undefined,
              notes: form.notes.trim() || undefined,
              followUpDate: form.followUpDate || undefined,
              followUpNote: form.followUpNote.trim() || undefined,
            });
            setEvents(loadEvents());
            setForm(EMPTY_FORM);
            setShowLeadForm(false);
            toast.success(`Lead "${event.name}" created`);
          }} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-body font-semibold text-foreground">Property</label>
              <select
                className={input}
                value={selectedVenueId}
                onChange={e => handleSelectProperty(e.target.value)}
              >
                <option value="">Select a property (autofills the form)…</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <input
              className={input}
              placeholder="Location (the lead/property)"
              list="venue-options"
              value={form.location}
              onChange={e => handleLocationChange(e.target.value)}
              autoFocus
            />
            <datalist id="venue-options">
              {venues.map(v => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
            <input
              className={input}
              placeholder="Address (autofills from the property)"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
            <input
              className={input}
              placeholder="Name (contact at the property)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Email"
              type="email"
              value={form.contactEmail}
              onChange={e => setForm({ ...form, contactEmail: e.target.value })}
            />
            <input
              className={input}
              placeholder="Phone"
              value={form.contactPhone}
              onChange={e => setForm({ ...form, contactPhone: e.target.value })}
            />
            <div className="space-y-1 overflow-hidden">
              <label className="block text-xs font-body font-semibold text-foreground">Date</label>
              <input
                className={input + " max-w-full"}
                type="date"
                value={form.dateStart}
                onChange={e => setForm({ ...form, dateStart: e.target.value })}
                style={{ WebkitAppearance: "none", maxWidth: "100%" }}
              />
            </div>
            <div className="space-y-1 overflow-hidden">
              <label className="block text-xs font-body font-semibold text-foreground">Event start time</label>
              <input
                className={input + " max-w-full"}
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                style={{ WebkitAppearance: "none", maxWidth: "100%" }}
              />
            </div>
            <select
              className={input}
              value={form.eventType}
              onChange={e => {
                const eventType = e.target.value as EventType;
                setForm({ ...form, eventType, preOrders: PREORDER_DEFAULTS[eventType] });
              }}
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="space-y-1">
              <label className="block text-xs font-body font-semibold text-foreground">Pre-ordered drinks</label>
              <input
                className={input}
                type="number"
                min={0}
                placeholder="Pre-ordered drinks"
                value={form.preOrders}
                onChange={e => {
                  const num = parseInt(e.target.value, 10);
                  setForm({ ...form, preOrders: isNaN(num) ? 0 : Math.max(0, num) });
                }}
              />
            </div>
            <textarea
              className={input}
              placeholder="Notes"
              rows={3}
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

      {/* Create form — mirrors the lead flow */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg bg-muted/20 p-5 space-y-3 overflow-hidden">
          <h3 className="font-body font-semibold text-foreground">New Event</h3>
          <div className="space-y-1">
            <label className="block text-xs font-body font-semibold text-foreground">Property</label>
            <select
              className={input}
              value={selectedVenueId}
              onChange={e => handleSelectProperty(e.target.value)}
            >
              <option value="">Select a property (autofills the form)…</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <input
            className={input}
            placeholder="Location (the event/property)"
            list="venue-options-event"
            value={form.location}
            onChange={e => handleLocationChange(e.target.value)}
            autoFocus
          />
          <datalist id="venue-options-event">
            {venues.map(v => (
              <option key={v.id} value={v.name} />
            ))}
          </datalist>
          <input
            className={input}
            placeholder="Address (autofills from the property)"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
          <input
            className={input}
            placeholder="Name (contact at the property)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={input}
            placeholder="Email"
            type="email"
            value={form.contactEmail}
            onChange={e => setForm({ ...form, contactEmail: e.target.value })}
          />
          <input
            className={input}
            placeholder="Phone"
            value={form.contactPhone}
            onChange={e => setForm({ ...form, contactPhone: e.target.value })}
          />
          <div className="space-y-1 overflow-hidden">
            <label className="block text-xs font-body font-semibold text-foreground">Date</label>
            <input
              className={input + " max-w-full"}
              type="date"
              value={form.dateStart}
              onChange={e => setForm({ ...form, dateStart: e.target.value })}
              style={{ WebkitAppearance: "none", maxWidth: "100%" }}
            />
          </div>
          <div className="space-y-1 overflow-hidden">
            <label className="block text-xs font-body font-semibold text-foreground">Event start time</label>
            <input
              className={input + " max-w-full"}
              type="time"
              value={form.startTime}
              onChange={e => setForm({ ...form, startTime: e.target.value })}
              style={{ WebkitAppearance: "none", maxWidth: "100%" }}
            />
          </div>
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
          <select
            className={input}
            value={form.eventType}
            onChange={e => {
              const eventType = e.target.value as EventType;
              setForm({ ...form, eventType, preOrders: PREORDER_DEFAULTS[eventType] });
            }}
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="space-y-1">
            <label className="block text-xs font-body font-semibold text-foreground">Pre-ordered drinks</label>
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Pre-ordered drinks"
              value={form.preOrders}
              onChange={e => {
                const num = parseInt(e.target.value, 10);
                setForm({ ...form, preOrders: isNaN(num) ? 0 : Math.max(0, num) });
              }}
            />
          </div>
          <textarea
            className={input}
            placeholder="Notes"
            rows={3}
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

        {/* Past events at bottom */}
        {past.length > 0 && (
          <section className="space-y-4 border-t border-border/50 pt-8">
            <div className="flex items-center gap-2">
              <History size={18} className="text-accent" />
              <h2 className="font-display text-lg text-foreground">Past Events ({past.length})</h2>
            </div>
            <div className="space-y-4">
              {past.slice(0, 6).map(event => renderEvent(event))}
            </div>
          </section>
        )}
      </div>

      {/* Venue Manager */}
      {showVenueManager && (
        <section ref={venueManagerRef} className="space-y-4 border-t border-border/50 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-accent" />
              <h2 className="font-display text-lg text-foreground">Venue Address Book ({venues.length})</h2>
            </div>
            <button
              onClick={() => { setEditingVenueId(null); setVenueForm(EMPTY_VENUE_FORM); setShowAddVenue(v => !v); }}
              className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-1.5 font-body font-semibold text-xs hover-scale active:scale-95 transition-all"
            >
              <Plus size={14} /> Add Venue
            </button>
          </div>

          <p className="text-xs font-body text-muted-foreground -mt-2">
            Each property has a <strong className="text-foreground">name</strong> (used as the event's Location)
            and a separate <strong className="text-foreground">address</strong> (the street address shown on Wix).
          </p>

          {showAddVenue && (
            <form onSubmit={handleAddVenue} className="rounded-lg bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-body font-semibold text-muted-foreground">
                {editingVenueId ? `Editing "${venueForm.name || "venue"}"` : "Required for Wix publish"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className={input} placeholder="Property name * (becomes the Location)" value={venueForm.name} onChange={e => setVenueForm({ ...venueForm, name: e.target.value })} autoFocus />
                <select className={input} value={venueForm.defaultCategory} onChange={e => setVenueForm({ ...venueForm, defaultCategory: e.target.value as Venue["defaultCategory"] })}>
                  <option value="Pop Up">Pop Up</option>
                  <option value="Grab & Go">Grab & Go</option>
                  <option value="Market">Market</option>
                  <option value="Private Event">Private Event</option>
                </select>
                <input className={input} placeholder="Street address * (e.g. 711 E Morehead St, Charlotte, NC 28203, USA)" value={venueForm.formattedAddress} onChange={e => setVenueForm({ ...venueForm, formattedAddress: e.target.value })} />
                <div className="flex gap-2">
                  <input className={input} placeholder="Street #" value={venueForm.streetNumber} onChange={e => setVenueForm({ ...venueForm, streetNumber: e.target.value })} />
                  <input className={input} placeholder="Street name" value={venueForm.streetName} onChange={e => setVenueForm({ ...venueForm, streetName: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <input className={input} placeholder="City" value={venueForm.city} onChange={e => setVenueForm({ ...venueForm, city: e.target.value })} />
                  <input className={input} placeholder="State" value={venueForm.state} maxLength={2} onChange={e => setVenueForm({ ...venueForm, state: e.target.value })} />
                  <input className={input} placeholder="ZIP" value={venueForm.zip} onChange={e => setVenueForm({ ...venueForm, zip: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <input className={input} placeholder="Latitude *" type="number" step="any" value={venueForm.lat} onChange={e => setVenueForm({ ...venueForm, lat: e.target.value })} />
                  <input className={input} placeholder="Longitude *" type="number" step="any" value={venueForm.lng} onChange={e => setVenueForm({ ...venueForm, lng: e.target.value })} />
                </div>
                <input className={input} placeholder="Logo URL (optional — or upload at publish time)" value={venueForm.logoUrl} onChange={e => setVenueForm({ ...venueForm, logoUrl: e.target.value })} />
                <input className={input} type="time" value={venueForm.defaultStartTime} onChange={e => setVenueForm({ ...venueForm, defaultStartTime: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all">{editingVenueId ? "Update Venue" : "Save Venue"}</button>
                <button type="button" onClick={() => { setShowAddVenue(false); setEditingVenueId(null); setVenueForm(EMPTY_VENUE_FORM); }} className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors">Cancel</button>
              </div>
            </form>
          )}

          {venues.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground">No venues yet. Add one above or they'll load automatically on first visit.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {venues.map(v => (
                <div key={v.id} className="rounded-lg bg-muted/20 p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-sm text-foreground truncate">{v.name}</p>
                    <p className="font-body text-xs text-muted-foreground truncate">{v.formattedAddress}</p>
                    <p className="font-body text-[10px] text-muted-foreground/70 mt-0.5">
                      {v.defaultCategory} · {v.defaultStartTime}{v.logoUrl ? "" : " · no photo"}
                    </p>
                  </div>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => startEditVenue(v)}
                      className="p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                      aria-label={`Edit ${v.name}`}
                    >
                      <Pencil size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => {
                        deleteVenue(v.id);
                        setVenues(loadVenues());
                        toast(`Removed "${v.name}"`);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Remove ${v.name}`}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
