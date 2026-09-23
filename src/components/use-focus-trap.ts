"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Bloc 119: the keyboard contract shared by every overlay of the admin — the
 * confirmation dialogs, the side panel and the sidebar drawer below 1024 px.
 *
 * Written by hand rather than delegating to the native `<dialog>` element:
 * `showModal()` would give the trap and the Escape key for free in a browser,
 * but jsdom 26 implements neither (`d.showModal is not a function`), so every
 * assertion below would have been running against a polyfill instead of the
 * behaviour. The three overlays share this hook, so the rules are stated once
 * and tested once.
 */

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (element) => !element.closest("[hidden]"),
  );
}

/**
 * Traps the keyboard inside the returned ref's element while `active`.
 *
 * - focus moves into the overlay when it opens, and back to whatever opened it
 *   when it closes — a keyboard user is never dropped at the top of the page;
 * - Tab and Shift+Tab wrap at the two ends instead of escaping to the page
 *   behind, which a screen reader would otherwise keep reading;
 * - Escape calls `onClose`.
 *
 * The container must be focusable itself (`tabIndex={-1}`) for the case where
 * it holds no focusable child yet.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const container = useRef<T | null>(null);
  // The caller almost always passes a fresh arrow function; keeping it in a
  // ref stops the trap from being torn down and re-armed on every render,
  // which would steal focus back to the first element mid-interaction. The
  // ref is refreshed in an effect rather than during the render — a render
  // must not write to a ref (react-hooks/refs) — and this effect is declared
  // first, so it has already run when the one below arms the trap.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const element = container.current;
    if (!active || !element) return;
    const previouslyFocused = document.activeElement;
    const [first] = focusableElements(element);
    (first ?? element).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (!element) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements(element);
      if (focusable.length === 0) {
        // Nothing to move to: keep the focus on the overlay rather than
        // letting Tab walk into the page underneath.
        event.preventDefault();
        element.focus();
        return;
      }
      const edge = event.shiftKey
        ? focusable[0]
        : focusable[focusable.length - 1];
      const wrapTo = event.shiftKey
        ? focusable[focusable.length - 1]
        : focusable[0];
      const current = document.activeElement;
      if (current === edge || !element.contains(current)) {
        event.preventDefault();
        wrapTo.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [active]);

  return container;
}
