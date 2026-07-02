// Geocode a US street address to { lat, lng }. Used to auto-create publishable
// venues from Wix bookings (which carry only a text address) and to fill the
// lat/lng fields in the venue form. No API key required: the US Census geocoder
// is free and accurate for US addresses; OpenStreetMap/Nominatim is a fallback.

interface GeoResult {
  lat: number;
  lng: number;
  source: "census" | "nominatim";
}

async function geocodeCensus(address: string): Promise<GeoResult | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const match = json?.result?.addressMatches?.[0]?.coordinates;
  if (!match || typeof match.x !== "number" || typeof match.y !== "number") return null;
  return { lat: match.y, lng: match.x, source: "census" };
}

async function geocodeNominatim(address: string): Promise<GeoResult | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TinyTulipCoffeeConsole/1.0 (venue geocoding)" },
  });
  if (!res.ok) return null;
  const arr = await res.json();
  const first = Array.isArray(arr) ? arr[0] : null;
  if (!first) return null;
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, source: "nominatim" };
}

export default async function handler(request: Request): Promise<Response> {
  const address = new URL(request.url).searchParams.get("address")?.trim();
  if (!address) {
    return Response.json({ error: "Missing address parameter" }, { status: 400 });
  }

  try {
    const result = (await geocodeCensus(address)) ?? (await geocodeNominatim(address));
    if (!result) {
      return Response.json({ error: "No match found", address }, { status: 404 });
    }
    return Response.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
