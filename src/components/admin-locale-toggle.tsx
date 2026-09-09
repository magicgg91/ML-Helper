"use client";

import { useTranslations } from "next-intl";
import { useLocaleChange } from "./use-locale-change";

// Bloc 47/C: reverts the admin chrome's own display language back to EN/FR
// only — Bloc 44's extension to 5 languages was meant for public content,
// not internal tooling only the team uses. Editorial content locale
// pickers (guides, legal notice, Consommables intro — EditorialLocaleSelect)
// are a separate, unrelated concept and still offer all 5 unchanged.
// Codex review (PR #70): admin and public share one NEXT_LOCALE cookie —
// src/proxy.ts clamps the locale actually rendered for /admin down to
// this same list, so this toggle always shows a real pressed state even
// after an ES/DE/TR choice made while browsing publicly.
const adminLocales = ["en", "fr"] as const;

export function AdminLocaleToggle() {
  const t = useTranslations("common");
  const { locale, change, pending } = useLocaleChange(adminLocales);

  return (
    <div role="group" aria-label={t("language")} className="locale-toggle">
      {adminLocales.map((availableLocale) => (
        <button
          key={availableLocale}
          type="button"
          disabled={pending}
          aria-pressed={availableLocale === locale}
          onClick={() => change(availableLocale)}
        >
          {availableLocale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
