"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  EditableDataTable,
  errorKey,
  type EditableColumn,
  type FieldErrors,
} from "./editable-reference-table";
import { EditorActionBar } from "./editor-action-bar";
import {
  EditorialLocaleSelect,
  type EditorialLocale,
} from "./editorial-locale-select";
import {
  consumableCategories,
  emptyConsumableRow,
  type ConsumableCatalog,
  type ConsumableCategory,
  type ConsumableRow,
} from "../lib/consumables";

// Bloc 48/A: the editorial locale selector drives which language's
// Nom/Description columns every table edits and displays — only fr/en are
// actually captured per item (no de/es/tr item text yet), so any non-fr
// editorial locale edits the EN columns, matching the public table's own
// non-fr fallback to English (Bloc44-review/C).
function fieldLocale(locale: EditorialLocale): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

// Bloc 58/A: the free-text markdown intro zone is gone, replaced by an
// "intro" table — same row shape and CRUD as the 4 category tables, always
// rendered first and never part of the category filter/errors machinery
// below, so it's tracked as its own section alongside (not inside)
// ConsumableCategory.
type ConsumableSection = "intro" | ConsumableCategory;
const consumableSections: readonly ConsumableSection[] = [
  "intro",
  ...consumableCategories,
];

type SectionErrors = Record<ConsumableSection, FieldErrors>;
const emptySectionErrors = Object.fromEntries(
  consumableSections.map((section) => [section, {}]),
) as SectionErrors;

