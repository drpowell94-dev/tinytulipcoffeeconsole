import { supabase } from "./supabase";

/**
 * Realtime helper for the `coffee` schema. Every domain store now reads and
 * writes its own relational table directly (no more mirrored JSONB blob), so
 * all "shared workspace" sync needs to do is say "something changed on this
 * table — go refetch." Subscribes to Postgres changes for one table and
 * invokes `onChange`; callers are expected to re-run their own load function.
 *
 * No-op (returns a no-op unsubscribe) when Supabase isn't configured.
 */
export function subscribeToTable(table: string, onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel(`coffee_${table}_changes`)
    .on("postgres_changes", { event: "*", schema: "coffee", table }, () => onChange())
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
