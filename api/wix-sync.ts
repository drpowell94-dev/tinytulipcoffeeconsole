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

// Cap each Wix call so a stalled upstream request fails fast with a clear
// error instead of hanging until the platform kills the function — which
// otherwise looks like a dropped connection to the client, not an error.
const WIX_TIMEOUT_MS = 6000;

// Stay safely under Vercel's platform-level function duration limit. Every
// production request to this route was coming back as a bare 504 from
// Vercel itself (confirmed in the runtime logs) — meaning the function never
// returned *any* response in time, so the platform killed it. AbortController
// alone didn't prevent that (the underlying request apparently doesn't always
// honor cancellation promptly in this runtime), so wixFetch below races every
// call against a hard timer instead: even if the network call never settles,
// the race resolves and the function can still return a real response.
const OVERALL_BUDGET_MS = 8000;

/** Resolves/rejects after `ms` regardless of what `promise` does. */
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

async function wixFetch(path: string, body: unknown): Promise<any> {
  const controller = new AbortController();
  const attempt = fetch(`${WIX_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).then(async res => {
    const json = await res.json();
    if (!res.ok) throw new Error(`Wix ${path} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  });

  try {
    return await withTimeout(attempt, WIX_TIMEOUT_MS, `Wix ${path}`);
  } finally {
    // Best-effort cancellation; the timeout guarantee above doesn't depend on
    // this actually working.
    controller.abort();
  }
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

// Test/owner bookings to exclude from the event list.
const TEST_EMAILS = new Set([
  "reneetest@gmail.com",
  "drpowell94@gmail.com",
  "drpxstatments@gmail.com",
]);

/** Is this booking a real client event (not a test or non-coffee service)? */
function isRealBooking(b: any): boolean {
  const email = (b.contactDetails?.email || "").toLowerCase();
  const title = b.bookedEntity?.title || "";
  if (TEST_EMAILS.has(email)) return false;
  if (/keepsake/i.test(title)) return false;
  return true;
}

/** Street-address first segment when it's a real address, else "". */
function streetOf(addr: string | undefined): string {
  const a = (addr || "").trim();
  return a && /\d/.test(a) && a.includes(",") ? a.split(",")[0].trim() : "";
}

export default async function handler(request: Request): Promise<Response> {
  if (!WIX_API_KEY || !WIX_SITE_ID) {
    return Response.json({ error: "Wix credentials not configured" }, { status: 500 });
  }

  const startedAt = Date.now();

  try {
    // Pull all bookings (paginated). Only start another page if there's
    // enough time budget left for it to run its full course — otherwise stop
    // and return whatever was gathered (or a clear error if nothing yet).
    // This is what keeps the function's total runtime bounded regardless of
    // how many pages exist, so it can never run into the platform's own kill.
    let offset = 0;
    const raw: any[] = [];
    for (let i = 0; i < 10; i++) {
      const elapsed = Date.now() - startedAt;
      if (elapsed + WIX_TIMEOUT_MS > OVERALL_BUDGET_MS) {
        if (raw.length === 0) {
          throw new Error(`Wix booking fetch exceeded time budget after page ${i}`);
        }
        break;
      }
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
      .filter(isRealBooking)
      .map((b: any): OutEvent => {
        const slot = b.bookedEntity?.slot ?? {};
        const addr = slot.location?.formattedAddress as string | undefined;
        const realAddr = addr && /\d/.test(addr) && addr.includes(",") ? addr : undefined;
        const street = streetOf(addr);
        const contact = `${b.contactDetails?.firstName ?? ""} ${b.contactDetails?.lastName ?? ""}`.trim();
        const start = slot.startDate || b.startDate || b.createdDate;
        const preOrders = preOrdersFromChoice(b.participantsChoices?.serviceChoices?.[0]?.choices?.[0]?.custom);
        const wixStatus = (b.status || "").toUpperCase();
        let status: string;
        if (wixStatus === "CANCELED" || wixStatus === "CANCELLED" || wixStatus === "DECLINED") status = "cancelled";
        else status = new Date(start).getTime() < now ? "completed" : "confirmed";

        // Prefer the contact (usually the property/venue) for the display name;
        // use the street address for location so it matches the venue book.
        const name = contact || street || "Booking";
        const location = street || contact || "TBD";

        return {
          id: `wix-booking:${b.id}`,
          wixEventId: `wix-booking:${b.id}`,
          name,
          eventType: eventTypeFromTitle(b.bookedEntity?.title),
          dateStart: new Date(start).toISOString(),
          location,
          address: realAddr,
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
