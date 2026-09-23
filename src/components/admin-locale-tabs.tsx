"use client";

import { launchLocales, type LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the language tabs of a screen whose whole content is one document
 * per language — the legal notice and a guide.
 *
 * Real tabs, unlike LangTabs: here the panel under them genuinely changes
 * document when the language changes, which is what a tablist describes. A
 * language with nothing written in it yet says so, and opening it gives an
 * empty form; nothing is created in that language until the save.
 */
export function AdminLocaleTabs({
  locale,
  onChange,
  filled,
  label,
  languageNames,
  toCreateLabel,
}: {
  locale: LaunchLocale;
  onChange: (locale: LaunchLocale) => void;
  filled: (locale: LaunchLocale) => boolean;
  /** Names the tablist: "Langue du contenu". */
  label: string;
  languageNames: Record<string, string>;
  /** The words beside a language nobody has written in yet. */
  toCreateLabel: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {launchLocales.map((code) => {
        const empty = !filled(code);
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={code === locale}
            tabIndex={code === locale ? 0 : -1}
            onClick={() => onChange(code)}
            className={cn(
              "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center gap-2 rounded-admin-control border px-3 text-sm",
              code === locale
                ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                : "border-admin-card-border text-admin-dim hover:text-admin-text",
              empty && "border-dashed",
            )}
          >
            {languageNames[code] ?? code.toUpperCase()}
            {empty && (
              <span className="text-xs opacity-80">{toCreateLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
