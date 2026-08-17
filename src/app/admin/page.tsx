import Link from "next/link";
import { requireAdminSession } from "@/auth/require-session";
import { can, type AdminCapability } from "@/auth/permissions";
import { prisma } from "@/lib/prisma";

const allShortcuts: Array<[string, string, AdminCapability]> = [
  ["/admin/calculators", "Calculateurs", "calculators.read"],
  ["/admin/references", "Référentiels", "references.read"],
  ["/admin/guides", "Guides", "guides.read"],
  ["/admin/content", "Contenu statique", "content.read"],
  ["/admin/users", "Utilisateurs", "users.manage"],
  ["/admin/logs", "Logs", "logs.view"],
];

export default async function AdminPage() {
  const session = await requireAdminSession();
  const mayViewCalculators = can(session.user.role, "calculators.read");
  const mayViewLogs = can(session.user.role, "logs.view");
  const [active, inactive, recentLogs] = await Promise.all([
    mayViewCalculators
      ? prisma.calculator.count({ where: { active: true } })
      : Promise.resolve(0),
    mayViewCalculators
      ? prisma.calculator.count({ where: { active: false } })
      : Promise.resolve(0),
    mayViewLogs
      ? prisma.auditLog.findMany({
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);
  const shortcuts = allShortcuts.filter(([, , capability]) =>
    can(session.user.role, capability),
  );
  return (
    <main className="admin-main">
      <p className="eyebrow">Vue d’ensemble</p>
      <h1>Dashboard</h1>
      {mayViewCalculators && (
        <section className="admin-metrics" aria-label="État des calculateurs">
          <article className="total-box">
            <span className="label">Calculateurs actifs</span>
            <strong className="value emerald">{active}</strong>
          </article>
          <article className="total-box">
            <span className="label">Calculateurs inactifs</span>
            <strong className="value">{inactive}</strong>
          </article>
        </section>
      )}
      <section className="admin-panel">
        <h2>Accès rapides</h2>
        <div className="admin-shortcuts">
          {shortcuts.map(([href, label]) => (
            <Link className="category-btn" href={href} key={href}>
              {label}
            </Link>
          ))}
        </div>
      </section>
      {mayViewLogs && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <h2>Dernières actions</h2>
            <Link href="/admin/logs">Voir tous les logs</Link>
          </div>
          {recentLogs.length ? (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.user.username}</td>
                      <td>{log.actorRole}</td>
                      <td>{log.action}</td>
                      <td>{log.entityType}</td>
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
