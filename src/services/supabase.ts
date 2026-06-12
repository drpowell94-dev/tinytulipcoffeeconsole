import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Optional Supabase client. The app is localStorage-first and fully
 * functional offline; when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * set in .env.local, drink counts sync to the backend automatically.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const isSupabaseEnabled = supabase !== null;
