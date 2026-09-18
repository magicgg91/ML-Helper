"use client";

import { useSyncExternalStore } from "react";

/**
 * The width at which the reference tables stop sitting side by side.
 *
 * It is declared here *and* in globals.css, because the two need it for
 * different reasons: the stylesheet arranges the tables, this constant lets a
 * component KNOW which arrangement is on screen. A paginated table has to
 * know — how many levels a page holds is not something CSS can decide. The
 * two values are pinned to each other by a test (responsive-styles.test.ts).
 */
export const narrowViewportMaxWidth = 900;
export const narrowViewportQuery = `(max-width: ${narrowViewportMaxWidth}px)`;

/**
 * Bloc 63/A+C: whether the viewport is in the narrow (stacked) layout.
 *
 * The server has no viewport, so it renders the wide layout and the client
 * corrects itself on hydration. `useSyncExternalStore`'s server snapshot is
 * the supported way to do that: React knows the first client render may
 * differ and re-renders instead of reporting a hydration mismatch. The
 * trade-off is visible — a narrow screen paints the wide layout for the
 * instant before hydration. Hiding a table in CSS to avoid that flash would
 * be worse: on Progression the hidden table holds 30 levels that no page
 * would then reach.
 */
export function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia(narrowViewportQuery);
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(narrowViewportQuery).matches,
    () => false,
  );
}
