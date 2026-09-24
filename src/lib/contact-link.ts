import type { ContactSubject } from "./contact";

/**
 * Bloc 129 §2.4 : le lien « Signaler une erreur », et tout lien qui ouvre
 * Contact sur un objet déjà choisi.
 *
 * Les deux paramètres sont lus par le formulaire (§3.6) : `subject`
 * présélectionne la pastille d'objet, `page` remplit « Page concernée ».
 * Un seul endroit les nomme, pour que l'émetteur et le lecteur ne puissent
 * pas diverger sur l'orthographe d'une clé.
 *
 * `page` porte le chemin tel qu'il se lit à l'écran — « Villes › Coût de
 * ville », pas « /tools/villes/city-cost » : c'est ce que l'auteur du
 * message relira dans le champ, et ce que l'équipe lira dans le courriel.
 */
export const contactPrefillKeys = { subject: "subject", page: "page" } as const;

/** Le séparateur du chemin affiché, entre la catégorie et la page. */
export const contactPageSeparator = " › ";

export function contactHref(subject: ContactSubject, page?: string): string {
  const params = new URLSearchParams({
    [contactPrefillKeys.subject]: subject,
  });
  const trimmed = page?.trim();
  if (trimmed) params.set(contactPrefillKeys.page, trimmed);
  return `/contact?${params.toString()}`;
}

/** Le chemin affiché d'une page, à partir de ses segments lisibles. */
export function contactPageLabel(...segments: (string | undefined)[]): string {
  return segments
    .filter((segment) => segment?.trim())
    .join(contactPageSeparator);
}
