import { useState } from "react";
import { Plus, Trash2, MapPin, Instagram, Zap, Pencil, Coffee } from "lucide-react";
import { toast } from "sonner";
import {
  loadVenues,
  upsertVenue,
  deleteVenue,
  getVenueStats,
  type Venue,
} from "@/lib/venueStore";
import { loadEvents } from "@/lib/eventStore";
import { formatCurrency } from "@/lib/utils";
import { useCloudSync } from "@/hooks/useCloudSync";

const input =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

const EMPTY_FORM = {
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
  instagramHandle: "",
  instagramFollowing: false,
  notes: "",
};

export default function PropertiesPage() {
  const [venues, setVenues] = useState<Venue[]>(() => loadVenues());
  const [events, setEvents] = useState(() => loadEvents());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useCloudSync(() => {
    setVenues(loadVenues());
    setEvents(loadEvents());
  });

  const statsFor = (venue: Venue) => getVenueStats(venue.name, events);

  const sorted = [...venues].sort((a, b) => {
    const sa = statsFor(a);
    const sb = statsFor(b);
    if (sb.completedCount !== sa.completedCount) return sb.completedCount - sa.completedCount;
    return a.name.localeCompare(b.name);
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (v: Venue) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      streetNumber: v.streetNumber,
      streetName: v.streetName,
      apt: v.apt,
      city: v.city,
      state: v.state,
      zip: v.zip,
      formattedAddress: v.formattedAddress,
      lat: v.lat ? String(v.lat) : "",
      lng: v.lng ? String(v.lng) : "",
      defaultStartTime: v.defaultStartTime,
      defaultCategory: v.defaultCategory,
      logoUrl: v.logoUrl,
      logoMediaId: v.logoMediaId,
      logoW: v.logoW,
      logoH: v.logoH,
      instagramHandle: v.instagramHandle || "",
      instagramFollowing: v.instagramFollowing || false,
      notes: v.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Venue name is required");
      return;
    }
    let mediaId = form.logoMediaId.trim();
    if (!mediaId && form.logoUrl.includes("wixstatic.com/media/")) {
      mediaId = form.logoUrl.split("/media/")[1]?.split("?")[0] ?? "";
    }
    const venue = upsertVenue({
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      streetNumber: form.streetNumber.trim(),
      streetName: form.streetName.trim(),
      apt: form.apt.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      formattedAddress: form.formattedAddress.trim(),
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      defaultStartTime: form.defaultStartTime,
      defaultCategory: form.defaultCategory,
      logoUrl: form.logoUrl.trim(),
      logoMediaId: mediaId,
      logoW: form.logoW,
      logoH: form.logoH,
      instagramHandle: form.instagramHandle.trim() || undefined,
      instagramFollowing: form.instagramFollowing,
      notes: form.notes.trim() || undefined,
    });
    setVenues(loadVenues());
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    toast.success(`Venue "${venue.name}" saved`);
  };

  const handleDelete = (v: Venue) => {
    deleteVenue(v.id);
    setVenues(loadVenues());
    toast(`Deleted "${v.name}"`);
  };

  const toggleInstagram = (v: Venue) => {
    upsertVenue({ ...v, instagramFollowing: !v.instagramFollowing });
    setVenues(loadVenues());
  };

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">Venues</h1>
          <p className="text-sm text-muted-foreground font-body mt-2">
            Your address book — publishing details, Instagram, and hosting activity in one place
          </p>
        </div>
        <button
          onClick={showForm ? () => setShowForm(false) : openAdd}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-2.5 sm:px-3 py-2 sm:py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all shrink-0"
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Add Venue</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-lg bg-accent/8 border border-accent/20 p-5 space-y-3">
          <h3 className="font-body font-semibold text-foreground">{editingId ? "Edit venue" : "Add venue"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Venue name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            <select className={input} value={form.defaultCategory} onChange={e => setForm({ ...form, defaultCategory: e.target.value as Venue["defaultCategory"] })}>
              <option value="Pop Up">Pop Up</option>
              <option value="Grab & Go">Grab & Go</option>
              <option value="Market">Market</option>
              <option value="Private Event">Private Event</option>
            </select>
            <input className={input} placeholder="Full address (e.g. 711 E Morehead St, Charlotte, NC 28203, USA)" value={form.formattedAddress} onChange={e => setForm({ ...form, formattedAddress: e.target.value })} />
            <div className="flex gap-2">
              <input className={input} placeholder="Street #" value={form.streetNumber} onChange={e => setForm({ ...form, streetNumber: e.target.value })} />
              <input className={input} placeholder="Street name" value={form.streetName} onChange={e => setForm({ ...form, streetName: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <input className={input} placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              <input className={input} placeholder="State" maxLength={2} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              <input className={input} placeholder="ZIP" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <input className={input} placeholder="Latitude (for Wix map)" type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
              <input className={input} placeholder="Longitude" type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
            </div>
            <input className={input} type="time" value={form.defaultStartTime} onChange={e => setForm({ ...form, defaultStartTime: e.target.value })} />
            <input className={input} placeholder="Logo URL (optional — upload at publish time)" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} />
            <input className={input} placeholder="Instagram handle (optional)" value={form.instagramHandle} onChange={e => setForm({ ...form, instagramHandle: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <input type="checkbox" checked={form.instagramFollowing} onChange={e => setForm({ ...form, instagramFollowing: e.target.checked })} className="w-4 h-4 rounded border-border" />
            <span className="text-sm font-body text-foreground">Following on Instagram</span>
          </label>
          <textarea className={input} placeholder="Notes (optional)" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <p className="text-xs font-body text-muted-foreground">
            Address, lat/lng, and a logo are only needed to publish this venue to Wix — you can add a venue with just a name for relationship tracking.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all">
              {editingId ? "Update Venue" : "Add Venue"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }} className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-lg bg-muted/20 p-8 text-center">
          <p className="font-body text-muted-foreground">No venues yet. Add your first to start tracking.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sorted.map(venue => {
            const stats = statsFor(venue);
            return (
              <div key={venue.id} className="rounded-lg bg-muted/20 p-4 sm:p-6 hover:bg-muted/30 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-body font-semibold text-foreground text-base">{venue.name}</h3>
                    {venue.formattedAddress && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-body mt-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{venue.formattedAddress}</span>
                      </div>
                    )}
                    <p className="text-[11px] font-body text-muted-foreground/70 mt-0.5">
                      {venue.defaultCategory} · {venue.defaultStartTime}
                      {(!venue.lat || !venue.lng) && " · no geocode"}
                      {!venue.logoUrl && " · no photo"}
                    </p>
                  </div>
                  <div className="flex items-center shrink-0">
                    <button onClick={() => openEdit(venue)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors" aria-label={`Edit ${venue.name}`}>
                      <Pencil size={16} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleDelete(venue)} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label={`Delete ${venue.name}`}>
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10">
                    <Zap size={14} className="text-accent" />
                    <span className="text-sm font-body font-semibold text-foreground">
                      {stats.completedCount} {stats.completedCount === 1 ? "event" : "events"}
                    </span>
                  </div>
                  {stats.totalRevenue > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30">
                      <Coffee size={14} className="text-muted-foreground" />
                      <span className="text-sm font-body font-semibold text-foreground">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                  )}
                  {stats.lastEventDate && (
                    <div className="flex items-center px-3 py-2 rounded-lg bg-muted/30">
                      <span className="text-xs font-body text-muted-foreground">
                        Last: {new Date(stats.lastEventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {venue.instagramFollowing ? (
                    <button onClick={() => toggleInstagram(venue)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-body text-sm font-semibold" title="Click to unfollow">
                      <Instagram size={14} /> Following
                    </button>
                  ) : venue.instagramHandle ? (
                    <button onClick={() => toggleInstagram(venue)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-colors font-body text-sm font-semibold" title="Click to follow">
                      <Instagram size={14} /> {venue.instagramHandle}
                    </button>
                  ) : null}
                </div>

                {venue.notes && <p className="text-xs text-muted-foreground font-body italic">{venue.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
