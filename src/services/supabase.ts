import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode, exitDemo, DEMO_DB_KEY } from "@/demo/demoMode";
import { createDemoClient, type DemoTables } from "@/demo/demoClient";
import { buildDemoTables } from "@/demo/demoData";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function loadDemoTables(): DemoTables {
  try {
    const saved = sessionStorage.getItem(DEMO_DB_KEY);
    if (saved) return JSON.parse(saved) as DemoTables;
  } catch {
    /* fall through to a fresh seed */
  }
  return buildDemoTables();
}

function createDemo(): SupabaseClient {
  const tables = loadDemoTables();
  const persist = () => {
    try {
      sessionStorage.setItem(DEMO_DB_KEY, JSON.stringify(tables));
    } catch {
      /* edits still live in memory for this page load */
    }
  };
  return createDemoClient(tables, persist, exitDemo) as unknown as SupabaseClient;
}

// In demo mode the real client is never created: no session, no network, no
// way to read or write the team's data.
export const supabase: SupabaseClient | null = isDemoMode
  ? createDemo()
  : url && key
    ? createClient(url, key)
    : null;

export const isSupabaseEnabled = supabase !== null;