// Bloc 43: Consumables is the first reference with free row CRUD (add,
// remove, 1-position reorder), all editable from a single screen with one
// shared EditorActionBar (Bloc 35/10.2/10.3 convention: one back link, not
// one per section).
// Bloc 48/B: the single table-with-category-column is replaced by
// independent tables, one per section — category is implicit to which
// table a row lives in, each with its own scoped Add button and its own
// independent up/down ordering.
export function ConsumablesReferenceScreen({
  initialCatalog,
}: {
  initialCatalog: ConsumableCatalog;
}) {
  const t = useTranslations("admin.references");
  const categoryLabel = useTranslations("references.consommables.categories");
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [catalog, setCatalog] = useState<ConsumableCatalog>(initialCatalog);
  const [errors, setErrors] = useState<SectionErrors>(emptySectionErrors);
  const [status, setStatus] = useState("");

  const lang = fieldLocale(locale);
  const nameKey = lang === "fr" ? "name_fr" : "name_en";
  const descriptionKey = lang === "fr" ? "description_fr" : "description_en";

  const nameAndDescriptionColumns: EditableColumn<ConsumableRow>[] = [
    { key: "image", label: t("consumables-columns.image") },
    { key: nameKey, label: t("consumables-columns.name"), required: true },
    {
      key: descriptionKey,
      label: t("consumables-columns.description"),
      required: true,
      wide: true,
    },
  ] as EditableColumn<ConsumableRow>[];
  const costColumn: EditableColumn<ConsumableRow> = {
    key: "cost",
    label: t("consumables-columns.cost"),
    type: "number",
    min: 0,
    step: 1,
    narrow: true,
  } as EditableColumn<ConsumableRow>;
  // Bloc 58/A: intro has no Coût column — it's a 3-column table (Image,
  // Nom, Description), the other 4 keep their Coût column unchanged.
  const columnsForSection = (section: ConsumableSection) => {
    const base =
      section === "intro"
        ? nameAndDescriptionColumns
        : [...nameAndDescriptionColumns, costColumn];
    const sectionLabel =
      section === "intro" ? t("consumables-intro-title") : categoryLabel(section);
    return base.map((column) => ({
      ...column,
      inputLabel: (index: number) =>
        t("category-row-label", {
          category: sectionLabel,
          row: index + 1,
          field: column.label,
        }),
    }));
  };

  function setSectionRows(section: ConsumableSection, rows: ConsumableRow[]) {
    setCatalog((current) => ({ ...current, [section]: rows }));
  }

  function addRow(section: ConsumableSection) {
    setCatalog((current) => ({
      ...current,
      [section]: [...current[section], { ...emptyConsumableRow }],
    }));
  }

  function removeRow(section: ConsumableSection, index: number) {
    setCatalog((current) => ({
      ...current,
      [section]: current[section].filter((_, i) => i !== index),
    }));
  }

  function moveRow(
    section: ConsumableSection,
    index: number,
    direction: -1 | 1,
  ) {
    setCatalog((current) => {
      const rows = current[section];
      const target = index + direction;
      if (target < 0 || target >= rows.length) return current;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, [section]: next };
    });
  }

  function validateRows() {
    const next: SectionErrors = { ...emptySectionErrors };
    let valid = true;
    for (const section of consumableSections) {
      const sectionErrors: FieldErrors = {};
      const columns = columnsForSection(section);
      catalog[section].forEach((row, rowIndex) =>
        columns.forEach((column) => {
          const value = row[column.key];
          const key = errorKey(rowIndex, column.key);
          if (column.required && !value.trim())
            sectionErrors[key] = t("required");
          if (column.type === "number" && value !== "") {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0)
              sectionErrors[key] = t("minimum", { min: 0 });
          }
        }),
      );
      if (Object.keys(sectionErrors).length) valid = false;
      next[section] = sectionErrors;
    }
    setErrors(next);
    return valid;
  }

  // Bloc 44 review: one save action for all sections, not several — a
  // click on one section's button, then navigating away, silently
  // discarded whichever section wasn't clicked.
  // Bloc 57/A, Bloc 58/A: a single request for the whole catalog (intro
  // included as just another section) — one write, one audit log line.
  async function saveAll() {
    if (!validateRows()) {
      setStatus(t("validation"));
      return;
    }
    setStatus(t("saving"));
    try {
      const response = await fetch("/api/admin/guides/references/consumables", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(catalog),
      });
      setStatus(response.ok ? t("saved") : t("server-error"));
    } catch {
      setStatus(t("server-error"));
    }
  }

  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/referentiels" message={status}>
        <EditorialLocaleSelect
          label={t("consumables-intro-language-label")}
          value={locale}
          onChange={setLocale}
        />
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={saveAll}
        >
          {t("save-all")}
        </button>
      </EditorActionBar>
      <section className="admin-panel editable-reference">
        <h2 className="editable-reference-title">
          {t("consumables-table-title")}
        </h2>
        {consumableSections.map((section) => (
          <div className="editable-reference" key={section}>
            <div className="editable-reference-title-row">
              <h3 className="editable-reference-title">
                {section === "intro"
                  ? t("consumables-intro-title")
                  : categoryLabel(section)}
              </h3>
              {/* Bloc 49/A: a scoped "+" icon on the title row replaces the
                  verbose "Ajouter (Catégorie)" button — section stays
                  implicit to which table this icon belongs to. */}
              <button
                type="button"
                className="icon-action"
                data-testid={`add-row-${section}`}
                aria-label={t("add-category", {
                  category:
                    section === "intro"
                      ? t("consumables-intro-title")
                      : categoryLabel(section),
                })}
                onClick={() => addRow(section)}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
            <EditableDataTable
              rows={catalog[section]}
              columns={columnsForSection(section)}
              testIdPrefix={section}
              onChange={(rows) => setSectionRows(section, rows)}
              onRemove={(index) => removeRow(section, index)}
              onMove={(index, direction) => moveRow(section, index, direction)}
              removeIcon
              removeConfirmMessage={t("confirm-remove")}
              removeLabel={t("remove")}
              moveUpLabel={t("move-up")}
              moveDownLabel={t("move-down")}
              emptyLabel={t("empty")}
              errors={errors[section]}
              combinedActions
              actionsLabel={t("actions")}
              tableClassName="consumables-admin-table"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
