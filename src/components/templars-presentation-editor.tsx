"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EditableDataTable,
  errorKey,
  type EditableColumn,
  type FieldErrors,
} from "./editable-reference-table";
import {
  EditorialLocaleSelect,
  type EditorialLocale,
} from "./editorial-locale-select";
import { templarKeys } from "../lib/player-settings";
import type {
  TemplarPresentationCatalog,
  TemplarPresentationRow,
} from "../lib/templars-presentation";

function fieldLocale(locale: EditorialLocale): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

// Bloc 66/B, restored Bloc 68/C: same admin pattern as Boutique (a simple
// table, not tiles), but with no add/move/remove controls — the 5
// Templiers are a fixed, complete set (cdc-confirmed), always shown in
// templarKeys' own order (already alphabetical on the French competence
// names: Attaque, Défense, Or, Recruteur, Vitesse). Renders with no
// EditorActionBar of its own: it shares the page with
// TemplarParametersEditor, which already carries the page's one back link
// (Bloc 35/10.2/10.3 convention).
// Base Temple/Bonus are genuinely editable here (Bloc 68/C: reverted a
// prior pass that made them read-only/computed — the porteur de projet
// confirmed editable was the intended spec) and left blank rather than
// forced to a value if an admin clears them (AGENTS.md: never invent a
// game value) — the public tile shows "—" in that case.
export function TemplarsPresentationEditor({
  initialCatalog,
}: {
  initialCatalog: TemplarPresentationCatalog;
}) {
  const t = useTranslations("admin.references");
  const [locale, setLocale] = useState<EditorialLocale>("fr");
  const [catalog, setCatalog] =
    useState<TemplarPresentationCatalog>(initialCatalog);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);

  const lang = fieldLocale(locale);
  const nameKey = lang === "fr" ? "name_fr" : "name_en";
  const descriptionKey = lang === "fr" ? "description_fr" : "description_en";

  const columns: EditableColumn<TemplarPresentationRow>[] = [
    { key: "image", label: t("templars-columns.image") },
    { key: nameKey, label: t("templars-columns.name"), required: true },
    {
      key: descriptionKey,
      label: t("templars-columns.description"),
      wide: true,
    },
    {
      key: "temple_base",
      label: t("templars-columns.temple-base"),
      type: "number",
      min: 0,
      narrow: true,
    },
    {
      key: "bonus",
      label: t("templars-columns.bonus"),
      type: "number",
      min: 0,
      step: 0.01,
      narrow: true,
    },
  ] as EditableColumn<TemplarPresentationRow>[];

  const rows = templarKeys.map((key) => catalog[key]);

  function setRows(nextRows: TemplarPresentationRow[]) {
    setCatalog(
      Object.fromEntries(
        templarKeys.map((key, index) => [key, nextRows[index]]),
      ) as TemplarPresentationCatalog,
    );
    setStatus("");
    setSuccess(false);
  }

  function validate() {
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

  async function save() {
    if (!validate()) {
      setStatus(t("validation"));
      setSuccess(false);
      return;
    }
    setStatus(t("saving"));
    setSuccess(false);
    try {
      const response = await fetch("/api/admin/guides/references/templars", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(catalog),
      });
      setStatus(response.ok ? t("saved") : t("server-error"));
      setSuccess(response.ok);
    } catch {
      setStatus(t("server-error"));
    }
  }

  return (
    <section className="admin-panel editable-reference">
      <div className="editable-reference-title-row">
        <h2 className="editable-reference-title">
          {t("templars-presentation-title")}
        </h2>
        <EditorialLocaleSelect
          label={t("templars-presentation-language-label")}
          value={locale}
          onChange={setLocale}
        />
      </div>
      <EditableDataTable
        rows={rows}
        columns={columns}
        onChange={setRows}
        errors={errors}
      />
      <button className="primary-button" type="button" onClick={save}>
        {t("save-all")}
      </button>
      {status && (
        <p className={success ? "form-success" : "form-status"} role="status">
          {status}
        </p>
      )}
    </section>
  );
}
