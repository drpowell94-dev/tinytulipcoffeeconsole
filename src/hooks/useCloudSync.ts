import { useEffect, useRef } from "react";

/**
 * Re-run `reload` whenever shared data changes — either another user's edit
 * arrives via the realtime subscription, or the tab regains focus. Lets a page
 * re-read its localStorage-backed state so team edits show up live.
 */
export function useCloudSync(reload: () => void) {
  const ref = useRef(reload);
  ref.current = reload;

  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener("tt-sync", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("tt-sync", handler);
      window.removeEventListener("focus", handler);
    };
  }, []);
}
