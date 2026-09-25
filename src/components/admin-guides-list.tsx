"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { DataTable, type AdminTableColumn } from "./admin-data-table";
import { FilterChips, SearchInput } from "./admin-filters";
import { LocaleChip } from "./admin-locale-chip";
import { OverflowMenu, type OverflowMenuItem } from "./admin-overflow-menu";
import { useServerRows } from "./use-server-rows";
import { formatAdminDate, formatAdminShortDate } from "@/lib/admin-dates";
import { launchLocales, type LaunchLocale } from "@/lib/translations";

/**
 * Bloc 119: the Guides list.
 *
 * Three things changed beyond the paint:
 *
 * - a guide has one state now, not two. The ⏻ button is gone: publishing and
 *   unpublishing is the whole of what the public sees (see the migration
 *   20260923100000_guides_single_status). The status control keeps its third
 *   value, `pending_review`, because that is a step of the editorial workflow
 *   — a Gestion Guides account submits, a publisher publishes — and not a
 *   second visibility flag;
 * - the translation chips are links. A missing translation used to be a grey
 *   label; it now opens the editor on that language, which is what one does
 *   about it;
 * - deleting goes through a dialog rather than a full-width red button in the
 *   row, one mis-click away from losing a guide.
 */

export type AdminGuideRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  /** ISO, formatted here so the admin's own time zone rules apply. */
  createdAt: string;
  updatedAt: string;
  status: string;
  /** Which languages this guide is really written in. */
  translations: Record<LaunchLocale, boolean>;
};

type Filter = "all" | "published" | "draft" | "missing";

const missesATranslation = (guide: AdminGuideRow) =>
  launchLocales.some((code) => !guide.translations[code]);

/** Whether a guide survives a filter — pure, so the memo below can trust it. */
const keep = (guide: AdminGuideRow, which: Filter) =>
  which === "all" ||
  (which === "published" && guide.status === "published") ||
  // A guide in review is not published either: both are "not out yet".
  (which === "draft" && guide.status !== "published") ||
  (which === "missing" && missesATranslation(guide));

