"use client";

import { useEffect } from "react";

/**
 * Bloc 119 §3 bis: an editor with unsaved work warns before it is left.
 *
 * `beforeunload` covers the tab being closed or reloaded, and nothing else —
 * a click on a link inside the app never reaches it, because the App Router
 * swaps the page without unloading the document. So the second half is a
 * capture-phase listener on the document: any click heading for another URL
 * asks first.
 *
 * Deliberately narrow. It ignores a click the browser will not treat as a
 * plain navigation (a modified click, a new tab, a download), and a link to
 * the very page you are on, so the confirm only ever appears where work would
 * actually be lost.
 */
export function useUnsavedWarning(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);

    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    // Capture: the router's own handler is on the link, so the question has
    // to be asked on the way down, before it navigates.
    document.addEventListener("click", intercept, true);

    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", intercept, true);
    };
  }, [dirty, message]);
}
