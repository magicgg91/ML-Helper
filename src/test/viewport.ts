import { act } from "@testing-library/react";
import { narrowViewportQuery } from "../components/use-narrow-viewport";

/**
 * Bloc 63/A+C: drives useNarrowViewport from a test.
 *
 * jsdom has no layout, so the global stub in vitest.setup.ts answers every
 * media query with `matches: false` — i.e. always the wide layout. This
 * replaces it with one that answers for the reference tables' own breakpoint
 * and can change its answer afterwards, which is how a rotation or a resize
 * reaches a mounted component.
 *
 * Call `restore()` in afterEach: the replacement is global, and a later test
 * that never asked for a narrow viewport must not inherit one.
 */
export function mockViewport(narrow: boolean) {
  const original = window.matchMedia;
  const listeners = new Set<() => void>();
  let current = narrow;
  window.matchMedia = ((query: string) =>
    ({
      // Only the reference tables' breakpoint is answered; anything else
      // (the theme toggle's prefers-color-scheme, say) keeps the stub's "no".
      matches: query === narrowViewportQuery ? current : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_event: string, listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: () => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return {
    /** A rotation or a resize across the breakpoint, on a mounted component. */
    resize(next: boolean) {
      current = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
    restore() {
      window.matchMedia = original;
    },
  };
}
