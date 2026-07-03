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

// The realtime subscription below re-delivers every write back to the same
// client that made it (Supabase doesn't suppress your own echo). Track the
// timestamp of each key's last local write so an echo — or any update that
// isn't actually newer — never overwrites a more recent local edit made
// while that echo was still in flight. Without this, saving twice in quick
// succession (or deleting something) could be silently reverted by a
// delayed echo of the earlier, now-stale state.
const lastLocalWrite = new Map<string, string>();

/**
 * True if an incoming remote update for a key is safe to apply — i.e. it's
 * genuinely newer than the last thing this device wrote for that key, or
 * there's no local write to compare against yet. Pulled out as a pure
 * function so the ordering logic itself is directly testable.
 */
export function isNewerThanLastWrite(lastWriteAt: string | undefined, incomingUpdatedAt: string | undefined): boolean {
  if (!lastWriteAt || !incomingUpdatedAt) return true;
  return incomingUpdatedAt > lastWriteAt;
}

/** Push one collection's value to the cloud (fire-and-forget). */
export function pushState(key: string, value: unknown) {
  if (!supabase || applyingRemote || !SYNC_KEYS.includes(key)) return;
  const updatedAt = new Date().toISOString();
  lastLocalWrite.set(key, updatedAt);
  supabase
    .from(TABLE)
    .upsert({ key, data: value, updated_at: updatedAt }, { onConflict: "key" })
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
  const { data, error } = await supabase.from(TABLE).select("key,data,updated_at").in("key", SYNC_KEYS);
  if (error) {
    console.warn("[cloudSync] hydrate failed:", error.message);
    return found;
  }
  for (const row of (data ?? []) as Array<{ key: string; data: unknown; updated_at?: string }>) {
    found.add(row.key);
    // startCloudSync() (and this hydrate) can run more than once per session -
    // e.g. a Supabase auth token refresh on tab focus flips `status` briefly,
    // re-triggering the effect that calls it. Without this guard, a hydrate
    // that races a local edit made moments earlier would silently overwrite
    // it with the older cloud value, since this path (unlike the realtime
    // subscription) had no ordering check at all.
    if (!isNewerThanLastWrite(lastLocalWrite.get(row.key), row.updated_at)) continue;
    applyRemote(row.key, row.data);
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
        const row = payload.new as { key?: string; data?: unknown; updated_at?: string } | null;
        if (!row?.key || !SYNC_KEYS.includes(row.key) || !("data" in row)) return;

        // Skip anything not strictly newer than our own last write to this
        // key — this is what makes echoes of our own pushes (and any
        // out-of-order delivery) harmless instead of silently reverting a
        // more recent local edit.
        if (!isNewerThanLastWrite(lastLocalWrite.get(row.key), row.updated_at)) return;

        applyRemote(row.key, row.data);
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
