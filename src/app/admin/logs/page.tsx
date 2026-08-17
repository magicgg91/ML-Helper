import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";
import { LogPurgeForm } from "@/components/log-purge-form";
export default async function LogsPage() {
  await requireCapability("logs.view");
  const t = await getTranslations("Logs");
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <main>
      <h1>{t("title")}</h1>
      <LogPurgeForm />
      <table>
        <thead>
          <tr>
            <th>{t("actor")}</th>
            <th>Rôle au moment de l’action</th>
            <th>{t("action")}</th>
            <th>{t("entity")}</th>
            <th>{t("date")}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.user.username}</td>
              <td>{log.actorRole}</td>
              <td>{log.action}</td>
              <td>
                {log.entityType}:{log.entityId}
              </td>
              <td>{log.createdAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
