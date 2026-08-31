import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
// Bloc 42/J: the previous "ML-Helper Admin" / "administration" default
// applied to every page in the app, public site included, since almost no
// public page overrode `description` — the admin-specific title/robots now
// live on /admin's own layout instead, and this root fallback describes
// the public site (only ever shown on a page whose own generateMetadata
// hasn't set a more specific description).
export const metadata: Metadata = {
  title: "ML Helper",
  description:
    "ML Helper réunit les outils et référentiels de la communauté pour préparer chaque décision de jeu sur Million Lords.",
};
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
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
