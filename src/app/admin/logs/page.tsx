import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";
import { LogPurgeForm } from "@/components/log-purge-form";
import { LogFilterForm } from "@/components/log-filter-form";
import { can } from "@/auth/permissions";
import { buildLogsWhere, parseLogFilters } from "@/lib/log-filters";
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
  const filters = parseLogFilters(await searchParams);
  const logs = await prisma.auditLog.findMany({
    where: buildLogsWhere(filters),
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <main className="flex flex-col gap-4">
      <h1>{t("title")}</h1>
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
    </main>
  );
}
