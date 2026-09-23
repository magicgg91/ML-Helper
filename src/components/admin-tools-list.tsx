"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminButton } from "./admin-button";
import { DataTable, type AdminTableColumn } from "./admin-data-table";
import { FilterChips, SearchInput } from "./admin-filters";
import { Pill } from "./admin-pill";
import { VisibilitySwitch } from "./admin-visibility-switch";

/**
 * Bloc 119: the Outils list.
 *
 * What it adds to the table it replaces is the answer to "where do this
 * tool's numbers come from?" — invisible until now: a row with no ✎ button
 * said nothing about whether the tool had no parameters, or parameters that
 * live in a reference table, or parameters shared with two other tools. The
 * source is computed in lib/admin-tool-sources.ts and arrives resolved.
 *
 * The visibility column is the old ⏻ action, unchanged underneath: same
 * endpoint, same audit entry, same permission. Only its shape changed, from
 * a power icon to a switch that says which state it is in.
 */

export type AdminToolSource =
  | { kind: "own"; href: string }
  | { kind: "shared"; href: string; sharedCount: number }
  | { kind: "reference"; href: string; referenceLabel: string }
  | { kind: "none" };

export type AdminToolRow = {
  id: string;
  slug: string;
  label: string;
  category: string;
  active: boolean;
  source: AdminToolSource;
};

/** The order of the chips and of the groups, per the brief (§3). */
const categories = ["classement", "villes", "competences", "combat"] as const;
type Category = (typeof categories)[number] | "all";

export function AdminToolsList({
  rows,
  canEdit,
  canToggle,
  canOpenReferences,
}: {
  rows: AdminToolRow[];
  canEdit: boolean;
  canToggle: boolean;
  /** Whether this role may open a reference editor the row points at. */
  canOpenReferences: boolean;
}) {
  const t = useTranslations("admin.tools");
  const [tools, setTools] = useState(rows);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return tools.filter(
      (tool) =>
        (category === "all" || tool.category === category) &&
        (needle === "" || tool.label.toLocaleLowerCase().includes(needle)),
    );
  }, [tools, query, category]);

  // The chips count what the search leaves, not the whole table: a chip
  // saying "Villes 4" that yields nothing once clicked is a lie.
  const searched = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle === ""
      ? tools
      : tools.filter((tool) => tool.label.toLocaleLowerCase().includes(needle));
  }, [tools, query]);

  async function toggle(row: AdminToolRow, next: boolean) {
    setSaving(row.id);
    setMessage(t("saving"));
    try {
      const response = await fetch(`/api/admin/tools/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!response.ok) {
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      setTools((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, active: next } : item,
        ),
      );
      setMessage(
        t("state-saved", {
          tool: row.label,
          state: t(next ? "active" : "inactive").toLocaleLowerCase(),
        }),
      );
    } catch {
      setMessage(t("server-error"));
    } finally {
      setSaving(undefined);
    }
  }

  const sourceCell = (row: AdminToolRow) => {
    if (row.source.kind === "none")
      return <span className="text-admin-dim">{t("source-none")}</span>;
    if (row.source.kind === "reference") {
      const label = t("source-reference", {
        name: row.source.referenceLabel,
      });
      return canOpenReferences ? (
        <Pill tone="accent" href={row.source.href}>
          {label}
        </Pill>
      ) : (
        <Pill tone="accent">{label}</Pill>
      );
    }
    return (
      <span>
        {row.source.kind === "shared"
          ? t("source-shared", { count: row.source.sharedCount })
          : t("source-own")}
      </span>
    );
  };

  const columns: AdminTableColumn<AdminToolRow>[] = [
    {
      key: "tool",
      header: t("columns.tool"),
      cell: (row) => <span className="font-semibold">{row.label}</span>,
    },
    { key: "source", header: t("columns-source"), cell: sourceCell },
    {
      key: "visible",
      header: t("columns-visible"),
      narrow: true,
      cell: (row) => (
        <VisibilitySwitch
          checked={row.active}
          disabled={!canToggle || saving === row.id}
          label={t("visibility-of", { tool: row.label })}
          onChange={(next) => toggle(row, next)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <SearchInput
            label={t("search-label")}
            placeholder={t("search-placeholder")}
            value={query}
            onChange={setQuery}
          />
        </div>
        <FilterChips
          label={t("filter-label")}
          value={category}
          onChange={setCategory}
          chips={[
            {
              value: "all" as const,
              label: t("filter-all"),
              count: searched.length,
            },
            ...categories.map((value) => ({
              value,
              label: t(`category-values.${value}`),
              count: searched.filter((tool) => tool.category === value).length,
            })),
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-admin-card border border-admin-card-border bg-admin-card">
        <DataTable
          caption={t("table-caption")}
          columns={columns}
          rowKey={(row) => row.id}
          empty={t("no-results")}
          groups={categories
            .map((value) => ({
              key: value,
              label: t(`category-values.${value}`),
              rows: matches.filter((tool) => tool.category === value),
            }))
            .filter((group) => group.rows.length > 0)
            .map((group) => ({ ...group, count: group.rows.length }))}
          actions={{
            header: t("columns.action"),
            cell: (row) => {
              if (row.source.kind === "none") return null;
              if (row.source.kind === "reference")
                return canOpenReferences ? (
                  <AdminButton asChild size="sm">
                    <Link href={row.source.href}>{t("open")}</Link>
                  </AdminButton>
                ) : null;
              return canEdit ? (
                <AdminButton asChild size="sm">
                  <Link href={row.source.href}>{t("edit")}</Link>
                </AdminButton>
              ) : null;
            },
            // Never an empty cell: a row without an action says why.
            explain: (row) =>
              row.source.kind === "none"
                ? t("nothing-to-edit")
                : t("read-only"),
          }}
        />
      </div>

      {message && (
        <p className="text-sm text-admin-dim" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
