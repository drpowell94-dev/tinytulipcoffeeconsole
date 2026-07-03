// Force the Edge runtime — see api/wix-sync.ts for why this matters. This is
// also what caused the isSameOrigin check added recently to throw
// (`request.headers.get is not a function`): under the legacy Node calling
// convention this file was actually running under, `request` isn't a
// Web-standard Request at all.
export const config = { runtime: "edge" };

const WIX_API_KEY = process.env.WIX_API_KEY ?? "";
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? "";
const WIX_BASE = "https://www.wixapis.com";

interface VenuePayload {
  name: string;
  streetNumber: string;
  streetName: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  defaultStartTime: string;
  logoMediaId: string;
  logoUrl: string;
  logoW: number;
  logoH: number;
}

interface EventPayload {
  id: string;
  name: string;
  eventType: string;
  dateStart: string;
  notes?: string;
  wixEventId?: string;
  wixPublishedEventId?: string;
}

interface ConvertBody {
  event: EventPayload;
  venue: VenuePayload;
}

const EVENT_TYPE_TO_CATEGORY: Record<string, string> = {
  popup: "Pop Up",
  farmers_market: "Grab & Go",
  catering: "Private Event",
  other: "Pop Up",
};

const NY_TIME_ZONE = "America/New_York";

// Convert a wall-clock time in America/New_York to the correct UTC instant,
// DST-aware, without pulling in a new dependency. Native Intl.DateTimeFormat
// can report the actual offset in effect for a given date, so we build a
// first guess assuming UTC, ask Intl what NY's offset was at that instant,
// then correct — this converges in one pass except right at a DST
// transition edge, where a second pass guarantees correctness.
export function nyWallClockToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const offsetMinutesAt = (utcGuess: Date): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: NY_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(utcGuess);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return (asUtc - utcGuess.getTime()) / 60000;
  };

  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutesAt(utc);
    utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 60000);
  }
  return utc;
}

// event.dateStart may or may not carry a real time. Events created without an
// explicit time are stored at UTC midnight for the given day — detect that
// and fall back to the venue's default start time (or 9am ET) so we always
// build a valid dateAndTimeSettings instead of publishing a bogus midnight
// start, or worse, failing validation entirely.
export function resolveStartDate(dateStart: string, venueDefaultStartTime: string | undefined): Date | null {
  const raw = new Date(dateStart);
  if (isNaN(raw.getTime())) return null;

  const isTimeless = raw.getUTCHours() === 0 && raw.getUTCMinutes() === 0 && raw.getUTCSeconds() === 0;
  if (!isTimeless) return raw;

  const [hourStr, minuteStr] = (venueDefaultStartTime || "09:00").split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (isNaN(hour) || isNaN(minute)) {
    return nyWallClockToUtc(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate(), 9, 0);
  }
  return nyWallClockToUtc(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate(), hour, minute);
}

async function wixFetch(path: string, method: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${WIX_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(`Wix ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function resolveCategoryId(label: string): Promise<string | undefined> {
  try {
    const data = await wixFetch("/events/v1/categories", "GET") as { categories?: Array<{ id: string; name: string }> };
    const match = (data.categories ?? []).find(c => c.name === label);
    if (match) return match.id;

    const created = await wixFetch("/events/v1/categories", "POST", { category: { name: label } }) as { category?: { id: string } };
    return created.category?.id;
  } catch {
    return undefined;
  }
}

// Reject requests that didn't originate from this app. This isn't real auth —
// the app has none yet — but it stops automated scanners/scripts from hitting
// this write endpoint directly and spamming events onto the live Wix site.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!isSameOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!WIX_API_KEY || !WIX_SITE_ID) {
    return Response.json({ error: "Wix credentials not configured on server" }, { status: 500 });
  }

  let body: ConvertBody;
  try {
    body = await request.json() as ConvertBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event, venue } = body;

  if (!event?.name || !event?.dateStart || !venue?.formattedAddress) {
    return Response.json({ error: "Missing required fields: event.name, event.dateStart, venue.formattedAddress" }, { status: 400 });
  }

  const startDate = resolveStartDate(event.dateStart, venue.defaultStartTime);
  if (!startDate) {
    return Response.json({ error: "Set a date before publishing" }, { status: 400 });
  }

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const categoryLabel = EVENT_TYPE_TO_CATEGORY[event.eventType] ?? "Pop Up";
  const categoryId = await resolveCategoryId(categoryLabel);

  const streetAddress: Record<string, string> = {
    name: venue.streetName,
    number: venue.streetNumber,
  };
  if (venue.apt) streetAddress.apt = venue.apt;

  const wixEvent: Record<string, unknown> = {
    title: event.name,
    shortDescription: "",
    dateAndTimeSettings: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timeZoneId: NY_TIME_ZONE,
      recurrenceStatus: "ONE_TIME",
    },
    location: {
      name: venue.name,
      type: "VENUE",
      address: {
        formattedAddress: venue.formattedAddress,
        streetAddress,
        city: venue.city,
        subdivision: `US-${venue.state}`,
        country: "US",
        postalCode: venue.zip,
        geocode: { lat: venue.lat, lng: venue.lng },
      },
    },
    mainImage: {
      id: venue.logoMediaId,
      url: venue.logoUrl,
      width: venue.logoW,
      height: venue.logoH,
    },
    registration: {
      initialType: "RSVP",
      registrationDisabled: true,
    },
    ...(categoryId ? { categories: [{ id: categoryId }] } : {}),
  };

  // A "wix-booking:"-prefixed wixEventId is this app's own Bookings sync
  // tracking key, not a real Wix Events GUID — sending it to the Events API
  // fails validation ("id is not a valid GUID"). Only treat wixEventId as an
  // existing Wix Events record when it isn't that sync marker; otherwise this
  // event has never actually been published to Wix Events yet.
  const existingWixEventsId =
    event.wixPublishedEventId ||
    (event.wixEventId && !event.wixEventId.startsWith("wix-booking:") ? event.wixEventId : undefined);

  try {
    let wixEventId: string;

    if (existingWixEventsId) {
      const updated = await wixFetch(`/events/v3/events/${existingWixEventsId}`, "PATCH", { event: wixEvent }) as { event?: { id: string } };
      wixEventId = updated.event?.id ?? existingWixEventsId;
    } else {
      const created = await wixFetch("/events/v3/events", "POST", { event: wixEvent }) as { event?: { id: string } };
      wixEventId = created.event?.id ?? "";

      if (!wixEventId) {
        return Response.json({ error: "Wix did not return event ID", raw: created }, { status: 502 });
      }

      await wixFetch(`/events/v3/events/${wixEventId}/publish`, "POST");
    }

    return Response.json({ wixEventId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Wix publish failed. Request body sent:", JSON.stringify({ event: wixEvent }));
    console.error("Wix error:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
