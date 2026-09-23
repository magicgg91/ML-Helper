"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { launchLocales, type LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";

/**
 * Bloc 119 §3 bis: the language switch of an edit screen.
 *
 * It sits **only** on the sections that hold translatable text, never at the
 * top of a screen whose other half is numbers: a coefficient is the same in
 * every language, and a control that seemed to scope it would be a lie.
 *
 * Switching keeps the edits: the caller holds one form state covering every
 * language, so these buttons choose what is shown, never what is kept. A
 * language with nothing written yet is dashed, the way the Pages légales tabs
 * mark theirs.
 *
 * `aria-pressed` and not `role="tab"`: there is no tabpanel here — the same
 * fields stay in place and change language, which is what a pressed toggle
 * describes (the Pages légales screen, whose whole content is one document
 * per language, does use real tabs).
 */
export function LangTabs({
  locale,
  onChange,
  filled,
  label,
  languageNames,
}: {
  locale: LaunchLocale;
  onChange: (locale: LaunchLocale) => void;
  /** Which languages already have text — the others are shown dashed. */
  filled: (locale: LaunchLocale) => boolean;
  /** "Textes en", "Libellés en" — says what these tabs scope. */
  label: string;
  languageNames?: Partial<Record<string, string>>;
}) {
  const t = useTranslations("admin.editor");
  // Several sections of one screen can carry their own tabs (a set of labels
  // and the sets below it), so the group's label needs a unique id.
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="admin-eyebrow text-admin-dim" id={labelId}>
        {label}
      </span>
      <div
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1"
        role="group"
      >
        {launchLocales.map((code) => {
          const empty = !filled(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={code === locale}
              aria-label={
                empty
                  ? t("language-to-create", {
                      language: languageNames?.[code] ?? code.toUpperCase(),
                    })
                  : undefined
              }
              className={cn(
                "admin-focus inline-flex h-[var(--admin-control-h-sm)] items-center rounded-admin-control border px-3 font-admin-mono text-xs font-semibold uppercase",
                code === locale
                  ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                  : "border-admin-card-border text-admin-dim hover:text-admin-text",
                empty && "border-dashed",
              )}
              onClick={() => onChange(code)}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
