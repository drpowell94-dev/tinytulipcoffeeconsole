/**
 * Typed localStorage helpers. Every module store builds on these.
 */

import { pushState } from "@/services/cloudSync";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  // Mirror shared collections to the team backend (no-op when Supabase isn't
  // configured or when the key isn't a synced collection).
  pushState(key, value);
}

export function removeKey(key: string) {
  localStorage.removeItem(key);
}

export function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
