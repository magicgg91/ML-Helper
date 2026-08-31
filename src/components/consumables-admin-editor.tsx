"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { emptyConsumableRow, type ConsumableRow } from "../lib/consumables";

// Bloc 43: Consumables is the first reference with free row CRUD (add,
// remove, 1-position reorder) and a free-text markdown zone, alongside its
// items table — both editable from a single screen with one shared
// EditorActionBar (Bloc 35/10.2/10.3 convention: one back link, not one
// per section).
export function ConsumablesReferenceScreen({
  initialRows,
  introInitial,
}: {
  initialRows: ConsumableRow[];
  introInitial: { fr: string; en: string };
}) {
  const t = useTranslations("admin.references");
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [intro, setIntro] = useState(introInitial);
  const [rows, setRows] = useState<ConsumableRow[]>(initialRows);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState("");

  const columns: EditableColumn<ConsumableRow>[] = (
    [
      { key: "image", label: t("consumables-columns.image") },
      {
        key: "name_fr",
        label: t("consumables-columns.name-fr"),
        required: true,
      },
      { key: "name_en", label: t("consumables-columns.name-en") },
      {
        key: "description_fr",
        label: t("consumables-columns.description-fr"),
        required: true,
      },
      {
        key: "description_en",
        label: t("consumables-columns.description-en"),
      },
      {
        key: "cost",
        label: t("consumables-columns.cost"),
        type: "number",
        min: 0,
        step: 1,
        narrow: true,
      },
    ] as EditableColumn<ConsumableRow>[]
  ).map((column) => ({
    ...column,
    inputLabel: (index: number) =>
      t("row-label", { row: index + 1, field: column.label }),
  }));

  async function saveIntro() {
    setStatus(t("saving"));
    const response = await fetch("/api/admin/content/consumables-intro", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: intro }),
    }).catch(() => null);
    setStatus(
      response?.ok
        ? t("consumables-intro-saved")
        : t("consumables-intro-error"),
    );
  }

  function validateRows() {
    const next: FieldErrors = {};
    rows.forEach((row, rowIndex) =>
      columns.forEach((column) => {
        const value = row[column.key];
        const key = errorKey(rowIndex, column.key);
        if (column.required && !value.trim()) next[key] = t("required");
        if (column.type === "number" && value !== "") {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0)
            next[key] = t("minimum", { min: 0 });
        }
      }),
    );
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function saveRows() {
    if (!validateRows()) {
      setStatus(t("validation"));
      return;
    }
    setStatus(t("saving"));
    try {
      const response = await fetch("/api/admin/guides/references/consumables", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rows),
      });
      if (!response.ok) {
        setStatus(t("save-error", { status: response.status }));
        return;
      }
      setStatus(t("saved"));
    } catch {
      setStatus(t("server-error"));
    }
  }

  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/guides" message={status}>
        <EditorialLocaleSelect
          label={t("consumables-intro-language-label")}
          value={locale}
          onChange={setLocale}
        />
        <button className="editor-action" type="button" onClick={saveIntro}>
          {t("consumables-intro-save")}
        </button>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={saveRows}
        >
          {t("consumables-table-save")}
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
        <EditableDataTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          onAdd={() =>
            setRows((current) => [...current, { ...emptyConsumableRow }])
          }
          onRemove={(index) =>
            setRows((current) => current.filter((_, i) => i !== index))
          }
          onMove={(index, direction) =>
            setRows((current) => {
              const target = index + direction;
              if (target < 0 || target >= current.length) return current;
              const next = [...current];
              [next[index], next[target]] = [next[target], next[index]];
              return next;
            })
          }
          addLabel={t("add")}
          removeLabel={t("remove")}
          moveUpLabel={t("move-up")}
          moveDownLabel={t("move-down")}
          emptyLabel={t("empty")}
          errors={errors}
        />
      </section>
    </div>
  );
}
