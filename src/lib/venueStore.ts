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
    if (!byId.has(id)) {
      byId.set(id, {
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
      });
    }
  }

  saveVenues(Array.from(byId.values()));
}

export function findVenueByName(name: string): Venue | undefined {
  const normalized = name.trim().toLowerCase();
  return loadVenues().find(v => v.name.toLowerCase() === normalized);
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
  venueName: string,
  events: Array<{ location: string; status: string; dateStart: string; estimatedRevenue?: number }>
): VenueEventStats {
  const norm = venueName.trim().toLowerCase();
  const matched = events.filter(
    e => (e.location || "").trim().toLowerCase() === norm && e.status !== "cancelled"
  );
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
