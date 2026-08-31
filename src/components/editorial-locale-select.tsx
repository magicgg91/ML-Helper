// Bloc 44: same list as launchLocales (per-record editorial content and the
// static UI text bundles activate together) — re-exported under its own
// name rather than duplicated, so the two can't drift.
import { launchLocales, type LaunchLocale } from "../lib/translations";

export const editorialLocales = launchLocales;
export type EditorialLocale = LaunchLocale;

export function EditorialLocaleSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EditorialLocale;
  onChange: (locale: EditorialLocale) => void;
}) {
  return (
    <label className="editorial-locale-select">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as EditorialLocale)}
      >
        {editorialLocales.map((locale) => (
          <option key={locale} value={locale}>
            {locale.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
