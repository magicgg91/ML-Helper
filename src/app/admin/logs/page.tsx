import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";
import { LogPurgeForm } from "@/components/log-purge-form";
import { can } from "@/auth/permissions";
export default async function LogsPage() {
  const session = await requireCapability("logs.view");
  const t = await getTranslations("admin.logs");
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <main>
      <h1>{t("title")}</h1>
      {can(session.user.role, "logs.purge") && <LogPurgeForm />}
      <table>
        <thead>
          <tr>
            <th>{t("actor")}</th>
            <th>{t("actor-role")}</th>
            <th>{t("message")}</th>
            <th>{t("date")}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.user.username}</td>
              <td>{log.actorRole}</td>
              <td>{log.message}</td>
              <td>{log.createdAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
