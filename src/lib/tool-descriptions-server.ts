import { prisma } from "./prisma";
import { parseToolDescription } from "./tool-description";
import { localizedText } from "./translations";

/**
 * Bloc 129 : la description d'une ligne d'un outil ou d'un référentiel,
 * dans la langue du visiteur.
 *
 * Elle vient de `calculators.description`, la colonne que le Bloc 130 a
 * rendue éditable en administration — un objet JSON par enregistrement
 * portant les cinq langues. Ce n'est PAS une clé i18n : le brief du Bloc 129
 * en prévoyait une, le Bloc 130 l'a remplacée par de la donnée, parce qu'une
 * description est du contenu éditorial et se modifie sans livraison.
 *
 * Une description absente ressort en chaîne vide, et l'appelant masque la
 * ligne plutôt que d'afficher un vide (§5 : « n'invente rien »).
 */
export async function getPublicDescriptions(
  locale: string,
): Promise<Record<string, string>> {
  const rows = await prisma.calculator.findMany({
    select: { slug: true, description: true },
  });
  return Object.fromEntries(
    rows.map((row) => [
      row.slug,
      localizedText(parseToolDescription(row.description), locale),
    ]),
  );
}
