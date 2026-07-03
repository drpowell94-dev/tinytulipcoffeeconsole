import { loadJSON, saveJSON } from "./storage";
import rawSeed from "@/data/venues-seed.json";

export interface Venue {
  id: string;
  name: string;
  streetNumber: string;
  streetName: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
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

const VENUES_KEY = "tt-venues";

export function nameToVenueId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function loadVenues(): Venue[] {
  return loadJSON<Venue[]>(VENUES_KEY, []);
}

function saveVenues(venues: Venue[]): void {
  saveJSON(VENUES_KEY, venues);
}

export function seedVenues(): void {
  const existing = loadVenues();
  const byId = new Map(existing.map(v => [v.id, v]));

  for (const raw of rawSeed) {
    const id = nameToVenueId(raw.name);
    const fromSeed: Venue = {
      id,
      name: raw.name,
      streetNumber: raw.street_number,
      streetName: raw.street_name,
      apt: raw.apt,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      formattedAddress: raw.formatted_address,
      lat: raw.lat,
      lng: raw.lng,
      defaultStartTime: raw.default_start_time,
      defaultCategory: raw.default_category as Venue["defaultCategory"],
      logoMediaId: raw.logo_media_id,
      logoUrl: raw.logo_url,
      logoW: raw.logo_w,
      logoH: raw.logo_h,
    };

    const current = byId.get(id);
    if (!current) {
      byId.set(id, fromSeed);
    } else {
      // Backfill publishing details the seed now provides but the stored venue
      // is missing (e.g. venues added blank in a prior release). Never overwrite
      // a non-empty stored value, and never touch CRM fields (IG/notes).
      byId.set(id, {
        ...current,
        formattedAddress: current.formattedAddress || fromSeed.formattedAddress,
        streetNumber: current.streetNumber || fromSeed.streetNumber,
        streetName: current.streetName || fromSeed.streetName,
        city: current.city || fromSeed.city,
        state: current.state || fromSeed.state,
        zip: current.zip || fromSeed.zip,
        lat: current.lat || fromSeed.lat,
        lng: current.lng || fromSeed.lng,
        logoUrl: current.logoUrl || fromSeed.logoUrl,
        logoMediaId: current.logoMediaId || fromSeed.logoMediaId,
        logoW: current.logoW || fromSeed.logoW,
        logoH: current.logoH || fromSeed.logoH,
      });
    }
  }

  saveVenues(Array.from(byId.values()));
}

// The old fake sample apartments that used to be seeded into Properties. They
// get purged from venues so only real places remain.
const SAMPLE_PROPERTY_NAMES = new Set([
  "the retreat at southend",
  "dilworth lofts",
  "south end apartments",
  "uptown place",
  "noda lofts",
]);

/** Remove the fake seeded sample properties from the venue list (idempotent). */
export function purgeSampleVenues(): void {
  const all = loadVenues();
  const kept = all.filter(v => !SAMPLE_PROPERTY_NAMES.has(v.name.trim().toLowerCase()));
  if (kept.length !== all.length) saveVenues(kept);
}

export function findVenueByName(name: string): Venue | undefined {
  const normalized = name.trim().toLowerCase();
  return loadVenues().find(v => v.name.toLowerCase() === normalized);
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
  venues: Venue[] = loadVenues()
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

/**
 * Create (and persist) a venue from a geocoded address — used to auto-add a
 * booking's venue to the address book when it isn't there yet. Keyed by name,
 * so re-running is idempotent.
 */
export function createVenueFromAddress(opts: {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  defaultCategory?: Venue["defaultCategory"];
  defaultStartTime?: string;
}): Venue {
  const p = parseAddress(opts.formattedAddress);
  return upsertVenue({
    name: opts.name.trim(),
    streetNumber: p.streetNumber,
    streetName: p.streetName,
    apt: p.apt,
    city: p.city,
    state: p.state,
    zip: p.zip,
    formattedAddress: opts.formattedAddress.trim(),
    lat: opts.lat,
    lng: opts.lng,
    defaultStartTime: opts.defaultStartTime || "09:00",
    defaultCategory: opts.defaultCategory || "Pop Up",
    logoMediaId: "",
    logoUrl: "",
    logoW: 1200,
    logoH: 630,
  });
}

export function upsertVenue(data: Omit<Venue, "id"> & { id?: string }): Venue {
  const id = data.id ?? nameToVenueId(data.name);
  const venue: Venue = { ...data, id };
  const venues = loadVenues();
  const idx = venues.findIndex(v => v.id === id);
  if (idx >= 0) {
    venues[idx] = venue;
  } else {
    venues.push(venue);
  }
  saveVenues(venues);
  return venue;
}

export function deleteVenue(id: string): void {
  saveVenues(loadVenues().filter(v => v.id !== id));
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

/**
 * One-time fold of the legacy Properties list into venues (keyed by name):
 * existing venues gain the property's Instagram/notes; property-only entries
 * become CRM venues (address/geocode blank until filled in). Idempotent.
 */
export function migratePropertiesToVenues(
  properties: Array<{ name: string; address?: string; zipCode?: string; instagramHandle?: string; instagramFollowing?: boolean; notes?: string }>
): void {
  if (!properties || properties.length === 0) return;
  const byName = new Map(loadVenues().map(v => [v.name.trim().toLowerCase(), v]));

  for (const p of properties) {
    if (!p.name?.trim()) continue;
    const existing = byName.get(p.name.trim().toLowerCase());
    if (existing) {
      // Merge CRM fields onto the venue only where it's missing them.
      const needsMerge =
        (p.instagramHandle && !existing.instagramHandle) ||
        (p.instagramFollowing && !existing.instagramFollowing) ||
        (p.notes && !existing.notes);
      if (needsMerge) {
        upsertVenue({
          ...existing,
          instagramHandle: existing.instagramHandle || p.instagramHandle,
          instagramFollowing: existing.instagramFollowing || p.instagramFollowing,
          notes: existing.notes || p.notes,
        });
      }
    } else {
      upsertVenue({
        name: p.name.trim(),
        streetNumber: "",
        streetName: "",
        apt: "",
        city: "Charlotte",
        state: "NC",
        zip: p.zipCode || "",
        formattedAddress: p.address || "",
        lat: 0,
        lng: 0,
        defaultStartTime: "09:00",
        defaultCategory: "Pop Up",
        logoMediaId: "",
        logoUrl: "",
        logoW: 1200,
        logoH: 630,
        instagramHandle: p.instagramHandle,
        instagramFollowing: p.instagramFollowing,
        notes: p.notes,
      });
    }
  }
}
