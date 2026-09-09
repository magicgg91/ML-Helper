import type { MetadataRoute } from "next";

// Bloc 95 (audit SEO Bloc 91/F1): everything in the web app manifest that is
// the same in all 5 languages. Only the name is translated, so it is the one
// thing this builder takes as an argument — see src/app/manifest.ts (the
// English fallback served at /manifest.webmanifest) and
// src/app/[locale]/manifest.webmanifest/route.ts (the per-locale one every
// public page actually links to).
//
// Colours are the site's own tokens, not new values: --bg (#1b2029) is the
// dark theme's page background, so the splash screen matches what renders
// right after it; --accent (#8b6bb8, the violet) tints the browser UI. Both
// are asserted against globals.css by manifest.test.ts, so a palette change
// can't silently leave this file behind.
const themeColor = "#8b6bb8";
const backgroundColor = "#1b2029";

export function buildWebManifest(name: string): MetadataRoute.Manifest {
  return {
    id: "/",
    // start_url is "/" rather than a locale-prefixed path: src/proxy.ts
    // redirects the bare root to the visitor's own language, so an installed
    // app opens in the locale they actually use instead of one frozen at
    // install time.
    start_url: "/",
    name,
    // The short name (what fits under a home screen icon) is the brand alone,
    // identical in every language — nothing to translate.
    short_name: "ML-Helper",
    display: "standalone",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      // Bloc 96: three sizes, so whatever picks an icon here finds one it
      // recognises. 192 and 512 are what the PWA spec (and Chrome's install
      // criteria) ask for; 180 is Apple's own home-screen size, listed because
      // Safari has read the manifest since iOS 16.4 and an installed app that
      // finds no size it wants shows an empty tile rather than falling back.
      //
      // Every file is a plain opaque true-colour PNG (see icons.test.ts): the
      // palette encoding these used to carry saved bytes but is an unusual
      // shape to hand an OS icon pipeline, and was one of the two suspects for
      // the blank iOS icon this bloc fixes.
      //
      // purpose is left at the default ("any") deliberately: the shield spans
      // ~83% of the square, wider than a maskable icon's 80% safe zone, so
      // declaring "maskable" would have Android clip its edges.
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
