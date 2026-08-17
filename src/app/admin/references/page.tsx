import Link from "next/link";
import { requireCapability } from "@/auth/require-session";

const references = [
  ["/admin/references/combat", "Équipements de Combat", "180 lignes éditables"],
  [
    "/admin/references/expedition",
    "Équipement d’Expédition",
    "120 lignes éditables",
  ],
  ["/admin/references/templars", "Templiers", "20 coûts exacts éditables"],
];

export default async function ReferencesAdminPage() {
  await requireCapability("references.read");
  return (
    <main className="admin-main">
      <p className="eyebrow">Données du jeu</p>
      <h1>Référentiels</h1>
      <div className="admin-card-grid">
        {references.map(([href, label, detail]) => (
          <Link className="admin-link-card" href={href} key={href}>
            <strong>{label}</strong>
            <span>{detail}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
