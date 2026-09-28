import { TriangleAlertIcon } from "lucide-react";
import { Button, type ButtonVariant } from "./button";
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
  variant = "secondary",
}: {
  label: string;
  /** Le chemin lisible de la page concernée, ex. « Villes › Coût de ville ». */
  page?: string;
  /**
   * Bloc 132 §2 : secondaire sur une page d'outil, de référentiel ou de
   * guide ; principal dans le bandeau de l'accueil, où c'est l'action que
   * la section demande.
   */
  variant?: Extract<ButtonVariant, "primary" | "secondary">;
}) {
  return (
    <Button
      variant={variant}
      className="report-error-link"
      href={contactHref("data-error", page)}
    >
      <TriangleAlertIcon aria-hidden="true" size={16} />
      {label}
    </Button>
  );
}
