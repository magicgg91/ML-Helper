import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../services/setup-superadmin";

export default async function HomePage() {
  await connection();
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  return (
    <main className="public-main">
      <section className="hero">
        <p className="eyebrow">Million Lords · Outils communautaires</p>
        <h1>Prépare ta prochaine progression.</h1>
        <p>
          Le socle public de ML-Helper accueille bientôt les simulateurs et les
          guides. Tes paramètres joueur restent uniquement dans ce navigateur.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/tools">
            Voir les simulateurs
          </Link>
          <Link href="/guides">Parcourir les guides</Link>
        </div>
      </section>
    </main>
  );
}
