import { requireAdminSession } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const mayViewCalculators = can(session.user.role, "calculators.read");
  const mayViewGuides = can(session.user.role, "guides.read");
  const mayViewLogs = can(session.user.role, "logs.view");
  const [active, calculatorTotal, publishedGuides, guideTotal, recentLogs] = await Promise.all([
    mayViewCalculators
      ? prisma.calculator.count({ where: { active: true } })
      : Promise.resolve(0),
    mayViewCalculators
      ? prisma.calculator.count()
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
      <p className="eyebrow">Vue d’ensemble</p>
      <h1>Dashboard</h1>
      {(mayViewCalculators || mayViewGuides) && (
        <section className="admin-metrics" aria-label="État des calculateurs">
          {mayViewCalculators && (
          <article className="total-box">
            <span className="label">Calculateurs</span>
            <strong className="value emerald">{active} activés / {calculatorTotal} au total</strong>
          </article>
          )}
          {mayViewGuides && (
          <article className="total-box">
            <span className="label">Guides</span>
            <strong className="value">{publishedGuides} publiés / {guideTotal} au total</strong>
          </article>
          )}
        </section>
      )}
      {mayViewLogs && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <h2>Dernières actions</h2>
          </div>
          {recentLogs.length ? (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th colSpan={2}>Message</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.user.username}</td>
                      <td>{log.actorRole}</td>
                      <td colSpan={2}>{log.message}</td>
                      <td>{log.createdAt.toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">Aucune action enregistrée.</p>
          )}
        </section>
      )}
    </main>
  );
}
