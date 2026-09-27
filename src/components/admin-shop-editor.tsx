"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  consumableCategories,
  emptyConsumableRow,
  type ConsumableCatalog,
  type ConsumableCategory,
  type ConsumableRow,
} from "@/lib/consumables";
import {
  localizedFieldLocales,
  readableInEveryLocale,
  withLocalizedFieldLocale,
  type LocalizedField,
} from "@/lib/localized-field";
import {
  launchLocales,
  localizedText,
  type LaunchLocale,
} from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { CollapsibleGroup } from "./admin-collapsible-group";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { EditorHeader } from "./admin-editor-header";
import { LangTabs } from "./admin-lang-tabs";
import { NumberField } from "./admin-number-field";
import { Pill } from "./admin-pill";
import { RowActions } from "./admin-row-actions";
import type { EditorScreenProps } from "./admin-tool-editors";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the Boutique reference, as a list and a panel.
 *
 * The screen it replaces put every field of every item in one row of a
 * table, which meant a Markdown description — several lines of it — was
 * being edited through a single-line input a few centimetres wide. The list
 * on the left now shows what an item *is* (thumbnail, name, one line of its
 * description, cost) and the panel on the right edits the selected one, with
 * the description in a textarea that can actually hold it.
 *
 * Bloc 127 (PR 1/3): an item's name and description are captured in each of
 * the site's languages, not in an fr/en pair — so the tabs here are the five
 * launch locales, and typing German writes German. The pair was what made a DE
 * tab overwrite the English column (Bloc 125 §9).
 *
 * A language nobody has written stays absent rather than saved blank: the
 * public read falls back to English, which an empty string would defeat
 * (Bloc 126/D). Nothing is ever translated automatically.
 */

type ShopSection = "intro" | ConsumableCategory;
const shopSections: readonly ShopSection[] = ["intro", ...consumableCategories];

/** One line of a Markdown description, as text — for the list, not the page. */
export function descriptionExcerpt(markdown: string): string {
  const firstLine = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "";
  return (
    firstLine
      // The marks that carry no words: headings, quotes, bullets, emphasis.
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s+/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim()
  );
}

