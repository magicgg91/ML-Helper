import { launchLocales } from "./launch-locales.generated";

// Bloc 44: DE/ES/TR activated (files delivered, structure verified against
// en.json). Polish is still planned but has no messages file, so it is not
// listed here — Bloc 93/F2 dropped the separate `plannedLocales` constant
// that recorded it, since nothing ever read it.
//
// Bloc 120: the list is no longer written here. It is derived from the
// contents of messages/ by scripts/generate-launch-locales.ts, which runs
// before dev, build and test, so adding a language is adding a file and
// nothing else — the promise section 3.3 of the cahier des charges makes.
// The generated module is a plain array of string literals, which is what
// lets this stay importable from a client component and keeps the locale
// segments statically prerenderable; that script's header explains why the
// alternative (reading the directory at runtime) cannot work here.
export { launchLocales };
export type LaunchLocale = (typeof launchLocales)[number];
// Bloc 91/E1: the site's default locale, kept here (no node:fs) so
// src/i18n/routing.ts — imported by the proxy — can reach it without pulling
// in src/i18n/config.ts's filesystem reads. Mirrors config.ts's own
// defaultLocale.
//
// Deliberately still written by hand: which language a visitor lands in is a
// product decision, not a consequence of which files exist. Typing it against
// the derived union is the guard — delete messages/fr.json and this line
// stops compiling rather than silently pointing at a locale the site no
// longer ships.
export const defaultLaunchLocale: LaunchLocale = "fr";

/**
 * Bloc 118: the admin is an EN/FR product, and only those two.
 *
 * src/proxy.ts clamps every /admin and /login request to one of these two
 * locales (Bloc 47/C, Bloc 90), so admin chrome is *rendered* in English or
 * French whatever the visitor picked publicly — which means a DE/ES/TR
 * translation of it could never appear on screen. Bloc 116/C drew that
 * conclusion for the audit log alone; this bloc draws it for the whole admin
 * interface, so `messages/{de,es,tr}.json` carry none of it.
 *
 * This is about the admin's OWN interface text, listed in `adminNamespaces`
 * below. It is not about the content an admin authors for the public site —
 * guides, the legal notice, reference tables — which the public reads in all
 * five languages and whose editors (EditorialLocaleSelect, the language
 * activation panel) still offer the full `launchLocales` list, unchanged.
 */
export const adminLocales = ["en", "fr"] as const;
export type AdminLocale = (typeof adminLocales)[number];

/**
 * Bloc 118: the top-level message namespaces rendered only under those
 * clamped routes — the admin chrome (`admin`), its sign-in page (`login`)
 * and the role names in /admin/users (`roles`, reached through a root
 * translator as `roles.<role>`).
 *
 * Deriving this list by hand would rot; src/i18n/admin-locale-scope.test.ts
 * recomputes it from the import graph and fails if a namespace joins or
 * leaves the admin side without this constant following.
 */
export const adminNamespaces = ["admin", "login", "roles"] as const;

/** Whether a dotted message key belongs to the admin's own interface text. */
export function isAdminMessageKey(key: string): boolean {
  return (adminNamespaces as readonly string[]).includes(key.split(".")[0]);
}

export function translationRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

// Bloc 44: Partial rather than a full Record — a caller can omit a locale
// entirely (e.g. a not-yet-translated DE/ES/TR field) instead of being
// forced to overwrite it with an empty string, which would otherwise
// permanently defeat localizedText()'s English fallback for that locale.
export function mergeLaunchTranslations(
  current: unknown,
  update: Partial<Record<LaunchLocale, string>>,
) {
  return { ...translationRecord(current), ...update };
}

// Bloc 44: builds a fully-populated per-locale record over every launched
// locale — used by editor pages seeding a form's initial state (new blank
// draft, or reading an existing record) instead of listing fr/en by hand.
export function launchRecord<T>(
  value: (locale: LaunchLocale) => T,
): Record<LaunchLocale, T> {
  return Object.fromEntries(
    launchLocales.map((locale) => [locale, value(locale)]),
  ) as Record<LaunchLocale, T>;
}

// Bloc 44: strips any locale left blank (a DE/ES/TR field the admin hasn't
// filled in yet) before a StaticContent record is persisted — same reason
// as nonEmptyLocaleValues in services/guides.ts: an explicit "" would
// permanently defeat localizedText()'s English fallback for that locale,
// where an absent key doesn't. Locales that are actually required (fr/en,
// validated non-empty upstream) pass through unaffected.
export function dropEmptyLocales(
  content: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(content).filter(([, value]) => value !== ""),
  );
}

// Bloc 47/D review: the safety net is always English, never French —
// falling back through `fr` first (the site's *default* locale for a
// visitor with no explicit preference, a wholly separate concept) used to
// prefer French over English for e.g. a DE/ES/TR visitor whenever their
// own locale was missing, contradicting this app's own "falls back to
// English when a translation is missing" rule. `defaultLocale`
// (src/i18n/config.ts) must never leak into this function.
// Codex review (PR #70): fr stays as a last-resort third tier — guides
// (guideInputSchema) only require fr OR en, never both, so a fr-only
// record must still render something rather than "" for every other
// locale (AGENTS.md: a missing translation is never a blank).
export function localizedText(value: unknown, locale: string) {
  const translations = translationRecord(value);
  return translations[locale] ?? translations.en ?? translations.fr ?? "";
}

// Bloc 42/F: unlike localizedText() above, no English fallback — checks
// whether THIS exact locale has real content, for the one place (guide
// editorial content) where a missing translation must show a visible
// "not translated yet" placeholder instead of silently substituting
// another language. Static UI text and the legal notice keep the silent
// fallback via localizedText() — this helper is not for them.
export function hasLocalizedText(value: unknown, locale: string): boolean {
  return Boolean(translationRecord(value)[locale]);
}

/**
 * Bloc 93/M1: the fr/en fallback for admin-entered text, which the
 * Consommables, Évènements and Templiers references each carried an identical
 * private copy of.
 *
 * Admin content is stored as an fr/en pair, and the site ships 5 locales, so
 * a non-French visitor reads the English text; either side falls back to the
 * other when its own is empty, so a half-filled pair never renders blank.
 *
 * Distinct from reference-tables' `secondaryLabel`, which deliberately does
 * NOT cross-fall-back: an absent override there means "use the built-in
 * label", not "use the other language".
 */
/**
 * Bloc 125 §9: the languages a reference's free text is actually stored in.
 *
 * Boutique, Événements, the Templiers catalogue and the equipment labels each
 * keep one French field and one other-language field, which `pickFrEn` above
 * reads back. Their editors offered all five launch locales anyway, and
 * collapsed DE/ES/TR onto the English one — so typing a German name saved it
 * into the English column, showed it back on the German tab (which reads the
 * same column), and destroyed the English text without saying so. The tabs
 * offer this pair instead: what the model holds, and nothing it does not.
 */
export const contentPairLocales = [
  "fr",
  "en",
] as const satisfies readonly LaunchLocale[];
export type ContentPairLocale = (typeof contentPairLocales)[number];

export function pickFrEn(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}
