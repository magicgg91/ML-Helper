"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatGameNumber } from "@/lib/format";
import { templarKeys, type TemplarKey } from "@/lib/player-settings";
import {
  templarLevelCost,
  type TemplarParameters,
} from "@/lib/templar-parameters";
import type {
  TemplarPresentationCatalog,
  TemplarPresentationRow,
} from "@/lib/templars-presentation";
import { contentPairLocales, type ContentPairLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { FormulaBox } from "./admin-formula-box";
import { LangTabs } from "./admin-lang-tabs";
import { NumberField } from "./admin-number-field";
import { Pill } from "./admin-pill";
import type { EditorScreenProps } from "./admin-tool-editors";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the Templiers screen — the cost formula and the five
 * presentation rows, under **one** save.
 *
 * This is the screen the brief singles out: it carried two buttons
 * ("Enregistrer les paramètres" and "Enregistrer toute la page"), so half the
 * work could be stored and the other half lost. The two now travel in one
 * request that writes both in one transaction (see the route).
 *
 * The cost preview calls `templarLevelCost` — the public tool's own function.
 * Copying the expression here is exactly how the admin and the public page
 * end up disagreeing about what the site charges.
 */

type TemplarsScreen = {
  parameters: TemplarParameters;
  presentation: TemplarPresentationCatalog;
};

/** The two editorial languages this catalog stores (as every reference does). */
const previewLevels = [1, 2, 3, 4, 5];

export function TemplarsEditor({
  initialParameters,
  initialPresentation,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & {
  initialParameters: TemplarParameters;
  initialPresentation: TemplarPresentationCatalog;
}) {
  const t = useTranslations("admin.templar-parameters");
  const names = useTranslations("game.templars");
  const languageNames = useTranslations("admin.config.languages");
  const [locale, setLocale] = useState<ContentPairLocale>("fr");
  const form = useEditorForm<TemplarsScreen>({
    initial: {
      parameters: initialParameters,
      presentation: initialPresentation,
    },
    endpoint: "/api/admin/tools/templars",
  });
  const { parameters, presentation } = form.value;

  const lang = locale;
  const nameKey = `name_${lang}` as const;
  const descriptionKey = `description_${lang}` as const;

  const setRow = (
    key: TemplarKey,
    field: keyof TemplarPresentationRow,
    next: string,
  ) =>
    form.setValue((current) => ({
      ...current,
      presentation: {
        ...current.presentation,
        [key]: { ...current.presentation[key], [field]: next },
      },
    }));

  // The catalog stores its two numbers as strings, empty meaning "not
  // confirmed" (templars-presentation.ts) — so they go through NumberField's
  // null state rather than being forced to a value.
  const numberOf = (raw: string) => (raw.trim() === "" ? null : Number(raw));
  const rawOf = (next: number | null) => (next === null ? "" : String(next));

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        pills={<Pill tone="accent">{t("shared-with-reference")}</Pill>}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />

      <EditorSection title={t("cost-section")}>
        <FormulaBox>{t("formula")}</FormulaBox>
        {/* Bloc 125 §5: the preview sits on the same line as the two numbers
            it is computed from, aligned on their baseline, instead of a
            paragraph below them. What the ratio does to the first five
            levels is the answer to "what should I type here" — it belongs
            beside the field, not under it. */}
        <div className="grid items-end gap-5 lg:grid-cols-[200px_200px_minmax(0,1fr)]">
          <NumberField
            label={t("base")}
            value={parameters.base}
            width="m"
            onChange={(base) =>
              form.setValue((current) => ({
                ...current,
                parameters: { ...current.parameters, base: base as number },
              }))
            }
          />
          <NumberField
            label={t("ratio")}
            value={parameters.ratio}
            width="m"
            onChange={(ratio) =>
              form.setValue((current) => ({
                ...current,
                parameters: { ...current.parameters, ratio: ratio as number },
              }))
            }
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="admin-eyebrow text-admin-dim">
              {t("preview-levels", {
                first: previewLevels[0],
                last: previewLevels[previewLevels.length - 1],
              })}
            </span>
            {/* The five costs as one line of figures, in the order the
                eyebrow above announces. The labelled chips this replaces
                wrapped onto a second line at this width, which broke the
                36 px the row is aligned on; each figure still says which
                level it is, for anyone reading with a screen reader.
                `tabular-nums`, not a monospace face: Bloc 119 §1 keeps that
                family for hours, identifiers and language codes. */}
            <ol className="flex h-9 items-center gap-2 overflow-hidden rounded-admin-control border border-admin-card-border bg-admin-head px-3 text-sm">
              {previewLevels.map((level, index) => (
                <li
                  key={level}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {index > 0 && (
                    <span aria-hidden="true" className="text-admin-dim">
                      ·
                    </span>
                  )}
                  <span className="sr-only">{t("level", { level })}</span>
                  <span className="font-semibold tabular-nums text-admin-text">
                    {formatGameNumber(templarLevelCost(level, parameters))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title={t("presentation-section")}
        description={t("presentation-help")}
        actions={
          <LangTabs
            locales={contentPairLocales}
            locale={locale}
            onChange={setLocale}
            label={t("texts-in")}
            filled={(code) => {
              const field = `name_${code}` as const;
              return templarKeys.some((key) => presentation[key][field].trim());
            }}
            languageNames={Object.fromEntries(
              contentPairLocales.map((code) => [
                code,
                languageNames.has(code)
                  ? languageNames(code)
                  : code.toUpperCase(),
              ]),
            )}
          />
        }
      >
        <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("presentation-section")}</caption>
            <thead className="bg-admin-head">
              <tr className="border-b border-admin-rule">
                {[
                  "columns.image",
                  "columns.name",
                  "columns.description",
                  "columns.temple-base",
                  "columns.bonus",
                ].map((key) => (
                  <th
                    key={key}
                    className="admin-column-head px-3 py-2 text-left text-admin-dim"
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templarKeys.map((key) => {
                const row = presentation[key];
                const description = row[descriptionKey];
                return (
                  <tr
                    key={key}
                    className="border-b border-admin-rule-soft align-top last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {row.image ? (
                          <Image
                            alt=""
                            className="size-10 rounded-admin-control object-cover"
                            height={40}
                            src={row.image}
                            width={40}
                          />
                        ) : (
                          <span className="size-10 rounded-admin-control border border-dashed border-admin-card-border" />
                        )}
                        <span className="flex flex-col gap-1">
                          {/* A file path is an identifier — one of the three
                              places §1 keeps the mono family for. */}
                          <span className="font-admin-mono text-xs text-admin-dim">
                            {row.image || t("no-image")}
                          </span>
                          <ImagePathField
                            label={t("image-of", { name: names(key) })}
                            value={row.image}
                            onChange={(next) => setRow(key, "image", next)}
                            changeLabel={t("change-image")}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        aria-label={t("name-of", { name: names(key) })}
                        className="admin-control admin-focus h-9 w-full min-w-[140px] rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                        type="text"
                        value={row[nameKey]}
                        onChange={(event) =>
                          setRow(key, nameKey, event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        aria-label={t("description-of", { name: names(key) })}
                        className={cn(
                          "admin-control admin-focus min-h-[72px] w-full min-w-[220px] rounded-admin-control border bg-admin-card px-2 py-1.5 text-sm text-admin-text",
                          description.trim()
                            ? "border-admin-card-border"
                            : "border-dashed border-admin-warn-ink/60",
                        )}
                        placeholder={t("description-to-write")}
                        value={description}
                        onChange={(event) =>
                          setRow(key, descriptionKey, event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumberField
                        label={t("temple-base-of", { name: names(key) })}
                        hideLabel
                        width="s"
                        value={numberOf(row.temple_base)}
                        onChange={(next) =>
                          setRow(key, "temple_base", rawOf(next))
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumberField
                        label={t("bonus-of", { name: names(key) })}
                        hideLabel
                        width="s"
                        unit="%"
                        value={numberOf(row.bonus)}
                        onChange={(next) => setRow(key, "bonus", rawOf(next))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </EditorSection>
    </div>
  );
}

/**
 * The image path, edited in place: the thumbnail and the path are what an
 * admin reads, the field is what they need only when changing it, so it stays
 * folded until they ask for it.
 */
function ImagePathField({
  label,
  value,
  onChange,
  changeLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  changeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <AdminButton
        type="button"
        size="sm"
        variant="ghost"
        className="self-start px-0"
        onClick={() => setOpen(true)}
      >
        {changeLabel}
      </AdminButton>
    );
  return (
    <input
      aria-label={label}
      autoFocus
      className="admin-control admin-focus h-9 w-full min-w-[180px] rounded-admin-control border border-admin-card-border bg-admin-card px-2 font-admin-mono text-xs text-admin-text"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
