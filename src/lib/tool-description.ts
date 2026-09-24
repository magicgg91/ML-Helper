import {
  dropEmptyLocales,
  launchLocales,
  translationRecord,
  type LaunchLocale,
} from "./translations";

/**
 * Bloc 130: the one-line description of a tool or a reference, in every
 * language the site ships.
 *
 * It lives in `calculators.description`, beside the `active` flag that the
 * Visible switch writes — the same row, because a tool and its description
 * are one record. Tools and references share that table (references are the
 * `referenceToolSlugs` rows), so both get this for free.
 *
 * The column already existed: declared by the initial migration, written as
 * `{}` by every insert since, and read by nothing. It is what section 6 of
 * the cahier des charges always meant by "contenu dynamique … stocké en JSON
 * par locale en base" — so this bloc fills a shape that was already there
 * rather than adding a column. No migration; see the PR.
 *
 * Shaped like a guide's title or the legal notice: one object per record
 * carrying N languages, never a key in `messages/*.json`. Interface text is
 * a key; what an editor writes is a row.
 */
export type ToolDescription = Partial<Record<LaunchLocale, string>>;

/** The stored value, as a record this app can index by locale. */
export function parseToolDescription(value: unknown): ToolDescription {
  const stored = translationRecord(value);
  return Object.fromEntries(
    launchLocales
      .filter((locale) => stored[locale] !== undefined)
      .map((locale) => [locale, stored[locale]]),
  );
}

/** Every launch locale, blank where nothing is written — what a form needs. */
export function toolDescriptionForm(
  value: unknown,
): Record<LaunchLocale, string> {
  const stored = parseToolDescription(value);
  return Object.fromEntries(
    launchLocales.map((locale) => [locale, stored[locale] ?? ""]),
  ) as Record<LaunchLocale, string>;
}

/**
 * What gets stored, from what a form holds.
 *
 * A language left blank is dropped rather than written as "", the same rule
 * `dropEmptyLocales` applies to the legal notice: an explicit empty string
 * would be a translation that exists and says nothing, and Bloc 126/D showed
 * what that costs — `localizedText` treats it as written and stops there
 * instead of falling back to a language that has something to say.
 *
 * Whitespace is trimmed first, so a field cleared to a space clears.
 */
export function toolDescriptionToStore(
  form: Partial<Record<string, string>>,
): ToolDescription {
  return dropEmptyLocales(
    Object.fromEntries(
      launchLocales.map((locale) => [locale, (form[locale] ?? "").trim()]),
    ),
  ) as ToolDescription;
}

/**
 * The longest a description may be.
 *
 * It is one line under a title on the public pages (Bloc 129), not a
 * paragraph: the limit is what keeps it that, and it is enforced on the
 * server as well as shown in the form.
 */
export const toolDescriptionMaxLength = 180;
