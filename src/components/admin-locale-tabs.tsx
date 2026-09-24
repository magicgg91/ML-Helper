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
  hiddenLocales,
  hiddenLabel,
}: {
  locale: LaunchLocale;
  onChange: (locale: LaunchLocale) => void;
  filled: (locale: LaunchLocale) => boolean;
  /** Names the tablist: "Langue du contenu". */
  label: string;
  languageNames: Record<string, string>;
  /** The words beside a language nobody has written in yet. */
  toCreateLabel: string;
  /**
   * Bloc 125 §9: the languages switched off in Configuration, and so absent
   * from the public site. Written but invisible is a normal state here — it
   * is what a language waiting to be launched looks like — so the tab says
   * so, quietly, rather than leaving it to be mistaken for a bug.
   */
  hiddenLocales?: readonly string[];
  /** "masquée sur le site" — the chip's words. */
  hiddenLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {launchLocales.map((code) => {
        const empty = !filled(code);
        const hidden = hiddenLocales?.includes(code) ?? false;
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
            {hidden && hiddenLabel && (
              <span
                title={hiddenLabel}
                className="inline-flex h-[var(--admin-pill-h)] items-center rounded-full bg-admin-neutral px-2 text-[11px] font-semibold text-admin-neutral-ink"
              >
                {hiddenLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
