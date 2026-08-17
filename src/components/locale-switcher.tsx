"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
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
      <span className="sr-only">Language / Langue</span>
      <select
        aria-label="Language / Langue"
        value={locale}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
