/**
 * Bulk import events from Wix Events app into Supabase
 *
 * Usage:
 *   npx ts-node scripts/import-wix-events.ts
 *
 * Environment variables required:
 *   - WIX_API_KEY: Your Wix API key
 *   - WIX_SITE_ID: Your Wix site ID
 *   - VITE_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf-8");
  env.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value && !process.env[key]) {
      process.env[key] = value.trim();
    }
  });
}

const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_SITE_ID = process.env.WIX_SITE_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WIX_API_KEY || !WIX_SITE_ID) {
  console.error("❌ Missing required Wix credentials");
  console.error("   Set WIX_API_KEY and WIX_SITE_ID in your .env file");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required Supabase credentials");
  console.error("   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file");
  process.exit(1);
}

interface WixEvent {
  id: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  location?: {
    address?: string;
  };
  status?: "READY" | "DRAFT" | "CANCELLED";
}

interface EventInsert {
  wix_event_id: string;
  name: string;
  description: string | null;
  date_start: string;
  date_end: string | null;
  location: string;
  status: "inquiry" | "confirmed" | "cancelled";
  event_type: "other";
  synced_from_wix: boolean;
  created_by: string; // Will be a system user UUID
}

async function fetchWixEvents(): Promise<WixEvent[]> {
  console.log("📡 Fetching events from Wix...");

  const url = `https://www.wixapis.com/v1/events/events`;
  const headers = {
    Authorization: WIX_API_KEY,
    "X-Wix-Site-Id": WIX_SITE_ID,
  };

  let allEvents: WixEvent[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const query = new URLSearchParams();
      if (pageToken) {
        query.append("pageToken", pageToken);
      }

      const response = await fetch(`${url}?${query.toString()}`, { headers });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Wix API error: ${response.status} - ${JSON.stringify(error)}`
        );
      }

      const data = (await response.json()) as {
        events?: WixEvent[];
        pageToken?: string;
      };
      const events = data.events || [];
      allEvents = allEvents.concat(events);
      pageToken = data.pageToken;

      console.log(`  ✓ Fetched ${events.length} events (total: ${allEvents.length})`);
    } while (pageToken);

    return allEvents;
  } catch (error) {
    console.error("❌ Failed to fetch Wix events:", error);
    throw error;
  }
}

async function getOrCreateSystemUser(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  console.log("🔍 Looking for system user...");

  // Try to find existing system user
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id")
    .eq("email", "system@tinytulipcoffee.internal")
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    console.log("  ✓ Found existing system user");
    return existingUsers[0].id;
  }

  // Create system user if it doesn't exist
  console.log("  Creating system user...");
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email: "system@tinytulipcoffee.internal",
        full_name: "System Import",
        role: "admin",
      },
    ])
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create system user: ${error.message}`);
  }

  console.log("  ✓ Created system user");
  return data.id;
}

function mapWixEventToSupabase(
  wixEvent: WixEvent,
  createdBy: string
): EventInsert {
  const status = (() => {
    if (wixEvent.status === "CANCELLED") return "cancelled";
    if (wixEvent.status === "READY") return "confirmed";
    return "inquiry";
  })();

  return {
    wix_event_id: wixEvent.id,
    name: wixEvent.title || "Untitled Event",
    description: wixEvent.description || null,
    date_start: wixEvent.startsAt || new Date().toISOString(),
    date_end: wixEvent.endsAt || null,
    location: wixEvent.location?.address || "TBD",
    status,
    event_type: "other",
    synced_from_wix: true,
    created_by: createdBy,
  };
}

async function importEventsToSupabase(
  supabase: ReturnType<typeof createClient>,
  events: WixEvent[],
  createdBy: string
): Promise<void> {
  console.log(`\n📦 Importing ${events.length} events to Supabase...`);

  if (events.length === 0) {
    console.log("  ℹ️  No events to import");
    return;
  }

  const insertData = events.map((event) => mapWixEventToSupabase(event, createdBy));

  // Upsert in batches
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < insertData.length; i += batchSize) {
    const batch = insertData.slice(i, i + batchSize);
    const { error } = await supabase.from("events").upsert(batch, {
      onConflict: "wix_event_id",
    });

    if (error) {
      console.error(`❌ Failed to import batch ${i / batchSize + 1}:`, error);
      throw error;
    }

    imported += batch.length;
    console.log(`  ✓ Imported ${imported}/${insertData.length} events`);
  }

  console.log(`\n✅ Successfully imported ${imported} events!`);
}

async function main() {
  console.log("🚀 Wix Events Bulk Import\n");

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  try {
    // Fetch events from Wix
    const wixEvents = await fetchWixEvents();

    if (wixEvents.length === 0) {
      console.log("⚠️  No events found in Wix");
      return;
    }

    // Get or create system user for created_by
    const userId = await getOrCreateSystemUser(supabase);

    // Import to Supabase
    await importEventsToSupabase(supabase, wixEvents, userId);

    console.log("\n🎉 Import complete!");
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
