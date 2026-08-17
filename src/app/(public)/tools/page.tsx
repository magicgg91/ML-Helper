import Link from "next/link";

const categories = ["Villes", "Classement", "Compétences", "Référentiels"];

export default function ToolsPage() {
  return (
    <main className="public-main">
      <p className="eyebrow">Simulateurs</p>
      <h1>Outils Million Lords</h1>
      <p className="lead">
        La structure est prête. Les calculateurs seront raccordés lors des
        prochaines étapes de la Phase 2.
      </p>
      <div className="card-grid">
        {categories.map((category) => (
          <article className="public-card" key={category}>
            <h2>{category}</h2>
            <p>Simulateurs à venir.</p>
            <Link href={`/tools/${category.toLowerCase()}`}>
              Ouvrir la catégorie
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
