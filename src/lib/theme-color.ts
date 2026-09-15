// Bloc 103: the page background of each theme, as one source of truth.
//
// These are not decoration: they are what the browser paints AROUND the page.
// Since Safari 26 (Liquid Glass), an installed web app's status-bar strip is
// filled from `<meta name="theme-color">`, and when no colour is declared
// WebKit samples the page's top edge instead — a sample it cannot resolve to a
// solid colour here, because body's top edge carries a radial gradient
// (globals.css). iOS/iPadOS 27 then falls back to a frosted-glass band that
// blurs the page content beneath it, which is what players saw over the
// ML-HELPER wordmark and the nav buttons.
//
// Kept equal to --bg in each theme's token block by theme-color.test.ts, so a
// palette change cannot silently leave the status bar showing last year's
// colour.
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
