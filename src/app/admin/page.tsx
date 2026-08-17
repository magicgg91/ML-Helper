import Link from "next/link";
import { requireAdminSession } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";

const calculatorRoles = ["super_admin", "admin", "calculators_manager"];
const guideRoles = ["super_admin", "admin", "guides_manager"];

export default async function AdminPage() {
  const session = await requireAdminSession();
  const [active, inactive, recentLogs] = await Promise.all([
    prisma.calculator.count({ where: { active: true } }),
    prisma.calculator.count({ where: { active: false } }),
    prisma.auditLog.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const shortcuts = [
    ...(calculatorRoles.includes(session.user.role)
      ? [
          ["/admin/calculators", "Calculateurs"],
          ["/admin/references", "Référentiels"],
        ]
      : []),
    ...(guideRoles.includes(session.user.role)
      ? [["/admin/guides", "Guides"]]
      : []),
    ...(session.user.role === "super_admin"
      ? [
          ["/admin/users", "Utilisateurs"],
          ["/admin/logs", "Logs"],
        ]
      : []),
  ];
  return (
    <main className="admin-main">
      <p className="eyebrow">Vue d’ensemble</p>
      <h1>Dashboard</h1>
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
      <section className="admin-panel">
        <div className="admin-section-heading">
          <h2>Dernières actions</h2>
          {session.user.role === "super_admin" && (
            <Link href="/admin/logs">Voir tous les logs</Link>
          )}
        </div>
        {recentLogs.length ? (
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.user.username}</td>
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
    </main>
  );
}
