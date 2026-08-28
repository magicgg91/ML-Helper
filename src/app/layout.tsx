import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
export const metadata: Metadata = {
  title: "ML-Helper Admin",
  description: "ML-Helper administration",
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
            own localStorage-then-matchMedia fallback. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem("mlhelper_theme");var theme=saved==="light"||saved==="dark"?saved:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme;}catch(e){}})();`,
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
