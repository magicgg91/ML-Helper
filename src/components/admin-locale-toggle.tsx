"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminLocaleToggle({ locales }: { locales: string[] }) {
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
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center rounded-md border border-border"
    >
      {locales.map((availableLocale, index) => (
        <Button
          key={availableLocale}
          type="button"
          size="sm"
          variant={availableLocale === locale ? "secondary" : "ghost"}
          disabled={pending}
          aria-pressed={availableLocale === locale}
          onClick={() => change(availableLocale)}
          className={cn(
            "rounded-none border-0",
            index === 0 && "rounded-l-md",
            index === locales.length - 1 && "rounded-r-md",
            index > 0 && "border-l border-border",
          )}
        >
          {availableLocale.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
