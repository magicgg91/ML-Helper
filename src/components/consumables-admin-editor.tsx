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
import { GuideMarkdownEditor } from "./guide-markdown-editor";
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

// Bloc 48/A: the same editorial locale selector already driving the intro
// markdown zone now also drives which language's Nom/Description columns
// this table edits and displays — fixes the regression where all 4
// language columns (FR+EN name, FR+EN description) were shown at once.
// Only fr/en are actually captured per item (no de/es/tr item text yet) —
// any non-fr editorial locale edits the EN columns, matching the public
// table's own non-fr fallback to English (Bloc44-review/C).
function fieldLocale(locale: EditorialLocale): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

type CategoryErrors = Record<ConsumableCategory, FieldErrors>;
const emptyCategoryErrors = Object.fromEntries(
  consumableCategories.map((category) => [category, {}]),
) as CategoryErrors;

// Bloc 43: Consumables is the first reference with free row CRUD (add,
// remove, 1-position reorder) and a free-text markdown zone, alongside its
// items table — both editable from a single screen with one shared
// EditorActionBar (Bloc 35/10.2/10.3 convention: one back link, not one
// per section).
// Bloc 48/B: the single table-with-category-column is replaced by 4
// independent tables, one per category — category is now implicit to
// which table a row lives in, each with its own scoped Add button and its
// own independent up/down ordering.
export function ConsumablesReferenceScreen({
  initialCatalog,
  introInitial,
}: {
  initialCatalog: ConsumableCatalog;
  introInitial: Record<EditorialLocale, string>;
}) {
  const t = useTranslations("admin.references");
  const categoryLabel = useTranslations("references.consommables.categories");
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [intro, setIntro] = useState(introInitial);
  const [catalog, setCatalog] = useState<ConsumableCatalog>(initialCatalog);
  const [errors, setErrors] = useState<CategoryErrors>(emptyCategoryErrors);
  const [status, setStatus] = useState("");

  const lang = fieldLocale(locale);
  const nameKey = lang === "fr" ? "name_fr" : "name_en";
  const descriptionKey = lang === "fr" ? "description_fr" : "description_en";

  const baseColumns: EditableColumn<ConsumableRow>[] = [
    { key: "image", label: t("consumables-columns.image") },
    { key: nameKey, label: t("consumables-columns.name"), required: true },
    {
      key: descriptionKey,
      label: t("consumables-columns.description"),
      required: true,
    },
    {
      key: "cost",
      label: t("consumables-columns.cost"),
      type: "number",
      min: 0,
      step: 1,
      narrow: true,
    },
  ] as EditableColumn<ConsumableRow>[];

  // Bloc 48/B: 4 independent tables each restart their own row numbering at
  // 1 — without the category name folded into the label, row 1 of every
  // table would render the exact same aria-label ("Ligne 1 Nom"), leaving
  // 4 indistinguishable "Ligne 1 Nom" fields on the same screen.
  function columnsFor(category: ConsumableCategory) {
    return baseColumns.map((column) => ({
      ...column,
      inputLabel: (index: number) =>
        t("category-row-label", {
          category: categoryLabel(category),
          row: index + 1,
          field: column.label,
        }),
    }));
  }

  function setCategoryRows(
    category: ConsumableCategory,
    rows: ConsumableRow[],
  ) {
    setCatalog((current) => ({ ...current, [category]: rows }));
  }

  function addRow(category: ConsumableCategory) {
    setCatalog((current) => ({
      ...current,
      [category]: [...current[category], { ...emptyConsumableRow }],
    }));
  }

  function removeRow(category: ConsumableCategory, index: number) {
    setCatalog((current) => ({
      ...current,
      [category]: current[category].filter((_, i) => i !== index),
    }));
  }

  function moveRow(
    category: ConsumableCategory,
    index: number,
    direction: -1 | 1,
  ) {
    setCatalog((current) => {
      const rows = current[category];
      const target = index + direction;
      if (target < 0 || target >= rows.length) return current;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, [category]: next };
    });
  }

  function validateRows() {
    const next: CategoryErrors = { ...emptyCategoryErrors };
    let valid = true;
    for (const category of consumableCategories) {
      const categoryErrors: FieldErrors = {};
      const columns = columnsFor(category);
      catalog[category].forEach((row, rowIndex) =>
        columns.forEach((column) => {
          const value = row[column.key];
          const key = errorKey(rowIndex, column.key);
          if (column.required && !value.trim())
            categoryErrors[key] = t("required");
          if (column.type === "number" && value !== "") {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0)
              categoryErrors[key] = t("minimum", { min: 0 });
          }
        }),
      );
      if (Object.keys(categoryErrors).length) valid = false;
      next[category] = categoryErrors;
    }
    setErrors(next);
    return valid;
  }

  // Bloc 44 review: one save action for both sections, not two — a click
  // on either previous button, then navigating away, silently discarded
  // whichever section wasn't clicked. Both requests always fire together;
  // a partial failure is reported explicitly (which section didn't save),
  // never silently swallowed by the other section's success message.
  async function saveAll() {
    if (!validateRows()) {
      setStatus(t("validation"));
      return;
    }
    setStatus(t("saving"));
    const [introResult, rowsResult] = await Promise.allSettled([
      fetch("/api/admin/content/consumables-intro", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: intro }),
      }),
      fetch("/api/admin/guides/references/consumables", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(catalog),
      }),
    ]);
    const introOk = introResult.status === "fulfilled" && introResult.value.ok;
    const rowsOk = rowsResult.status === "fulfilled" && rowsResult.value.ok;
    if (introOk && rowsOk) setStatus(t("saved"));
    else if (!introOk && !rowsOk) setStatus(t("server-error"));
    else
      setStatus(
        introOk ? t("consumables-rows-error") : t("consumables-intro-error"),
      );
  }

  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/guides" message={status}>
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
      <section className="admin-panel guide-simple-fields">
        <h2 className="editable-reference-title">
          {t("consumables-intro-title")}
        </h2>
        <p>{t("consumables-intro-description")}</p>
        <GuideMarkdownEditor
          label={t("consumables-intro-label")}
          value={intro[locale]}
          onChange={(value) =>
            setIntro((current) => ({ ...current, [locale]: value }))
          }
        />
      </section>
      <section className="admin-panel editable-reference">
        <h2 className="editable-reference-title">
          {t("consumables-table-title")}
        </h2>
        <p>{t("consumables-table-description")}</p>
        {consumableCategories.map((category) => (
          <div className="editable-reference" key={category}>
            <div className="editable-reference-title-row">
              <h3 className="editable-reference-title">
                {categoryLabel(category)}
              </h3>
              {/* Bloc 49/A: a scoped "+" icon on the title row replaces the
                  verbose "Ajouter (Catégorie)" button — category stays
                  implicit to which table this icon belongs to. */}
              <button
                type="button"
                className="icon-action"
                data-testid={`add-row-${category}`}
                aria-label={t("add-category", {
                  category: categoryLabel(category),
                })}
                onClick={() => addRow(category)}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
            <EditableDataTable
              rows={catalog[category]}
              columns={columnsFor(category)}
              testIdPrefix={category}
              onChange={(rows) => setCategoryRows(category, rows)}
              onRemove={(index) => removeRow(category, index)}
              onMove={(index, direction) => moveRow(category, index, direction)}
              removeIcon
              removeConfirmMessage={t("confirm-remove")}
              removeLabel={t("remove")}
              moveUpLabel={t("move-up")}
              moveDownLabel={t("move-down")}
              emptyLabel={t("empty")}
              errors={errors[category]}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
