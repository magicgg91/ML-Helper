"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleToggle({ locales }: { locales: string[] }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(nextLocale: string) {
    if (nextLocale === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div role="group" aria-label={t("language")} className="locale-toggle">
      {locales.map((availableLocale) => (
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
