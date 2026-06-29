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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
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

  const startDate = new Date(event.dateStart);
  if (isNaN(startDate.getTime())) {
    return Response.json({ error: "Invalid event.dateStart" }, { status: 400 });
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
    scheduling: {
      config: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timeZoneId: "America/New_York",
      },
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

  try {
    let wixEventId: string;

    if (event.wixEventId) {
      const updated = await wixFetch(`/events/v3/events/${event.wixEventId}`, "PATCH", { event: wixEvent }) as { event?: { id: string } };
      wixEventId = updated.event?.id ?? event.wixEventId;
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
    return Response.json({ error: message }, { status: 502 });
  }
}
