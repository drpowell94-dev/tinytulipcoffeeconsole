import type { Venue } from "@/lib/venueStore";
import type { TulipEvent } from "@/lib/eventStore";

export interface WixConvertPayload {
  event: Pick<TulipEvent, "id" | "name" | "eventType" | "dateStart" | "notes" | "wixEventId">;
  venue: Venue;
}

export async function publishToWix(payload: WixConvertPayload): Promise<{ wixEventId: string }> {
  const res = await fetch("/api/wix-convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as { wixEventId?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? `Wix API returned HTTP ${res.status}`);
  }

  if (!data.wixEventId) {
    throw new Error("Wix did not return an event ID");
  }

  return { wixEventId: data.wixEventId };
}
