/**
 * Records the outcome of the last Wix booking sync attempt so a failure is
 * visible in the UI instead of failing silently in the background. This is a
 * per-browser diagnostic, not shared team data, so it bypasses the cloud-sync
 * layer and writes straight to localStorage.
 */
export interface SyncStatus {
  lastAttempt: string; // ISO
  ok: boolean;
  error?: string;
}

const KEY = "tt-wix-sync-status";

export function recordSyncStatus(status: { ok: boolean; error?: string }): void {
  const value: SyncStatus = { ...status, lastAttempt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Best-effort — a failure to persist the status shouldn't break the app.
  }
}

export function loadSyncStatus(): SyncStatus | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SyncStatus) : null;
  } catch {
    return null;
  }
}