export function ShopReferenceEditor({
  initialCatalog,
  backHref,
  backLabel,
  title,
  hiddenLocales,
}: EditorScreenProps & {
  initialCatalog: ConsumableCatalog;
  /**
   * Les langues éteintes dans Configuration : leur onglet le dit, pour qu'une
   * traduction écrite et invisible ne se lise pas comme un enregistrement
   * raté (même traitement que les guides et les mentions légales).
   */
  hiddenLocales?: readonly string[];
}) {
  const t = useTranslations("admin.references");
  const categoryLabel = useTranslations("references.consommables.categories");
  const languageNames = useTranslations("admin.config.languages");
  const [locale, setLocale] = useState<LaunchLocale>("fr");
  const [open, setOpen] = useState<Set<ShopSection>>(new Set(shopSections));
  const [selected, setSelected] = useState<{
    section: ShopSection;
    index: number;
  }>(() => ({
    // The first section that has anything in it: opening on an empty Intro
    // would show a list with no panel beside it.
    section:
      shopSections.find((section) => initialCatalog[section].length > 0) ??
      "intro",
    index: 0,
  }));
  const [removing, setRemoving] = useState<{
    section: ShopSection;
    index: number;
  }>();

  const form = useEditorForm<ConsumableCatalog>({
    initial: initialCatalog,
    endpoint: "/api/admin/guides/references/consumables",
    validate: (catalog) => {
      // The same two rules the screen already enforced, reported once by the
      // one save button instead of per field.
      //
      // Bloc 127: not "in the language on screen". Five languages over ~40
      // items means DE/ES/TR are written over time, and a rule that demanded
      // the open tab be complete would have blocked every save until it was —
      // which is how a screen teaches its user to invent translations.
      //
      // Revue Codex (PR #167, P2) : « au moins une langue » ne suffisait pas
      // pour autant. Le repli public va de la langue du visiteur à l'anglais
      // puis au français : une ligne écrite en allemand seul est blanche pour
      // tous les autres. La règle est donc celle des guides — français OU
      // anglais — et les trois autres langues restent facultatives.
      for (const section of shopSections)
        for (const row of catalog[section]) {
          if (
            !readableInEveryLocale(row.name) ||
            !readableInEveryLocale(row.description)
          )
            return t("required-fallback");
          if (row.cost !== "" && !(Number(row.cost) >= 0))
            return t("minimum", { min: 0 });
        }
      return undefined;
    },
  });
  const catalog = form.value;

  const sectionName = (section: ShopSection) =>
    section === "intro" ? t("consumables-intro-title") : categoryLabel(section);

  /**
   * Ce que la liste affiche d'une ligne : le texte de la langue ouverte, et à
   * défaut celui que le public lirait (anglais puis français). Afficher
   * « Objet sans nom » dès qu'une langue manque rendrait la liste illisible
   * sur l'onglet DE, alors que les pastilles des onglets disent déjà quelles
   * langues sont écrites. Le champ du panneau, lui, montre la langue ouverte
   * telle quelle — c'est là qu'on écrit.
   */
  const inLocale = (field: LocalizedField) => localizedText(field, locale);

  const item: ConsumableRow | undefined =
    catalog[selected.section]?.[selected.index];

  const setRows = (section: ShopSection, rows: ConsumableRow[]) =>
    form.setValue((current) => ({ ...current, [section]: rows }));

  const setField = (
    field: keyof ConsumableRow,
    value: string | LocalizedField,
  ) =>
    setRows(
      selected.section,
      catalog[selected.section].map((row, index) =>
        index === selected.index ? { ...row, [field]: value } : row,
      ),
    );

  function addRow(section: ShopSection) {
    setRows(section, [...catalog[section], { ...emptyConsumableRow }]);
    setSelected({ section, index: catalog[section].length });
    setOpen((current) => new Set(current).add(section));
  }

  function move(section: ShopSection, index: number, direction: -1 | 1) {
    const rows = catalog[section];
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(section, next);
    if (selected.section === section && selected.index === index)
      setSelected({ section, index: target });
  }

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        pills={
          <LangTabs
            locale={locale}
            onChange={setLocale}
            label={t("texts-in")}
            filled={(code) =>
              shopSections.some((section) =>
                catalog[section].some((row) =>
                  localizedFieldLocales(row.name).includes(code),
                ),
              )
            }
            languageNames={Object.fromEntries(
              launchLocales.map((code) => [
                code,
                languageNames.has(code)
                  ? languageNames(code)
                  : code.toUpperCase(),
              ]),
            )}
            hiddenLocales={hiddenLocales}
            hiddenLabel={(language) => t("language-hidden", { language })}
          />
        }
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {shopSections.map((section) => (
            <CollapsibleGroup
              key={section}
              title={sectionName(section)}
              open={open.has(section)}
              onToggle={(next) =>
                setOpen((current) => {
                  const updated = new Set(current);
                  if (next) updated.add(section);
                  else updated.delete(section);
                  return updated;
                })
              }
              count={t("item-count", { count: catalog[section].length })}
              actions={
                <AdminButton
                  type="button"
                  size="sm"
                  data-testid={`add-row-${section}`}
                  onClick={() => addRow(section)}
                >
                  {t("add-category", { category: sectionName(section) })}
                </AdminButton>
              }
            >
              {catalog[section].length === 0 ? (
                <p className="px-3 py-3 text-sm text-admin-dim">{t("empty")}</p>
              ) : (
                <ul>
                  {catalog[section].map((row, index) => {
                    const isSelected =
                      selected.section === section && selected.index === index;
                    return (
                      <li
                        key={index}
                        className={cn(
                          "flex items-center gap-3 border-b border-admin-rule-soft px-3 py-2 last:border-0",
                          isSelected && "bg-admin-accent-soft",
                        )}
                      >
                        <button
                          type="button"
                          aria-current={isSelected ? "true" : undefined}
                          className="admin-focus flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => setSelected({ section, index })}
                        >
                          {row.image ? (
                            <Image
                              alt=""
                              className="size-10 shrink-0 rounded-admin-control object-cover"
                              height={40}
                              src={row.image}
                              width={40}
                            />
                          ) : (
                            <span className="size-10 shrink-0 rounded-admin-control border border-dashed border-admin-card-border" />
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold text-admin-text">
                              {inLocale(row.name) || t("item-unnamed")}
                            </span>
                            <span className="truncate text-xs text-admin-dim">
                              {descriptionExcerpt(inLocale(row.description)) ||
                                t("description-to-write")}
                            </span>
                          </span>
                        </button>
                        {section !== "intro" && (
                          <Pill tone={row.cost ? "neutral" : "warn"}>
                            {row.cost
                              ? `${row.cost} ${t("sapphires")}`
                              : t("cost-unconfirmed")}
                          </Pill>
                        )}
                        <RowActions
                          name={inLocale(row.name) || t("item-unnamed")}
                          isFirst={index === 0}
                          isLast={index === catalog[section].length - 1}
                          onMoveUp={() => move(section, index, -1)}
                          onMoveDown={() => move(section, index, 1)}
                          onRemove={() => setRemoving({ section, index })}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CollapsibleGroup>
          ))}
        </div>

        {item && (
          <aside
            aria-label={t("item-panel")}
            className="flex w-full shrink-0 flex-col gap-4 self-start rounded-admin-card border border-admin-card-border bg-admin-card p-5 xl:w-[360px]"
          >
            <h2 className="admin-section-title text-admin-text">
              {inLocale(item.name) || t("item-unnamed")}
            </h2>
            <div className="flex items-start gap-3">
              {item.image ? (
                <Image
                  alt=""
                  className="size-[72px] rounded-admin-control object-cover"
                  height={72}
                  src={item.image}
                  width={72}
                />
              ) : (
                <span className="size-[72px] rounded-admin-control border border-dashed border-admin-card-border" />
              )}
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-admin-dim">
                {t("consumables-columns.image")}
                <input
                  className="admin-control admin-focus h-9 w-full rounded-admin-control border border-admin-card-border bg-admin-card px-2 font-admin-mono text-xs text-admin-text"
                  type="text"
                  value={item.image}
                  onChange={(event) => setField("image", event.target.value)}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
              {t("consumables-columns.name")}
              <input
                className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                type="text"
                value={item.name[locale] ?? ""}
                onChange={(event) =>
                  setField(
                    "name",
                    withLocalizedFieldLocale(
                      item.name,
                      locale,
                      event.target.value,
                    ),
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
              {t("consumables-columns.description-markdown")}
              {/* Bloc 125 §7: six rows, 150 px at the very least, resizable
                  vertically, and set at 13/1.6 — the line height of something
                  read back as prose rather than of a one-line field. The
                  label says Markdown, because that is what goes in it. */}
              <textarea
                rows={6}
                className="admin-control admin-focus min-h-[150px] resize-y rounded-admin-control border border-admin-card-border bg-admin-card px-2 py-1.5 font-admin-body text-[13px] leading-[1.6] text-admin-text"
                value={item.description[locale] ?? ""}
                onChange={(event) =>
                  setField(
                    "description",
                    withLocalizedFieldLocale(
                      item.description,
                      locale,
                      event.target.value,
                    ),
                  )
                }
              />
            </label>
            {selected.section !== "intro" && (
              <NumberField
                label={t("consumables-columns.cost")}
                width="l"
                unit={t("sapphires")}
                value={item.cost === "" ? null : Number(item.cost)}
                onChange={(next) =>
                  setField("cost", next === null ? "" : String(next))
                }
              />
            )}
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title={t("remove")}
        description={t("confirm-remove")}
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => {
          const target = removing;
          setRemoving(undefined);
          if (!target) return;
          setRows(
            target.section,
            catalog[target.section].filter((_, i) => i !== target.index),
          );
          setSelected({ section: target.section, index: 0 });
        }}
      />
    </div>
  );
}
