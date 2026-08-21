"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type EditableColumn<Row> = {
  key: keyof Row & string;
  label: string;
  inputLabel?: (index: number) => string;
  type?: "text" | "number";
  step?: number;
  min?: number;
  required?: boolean;
  readOnly?: boolean;
};

type FieldErrors = Record<string, string>;
const errorKey = (row: number, field: string) => `${row}:${field}`;

export function EditableReferenceTable<Row extends Record<string, string>>({
  initialRows,
  columns,
  endpoint,
  description,
  saveLabel,
  serialize = (rows) => rows,
}: {
  initialRows: Row[];
  columns: EditableColumn<Row>[];
  endpoint: string;
  description: string;
  saveLabel?: string;
  serialize?: (rows: Row[]) => unknown;
}) {
  const t = useTranslations("admin.references");
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  function update(index: number, field: keyof Row & string, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
    setErrors((current) => {
      const next = { ...current };
      delete next[errorKey(index, field)];
      return next;
    });
    setStatus("");
    setSuccess(false);
  }

  function validate() {
    const next: FieldErrors = {};
    rows.forEach((row, rowIndex) =>
      columns.forEach((column) => {
        const value = row[column.key];
        const key = errorKey(rowIndex, column.key);
        if (column.required && !value.trim())
          next[key] = t("required");
        if (column.type === "number" && (value !== "" || column.required)) {
          const parsed = Number(value);
          if (!Number.isFinite(parsed))
            next[key] = t("number");
          else if (column.min !== undefined && parsed < column.min)
            next[key] = t("minimum", { min: column.min });
        }
      }),
    );
    setErrors(next);
    if (Object.keys(next).length) {
      setStatus(t("validation"));
      return false;
    }
    return true;
  }

  async function save() {
    if (!validate()) return;
    setStatus(t("saving"));
    setSuccess(false);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(serialize(rows)),
      });
      if (!response.ok) {
        setStatus(t("save-error", { status: response.status }));
        return;
      }
      setStatus(t("saved"));
      setSuccess(true);
    } catch {
      setStatus(t("server-error"));
    }
  }

  return (
    <div className="calculator-stack editable-reference">
      <p>{description}</p>
      <div className="ranking-table-wrap">
        <table className="ranking-table reference-admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => {
                  const key = errorKey(rowIndex, column.key);
                  const label =
                    column.inputLabel?.(rowIndex) ??
                    t("row-label", { row: rowIndex + 1, field: column.label });
                  return (
                    <td key={column.key}>
                      <input
                        aria-label={label}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={
                          errors[key] ? `${key}-error` : undefined
                        }
                        className={errors[key] ? "field-invalid" : undefined}
                        type={column.type ?? "text"}
                        value={row[column.key]}
                        min={column.min}
                        step={column.step}
                        readOnly={column.readOnly}
                        onChange={(event) =>
                          update(rowIndex, column.key, event.target.value)
                        }
                      />
                      {errors[key] && (
                        <small className="field-error" id={`${key}-error`}>
                          {errors[key]}
                        </small>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="primary-button" type="button" onClick={save}>
        {saveLabel ?? t("save")}
      </button>
      {status && (
        <p
          className={
            success ? "form-success" : "form-status"
          }
          role="status"
        >
          {status}
        </p>
      )}
    </div>
  );
}
