import { requireAdminSession } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { referenceToolSlugs } from "@/lib/admin-tools";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const [t, locale] = await Promise.all([
    getTranslations("admin.dashboard"),
    getLocale(),
  ]);
  const mayViewCalculators = can(session.user.role, "calculators.read");
  const mayViewGuides = can(session.user.role, "guides.read");
  const mayViewLogs = can(session.user.role, "logs.view");
  const [active, calculatorTotal, publishedGuides, guideTotal, recentLogs] = await Promise.all([
    mayViewCalculators
      ? prisma.calculator.count({ where: { active: true, slug: { notIn: [...referenceToolSlugs] } } })
      : Promise.resolve(0),
    mayViewCalculators
      ? prisma.calculator.count({ where: { slug: { notIn: [...referenceToolSlugs] } } })
      : Promise.resolve(0),
    mayViewGuides
      ? prisma.guide.count({ where: { status: "published" } })
      : Promise.resolve(0),
    mayViewGuides
      ? prisma.guide.count()
      : Promise.resolve(0),
    mayViewLogs
      ? prisma.auditLog.findMany({
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      {(mayViewCalculators || mayViewGuides) && (
        <section className="admin-metrics" aria-label={t("metrics-label")}>
          {mayViewCalculators && (
          <article className="total-box">
            <span className="label">{t("tools")}</span>
            <strong className="value emerald">{t("tools-summary", { active, total: calculatorTotal })}</strong>
          </article>
          )}
          {mayViewGuides && (
          <article className="total-box">
            <span className="label">{t("guides")}</span>
            <strong className="value">{t("guides-summary", { published: publishedGuides, total: guideTotal })}</strong>
          </article>
          )}
        </section>
      )}
      {mayViewLogs && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <h2>{t("recent-actions")}</h2>
          </div>
          {recentLogs.length ? (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>{t("user")}</th>
                    <th>{t("role")}</th>
                    <th colSpan={2}>{t("message")}</th>
                    <th>{t("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.user.username}</td>
                      <td>{log.actorRole}</td>
                      <td colSpan={2}>{log.message}</td>
                      <td>{log.createdAt.toLocaleString(locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">{t("empty")}</p>
          )}
        </section>
      )}
    </main>
  );
}
