// Geocode a US street address to { lat, lng }. Used to auto-create publishable
// venues from Wix bookings (which carry only a text address) and to fill the
// lat/lng fields in the venue form. No API key required: the US Census geocoder
// is free and accurate for US addresses; OpenStreetMap/Nominatim is a fallback.

interface GeoResult {
  lat: number;
  lng: number;
  source: "census" | "nominatim";
}

// Cap each upstream geocoder call so a stall fails fast instead of hanging
// until the platform kills the function. Census and Nominatim run
// sequentially (fallback on miss), so keep each short enough that the
// combined worst case stays well under Vercel's own function duration limit —
// AbortController alone isn't a reliable guarantee here (confirmed via
// wix-sync's runtime logs: hung upstream calls came back as a platform-level
// 504, meaning the abort didn't actually free up the function in time), so
// every call is raced against a hard timer that always resolves.
const GEOCODE_UPSTREAM_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const attempt = fetch(url, { ...init, signal: controller.signal });
  try {
    return await withTimeout(attempt, GEOCODE_UPSTREAM_TIMEOUT_MS, url);
  } finally {
    controller.abort();
  }
}

async function geocodeCensus(address: string): Promise<GeoResult | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const run = (async () => {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json();
    const match = json?.result?.addressMatches?.[0]?.coordinates;
    if (!match || typeof match.x !== "number" || typeof match.y !== "number") return null;
    return { lat: match.y, lng: match.x, source: "census" as const };
  })();
  return withTimeout(run, GEOCODE_UPSTREAM_TIMEOUT_MS, "Census geocode");
}

async function geocodeNominatim(address: string): Promise<GeoResult | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const run = (async () => {
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "TinyTulipCoffeeConsole/1.0 (venue geocoding)" },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    const first = Array.isArray(arr) ? arr[0] : null;
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, source: "nominatim" as const };
  })();
  return withTimeout(run, GEOCODE_UPSTREAM_TIMEOUT_MS, "Nominatim geocode");
}

export default async function handler(request: Request): Promise<Response> {
  const address = new URL(request.url).searchParams.get("address")?.trim();
  if (!address) {
    return Response.json({ error: "Missing address parameter" }, { status: 400 });
  }

  // Try Census first; if it errors, times out, or has no match, fall back to
  // Nominatim rather than failing the whole request.
  try {
    const result = (await geocodeCensus(address).catch(() => null)) ?? (await geocodeNominatim(address));
    if (!result) {
      return Response.json({ error: "No match found", address }, { status: 404 });
    }
    return Response.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