export function AdminGuidesList({
  rows,
  languageNames,
  canWrite,
  canPublish,
  canDelete,
}: {
  rows: AdminGuideRow[];
  /** The five language names, resolved server-side. */
  languageNames: Record<string, string>;
  canWrite: boolean;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("admin.guides");
  const common = useTranslations("admin.common");
  const locale = useLocale();
  // Bloc 126/D, généralisé au Bloc 128: the rows follow what the server
  // re-renders, so a language change reaches the table and not only the
  // chrome around it.
  const [guides, setGuides] = useServerRows(rows);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminGuideRow>();
  const [busy, setBusy] = useState(false);

  const searched = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle === ""
      ? guides
      : guides.filter((guide) =>
          guide.title.toLocaleLowerCase().includes(needle),
        );
  }, [guides, query]);
  const matches = useMemo(
    () => searched.filter((guide) => keep(guide, filter)),
    [searched, filter],
  );

  async function changeStatus(guide: AdminGuideRow, status: string) {
    const response = await fetch(`/api/admin/guides/${guide.id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!response?.ok) return setMessage(t("status-forbidden"));
    setGuides((current) =>
      current.map((item) =>
        item.id === guide.id ? { ...item, status } : item,
      ),
    );
    setMessage(t("status-saved"));
  }

  async function remove(guide: AdminGuideRow) {
    setBusy(true);
    const response = await fetch(`/api/admin/guides/${guide.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    setPendingDelete(undefined);
    if (!response?.ok) return setMessage(t("delete-forbidden"));
    setGuides((current) => current.filter((item) => item.id !== guide.id));
    setMessage(t("deleted"));
  }

  const statuses = ["draft", "pending_review", "published"] as const;

  const columns: AdminTableColumn<AdminGuideRow>[] = [
    {
      key: "guide",
      header: t("columns-guide"),
      cell: (guide) => (
        <span className="flex flex-col">
          {/* Codex review (PR #148): the editor needs guides.write, so a
              read_only reader following this link lands on "Accès interdit".
              They read the table; they do not open what it points at. */}
          {canWrite ? (
            <Link
              href={`/admin/guides/${guide.id}`}
              className="admin-focus font-semibold hover:underline"
            >
              {guide.title}
            </Link>
          ) : (
            <span className="font-semibold">{guide.title}</span>
          )}
          <span className="text-xs text-admin-dim">
            {t("byline", {
              author: guide.author,
              date: formatAdminDate(guide.createdAt, locale),
            })}
          </span>
        </span>
      ),
    },
    {
      key: "translations",
      header: t("columns-translations"),
      cell: (guide) => (
        <span className="flex flex-wrap gap-1">
          {launchLocales.map((code) => {
            const written = guide.translations[code];
            const language = languageNames[code] ?? code;
            // Same reason as the title above: no link for a reader who
            // cannot open the editor. The chip still says which languages
            // are written, which is what the column is for.
            return (
              <LocaleChip
                key={code}
                code={code}
                written={written}
                href={
                  canWrite
                    ? `/admin/guides/${guide.id}?lang=${code}`
                    : undefined
                }
                label={
                  canWrite
                    ? t(written ? "translation-edit" : "translation-create", {
                        language,
                        title: guide.title,
                      })
                    : t(
                        written ? "translation-written" : "translation-missing",
                        { language },
                      )
                }
              />
            );
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      narrow: true,
      cell: (guide) => (
        <select
          aria-label={t("status-label", { title: guide.title })}
          value={guide.status}
          disabled={!canWrite}
          onChange={(event) => changeStatus(guide, event.target.value)}
          className="admin-control admin-focus h-[var(--admin-control-h-sm)] rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm"
        >
          {statuses
            // Publishing stays a publisher's action: the option is not even
            // offered to a role that cannot take it (unless it is already
            // the guide's state, which must remain readable).
            .filter(
              (status) =>
                status !== "published" ||
                canPublish ||
                guide.status === "published",
            )
            .map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: "modified",
      header: t("columns-modified"),
      narrow: true,
      cell: (guide) => (
        <span className="text-admin-dim">
          {formatAdminShortDate(guide.updatedAt, locale)}
        </span>
      ),
    },
  ];

  const menuItems = (guide: AdminGuideRow): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = [
      {
        key: "view",
        label: t("view-on-site"),
        href: `/guides/${guide.slug}`,
      },
    ];
    if (canWrite)
      items.push(
        guide.status === "published"
          ? {
              key: "unpublish",
              label: t("unpublish"),
              onSelect: () => changeStatus(guide, "draft"),
            }
          : {
              key: "publish",
              label: t("publish"),
              disabled: !canPublish,
              onSelect: () => changeStatus(guide, "published"),
            },
      );
    if (canDelete)
      items.push({
        key: "delete",
        label: `${t("delete")}…`,
        tone: "danger",
        onSelect: () => setPendingDelete(guide),
      });
    return items;
  };

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
          value={filter}
          onChange={setFilter}
          chips={(
            [
              ["all", t("filter-all")],
              ["published", t("filter-published")],
              ["draft", t("filter-drafts")],
              ["missing", t("filter-missing")],
            ] as const
          ).map(([value, label]) => ({
            value,
            label,
            count: searched.filter((guide) => keep(guide, value)).length,
          }))}
        />
      </div>

      <div className="overflow-hidden rounded-admin-card border border-admin-card-border bg-admin-card">
        <DataTable
          caption={t("table-caption")}
          columns={columns}
          rows={matches}
          rowKey={(guide) => guide.id}
          empty={guides.length === 0 ? t("empty") : t("no-results")}
          actions={{
            header: t("columns.actions"),
            cell: (guide) =>
              canWrite ? (
                <span className="inline-flex items-center gap-2">
                  <AdminButton asChild size="sm">
                    <Link href={`/admin/guides/${guide.id}`}>
                      {t("modify")}
                    </Link>
                  </AdminButton>
                  <OverflowMenu
                    label={t("more-actions", { title: guide.title })}
                    items={menuItems(guide)}
                  />
                </span>
              ) : null,
            explain: () => common("read-only"),
          }}
        />
      </div>

      <p className="text-xs text-admin-dim">{t("legend")}</p>

      {message && (
        <p className="text-sm text-admin-dim" role="status">
          {message}
        </p>
      )}

      <ConfirmDialog
        open={pendingDelete !== undefined}
        title={t("delete-confirm-title")}
        description={t("delete-confirm-body", {
          title: pendingDelete?.title ?? "",
        })}
        confirmLabel={t("delete")}
        busy={busy}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
      />
    </div>
  );
}
