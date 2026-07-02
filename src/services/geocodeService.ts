/**
 * Geocode a street address to { lat, lng } via the serverless /api/geocode
 * route (US Census with an OpenStreetMap fallback). Best-effort: returns null
 * on any failure so callers can degrade gracefully.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      return { lat: data.lat, lng: data.lng };
    }
    return null;
  } catch {
    return null;
  }
}
