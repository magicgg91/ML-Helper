"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher({ locales }: { locales: string[] }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  async function change(nextLocale: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    startTransition(() => router.refresh());
  }
  return (
    <label className="locale-switcher">
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
      >
        {locales.map((availableLocale) => (
          <option key={availableLocale} value={availableLocale}>
            {availableLocale.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
