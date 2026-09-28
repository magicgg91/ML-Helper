import { Link } from "@/i18n/navigation";

/**
 * Bloc 129 §2.3 : le fil d'Ariane, présent sur toutes les pages sauf
 * l'accueil.
 *
 * Il ne traduit rien lui-même : chaque page lui passe des libellés déjà
 * résolus, comme le fait déjà ReferenceCatalogGrid avec son `t`. Le dernier
 * élément est la page courante — ni lien, ni cible : `aria-current="page"`
 * et rien d'autre, sans quoi un lecteur d'écran annoncerait un lien qui ne
 * mène nulle part.
 */
export type BreadcrumbItem = {
  label: string;
  /** Absent sur le dernier élément : la page où l'on est déjà. */
  href?: string;
};

export function Breadcrumb({
  items,
  label,
}: {
  items: BreadcrumbItem[];
  /** Le nom de la navigation elle-même, « Fil d'Ariane ». */
  label: string;
}) {
  return (
    <nav className="breadcrumb" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.href ?? "current"}-${item.label}`}>
            {/* Le séparateur est décoratif : il sépare à l'œil, il n'a rien
                à annoncer à qui écoute la page. */}
            {index > 0 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span className="breadcrumb-current" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
