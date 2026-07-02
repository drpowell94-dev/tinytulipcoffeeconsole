const GEOCODE_TIMEOUT_MS = 10000;

/**
 * Geocode a street address to { lat, lng } via the serverless /api/geocode
 * route (US Census with an OpenStreetMap fallback). Best-effort: returns null
 * on any failure (including a stalled request) so callers — like the booking
 * sync, which awaits this per address — can degrade gracefully instead of
 * hanging indefinitely.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      return { lat: data.lat, lng: data.lng };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
