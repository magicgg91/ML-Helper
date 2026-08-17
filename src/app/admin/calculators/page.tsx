import Link from "next/link";
import { requireCapability } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";

export default async function CalculatorsAdminPage() {
  await requireCapability("calculators.read");
  const calculators = await prisma.calculator.findMany({
    orderBy: { slug: "asc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Contenu fonctionnel</p>
      <h1>Calculateurs</h1>
      <div className="admin-card-grid">
        <Link className="admin-link-card" href="/admin/calculators/ranking">
          <strong>Classement</strong>
          <span>Seuils, ligues cibles et récompenses</span>
        </Link>
        {calculators.map((calculator) => (
          <article className="admin-link-card" key={calculator.id}>
            <strong>{calculator.slug}</strong>
            <span
              className={
                calculator.active ? "status-active" : "status-inactive"
              }
            >
              {calculator.active ? "Actif" : "Inactif"}
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}
