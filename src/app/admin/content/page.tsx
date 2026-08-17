import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";

export default async function StaticContentAdminPage() {
  await requireCapability("content.read");
  const items = await prisma.staticContent.findMany({
    orderBy: { key: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Pages institutionnelles</p>
      <h1>Contenu statique et légal</h1>
      {items.length ? (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Clé</th>
                <th>Dernière mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.key}</td>
                  <td>{item.updatedAt.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-empty">Aucun contenu statique enregistré.</p>
      )}
    </main>
  );
}
