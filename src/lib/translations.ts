// Bloc 44: DE/ES/TR activated (files delivered, structure verified against
// en.json). "pl" stays in plannedLocales only — no file for it yet.
export const launchLocales = ["fr", "en", "de", "es", "tr"] as const;
export const plannedLocales = ["fr", "en", "es", "de", "pl", "tr"] as const;
export type LaunchLocale = (typeof launchLocales)[number];

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
// permanently defeat localizedText()'s fr/en fallback for that locale.
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
// permanently defeat localizedText()'s fr/en fallback for that locale,
// where an absent key doesn't. Locales that are actually required (fr/en,
// validated non-empty upstream) pass through unaffected.
export function dropEmptyLocales(
  content: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(content).filter(([, value]) => value !== ""),
  );
}

export function localizedText(value: unknown, locale: string) {
  const translations = translationRecord(value);
  return translations[locale] ?? translations.fr ?? translations.en ?? "";
}

// Bloc 42/F: unlike localizedText() above, no fr/en fallback — checks
// whether THIS exact locale has real content, for the one place (guide
// editorial content) where a missing translation must show a visible
// "not translated yet" placeholder instead of silently substituting
// another language. Static UI text and the legal notice keep the silent
// fallback via localizedText() — this helper is not for them.
export function hasLocalizedText(value: unknown, locale: string): boolean {
  return Boolean(translationRecord(value)[locale]);
}
