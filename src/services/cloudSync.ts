import { supabase } from "./supabase";

/**
 * Shared-workspace sync. Every localStorage collection listed below is mirrored
 * to a single Supabase `app_state` table (one row per key, value stored as
 * JSON). Saves push to the cloud; a realtime subscription applies other users'
 * changes back into localStorage and notifies the UI via a "tt-sync" event.
 *
 * No auth: the whole team shares one dataset. Last write wins per collection.
 */

const TABLE = "app_state";

/** localStorage keys that represent shared team data. */
export const SYNC_KEYS = [
  "tt-events",
  "tt-venues",
  "tt-checklists",
  "tt-inventory",
  "tt-blog-posts",
  "tt-website-settings",
  "tt-session-history",
  "tiny_tulip_daily_checklist",
  "tiny_tulip_properties",
  "tiny_tulip_todo_lists",
];

// Guards against echoing a remote change straight back to the cloud.
let applyingRemote = false;

/** Push one collection's value to the cloud (fire-and-forget). */
export function pushState(key: string, value: unknown) {
  if (!supabase || applyingRemote || !SYNC_KEYS.includes(key)) return;
  supabase
    .from(TABLE)
    .upsert({ key, data: value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .then(({ error }) => {
      if (error) console.warn(`[cloudSync] push "${key}" failed:`, error.message);
    });
}

/** Write a remote value into localStorage without re-pushing, then notify the UI. */
function applyRemote(key: string, value: unknown) {
  applyingRemote = true;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } finally {
    applyingRemote = false;
  }
  window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key } }));
}

/** Pull all shared collections from the cloud; returns the set of keys found. */
async function hydrateFromCloud(): Promise<Set<string>> {
  const found = new Set<string>();
  if (!supabase) return found;
  const { data, error } = await supabase.from(TABLE).select("key,data").in("key", SYNC_KEYS);
  if (error) {
    console.warn("[cloudSync] hydrate failed:", error.message);
    return found;
  }
  for (const row of (data ?? []) as Array<{ key: string; data: unknown }>) {
    applyRemote(row.key, row.data);
    found.add(row.key);
  }
  return found;
}

/** Listen for other users' changes and apply them locally in real time. */
function subscribeToCloud() {
  if (!supabase) return;
  supabase
    .channel("app_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      payload => {
        const row = payload.new as { key?: string; data?: unknown } | null;
        if (row?.key && SYNC_KEYS.includes(row.key) && "data" in row) {
          applyRemote(row.key, row.data);
        }
      }
    )
    .subscribe();
}

/**
 * Start syncing: pull shared state, seed any collections the cloud doesn't have
 * yet from this device, then subscribe to live changes. Safe to call when
 * Supabase isn't configured (no-op).
 */
export async function startCloudSync() {
  if (!supabase) return;
  const cloudKeys = await hydrateFromCloud();

  // Seed the cloud with any local-only collections (first device to load wins).
  for (const key of SYNC_KEYS) {
    if (!cloudKeys.has(key)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          pushState(key, JSON.parse(raw));
        } catch {
          /* ignore unparseable local value */
        }
      }
    }
  }

  subscribeToCloud();
}
