import { useEffect, useState } from "react";
import { supabase, isSupabaseEnabled } from "@/services/supabase";
import { isDemoMode, exitDemo } from "@/demo/demoMode";

// One shared Supabase Auth account gates the whole team's access — there's no
// per-person identity yet, just a single passcode. Signing in with it issues a
// real session, which the database's row-level-security policy requires.
const SERVICE_EMAIL = "staff@tinytulipcoffeeconsole.internal";

export type AuthStatus = "checking" | "authed" | "anon";

/**
 * Tracks whether the shared team session is active. When Supabase isn't
 * configured (local dev without env vars), there's nothing to gate — the app
 * is immediately "authed" so offline/local development still works.
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseEnabled && !isDemoMode ? "checking" : "authed");

  useEffect(() => {
    if (!supabase || isDemoMode) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "authed" : "anon");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authed" : "anon");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { status };
}

/** Attempt to unlock the app with the shared team passcode. */
export async function signIn(pin: string): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.auth.signInWithPassword({ email: SERVICE_EMAIL, password: pin });
  return error ? "Incorrect passcode" : null;
}

/** Lock the app again (e.g. on a shared device at the end of an event). */
export async function signOut(): Promise<void> {
  if (isDemoMode) return exitDemo();
  await supabase?.auth.signOut();
}
