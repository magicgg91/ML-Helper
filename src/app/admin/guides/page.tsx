import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";

export default async function GuidesAdminPage() {
  await requireCapability("guides.read");
  const guides = await prisma.guide.findMany({
    select: { id: true, slug: true, status: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Contenu éditorial</p>
      <h1>Guides</h1>
      <p className="lead">
        La gestion éditoriale complète arrivera dans la phase dédiée.
      </p>
      {guides.length ? (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <tr key={guide.id}>
                  <td>{guide.slug}</td>
                  <td>{guide.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-empty">Aucun guide créé.</p>
      )}
    </main>
  );
}
