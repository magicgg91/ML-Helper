"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

// Bloc 47/B: same storage-key convention as ThemeToggle's "mlhelper_theme"
// (Bloc 33/B) — the chosen locale (auto-detected server-side by
// src/proxy.ts, or picked manually) is mirrored here so a returning visit
// stays consistent even if the NEXT_LOCALE cookie (the actual SSR source
// of truth, read in src/i18n/request.ts) gets cleared separately.
export const localeStorageKey = "mlhelper_locale";

// Shared by LocaleToggle (public, 5 locales) and AdminLocaleToggle (admin
// chrome, EN/FR only) — same fetch-then-refresh mechanism, only the
// `locales` list and the rendered control differ between the two.
export function useLocaleChange(locales: readonly string[]) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(nextLocale: string) {
    if (nextLocale === locale) return;
    // Codex review (PR #70): a non-2xx response still resolves this
    // promise — without checking response.ok (and catching a rejected
    // request), a failed cookie write would still get persisted to
    // localStorage and trigger a refresh, and the sync-on-mount effect
    // would keep retrying it as if it had succeeded.
    let ok = false;
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      ok = response.ok;
    } catch {
      // Network failure — nothing persisted, nothing refreshed; the next
      // manual pick or mount-time sync attempt simply tries again.
    }
    if (!ok) return;
    try {
      localStorage.setItem(localeStorageKey, nextLocale);
    } catch {
      // Private browsing / storage-restricted contexts — the cookie above
      // still carries the choice, localStorage is only a convenience layer.
    }
    startTransition(() => router.refresh());
  }

  // Reconciles a previously-saved choice, e.g. if the NEXT_LOCALE cookie
  // was cleared independently of localStorage. Only acts on a locale this
  // particular toggle actually offers — AdminLocaleToggle's EN/FR-only
  // list naturally ignores a DE/ES/TR choice made while browsing publicly.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(localeStorageKey);
    } catch {
      return;
    }
    if (saved && saved !== locale && locales.includes(saved))
      void change(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { locale, change, pending };
}
