import type { MetadataRoute } from "next";

// Bloc 95 (audit SEO Bloc 91/F1): the web app manifest, so players can install
// ML-Helper on a phone's home screen and open it without browser chrome.
//
// Colours are the site's own tokens, not new values: --bg (#1b2029) is the
// dark theme's page background, so the splash screen matches what renders
// right after it; --accent (#8b6bb8, the violet) tints the browser UI. Both
// are asserted against globals.css by manifest.test.ts, so a palette change
// can't silently leave this file behind.
//
// start_url is "/" rather than a locale-prefixed path: src/proxy.ts redirects
// the bare root to the visitor's own language, so an installed app opens in
// the locale they actually use instead of one frozen at install time.
const themeColor = "#8b6bb8";
const backgroundColor = "#1b2029";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    start_url: "/",
    name: "ML-Helper — Outils Million Lords",
    short_name: "ML-Helper",
    display: "standalone",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      // Both files are Next.js file-convention icons (src/app/icon.png and
      // src/app/apple-icon.png), which is what also emits the <link rel="icon">
      // and <link rel="apple-touch-icon"> tags. Listing them here is what makes
      // them available to the install prompt itself.
      //
      // purpose is left at the default ("any") deliberately: the shield spans
      // ~83% of the square, wider than a maskable icon's 80% safe zone, so
      // declaring "maskable" would have Android clip its edges.
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
