import { defaultLocale, fallbackLocale } from "../i18n/config";
import { prisma } from "./prisma";
import { launchLocales, type LaunchLocale } from "./translations";

// Bloc 90: EN and FR are the site's base languages (built first) — always
// active and never deactivatable (guardrail D). They are never stored
// inactive, and this list forces them active even if a stored row said
// otherwise, as defense in depth.
export const alwaysActiveLocales = [
  "en",
  "fr",
] as const satisfies readonly LaunchLocale[];

export function isAlwaysActiveLocale(locale: string): boolean {
  return (alwaysActiveLocales as readonly string[]).includes(locale);
}

// The launched locales an admin can actually toggle for the public site
// (everything except the always-active EN/FR base) — kept in launchLocales
// order.
export const deactivatableLocales = launchLocales.filter(
  (locale) => !isAlwaysActiveLocale(locale),
);

export function isDeactivatableLocale(locale: string): locale is LaunchLocale {
  return (deactivatableLocales as readonly string[]).includes(locale);
}

// The full active/inactive state of the 5 launched locales: a locale with no
// stored row defaults to active, and EN/FR are always forced active.
export async function getLocaleActiveState(): Promise<
  Record<LaunchLocale, boolean>
> {
  const rows = await prisma.localeSetting.findMany({
    select: { locale: true, active: true },
  });
  const stored = new Map(rows.map((row) => [row.locale, row.active]));
  return Object.fromEntries(
    launchLocales.map((locale) => [
      locale,
      isAlwaysActiveLocale(locale) ? true : (stored.get(locale) ?? true),
    ]),
  ) as Record<LaunchLocale, boolean>;
}

// The launched locales currently visible to the public, in launchLocales
// order. Falls open to all launched locales if the DB read fails, so a
// transient DB error never hides every language (or trips a build-time
// render) — degrading to "show everything" rather than "show nothing".
export async function getActiveLocales(): Promise<LaunchLocale[]> {
  try {
    const state = await getLocaleActiveState();
    return launchLocales.filter((locale) => state[locale]);
  } catch {
    return [...launchLocales];
  }
}

// Bloc 90/E: which locale a page renders in, given the visitor's NEXT_LOCALE
// cookie and the currently-active locales. No cookie → the first-visit
// default (FR, always active); an active cookie → itself; a cookie pointing
// at a now-disabled or unknown locale → English (always active, guardrail D).
// Pure so it can be unit-tested without the request pipeline.
export function resolveRenderLocale(
  cookieLocale: string | undefined,
  activeLocales: readonly string[],
): string {
  if (!cookieLocale) return defaultLocale;
  return activeLocales.includes(cookieLocale) ? cookieLocale : fallbackLocale;
}
