import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";
import { LogPurgeForm } from "@/components/log-purge-form";
import { LogFilterForm } from "@/components/log-filter-form";
import { can } from "@/auth/permissions";
import {
  buildLogsWhere,
  logsPageHref,
  logsPageSize,
  parseLogFilters,
  parseLogPage,
} from "@/lib/log-filters";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default async function LogsPage({
  searchParams,
}: PageProps<"/admin/logs">) {
  const session = await requireCapability("logs.view");
  const t = await getTranslations("admin.logs");
  const resolvedSearchParams = await searchParams;
  const filters = parseLogFilters(resolvedSearchParams);
  const page = parseLogPage(resolvedSearchParams);
  const where = buildLogsWhere(filters);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * logsPageSize,
      take: logsPageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / logsPageSize));
  return (
    <main className="flex flex-col gap-4">
      {can(session.user.role, "logs.purge") && <LogPurgeForm />}
      <LogFilterForm filters={filters} t={t} />
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no-results")}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("actor")}</TableHead>
                  <TableHead>{t("actor-role")}</TableHead>
                  <TableHead>{t("message")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.user.username}
                    </TableCell>
                    <TableCell>{log.actorRole}</TableCell>
                    <TableCell className="whitespace-normal">
                      {log.message}
                    </TableCell>
                    <TableCell>{log.createdAt.toISOString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3 text-sm"
          aria-label={t("pagination")}
        >
          {page > 1 ? (
            <a href={logsPageHref(filters, page - 1)}>{t("previous")}</a>
          ) : (
            <span className="text-muted-foreground">{t("previous")}</span>
          )}
          <span>{t("page-summary", { page, total: totalPages })}</span>
          {page < totalPages ? (
            <a href={logsPageHref(filters, page + 1)}>{t("next")}</a>
          ) : (
            <span className="text-muted-foreground">{t("next")}</span>
          )}
        </nav>
      )}
    </main>
  );
}
