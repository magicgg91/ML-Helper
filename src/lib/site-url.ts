import { launchLocales, defaultLaunchLocale } from "./translations";

// Bloc 42/J: NEXTAUTH_URL is already the app's "public origin" env var
// (.env.example: "Public origin used by NextAuth callbacks and cookies") —
// reused here instead of introducing a second URL variable. ml-helper.com
// is the confirmed production domain (cdc section "Nom de domaine décidé"),
// used only as the fallback for local/preview environments that don't set
// NEXTAUTH_URL to the real public origin.
export const siteUrl = (
  process.env.NEXTAUTH_URL?.replace(/\/+$/, "") || "https://ml-helper.com"
).trim();

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path}`;
}

// Bloc 91/E1: locale now lives in the URL (/[locale]/…). Turns an unprefixed
// public path ("/tools", "/") into its locale-prefixed form ("/en/tools",
// "/fr"). The home path collapses to "/{locale}" (no trailing slash).
export function localizedPath(locale: string, path: string): string {
  return path === "/" || path === "" ? `/${locale}` : `/${locale}${path}`;
}

// The canonical absolute URL for a page in a given locale.
export function canonicalUrl(locale: string, path: string): string {
  return absoluteUrl(localizedPath(locale, path));
}

// Bloc 91/E1: each of the 5 launched languages now has its own real URL, so
// hreflang alternates point at distinct, valid locale-prefixed URLs (with
// x-default → the French URL, the site's default locale). Fixes the previous
// scheme where all 6 alternates pointed at the same cookie-driven URL.
export function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries([
    ...launchLocales.map((locale) => [
      locale,
      absoluteUrl(localizedPath(locale, path)),
    ]),
    ["x-default", absoluteUrl(localizedPath(defaultLaunchLocale, path))],
  ]);
}
