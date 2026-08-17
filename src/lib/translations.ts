export const launchLocales = ["fr", "en"] as const;
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

export function mergeLaunchTranslations(
  current: unknown,
  update: Record<LaunchLocale, string>,
) {
  return { ...translationRecord(current), ...update };
}

export function localizedText(value: unknown, locale: string) {
  const translations = translationRecord(value);
  return translations[locale] ?? translations.fr ?? translations.en ?? "";
}
