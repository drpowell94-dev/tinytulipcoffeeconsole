/**
 * Typed localStorage helpers. Used only by the one store that stays
 * local-only under the `coffee` schema migration: the live per-event drink
 * order log (drinkStore's loadSession/saveSession/clearSession). Every
 * shared-team collection now talks to Supabase's `coffee` schema directly
 * instead of mirroring through this layer.
 */

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
}

export function removeKey(key: string) {
  localStorage.removeItem(key);
}

export function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
