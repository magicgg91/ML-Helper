"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminButton } from "./admin-button";
import { DataTable, type AdminTableColumn } from "./admin-data-table";
import { SearchInput } from "./admin-filters";
import { Pill } from "./admin-pill";
import { VisibilitySwitch } from "./admin-visibility-switch";
import { useServerRows } from "./use-server-rows";
import { DescriptionCell } from "./admin-description-cell";
import {
  DescriptionPanel,
  type DescriptionTarget,
} from "./admin-description-panel";
import type { ToolDescription } from "@/lib/tool-description";

/**
 * Bloc 119: the Référentiels list — the Outils table's twin, with the
 * dependency read the other way round.
 *
 * "Utilisé par l'outil" answers the question a reference could not answer
 * before: whether anything on the public site reads it. Three of the seven
 * are free-standing (Progression, Boutique, Événements) and say so with an
 * em dash rather than an empty cell.
 */

export type AdminReferenceRow = {
  /** The slug, which is also what the toggle endpoint is keyed by. */
  id: string;
  title: string;
  active: boolean;
  editHref: string;
  /** The tool that reads it, already named, or null when nothing does. */
  usedBy: string | null;
  /** Bloc 130: the one-line public description, per language. */
  description: ToolDescription;
};

export function AdminReferencesList({
  rows,
  canWrite,
  hiddenLocales,
  languageNames,
}: {
  rows: AdminReferenceRow[];
  canWrite: boolean;
  /** Bloc 130: the launch languages switched off in Configuration. */
  hiddenLocales?: readonly string[];
  languageNames?: Partial<Record<string, string>>;
}) {
  const t = useTranslations("admin.referentiels");
  const common = useTranslations("admin.common");
  const descriptions = useTranslations("admin.descriptions");
  // Bloc 128: the rows follow what the server re-renders. Their labels
  // and their order are resolved server-side in the admin's own language,
  // so a language change has to reach them and not only the chrome.
  const [references, setReferences] = useServerRows(rows);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string>();
  // Bloc 130: which row's description is open, if any.
  const [describing, setDescribing] = useState<DescriptionTarget>();

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle === ""
      ? references
      : references.filter((row) =>
          row.title.toLocaleLowerCase().includes(needle),
        );
  }, [references, query]);

  async function toggle(row: AdminReferenceRow, next: boolean) {
    setSaving(row.id);
    try {
      const response = await fetch(
        `/api/admin/guides/references/${row.id}/active`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: next }),
        },
      );
      if (!response.ok) {
        setMessage(t("visibility-error"));
        return;
      }
      setReferences((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, active: next } : item,
        ),
      );
      setMessage(t(next ? "enabled" : "disabled"));
    } catch {
      setMessage(t("visibility-error"));
    } finally {
      setSaving(undefined);
    }
  }

  const columns: AdminTableColumn<AdminReferenceRow>[] = [
    {
      key: "title",
      header: t("columns.title"),
      cell: (row) => <span className="font-semibold">{row.title}</span>,
    },
    {
      key: "used-by",
      header: t("columns-used-by"),
      cell: (row) =>
        row.usedBy ? (
          // The tool lives on the other screen; the chip is the way there.
          <Pill tone="accent" href="/admin/tools">
            {row.usedBy}
          </Pill>
        ) : (
          <span className="text-admin-dim">{t("used-by-none")}</span>
        ),
    },
    {
      key: "description",
      header: descriptions("column"),
      narrow: true,
      cell: (row) => (
        <DescriptionCell
          row={{ label: row.title, description: row.description }}
          canEdit={canWrite}
          onOpen={() =>
            setDescribing({
              slug: row.id,
              label: row.title,
              description: row.description,
            })
          }
        />
      ),
    },
    {
      key: "visible",
      header: t("columns-visible"),
      narrow: true,
      cell: (row) => (
        <VisibilitySwitch
          checked={row.active}
          disabled={!canWrite || saving === row.id}
          label={t("visibility-of", { reference: row.title })}
          onChange={(next) => toggle(row, next)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-96">
        <SearchInput
          label={t("search-label")}
          placeholder={t("search-placeholder")}
          value={query}
          onChange={setQuery}
        />
      </div>

      <div className="overflow-hidden rounded-admin-card border border-admin-card-border bg-admin-card">
        <DataTable
          caption={t("table-caption")}
          columns={columns}
          rows={matches}
          rowKey={(row) => row.id}
          empty={t("no-results")}
          actions={{
            header: t("columns.actions"),
            cell: (row) =>
              canWrite ? (
                <AdminButton asChild size="sm">
                  <Link href={row.editHref}>{t("modify")}</Link>
                </AdminButton>
              ) : null,
            explain: () => common("read-only"),
          }}
        />
      </div>

      {message && (
        <p className="text-sm text-admin-dim" role="status">
          {message}
        </p>
      )}

      <DescriptionPanel
        target={describing}
        hiddenLocales={hiddenLocales}
        languageNames={languageNames}
        onClose={() => setDescribing(undefined)}
        onSaved={(slug, description) => {
          setReferences((current) =>
            current.map((reference) =>
              reference.id === slug ? { ...reference, description } : reference,
            ),
          );
          setDescribing(undefined);
        }}
      />
    </div>
  );
}
