import { useState } from "react";
import { Plus, Trash2, MapPin, Instagram, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  loadProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getCharlotteApartments,
  type Property,
} from "@/lib/propertyStore";
import { loadEvents } from "@/lib/eventStore";
import { cn } from "@/lib/utils";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>(() => getCharlotteApartments());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    zipCode: "",
    instagramHandle: "",
    instagramFollowing: false,
    notes: "",
  });

  const allEvents = loadEvents();

  const getEventCountForProperty = (propertyId: string): number => {
    return allEvents.filter(e => e.propertyId === propertyId && e.status === "completed").length;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Property name is required");
      return;
    }
    createProperty(form.name.trim(), "charlotte_apartment", {
      address: form.address.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined,
      instagramHandle: form.instagramHandle.trim() || undefined,
      instagramFollowing: form.instagramFollowing,
      notes: form.notes.trim() || undefined,
    });
    setProperties(getCharlotteApartments());
    setForm({ name: "", address: "", zipCode: "", instagramHandle: "", instagramFollowing: false, notes: "" });
    setShowForm(false);
    toast.success(`"${form.name}" added`);
  };

  const handleDelete = (property: Property) => {
    deleteProperty(property.id);
    setProperties(getCharlotteApartments());
    toast(`Deleted "${property.name}"`);
  };

  const handleToggleInstagram = (property: Property) => {
    updateProperty(property.id, { instagramFollowing: !property.instagramFollowing });
    setProperties(getCharlotteApartments());
  };

  const input =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

  const sortedProperties = properties.sort((a, b) => {
    const countA = getEventCountForProperty(a.id);
    const countB = getEventCountForProperty(b.id);
    return countB - countA;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">Charlotte Apartments</h1>
          <p className="text-sm text-muted-foreground font-body mt-2">Track properties and hosting activity</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-2.5 sm:px-3 py-2 sm:py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all shrink-0"
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Add Property</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg bg-accent/8 border border-accent/20 p-5 space-y-3">
          <h3 className="font-body font-semibold text-foreground">Add New Property</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              className={input}
              placeholder="Property name (e.g. The Retreat at Southend) *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <input
              className={input}
              placeholder="Address (optional)"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
            <input
              className={input}
              placeholder="ZIP code (optional)"
              value={form.zipCode}
              onChange={e => setForm({ ...form, zipCode: e.target.value })}
              maxLength={5}
            />
            <input
              className={input}
              placeholder="Instagram handle (optional)"
              value={form.instagramHandle}
              onChange={e => setForm({ ...form, instagramHandle: e.target.value })}
            />
            <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={form.instagramFollowing}
                onChange={e => setForm({ ...form, instagramFollowing: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-body text-foreground">Following on Instagram</span>
            </label>
            <textarea
              className={input}
              placeholder="Notes (optional)"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-accent text-accent-foreground px-4 py-2 font-body font-semibold text-sm hover-scale active:scale-95 transition-all"
              >
                Add Property
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm({ name: "", address: "", zipCode: "", instagramHandle: "", instagramFollowing: false, notes: "" });
                }}
                className="rounded-lg bg-muted/50 px-4 py-2 font-body font-semibold text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {sortedProperties.length === 0 ? (
        <div className="rounded-lg bg-muted/20 p-8 text-center">
          <p className="font-body text-muted-foreground">No properties yet. Add your first Charlotte apartment to start tracking.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedProperties.map(property => {
            const eventCount = getEventCountForProperty(property.id);
            return (
              <div
                key={property.id}
                className="rounded-lg bg-muted/20 p-4 sm:p-6 hover:bg-muted/30 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-body font-semibold text-foreground text-base">{property.name}</h3>
                    {property.address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-body mt-1">
                        <MapPin size={12} />
                        {property.address}
                        {property.zipCode && `, ${property.zipCode}`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(property)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    aria-label={`Delete ${property.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {/* Event count badge */}
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10">
                    <Zap size={14} className="text-accent" />
                    <span className="text-sm font-body font-semibold text-foreground">
                      {eventCount} {eventCount === 1 ? "event" : "events"}
                    </span>
                  </div>

                  {/* Instagram follow status */}
                  {property.instagramFollowing && (
                    <button
                      onClick={() => handleToggleInstagram(property)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-body text-sm font-semibold"
                      title="Click to unfollow"
                    >
                      <Instagram size={14} />
                      Following
                    </button>
                  )}
                  {!property.instagramFollowing && property.instagramHandle && (
                    <button
                      onClick={() => handleToggleInstagram(property)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-colors font-body text-sm font-semibold"
                      title="Click to follow"
                    >
                      <Instagram size={14} />
                      {property.instagramHandle}
                    </button>
                  )}
                </div>

                {property.notes && (
                  <p className="text-xs text-muted-foreground font-body italic">{property.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
