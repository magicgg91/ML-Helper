import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cinzel, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/site-url";
import { themeBackground } from "@/lib/theme-color";
import { getTrackingSettings } from "@/lib/site-settings";
import { ogLocale, titleTemplate } from "@/lib/page-metadata";
import "./globals.css";

// Bloc 91/M1: self-host the display fonts through next/font instead of the
// render-blocking Google Fonts @import globals.css used to carry. next/font
// downloads the files at build time, serves them same-origin (one fewer CSP
// domain, no third-party request — simpler on the RGPD front), preloads them
// and applies an automatic size-adjust fallback. Only the weights the CSS
// actually uses are requested. Each family is exposed as a CSS custom property
// (--font-sans/-serif/-mono) that globals.css references.
const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const fontSerif = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Bloc 42/J: the previous "ML-Helper Admin" / "administration" default
// applied to every page in the app, public site included, since almost no
// public page overrode `description` — the admin-specific title/robots now
// live on /admin's own layout instead, and this root fallback describes
// the public site (only ever shown on a page whose own generateMetadata
// hasn't set a more specific description).
// Codex review (PR #68): a static, French-only fallback text is wrong for
// a visitor whose <html lang> is anything else — generateMetadata (not a
// bare `export const metadata`) is what lets it follow the active locale,
// same as every real page's own metadata already does. Reuses the exact
// same string as the homepage's own intro sentence.
export async function generateMetadata(): Promise<Metadata> {
  const [t, meta, locale] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Public.meta"),
    getLocale(),
  ]);
  // Bloc 91/E2: metadataBase lets every URL-based field (OG images, canonicals)
  // resolve from a single origin; the title template puts the brand and the
  // "Million Lords" keyword on every page's <title> automatically, and the
  // default names the site for pages (login, admin fallbacks) that don't set a
  // title of their own. Bloc 91/E3: a site-wide Open Graph identity + Twitter
  // summary card so shared links (Discord, Reddit) render with an image — the
  // per-page og:title/description are filled in by each page (see
  // pageMetadata), and the default OG image comes from opengraph-image.tsx.
  return {
    metadataBase: new URL(siteUrl),
    title: { default: meta("siteTitle"), template: titleTemplate },
    description: t("intro"),
    openGraph: {
      siteName: "ML-Helper",
      type: "website",
      locale: ogLocale(locale),
    },
    twitter: { card: "summary_large_image" },
  };
}
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();
  const locale = await getLocale();
  // M2: the CSP (src/proxy.ts) is nonce-based — the pre-paint theme script
  // below is inline, so it must carry the request's nonce or the browser
  // refuses to run it. The nonce is published on the x-nonce request header
  // by the middleware.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Bloc 100: the visit-tracking script an admin configured in the
  // Configuration tab, or null when the field is empty — nothing is loaded by
  // default. This is the root layout, so it covers the public site and the
  // admin alike. A database failure here propagates rather than being
  // swallowed (AGENTS.md), which costs nothing in practice: every page under
  // this layout already needs the database to render at all.
  const tracking = await getTrackingSettings();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
    >
      <head>
        {/* Bloc 100: the configured tracking script. It carries the request's
            nonce, exactly like the inline theme script below: the CSP is
            nonce-based with 'strict-dynamic' (src/proxy.ts), under which host
            allowlists are ignored and a nonce is what authorises a script —
            which is also why a URL an admin can change at any time needs no
            CSP exception of its own. `defer` keeps it off the critical path.
            Where the script may SEND its measurements is connect-src, not
            script-src: see TRACKING_ORIGIN in src/proxy.ts. */}
        {tracking.url && (
          <script
            defer
            src={tracking.url}
            // Bloc 101: the identifier the tracker expects next to its src
            // (data-website-id for Umami). Omitted entirely when unset —
            // `undefined` renders no attribute at all, which is what a tracker
            // that needs none should see.
            data-website-id={tracking.websiteId ?? undefined}
            nonce={nonce}
          />
        )}
        {/* Bloc 33/B: sets data-theme before first paint, so a first-time
            visitor sees their OS preference immediately instead of a flash
            of dark followed by a correction. Kept in sync with ThemeToggle's
            own localStorage-then-matchMedia fallback.
            localStorage access is isolated in its own try/catch (it can
            throw in private-browsing or storage-restricted contexts) so a
            denial there still falls through to the matchMedia read instead
            of silently keeping the CSS dark default.
            Bloc 103: it also CREATES and fills <meta name="theme-color">,
            the colour the browser paints AROUND the page — the address-bar
            area on Android Chrome, the window chrome on desktop, an
            installed app's status-bar strip. It is set here, before the
            first paint, so a visitor who saved the light theme never gets a
            dark strip over a light page while React hydrates.
            Bloc 106: this was originally introduced to fix an iOS 27 blur
            over that strip, and it did not — that blur is an Apple system
            bug affecting every PWA on the device. src/lib/theme-color.ts
            carries the full record; the tag stays because declaring it is
            right on its own terms.

            The tag is created here rather than server-rendered through
            metadata, and that is deliberate. A tag React owns is one React
            re-inserts at hydration: since this script rewrites the colour
            for a saved light theme, React answered with a SECOND
            theme-color tag holding the stale dark value, and a duplicate
            leaves the browser reading whichever comes first.
            suppressHydrationWarning does not help — React 19 hoists <meta>
            as a resource rather than hydrating it in place. One owner, then,
            and it has to be this script: it runs before the first paint, so
            the strip is right from the first frame instead of being
            corrected afterwards.

            This is the inline twin of applyThemeColor
            (src/lib/theme-color.ts), which ThemeToggle uses for later
            changes; both colours are interpolated from that one module, so
            the twins cannot drift apart. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var saved=null;try{saved=localStorage.getItem("mlhelper_theme");}catch(e){}var theme=saved==="light"||saved==="dark"?saved:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m);}m.setAttribute("content",theme==="light"?${JSON.stringify(themeBackground.light)}:${JSON.stringify(themeBackground.dark)});})();`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
