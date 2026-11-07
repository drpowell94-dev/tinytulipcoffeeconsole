// Demo mode lets visitors explore the app on sample data without the team
// passcode. It's scoped to the browser tab (sessionStorage) and decided once at
// page load, so the real Supabase client is never even created while it's on.

const FLAG_KEY = "tt-demo";
export const DEMO_DB_KEY = "tt-demo-db";
export const DEMO_BLOCKED_MESSAGE = "Not available in demo mode";

function readFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // ?demo in the URL makes the demo shareable as a plain link.
    if (new URLSearchParams(window.location.search).has("demo")) {
      sessionStorage.setItem(FLAG_KEY, "1");
    }
    return sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export const isDemoMode = readFlag();

export function enterDemo(): void {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
    sessionStorage.removeItem(DEMO_DB_KEY);
  } catch {
    /* storage blocked: the reload below simply lands back on the login screen */
  }
  window.location.assign("/");
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(FLAG_KEY);
    sessionStorage.removeItem(DEMO_DB_KEY);
    // The drink counter keeps its in-progress order log in localStorage per
    // event; drop the ones created for demo events.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("tt-session-demo-")) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  window.location.assign("/");
}

/**
 * Block every request that could reach real data or have real side effects
 * (Wix publish/sync/upload, geocoding, Supabase edge functions such as email
 * sending). Only same-origin static assets are allowed through.
 */
export function installDemoFetchGuard(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: DEMO_BLOCKED_MESSAGE }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return realFetch(input, init);
  };
}
