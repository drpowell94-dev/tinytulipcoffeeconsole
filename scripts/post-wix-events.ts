/**
 * Replay the bundled Wix events through the live /v1/wix-receiver endpoint.
 *
 * This uses the SAME authenticated path as real Wix webhooks, so it's a good
 * way to (a) smoke-test the deployed receiver and (b) populate Supabase with
 * your existing events.
 *
 * Usage:
 *   WIX_RECEIVER_URL="https://<project>.supabase.co/functions/v1/wix-receiver" \
 *   WIX_WEBHOOK_SECRET="<your-secret>" \
 *   npx tsx scripts/post-wix-events.ts
 *
 * (Node 18+ has a global fetch; tsx or ts-node both work to run the file.)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RECEIVER_URL = process.env.WIX_RECEIVER_URL;
const SECRET = process.env.WIX_WEBHOOK_SECRET;

if (!RECEIVER_URL || !SECRET) {
  console.error("❌ Missing configuration. Set both:");
  console.error("   WIX_RECEIVER_URL  – the deployed receiver endpoint URL");
  console.error("   WIX_WEBHOOK_SECRET – the shared Bearer token");
  process.exit(1);
}

interface WixEventRecord {
  wixEventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: string;
  status: string;
}

const dataPath = resolve(__dirname, "../src/data/wixEvents.json");
const events: WixEventRecord[] = JSON.parse(readFileSync(dataPath, "utf-8"));

async function postEvent(event: WixEventRecord): Promise<boolean> {
  try {
    const res = await fetch(RECEIVER_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wixEventId: event.wixEventId,
        title: event.title,
        description: event.description ?? "",
        startDate: event.startDate,
        endDate: event.endDate ?? null,
        location: event.location,
        status: event.status,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`  ✗ ${event.title} → ${res.status}: ${text}`);
      return false;
    }
    console.log(`  ✓ ${event.title}`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${event.title} → ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  console.log(`🚀 Posting ${events.length} events to ${RECEIVER_URL}\n`);
  let ok = 0;
  for (const event of events) {
    // Sequential to keep ordering and avoid rate limits.
    if (await postEvent(event)) ok++;
  }
  console.log(`\n✅ Done: ${ok}/${events.length} succeeded`);
  if (ok < events.length) process.exit(1);
}

main();
