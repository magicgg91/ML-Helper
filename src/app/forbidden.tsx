import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="admin-main forbidden-page">
      <p className="eyebrow">Erreur 403</p>
      <h1>Accès interdit</h1>
      <p>
        Ton rôle ne permet pas d’accéder à cette section ou d’effectuer cette
        action.
      </p>
      <Link className="category-btn" href="/admin">
        Retour au dashboard
      </Link>
    </main>
  );
}
