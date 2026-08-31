"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  type ChangeEvent,
  type ForwardedRef,
} from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";

// Bloc 37/E: lets a page hosting several of these tables (Combat,
// Expedition) drive them from one shared save button instead of each table
// keeping its own — the page calls validate()/save() on every table's
// handle and combines the results into a single status message.
export type ReferenceTableHandle = {
  validate: () => boolean;
  save: () => Promise<boolean>;
};

export type EditableColumn<Row> = {
  key: keyof Row & string;
  label: string;
  inputLabel?: (index: number) => string;
  type?: "text" | "number" | "select";
  options?: Array<{ value: string; label: string }>;
  step?: number;
  min?: number;
  required?: boolean;
  readOnly?: boolean;
  // Bloc 35/5.3, 6.3, 8.1, 9.1: narrows this column's cell — for values that
  // never exceed 100% (or another short, bounded range) and don't need the
  // table's default input width, so those columns stop forcing a horizontal
  // scroll. Left off (the default) for columns that can hold larger numbers
  // (e.g. Ranking's reward quantities).
  narrow?: boolean;
};

export type FieldErrors = Record<string, string>;
export const errorKey = (row: number, field: string) => `${row}:${field}`;

export function EditableDataTable<Row extends Record<string, string>>({
  rows,
  columns,
  onChange,
  onAdd,
  onRemove,
  addLabel,
  removeLabel,
  emptyLabel,
  errors,
  // Bloc 43: optional 1-position move (Consumables' free row ordering,
  // "l'ordre choisi en admin est l'ordre d'affichage public" — no
  // drag-and-drop). Left undefined for tables with no meaningful order
  // (e.g. Ranking's threshold-sorted rows), same opt-in pattern as
  // onAdd/onRemove above.
  onMove,
  moveUpLabel,
  moveDownLabel,
}: {
  rows: Row[];
  columns: EditableColumn<Row>[];
  onChange: (rows: Row[]) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  addLabel?: string;
  removeLabel?: string;
  emptyLabel?: string;
  errors?: FieldErrors;
  onMove?: (index: number, direction: -1 | 1) => void;
  moveUpLabel?: string;
  moveDownLabel?: string;
}) {
  return (
    <>
      {onAdd && (
        <button className="secondary-action" type="button" onClick={onAdd}>
          {addLabel}
        </button>
      )}
      {rows.length ? (
        <div className="ranking-table-wrap">
          <table className="ranking-table reference-admin-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={
                      column.narrow ? "reference-admin-narrow" : undefined
                    }
                  >
                    {column.label}
                  </th>
                ))}
                {onMove && <th>{moveUpLabel}</th>}
                {onRemove && <th>{removeLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => {
                    const label =
                      column.inputLabel?.(rowIndex) ??
                      `${column.label} ${rowIndex + 1}`;
                    const errorMessage =
                      errors?.[errorKey(rowIndex, column.key)];
                    const shared = {
                      "aria-label": label,
                      "aria-invalid": Boolean(errorMessage),
                      value: row[column.key],
                      disabled: column.readOnly,
                      onChange: (
                        event: ChangeEvent<
                          HTMLInputElement | HTMLSelectElement
                        >,
                      ) =>
                        onChange(
                          rows.map((item, index) =>
                            index === rowIndex
                              ? { ...item, [column.key]: event.target.value }
                              : item,
                          ),
                        ),
                    };
                    return (
                      <td
                        key={column.key}
                        className={
                          column.narrow ? "reference-admin-narrow" : undefined
                        }
                      >
                        {column.type === "select" ? (
                          <select {...shared}>
                            {column.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            {...shared}
                            type={column.type ?? "text"}
                            min={column.min}
                            step={column.step}
                            readOnly={column.readOnly}
                          />
                        )}
                        {errorMessage && (
                          <small className="field-error">{errorMessage}</small>
                        )}
                      </td>
                    );
                  })}
                  {onMove && (
                    <td className="reference-admin-move-cell">
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => onMove(rowIndex, -1)}
                        disabled={rowIndex === 0}
                        aria-label={moveUpLabel}
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => onMove(rowIndex, 1)}
                        disabled={rowIndex === rows.length - 1}
                        aria-label={moveDownLabel}
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                  {onRemove && (
                    <td>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => onRemove(rowIndex)}
                      >
                        {removeLabel}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-empty">{emptyLabel}</p>
      )}
    </>
  );
}

