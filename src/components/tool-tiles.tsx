"use client";

/**
 * Bloc 113: the tile vocabulary the Villes tool's four sub-tabs share.
 *
 * They only lay values out — every figure handed to them is already computed
 * by the calculators in src/lib. Keeping them here rather than inside
 * city-calculators.tsx is what makes the four sub-tabs look like one tool:
 * a tile, a badge, a breakdown table and a share bar, defined once.
 */

import type { ReactNode } from "react";

/** A value's role, which is what decides its color. */
export type ToolTone = "violet" | "green" | "muted";

/**
 * Bloc 113/A.6: the growth a change represents, as target ÷ start.
 *
 * Returns null when there is nothing to divide by — a start of 0 has no
 * multiple, and the badge is simply not drawn. One decimal at most, so a
 * clean ratio reads "×38" rather than "×38,0", and the separator follows the
 * reader's locale.
 */
export function multiplierLabel(
  start: number,
  target: number,
  locale: string,
): string | null {
  if (!start || !Number.isFinite(start) || !Number.isFinite(target))
    return null;
  const ratio = target / start;
  if (!Number.isFinite(ratio)) return null;
  return `×${ratio.toLocaleString(locale, { maximumFractionDigits: 1 })}`;
}

export function MultiplierBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return <span className="tool-badge">{label}</span>;
}

/**
 * Bloc 113/A.5: an icon, a title and one value. Nothing else — no start →
 * target line, no secondary text; whatever else there is to say belongs in
 * the tables below.
 */
export function SummaryTile({
  icon,
  label,
  value,
  unit,
  tone = "violet",
  badge,
  highlight = false,
  wide = false,
  testId,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** A trailing word such as "or", set smaller beside the figure. */
  unit?: string;
  tone?: ToolTone;
  badge?: string | null;
  /** Bloc 113/A.7: reserved for the one headline result of a sub-tab. */
  highlight?: boolean;
  /** Spans the full row on a phone, where tiles are otherwise two per row. */
  wide?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={[
        "tool-tile",
        highlight ? "tool-tile-highlight" : "",
        wide ? "tool-tile-wide" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="tool-tile-head">
        {icon}
        <span className="tool-tile-label">{label}</span>
        <MultiplierBadge label={badge} />
      </p>
      <strong className={`tool-tile-value tool-value-${tone}`}>
        <span data-testid={testId}>{value}</span>
        {unit ? <small className="tool-tile-unit">{unit}</small> : null}
      </strong>
    </div>
  );
}

/**
 * The "Total pour N villes" block: its heading, the grey chip recalling the
 * parameters the figures were computed from, and the tiles themselves.
 */
export function SummarySection({
  title,
  recall,
  children,
}: {
  title: string;
  recall: string;
  children: ReactNode;
}) {
  return (
    <section className="calculator-card tool-summary">
      <div className="tool-summary-header">
        <h2 className="calculator-heading">{title}</h2>
        <p className="tool-recall">{recall}</p>
      </div>
      <div className="tool-tiles">{children}</div>
    </section>
  );
}

/** One cell of a breakdown table. */
export type ToolCell = { text: string; tone?: ToolTone };
/** One row: its source name, then its cells. */
export type ToolRow = { key: string; label: string; cells: ToolCell[] };

/**
 * Bloc 113: the per-city breakdown, as a real table.
 *
 * Same component for both shapes the sub-tabs need — four columns when a
 * range is compared (start, target, gap) and three when a single production
 * is shared out — because only the headers and the cells differ.
 */
export function BreakdownTable({
  title,
  note,
  headers,
  rows,
  totalRow,
  grandRow,
  children,
  testId,
}: {
  title: string;
  /** "par ville", set small after the title. */
  note: string;
  headers: string[];
  rows: ToolRow[];
  /** The per-city total: bold, never highlighted. */
  totalRow: ToolRow;
  /** Bloc 113/A.7: the N-city total, the one violet row. */
  grandRow: ToolRow;
  /** The share bar and its legend. */
  children?: ReactNode;
  testId?: string;
}) {
  const cellClass = (cell: ToolCell) =>
    cell.tone ? `tool-cell tool-value-${cell.tone}` : "tool-cell";
  return (
    <section className="calculator-card tool-breakdown" data-testid={testId}>
      <h2 className="calculator-heading tool-breakdown-title">
        {title} <small>{note}</small>
      </h2>
      <table className="tool-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={header} scope="col" className={index ? "tool-cell" : ""}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, index) => (
                <td key={index} className={cellClass(cell)}>
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="tool-row-total">
            <th scope="row">{totalRow.label}</th>
            {totalRow.cells.map((cell, index) => (
              <td key={index} className={cellClass(cell)}>
                {cell.text}
              </td>
            ))}
          </tr>
          <tr className="tool-row-grand">
            <th scope="row">{grandRow.label}</th>
            {grandRow.cells.map((cell, index) => (
              <td key={index} className={cellClass(cell)}>
                {cell.text}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      {children}
    </section>
  );
}

/** One slice of the share bar. */
export type ToolShare = { key: string; label: string; value: number };

/**
 * Where a production comes from, as a stacked bar. Decorative: the same
 * split is in the table right above it, so the bar carries aria-hidden and
 * only the legend's text is read.
 */
export function DistributionBar({
  shares,
  showPercent,
  formatPercent,
}: {
  shares: ToolShare[];
  /** Coût shows the share in the legend; Production has a Part column. */
  showPercent: boolean;
  /** Receives the share as a fraction of the whole, never a percentage. */
  formatPercent?: (fraction: number) => string;
}) {
  const total = shares.reduce(
    (sum, share) => sum + Math.max(0, share.value),
    0,
  );
  return (
    <div className="tool-shares">
      <div className="tool-share-bar" aria-hidden="true">
        {shares.map((share) => (
          <span
            key={share.key}
            className={`tool-share-slice tool-share-${share.key}`}
            style={{
              width: total
                ? `${(Math.max(0, share.value) / total) * 100}%`
                : "0%",
            }}
          />
        ))}
      </div>
      <p className="tool-share-legend">
        {shares.map((share) => (
          <span key={share.key} className="tool-share-key">
            <span
              className={`tool-share-dot tool-share-${share.key}`}
              aria-hidden="true"
            />
            {showPercent && formatPercent
              ? `${share.label} ${formatPercent(total ? Math.max(0, share.value) / total : 0)}`
              : share.label}
          </span>
        ))}
      </p>
    </div>
  );
}
