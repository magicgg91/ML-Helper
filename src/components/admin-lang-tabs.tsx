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
export function LangTabs<T extends LaunchLocale = LaunchLocale>({
  locale,
  onChange,
  filled,
  label,
  languageNames,
  locales = launchLocales as unknown as readonly T[],
  hiddenLocales,
  hiddenLabel,
}: {
  locale: T;
  onChange: (locale: T) => void;
  /** Which languages already have text — the others are shown dashed. */
  filled: (locale: T) => boolean;
  /** "Textes en", "Libellés en" — says what these tabs scope. */
  label: string;
  languageNames?: Partial<Record<string, string>>;
  /**
   * Bloc 125 §9: the languages this particular content is stored in. Most
   * screens keep all five; the four reference editors whose model holds one
   * French field and one other-language field pass that pair, because a tab
   * for a language the row has no column for can only overwrite another.
   */
  locales?: readonly T[];
  /**
   * The languages that are switched off in Configuration, and therefore
   * absent from the public site. Shown as a quiet chip so a translation that
   * is written but nowhere to be seen does not read as a bug.
   */
  hiddenLocales?: readonly string[];
  /** "masquée sur le site" — the chip's words and its tooltip. */
  hiddenLabel?: (language: string) => string;
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
        {locales.map((code) => {
          const empty = !filled(code);
          const hidden = hiddenLocales?.includes(code) ?? false;
          const language = languageNames?.[code] ?? code.toUpperCase();
          return (
            <button
              key={code}
              type="button"
              aria-pressed={code === locale}
              // The button shows the code and is named by the language: a
              // two-letter code is an abbreviation, not a name, and the
              // label carries both so speech input still finds it.
              aria-label={[
                t(empty ? "language-to-create" : "language-tab", {
                  language: `${code.toUpperCase()} — ${language}`,
                }),
                hidden ? hiddenLabel?.(language) : undefined,
              ]
                .filter(Boolean)
                .join(" — ")}
              title={hidden ? hiddenLabel?.(language) : undefined}
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
              {hidden && (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block size-1.5 rounded-full bg-admin-neutral-ink/60"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
