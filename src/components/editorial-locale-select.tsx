export const editorialLocales = ["fr", "en"] as const;

export type EditorialLocale = (typeof editorialLocales)[number];

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
