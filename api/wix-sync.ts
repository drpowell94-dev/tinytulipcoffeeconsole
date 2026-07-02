const WIX_API_KEY = process.env.WIX_API_KEY ?? "";
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? "";
const WIX_BASE = "https://www.wixapis.com";

interface OutEvent {
  id: string;
  wixEventId: string;
  name: string;
  eventType: string;
  dateStart: string;
  location: string;
  address?: string;
  preOrders: number;
  estimatedRevenue?: number;
  status: string;
  depositStatus: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

async function wixFetch(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${WIX_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Wix ${path} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function eventTypeFromTitle(title: string): string {
  const t = (title || "").toLowerCase();
  if (/grab\s*&?\s*go/.test(t)) return "farmers_market";
  if (/pop\s*-?\s*up/.test(t)) return "popup";
  if (/market/.test(t)) return "farmers_market";
  return "other";
}

function preOrdersFromChoice(choice?: string): number {
  const m = (choice || "").match(/(\d+)\s*coffees/i);
  return m ? parseInt(m[1], 10) : 0;
}

function revenueFromPreOrders(n: number): number | undefined {
  if (n <= 0) return undefined;
  if (n <= 25) return 200;
  if (n <= 30) return 300;
  if (n <= 50) return 500;
  return Math.round(n * 10);
}

/** Clean a Wix booking address/contact into a display venue name. */
function venueNameFrom(addr: string | undefined, contact: string): string {
  const a = (addr || "").trim();
  // A real street address → use its first segment; otherwise fall back to the
  // contact name (often the property/venue), then the raw address.
  if (a && /\d/.test(a) && a.includes(",")) {
    return a.split(",")[0].trim();
  }
  const c = (contact || "").trim();
  return c || a || "Booking";
}

export default async function handler(request: Request): Promise<Response> {
  if (!WIX_API_KEY || !WIX_SITE_ID) {
    return Response.json({ error: "Wix credentials not configured" }, { status: 500 });
  }

  try {
    // Pull all bookings (paginated).
    let offset = 0;
    const raw: any[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await wixFetch("/_api/bookings-reader/v2/extended-bookings/query", {
        query: { filter: {}, paging: { limit: 100, offset } },
      });
      const batch = res.extendedBookings ?? [];
      raw.push(...batch);
      const total = res.pagingMetadata?.total ?? raw.length;
      offset += batch.length;
      if (batch.length === 0 || raw.length >= total) break;
    }

    const now = Date.now();
    const events: OutEvent[] = raw
      .map(x => x.booking)
      .filter(Boolean)
      .map((b: any): OutEvent => {
        const slot = b.bookedEntity?.slot ?? {};
        const addr = slot.location?.formattedAddress as string | undefined;
        const contact = `${b.contactDetails?.firstName ?? ""} ${b.contactDetails?.lastName ?? ""}`.trim();
        const start = slot.startDate || b.startDate || b.createdDate;
        const preOrders = preOrdersFromChoice(b.participantsChoices?.serviceChoices?.[0]?.choices?.[0]?.custom);
        const wixStatus = (b.status || "").toUpperCase();
        let status: string;
        if (wixStatus === "CANCELED" || wixStatus === "CANCELLED" || wixStatus === "DECLINED") status = "cancelled";
        else status = new Date(start).getTime() < now ? "completed" : "confirmed";
        const venueName = venueNameFrom(addr, contact);

        return {
          id: `wix-booking:${b.id}`,
          wixEventId: `wix-booking:${b.id}`,
          name: venueName,
          eventType: eventTypeFromTitle(b.bookedEntity?.title),
          dateStart: new Date(start).toISOString(),
          location: venueName,
          address: addr && /\d/.test(addr) ? addr : undefined,
          preOrders,
          estimatedRevenue: revenueFromPreOrders(preOrders),
          status,
          depositStatus: (b.paymentStatus || "").toUpperCase() === "PAID" ? "paid" : "pending",
          contactName: contact || undefined,
          contactEmail: b.contactDetails?.email || undefined,
          contactPhone: (b.contactDetails?.phone || "").trim() || undefined,
          createdAt: b.createdDate || new Date().toISOString(),
        };
      });

    return Response.json({ events, count: events.length }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }
}
