import { uid, saveJSON } from "./storage";

export interface Property {
  id: string;
  name: string;
  category: "charlotte_apartment" | "other_venue";
  address?: string;
  zipCode?: string;
  instagramHandle?: string;
  instagramFollowing: boolean;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = "tiny_tulip_properties";

export function loadProperties(): Property[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProperties(properties: Property[]): void {
  saveJSON(STORAGE_KEY, properties);
}

export function createProperty(
  name: string,
  category: "charlotte_apartment" | "other_venue" = "other_venue",
  data?: Partial<Property>
): Property {
  const property: Property = {
    id: uid(),
    name,
    category,
    address: data?.address,
    zipCode: data?.zipCode,
    instagramHandle: data?.instagramHandle,
    instagramFollowing: data?.instagramFollowing ?? false,
    notes: data?.notes,
    createdAt: new Date().toISOString(),
  };
  const properties = loadProperties();
  properties.push(property);
  saveProperties(properties);
  return property;
}

export function updateProperty(id: string, updates: Partial<Property>): Property | null {
  const properties = loadProperties();
  const idx = properties.findIndex(p => p.id === id);
  if (idx === -1) return null;
  properties[idx] = { ...properties[idx], ...updates };
  saveProperties(properties);
  return properties[idx];
}

export function deleteProperty(id: string): void {
  const properties = loadProperties().filter(p => p.id !== id);
  saveProperties(properties);
}

export function getCharlotteApartments(): Property[] {
  return loadProperties().filter(p => p.category === "charlotte_apartment");
}

export function getInstagramFollowsWithoutBooking(eventVenues: string[]): Property[] {
  const properties = loadProperties();
  return properties.filter(
    p => p.instagramFollowing && !eventVenues.includes(p.id)
  );
}
