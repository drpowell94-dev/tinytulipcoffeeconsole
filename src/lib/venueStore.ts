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
