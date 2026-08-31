"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useLocaleChange } from "./use-locale-change";

// Bloc 47/A: a styled <select> instead of one button per locale — still
// looks like the site's existing pill controls (ThemeToggle,
// AdminLocaleToggle), just compact enough for 5 languages instead of 2.
export function LocaleToggle({ locales }: { locales: string[] }) {
  const t = useTranslations("common");
  const { locale, change, pending } = useLocaleChange(locales);

  return (
    <div className="locale-select">
      <select
        aria-label={t("language")}
        disabled={pending}
        value={locale}
        onChange={(event) => change(event.target.value)}
      >
        {locales.map((availableLocale) => (
          <option key={availableLocale} value={availableLocale}>
            {availableLocale.toUpperCase()}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={14}
        className="locale-select-chevron"
      />
    </div>
  );
}
