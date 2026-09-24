"use client";

import { useTranslations } from "next-intl";
import { adminLocales, type AdminLocale } from "@/lib/translations";
import { AdminSegmented } from "./admin-segmented";
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
// Bloc 118: `adminLocales` now comes from lib/translations.ts — one list
// shared with the middleware clamp and the message files.

// Bloc 125 §2: a segmented control rather than two filled violet buttons.
// A solid accent fill reads as "this button does something"; the admin's
// language is a state, and the maquette shows it as one — a grey track with
// the active language raised out of it in white.
// The maquette reads FR | EN. `adminLocales` is a membership list whose own
// order is a fallback order elsewhere (the middleware clamp), so it is not
// reordered; the display order is declared here instead — as a Record over
// AdminLocale, so a language added to the list has to be given a place before
// this compiles.
const displayOrder: Record<AdminLocale, number> = { fr: 0, en: 1 };
const orderedLocales = [...adminLocales].sort(
  (a, b) => displayOrder[a] - displayOrder[b],
);

// Bloc 125 §2: a segmented control rather than two filled violet buttons.
// A solid accent fill reads as "this button does something"; the admin's
// language is a state, and the maquette shows it as one — a grey track with
// the active language raised out of it in white.
export function AdminLocaleToggle() {
  const t = useTranslations("common");
  const { locale, change, pending } = useLocaleChange(adminLocales);
  const current = orderedLocales.find((code) => code === locale);

  return (
    <AdminSegmented
      options={orderedLocales}
      // src/proxy.ts clamps the admin to these two, so `current` is only ever
      // undefined for the frame before a refresh lands.
      value={current ?? orderedLocales[0]}
      onChange={change}
      disabled={pending}
      label={t("language")}
      optionLabel={(code) => code.toUpperCase()}
    />
  );
}
