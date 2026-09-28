import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bloc 119: the one table of the admin — the list screens and the editing
 * screens share it, so a row of guides and a row of ladder bands line up the
 * same way.
 *
 * Two things it enforces rather than leaves to each caller:
 *
 * - the actions live in a fixed last column, and a row with no action prints
 *   *why* instead of leaving a hole (§2). That is why `explain` is required
 *   alongside `cell`: a table cannot be given actions without saying what a
 *   row without one shows;
 * - groups are sub-headers inside the same table, not several tables, so the
 *   columns of "Classement" and those of "Villes" stay aligned.
 */

export type AdminTableColumn<Row> = {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** Numeric columns are right-aligned, headers included (§3 bis). */
  align?: "left" | "right";
  /** Shrinks the column to its content instead of sharing the width. */
  narrow?: boolean;
};

export type AdminTableGroup<Row> = {
  key: string;
  label: ReactNode;
  count?: number;
  rows: readonly Row[];
};

export type AdminTableActions<Row> = {
  header: ReactNode;
  /** The row's controls, or null when it has none. */
  cell: (row: Row) => ReactNode | null;
  /** What replaces them then — "Aucun paramètre", never an empty cell. */
  explain: (row: Row) => ReactNode;
};

type Content<Row> =
  | { rows: readonly Row[]; groups?: never }
  | { groups: readonly AdminTableGroup<Row>[]; rows?: never };

export function DataTable<Row>({
  caption,
  columns,
  rowKey,
  actions,
  empty,
  density = "list",
  ...content
}: {
  /** Names the table for a screen reader; not shown. */
  caption: string;
  columns: readonly AdminTableColumn<Row>[];
  rowKey: (row: Row) => string;
  actions?: AdminTableActions<Row>;
  /** Shown in place of the rows when there are none. */
  empty: ReactNode;
  /** `edit` is the tighter row of the editing screens (§3 bis). */
  density?: "list" | "edit";
} & Content<Row>) {
  // A flat list is one unlabelled group, so the two shapes share one render.
  const groups: readonly AdminTableGroup<Row>[] = content.groups ?? [
    { key: "all", label: null, rows: content.rows },
  ];
  // Counted across the groups, not per group: a filter that empties every
  // group must show the empty message once, not a column of bare headings.
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const columnCount = columns.length + (actions ? 1 : 0);
  const rowHeight =
    density === "edit"
      ? "h-[var(--admin-row-h-edit)]"
      : "h-[var(--admin-row-h)]";

  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-admin-rule bg-admin-head">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "admin-column-head px-4 py-3 text-admin-dim",
                column.align === "right" ? "text-right" : "text-left",
                column.narrow && "w-px whitespace-nowrap",
              )}
            >
              {column.header}
            </th>
          ))}
          {actions && (
            <th
              scope="col"
              className="admin-column-head w-px px-4 py-3 text-right whitespace-nowrap text-admin-dim"
            >
              {actions.header}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {total === 0 && (
          <tr>
            <td
              colSpan={columnCount}
              className="px-4 py-8 text-center text-admin-dim"
            >
              {empty}
            </td>
          </tr>
        )}
        {total > 0 &&
          groups.map((group) => (
            <Fragment key={group.key}>
              {group.label !== null && group.label !== undefined && (
                <tr className="bg-admin-head">
                  <th
                    scope="colgroup"
                    colSpan={columnCount}
                    className="border-y border-admin-rule-soft px-4 py-2 text-left"
                  >
                    <span className="admin-section-title text-admin-text">
                      {group.label}
                    </span>
                    {group.count !== undefined && (
                      <span className="ml-2 text-xs tabular-nums text-admin-dim">
                        {group.count}
                      </span>
                    )}
                  </th>
                </tr>
              )}
              {group.rows.map((row) => {
                const rowActions = actions?.cell(row) ?? null;
                return (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      "border-b border-admin-rule-soft last:border-b-0",
                      rowHeight,
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-2 align-middle",
                          column.align === "right" && "text-right tabular-nums",
                          column.narrow && "w-px whitespace-nowrap",
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    {actions && (
                      <td className="w-px px-4 py-2 text-right align-middle whitespace-nowrap">
                        {rowActions ?? (
                          <span className="text-xs text-admin-dim">
                            {actions.explain(row)}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </Fragment>
          ))}
      </tbody>
    </table>
  );
}