export type EditableReferenceTableProps<Row extends Record<string, string>> = {
  initialRows: Row[];
  columns: EditableColumn<Row>[];
  endpoint: string;
  description: string;
  // Bloc 35/5.5: a dedicated heading for tables that share a page with
  // other editable tables (Expedition's 4), instead of a paragraph
  // explaining what the whole page does.
  descriptionAsTitle?: boolean;
  saveLabel?: string;
  serialize?: (rows: Row[]) => unknown;
  onRowsChange?: (
    rows: Row[],
    index: number,
    field: keyof Row & string,
  ) => Row[];
  filters?: Array<{
    key: keyof Row & string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
  // Bloc 35/5.1: "grid" wraps each column as a labelled field in a
  // responsive CSS grid instead of a wide table row — meant for a
  // single-row table with many columns (e.g. per-star increments), where a
  // real table forces a horizontal scroll a field grid doesn't need.
  layout?: "table" | "grid";
  // Bloc 37/E: when false, this table renders no save button/status of its
  // own — a page hosting several tables (Combat, Expedition) drives them
  // all from ref.validate()/ref.save() instead, behind one shared button.
  standalone?: boolean;
  // Bloc 38/Q: roughly doubles this table's (non-narrow) numeric input
  // fields — for Combat's/Expedition's auxiliary tables (Pouciel,
  // gem-slots, star increments, merge-cost, Terradust-at-destruction)
  // specifically, never the 180/120-row main tables' narrow skill/stat %
  // columns from Bloc 35/37, which this prop is never set on.
  wideInputs?: boolean;
};

function EditableReferenceTableInner<Row extends Record<string, string>>(
  {
    initialRows,
    columns,
    endpoint,
    description,
    descriptionAsTitle = false,
    saveLabel,
    serialize = (rows) => rows,
    onRowsChange,
    filters = [],
    layout = "table",
    standalone = true,
    wideInputs = false,
  }: EditableReferenceTableProps<Row>,
  ref: ForwardedRef<ReferenceTableHandle>,
) {
  const t = useTranslations("admin.references");
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      filters.every(
        (filter) =>
          !filterValues[filter.key] ||
          row[filter.key] === filterValues[filter.key],
      ),
    );

  function update(index: number, field: keyof Row & string, value: string) {
    setRows((current) => {
      const updated = current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      );
      return onRowsChange ? onRowsChange(updated, index, field) : updated;
    });
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
        if (column.required && !value.trim()) next[key] = t("required");
        if (column.type === "number" && (value !== "" || column.required)) {
          const parsed = Number(value);
          if (!Number.isFinite(parsed)) next[key] = t("number");
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

  function performSave(): Promise<Response> {
    return fetch(endpoint, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(serialize(rows)),
    });
  }

  async function save() {
    if (!validate()) return;
    setStatus(t("saving"));
    setSuccess(false);
    try {
      const response = await performSave();
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

  useImperativeHandle(ref, () => ({
    validate,
    async save() {
      if (!validate()) return false;
      try {
        const response = await performSave();
        return response.ok;
      } catch {
        return false;
      }
    },
  }));

  function field(row: Row, rowIndex: number, column: EditableColumn<Row>) {
    const key = errorKey(rowIndex, column.key);
    const label =
      column.inputLabel?.(rowIndex) ??
      t("row-label", { row: rowIndex + 1, field: column.label });
    return (
      <>
        {column.type === "select" ? (
          <select
            aria-label={label}
            value={row[column.key]}
            disabled={column.readOnly}
            onChange={(event) =>
              update(rowIndex, column.key, event.target.value)
            }
          >
            {column.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={label}
            aria-invalid={Boolean(errors[key])}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
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
        )}
        {errors[key] && (
          <small className="field-error" id={`${key}-error`}>
            {errors[key]}
          </small>
        )}
      </>
    );
  }

  return (
    <div
      className={
        wideInputs
          ? "calculator-stack editable-reference reference-admin-wide-inputs"
          : "calculator-stack editable-reference"
      }
    >
      {descriptionAsTitle ? (
        <h2 className="editable-reference-title">{description}</h2>
      ) : (
        <p>{description}</p>
      )}
      {filters.length > 0 && (
        <div className="reference-admin-filters">
          {filters.map((filter) => (
            <label key={filter.key}>
              {filter.label}
              <select
                aria-label={filter.label}
                value={filterValues[filter.key] ?? ""}
                onChange={(event) =>
                  setFilterValues((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }))
                }
              >
                <option value="">{t("all")}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {layout === "grid" ? (
        <div className="reference-admin-grid">
          {visibleRows.map(({ row, index: rowIndex }) => (
            <div className="reference-admin-grid-row" key={rowIndex}>
              {columns.map((column) => (
                <label key={column.key} className="reference-admin-grid-field">
                  <span>{column.label}</span>
                  {field(row, rowIndex, column)}
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table reference-admin-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={
                      column.narrow ? "reference-admin-narrow" : undefined
                    }
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, index: rowIndex }) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.narrow ? "reference-admin-narrow" : undefined
                      }
                    >
                      {field(row, rowIndex, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {standalone && (
        <>
          <button className="primary-button" type="button" onClick={save}>
            {saveLabel ?? t("save")}
          </button>
          {status && (
            <p
              className={success ? "form-success" : "form-status"}
              role="status"
            >
              {status}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const EditableReferenceTable = forwardRef(
  EditableReferenceTableInner,
) as <Row extends Record<string, string>>(
  props: EditableReferenceTableProps<Row> & {
    ref?: ForwardedRef<ReferenceTableHandle>;
  },
) => ReturnType<typeof EditableReferenceTableInner>;
