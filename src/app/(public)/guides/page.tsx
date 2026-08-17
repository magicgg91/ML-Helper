import Link from "next/link";

export default function GuidesPage() {
  return (
    <main className="public-main">
      <p className="eyebrow">Guides</p>
      <h1>Bibliothèque communautaire</h1>
      <p className="lead">
        La liste, les catégories et la recherche accueilleront les guides
        publiés. Aucun contenu éditorial n’est rédigé à cette étape.
      </p>
      <div className="empty-state">
        <p>Aucun guide publié pour le moment.</p>
        <Link href="/guides/apercu">Voir la structure d’un guide</Link>
      </div>
    </main>
  );
}
