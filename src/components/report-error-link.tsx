import { TriangleAlertIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { contactHref } from "@/lib/contact-link";

/**
 * Bloc 129 §2.4 : « Signaler une erreur ».
 *
 * Un bouton secondaire qui ouvre Contact avec l'objet « Erreur dans les
 * données » déjà choisi et le chemin de la page déjà rempli, pour que la
 * personne n'ait à écrire que ce qu'elle a vu en jeu.
 *
 * Le libellé arrive traduit : ce composant est rendu depuis des pages
 * serveur, et c'est la convention du dépôt (cf. ReferenceCatalogGrid).
 */
export function ReportErrorLink({
  label,
  page,
  className,
}: {
  label: string;
  /** Le chemin lisible de la page concernée, ex. « Villes › Coût de ville ». */
  page?: string;
  className?: string;
}) {
  return (
    <Link
      className={`report-error-link${className ? ` ${className}` : ""}`}
      href={contactHref("data-error", page)}
    >
      <TriangleAlertIcon aria-hidden="true" size={16} />
      {label}
    </Link>
  );
}
