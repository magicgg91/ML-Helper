"use client";

import { useEffect } from "react";

// Bloc 91/E1: <html lang> is emitted by the ROOT layout (getLocale()), a shared
// ancestor of both the /[locale]/… subtree and the deliberately non-prefixed
// admin/login routes. Next.js does not re-render that shared root layout on a
// soft navigation that only changes the [locale] segment (e.g. the LocaleToggle
// going /fr/tools → /en/tools) — only the [locale] layout below it re-renders.
// This keeps document.documentElement.lang in sync with the active locale after
// such a switch, so assistive tech (and the e2e switchLocale helper) always see
// the language actually being displayed.
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return null;
}
