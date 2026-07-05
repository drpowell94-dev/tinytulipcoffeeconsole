import { useEffect, useRef } from "react";
import { subscribeToTable } from "@/services/cloudSync";

/**
 * Re-run `reload` whenever any of the given `coffee.*` tables change (via a
 * Supabase realtime subscription) or the tab regains focus. Lets a page
 * re-fetch its Supabase-backed state so teammates' edits show up live.
 */
export function useCloudSync(tables: string[], reload: () => void) {
  const ref = useRef(reload);
  ref.current = reload;
  const key = tables.join(",");

  useEffect(() => {
    const handler = () => ref.current();
    const unsubscribes = tables.map(table => subscribeToTable(table, handler));
    window.addEventListener("focus", handler);
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
      window.removeEventListener("focus", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
