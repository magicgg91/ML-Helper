import Link from "next/link";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import { AdminButton } from "@/components/admin-button";
import {
  DataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { AdminLogsFilters } from "@/components/admin-logs-filters";
import { AdminLogsPurge } from "@/components/admin-logs-purge";
import { PageHeader } from "@/components/admin-page-header";
import { Pill, type PillTone } from "@/components/admin-pill";
import {
  adminDayKey,
  formatAdminDayHeading,
  formatAdminTime,
} from "@/lib/admin-dates";
import {
  auditKeysMatching,
  auditTranslator,
  renderAuditMessage,
} from "@/lib/audit-message";
import {
  buildLogsWhere,
  logsPageHref,
  logsPageSize,
  parseLogFilters,
  parseLogPage,
} from "@/lib/log-filters";
import { prisma } from "@/lib/prisma";

type LogRow = {
  id: string;
  at: Date;
  author: string;
  role: string;
  message: string;
};

const roleTone = (role: string): PillTone =>
  role === "super_admin"
    ? "accent-deep"
    : role === "admin"
      ? "accent"
      : "neutral";

export default async function LogsPage({
  searchParams,
}: PageProps<"/admin/logs">) {
  const session = await requireCapability("logs.view");
  const [t, messages, roleLabels, locale] = await Promise.all([
    getTranslations("admin.logs"),
    // Bloc 116/C: the sentence is resolved here, in the admin's own language,
    // from the key and parameters the row stores.
    getTranslations("admin.logs.messages"),
    getTranslations("roles"),
    getLocale(),
  ]);
  const resolvedSearchParams = await searchParams;
  const filters = parseLogFilters(resolvedSearchParams);
  const page = parseLogPage(resolvedSearchParams);
  // Bloc 116/C review: a word typed into the filter is a word of a sentence,
  // so it is matched against the sentences — in this admin's own language —
  // and the keys that match join the query.
  const allMessages = (await getMessages()) as {
    admin?: { logs?: { messages?: unknown } };
  };
  const where = buildLogsWhere(
    filters,
    filters.message
      ? auditKeysMatching(allMessages.admin?.logs?.messages, filters.message)
      : [],
  );
  const window = logsPageSize * page;
  const [found, usernames] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      // One more than the window: its presence is what says there are older
      // days to load, without a second COUNT over a table built to grow.
      take: window + 1,
    }),
    prisma.user.findMany({
      select: { username: true },
      orderBy: { username: "asc" },
    }),
  ]);
  const hasMore = found.length > window;
  const translate = auditTranslator(messages);
  const rows: LogRow[] = found.slice(0, window).map((log) => ({
    id: log.id,
    at: log.createdAt,
    author: log.user.username,
    role: log.actorRole,
    message: renderAuditMessage(log, translate),
  }));

  // Grouped on the Paris day, not the UTC one: an action taken at 00:30 in
  // Paris belongs to that day, not to the one that ended two hours earlier.
  const days: { key: string; rows: LogRow[] }[] = [];
  for (const row of rows) {
    const key = adminDayKey(row.at);
    const last = days.at(-1);
    if (last?.key === key) last.rows.push(row);
    else days.push({ key, rows: [row] });
  }

  const columns: AdminTableColumn<LogRow>[] = [
    {
      key: "time",
      header: t("column-time"),
      narrow: true,
      cell: (row) => (
        <span className="font-admin-mono text-admin-dim">
          {formatAdminTime(row.at, locale)}
        </span>
      ),
    },
    {
      key: "author",
      header: t("actor"),
      narrow: true,
      cell: (row) => <span className="font-semibold">{row.author}</span>,
    },
    { key: "message", header: t("message"), cell: (row) => row.message },
    {
      key: "role",
      header: t("actor-role"),
      narrow: true,
      cell: (row) => (
        <Pill tone={roleTone(row.role)}>
          {/* The translated label, never the raw `super_admin` key — and the
              key itself if a role was retired since the entry was written. */}
          {roleLabels.has(row.role) ? roleLabels(row.role) : row.role}
        </Pill>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />

      <AdminLogsFilters
        usernames={usernames.map((user) => user.username)}
        filters={filters}
      />

      <div className="overflow-hidden rounded-admin-card border border-admin-card-border bg-admin-card">
        <DataTable
          caption={t("title")}
          columns={columns}
          rowKey={(row) => row.id}
          empty={t("no-results")}
          density="edit"
          groups={days.map((day) => ({
            key: day.key,
            // The heading carries the count as a sentence rather than a bare
            // number: "Mardi 22 septembre 2026 · 12 actions".
            label: (
              <>
                {formatAdminDayHeading(day.rows[0].at, locale)}
                <span className="ml-2 text-xs font-normal text-admin-dim">
                  {t("day-actions", { count: day.rows.length })}
                </span>
              </>
            ),
            rows: day.rows,
          }))}
        />
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <AdminButton asChild>
            {/* Bloc 126/A: `scroll={false}`. Each click re-renders the whole
                page with one more window of days, and Next's default is to
                scroll to the top of the first Page element whenever that
                element is not in the viewport — which, standing at the bottom
                of 20 days of history, it never is. So reading the fourth
                window meant scrolling back down through the first three. The
                rows above the button do not move when it is clicked, so
                keeping the scroll position leaves the reader exactly where
                they were, with the new days appended below. */}
            <Link href={logsPageHref(filters, page + 1)} scroll={false}>
              {t("load-more")}
            </Link>
          </AdminButton>
        </div>
      )}

      {can(session.user.role, "logs.purge") && <AdminLogsPurge />}
    </div>
  );
}
