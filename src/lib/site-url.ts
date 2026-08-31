import { launchLocales } from "./translations";

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

// Bloc 42/J: locale here is cookie-driven (src/i18n/request.ts), never part
// of the URL — this app has exactly one URL per page, shown in whichever
// of the 5 launched languages the visitor's cookie selects. Every hreflang
// alternate (including x-default) therefore points at that same URL: the
// closest honest signal a search engine can get from this app's actual
// (cookie-based, not path-segmented) i18n architecture, without claiming
// language-specific URLs that don't exist.
export function languageAlternates(path: string): Record<string, string> {
  const url = absoluteUrl(path);
  return Object.fromEntries([
    ...launchLocales.map((locale) => [locale, url]),
    ["x-default", url],
  ]);
}
