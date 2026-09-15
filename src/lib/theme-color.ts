// Bloc 103: the page background of each theme, as one source of truth.
//
// These are not decoration: they are what the browser paints AROUND the page.
// `<meta name="theme-color">` tints the browser UI next to the page — the
// address-bar area on Android Chrome, the window chrome on desktop, the
// status-bar strip of an installed web app. Declaring it, and keeping it equal
// to what the page actually paints, is plain good practice on every platform;
// theme-color.test.ts keeps it equal to --bg in each theme's token block, so a
// palette change cannot leave the browser showing last year's colour.
//
// ---------------------------------------------------------------------------
// Bloc 106 — CORRECTION. This module was introduced to fix something it did
// not fix, and the record is kept here so nobody re-runs the investigation.
//
// The claim was: since Safari 26, WebKit fills an installed app's status-bar
// strip from theme-color, falls back to sampling the page's top edge when no
// colour is declared, and frosts the strip when that sample is not a solid
// colour — blurring the ML-HELPER wordmark and the nav buttons under it. Three
// independent public reports described that mechanism. Bloc 103 declared the
// colour; Bloc 105 flattened the top edge (globals.css) after the blur
// survived. On a real device, with the app removed and reinstalled, the blur
// survived both.
//
// It is an iOS 27 system bug, not ours. What settles it: it hits EVERY PWA on
// the affected device, so no markup of ours can be the cause. Reported widely
// (macrumors.com thread 2489325, read by the project owner — this environment
// cannot reach that host, so it is cited as their reading, not as something
// verified here), including on apps that never opt into viewport-fit=cover,
// and a near-identical bug went round on iOS 26.1 the year before.
//
// One caveat worth keeping, in case this is ever picked up again: the bug is
// reported and confirmed portrait-only, but that detail does NOT on its own
// point at a cause — iPhones hide the status bar in landscape anyway, so any
// status-bar-related explanation predicts the same asymmetry. The load-bearing
// fact is the one above: every PWA on the device, not just this one.
//
// So the earlier reasoning about sampling and frosting should be treated as
// unproven. Both changes stay because each is defensible on its own terms (see
// globals.css for the other half), not because either fixed the blur. Reopen
// only if a real workaround appears, or once Apple ships a fix.
// ---------------------------------------------------------------------------
export type Theme = "dark" | "light";

export const themeBackground: Record<Theme, string> = {
  dark: "#1b2029",
  light: "#e4e7eb",
};

/**
 * Points `<meta name="theme-color">` at the theme now on screen, creating the
 * tag if the document has none yet.
 *
 * A single tag, rewritten, rather than one media-scoped tag per theme: the
 * site's theme is a saved choice first and `prefers-color-scheme` only as a
 * fallback (ThemeToggle), so a media query would state the wrong colour for
 * anyone who toggled against their OS setting.
 */
export function applyThemeColor(theme: Theme) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", themeBackground[theme]);
}
