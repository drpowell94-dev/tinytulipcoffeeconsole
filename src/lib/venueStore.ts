import { supabase } from "@/services/supabase";

export interface Venue {
  id: string;
  name: string;
  streetNumber: string;
  streetName: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  /**
   * Full display address. coffee.venues has no single "formatted address"
   * column - this is derived from the structured street/city/state/zip
   * fields on every read (and ignored on write), instead of round-tripping
   * the original free-text string Wix/geocoding produced.
   */
  formattedAddress: string;
  lat: number;
  lng: number;
  defaultStartTime: string;
  defaultCategory: "Pop Up" | "Grab & Go" | "Market" | "Private Event";
  logoMediaId: string;
  logoUrl: string;
  logoW: number;
  logoH: number;
  /** CRM fields (folded in from the old Properties list). */
  instagramHandle?: string;
  instagramFollowing?: boolean;
  notes?: string;
  /** Property manager / point of contact at this venue. */
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function nameToVenueId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Reconstruct a display address from the structured fields (see Venue.formattedAddress).
 * Matches the original Wix-emitted convention this app's own docs describe
 * ("650 E Brooklyn Vlg Ave, Charlotte, NC 28202, USA" / apt-prefixed forms
 * like "The ellis apt, 512 N College St, Charlotte, NC 28202, USA") - apt
 * (when present) leads, followed by street, city, state+zip, and a trailing
 * "USA". This string is sent verbatim to Wix as `location.address.formattedAddress`
 * when publishing an event (see api/wix-convert.ts), so it's not purely
 * cosmetic inside this app - it's what shows up on the public Wix listing. */
function buildFormattedAddress(v: { apt?: string; streetNumber?: string; streetName?: string; city?: string; state?: string; zip?: string }): string {
  const street = [v.streetNumber, v.streetName].filter(Boolean).join(" ");
  const stateZip = [v.state, v.zip].filter(Boolean).join(" ");
  const parts = [v.apt, street, v.city, stateZip].filter(Boolean);
  if (parts.length === 0) return "";
  return `${parts.join(", ")}, USA`;
}

interface VenueRow {
  id: string;
  name: string;
  street_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  apt: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  logo_media_id: string | null;
  logo_w: number | null;
  logo_h: number | null;
  instagram_handle: string | null;
  instagram_following: boolean | null;
  notes: string | null;
  default_category: string | null;
  default_start_time: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

function rowToVenue(row: VenueRow): Venue {
  const base = {
    streetNumber: row.street_number ?? "",
    streetName: row.street_name ?? "",
    apt: row.apt ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
  };
  return {
    id: row.id,
    name: row.name,
    ...base,
    formattedAddress: buildFormattedAddress(base),
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    defaultStartTime: row.default_start_time ?? "09:00",
    defaultCategory: (row.default_category as Venue["defaultCategory"]) ?? "Pop Up",
    logoMediaId: row.logo_media_id ?? "",
    logoUrl: row.logo_url ?? "",
    logoW: row.logo_w ?? 1200,
    logoH: row.logo_h ?? 630,
    instagramHandle: row.instagram_handle ?? undefined,
    instagramFollowing: row.instagram_following ?? false,
    notes: row.notes ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
  };
}

/** Venue -> row payload for insert/update. `formattedAddress` has no column and is never sent. */
function venueToRow(v: Omit<Venue, "id">): Record<string, unknown> {
  return {
    name: v.name,
    street_number: v.streetNumber,
    street_name: v.streetName,
    apt: v.apt,
    city: v.city,
    state: v.state,
    zip: v.zip,
    lat: v.lat,
    lng: v.lng,
    default_start_time: v.defaultStartTime,
    default_category: v.defaultCategory,
    logo_media_id: v.logoMediaId,
    logo_url: v.logoUrl,
    logo_w: v.logoW,
    logo_h: v.logoH,
    instagram_handle: v.instagramHandle ?? null,
    instagram_following: v.instagramFollowing ?? false,
    notes: v.notes ?? null,
    contact_name: v.contactName ?? null,
    contact_email: v.contactEmail ?? null,
    contact_phone: v.contactPhone ?? null,
  };
}

export async function loadVenues(): Promise<Venue[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.schema("coffee").from("venues").select("*").order("name");
  if (error) {
    console.warn("[venueStore] load failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToVenue);
}

/** Find a venue by exact (case-insensitive) name in an already-loaded list. */
export function findVenueByName(name: string, venues: Venue[]): Venue | undefined {
  const normalized = name.trim().toLowerCase();
  return venues.find(v => v.name.toLowerCase() === normalized);
}

// Common US street abbreviations, normalized so "650 E Brooklyn Vlg Ave" and
// "650 East Brooklyn Village Avenue, Charlotte, NC 28202, USA" compare equal.
const STREET_ABBREV: Record<string, string> = {
  ave: "avenue", av: "avenue", st: "street", str: "street", blvd: "boulevard",
  dr: "drive", ln: "lane", rd: "road", ct: "court", pl: "place", sq: "square",
  ter: "terrace", pkwy: "parkway", hwy: "highway", vlg: "village", cir: "circle",
  e: "east", w: "west", n: "north", s: "south",
  ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest",
};

/**
 * Canonical key for the *street* portion of an address (everything before the
 * first comma), with abbreviations expanded and punctuation/country/zip noise
 * dropped. Used to match events to venues regardless of how the address was
 * typed or formatted by Wix. Returns "" for a blank or name-only string.
 */
export function streetKey(input?: string): string {
  if (!input) return "";
  const street = input.split(",")[0];
  const cleaned = street.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(t => STREET_ABBREV[t] ?? t);
  // Only treat it as an address key if it actually contains a street number;
  // a bare venue name ("Savoy") must not accidentally match another venue.
  if (!tokens.some(t => /\d/.test(t))) return "";
  return tokens.join(" ").trim();
}

/**
 * The one venue resolver used everywhere (publish, sync, stats). Tries, in
 * priority order:
 *   1. an explicit venueId stamped on the event,
 *   2. an exact venue-name match (event.location or event.name),
 *   3. a normalized street-address match (event.address or event.location).
 * This replaces the old name-only lookup that failed whenever an event's
 * location held a street address instead of the venue's name.
 */
export function resolveVenue(
  ev: { venueId?: string; location?: string; name?: string; address?: string },
  venues: Venue[]
): Venue | undefined {
  if (ev.venueId) {
    const byId = venues.find(v => v.id === ev.venueId);
    if (byId) return byId;
  }

  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const nameKeys = [ev.location, ev.name].map(norm).filter(Boolean);
  const byName = venues.find(v => nameKeys.includes(norm(v.name)));
  if (byName) return byName;

  const addrKeys = [ev.address, ev.location].map(streetKey).filter(Boolean);
  if (addrKeys.length === 0) return undefined;
  return venues.find(v => {
    const venueKeys = [
      streetKey(v.formattedAddress),
      streetKey(`${v.streetNumber} ${v.streetName}`),
    ].filter(Boolean);
    return venueKeys.some(k => addrKeys.includes(k));
  });
}

/**
 * Split a formatted US address into venue fields. Handles the shapes Wix emits:
 *   "650 E Brooklyn Vlg Ave, Charlotte, NC 28202, USA"
 *   "327 W Tremont Ave, Charlotte, NC, 28203, US"
 *   "The ellis apt, 512 N College St, Charlotte, NC 28202, USA"  (leading apt)
 */
export function parseAddress(formatted: string): {
  streetNumber: string; streetName: string; apt: string;
  city: string; state: string; zip: string;
} {
  const parts = formatted.split(",").map(s => s.trim()).filter(Boolean);
  let streetIdx = parts.findIndex(p => /^\d/.test(p));
  if (streetIdx === -1) streetIdx = 0;
  const street = parts[streetIdx] || "";
  const m = street.match(/^(\d+[a-z]?)\s+(.*)$/i);
  const rest = parts.slice(streetIdx + 2).join(" ");
  return {
    streetNumber: m ? m[1] : "",
    streetName: m ? m[2] : street,
    apt: streetIdx > 0 ? parts.slice(0, streetIdx).join(", ") : "",
    city: parts[streetIdx + 1] || "Charlotte",
    state: (rest.match(/\b([A-Z]{2})\b/) || [])[1] || "NC",
    zip: (rest.match(/\b(\d{5})\b/) || [])[1] || "",
  };
}

/** Build a venue from a geocoded address without persisting it — lets a
 * caller creating several new venues in one batch collect them and save
 * once via upsertVenues(), instead of one independent save per venue. */
export function buildVenueFromAddress(opts: {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  defaultCategory?: Venue["defaultCategory"];
  defaultStartTime?: string;
}): Venue {
  const p = parseAddress(opts.formattedAddress);
  const name = opts.name.trim();
  return {
    id: nameToVenueId(name),
    name,
    streetNumber: p.streetNumber,
    streetName: p.streetName,
    apt: p.apt,
    city: p.city,
    state: p.state,
    zip: p.zip,
    formattedAddress: buildFormattedAddress(p),
    lat: opts.lat,
    lng: opts.lng,
    defaultStartTime: opts.defaultStartTime || "09:00",
    defaultCategory: opts.defaultCategory || "Pop Up",
    logoMediaId: "",
    logoUrl: "",
    logoW: 1200,
    logoH: 630,
  };
}

/**
 * Create (and persist) a venue from a geocoded address — used to auto-add a
 * booking's venue to the address book when it isn't there yet. Keyed by name,
 * so re-running is idempotent. For creating several venues in one batch,
 * prefer buildVenueFromAddress() + upsertVenues() to avoid one save per item.
 */
export async function createVenueFromAddress(opts: {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  defaultCategory?: Venue["defaultCategory"];
  defaultStartTime?: string;
}): Promise<Venue> {
  return upsertVenue(buildVenueFromAddress(opts));
}

/**
 * Merge multiple venues into the store with a single batched upsert. Use this
 * instead of calling upsertVenue() in a loop, which would fire one independent
 * request per venue.
 */
export async function upsertVenues(list: Venue[]): Promise<void> {
  if (list.length === 0 || !supabase) return;
  const rows = list.map(v => ({ id: v.id, ...venueToRow(v) }));
  const { error } = await supabase.schema("coffee").from("venues").upsert(rows, { onConflict: "id" });
  if (error) console.warn("[venueStore] upsertVenues failed:", error.message);
}

export async function upsertVenue(data: Omit<Venue, "id"> & { id?: string }): Promise<Venue> {
  const id = data.id ?? nameToVenueId(data.name);
  const venue: Venue = { ...data, id };
  if (supabase) {
    const { error } = await supabase
      .schema("coffee")
      .from("venues")
      .upsert({ id, ...venueToRow(venue) }, { onConflict: "id" });
    if (error) console.warn("[venueStore] upsertVenue failed:", error.message);
  }
  return venue;
}

export async function deleteVenue(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.schema("coffee").from("venues").delete().eq("id", id);
  if (error) console.warn("[venueStore] deleteVenue failed:", error.message);
}

export interface VenueEventStats {
  /** Completed events at this venue. */
  completedCount: number;
  /** All non-cancelled events (past + upcoming) at this venue. */
  totalCount: number;
  /** Sum of estimated revenue across completed events. */
  totalRevenue: number;
  /** ISO date of the most recent event, if any. */
  lastEventDate?: string;
}

/**
 * Compute a venue's activity from the events list, matched by location name
 * (case-insensitive) — the same key events already use. This is what makes the
 * combined list reflect real bookings without a separate propertyId.
 */
export function getVenueStats(
  venue: { id?: string; name: string; formattedAddress?: string },
  events: Array<{ venueId?: string; name?: string; location: string; status: string; dateStart: string; estimatedRevenue?: number }>
): VenueEventStats {
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  // Prefer the stamped venueId (set at sync time); fall back to name/address
  // matching for events that predate stamping or were entered by hand. A
  // Wix-imported event stores the venue name in its title and the street
  // address in its location; a form-created event stores the venue name in both.
  const nameKeys = new Set([venue.name, venue.formattedAddress?.split(",")[0]].map(norm).filter(Boolean));
  const addrKeys = new Set([streetKey(venue.formattedAddress), streetKey(`${venue.name}`)].filter(Boolean));
  const matched = events.filter(e => {
    if (e.status === "cancelled") return false;
    if (venue.id && e.venueId) return e.venueId === venue.id;
    return (
      nameKeys.has(norm(e.name)) ||
      nameKeys.has(norm(e.location)) ||
      addrKeys.has(streetKey(e.location)) ||
      addrKeys.has(streetKey(e.name))
    );
  });
  const completed = matched.filter(e => e.status === "completed");
  return {
    completedCount: completed.length,
    totalCount: matched.length,
    totalRevenue: completed.reduce((s, e) => s + (e.estimatedRevenue || 0), 0),
    lastEventDate: matched.map(e => e.dateStart).sort().pop(),
  };
}
