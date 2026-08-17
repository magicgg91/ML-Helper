import Link from "next/link";

const categories = [
  { label: "Villes", slug: "villes", available: true },
  { label: "Classement", slug: "classement", available: true },
  { label: "Compétences", slug: "competences", available: true },
  { label: "Référentiels", slug: "referentiels", available: true },
];

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
          <article className="public-card" key={category.slug}>
            <h2>{category.label}</h2>
            <p>
              {category.available
                ? "3 calculateurs disponibles."
                : "Simulateurs à venir."}
            </p>
            {category.available && (
              <Link href={`/tools/${category.slug}`}>Ouvrir la catégorie</Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
