import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cinzel, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/site-url";
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
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
    >
      <head>
        {/* Bloc 33/B: sets data-theme before first paint, so a first-time
            visitor sees their OS preference immediately instead of a flash
            of dark followed by a correction. Kept in sync with ThemeToggle's
            own localStorage-then-matchMedia fallback. localStorage access is
            isolated in its own try/catch (it can throw in private-browsing
            or storage-restricted contexts) so a denial there still falls
            through to the matchMedia read instead of silently keeping the
            CSS dark default. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var saved=null;try{saved=localStorage.getItem("mlhelper_theme");}catch(e){}var theme=saved==="light"||saved==="dark"?saved:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;})();`,
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
