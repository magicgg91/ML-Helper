// Avant tout schéma : coupe la compilation JIT de Zod dans le navigateur,
// qui violerait la CSP (voir le module pour le détail).
import "./zod-config";
import { z } from "zod";

/**
 * Bloc 132 §4 : la sélection « Mis en avant » de l'accueil.
 *
 * Cinq entrées choisies à la main en administration, parmi les guides, les
 * outils et les référentiels confondus. Le brief d'origine prévoyait un
 * compteur de consultations ; la révision l'abandonne au profit de ce choix
 * éditorial, et il n'y a donc rien à mesurer ni à stocker par visite.
 *
 * Elle vit dans une ligne de `SiteSetting`, la table clé/valeur que le
 * Bloc 100 a créée pour la configuration nommée, et non dans une table de
 * liaison : une liste ordonnée d'au plus cinq références n'a ni colonnes
 * propres ni contraintes à faire respecter par la base, et une table
 * imposerait une migration pour ne rien gagner. Le prix à payer est que
 * l'intégrité n'est pas garantie par la base — une entrée peut désigner un
 * guide dépublié depuis. La résolution côté page la laisse alors tomber,
 * ce qui est de toute façon nécessaire : un outil désactivé en
 * administration doit disparaître de l'accueil sans qu'on retouche la
 * sélection.
 */
export const homeHighlightsKey = "home_highlights";

/** Le brief en demande cinq. */
export const maxHomeHighlights = 5;

export const homeHighlightKinds = ["tool", "reference", "guide"] as const;
export type HomeHighlightKind = (typeof homeHighlightKinds)[number];

/**
 * Une entrée de la sélection.
 *
 * `slug` est le slug public de la chose désignée : celui d'un guide, celui
 * d'un outil, celui d'un référentiel tel qu'il apparaît dans l'URL
 * (« shop », pas « consommables » — les deux diffèrent depuis le Bloc
 * 48/F). C'est ce que l'administration liste et ce que le visiteur voit
 * dans la barre d'adresse ; une clé technique aurait obligé à traduire dans
 * les deux sens à chaque bout.
 */
export type HomeHighlight = {
  kind: HomeHighlightKind;
  slug: string;
};

export const homeHighlightSchema = z.object({
  kind: z.enum(homeHighlightKinds),
  slug: z.string().trim().min(1).max(200),
});

export const homeHighlightsSchema = z
  .array(homeHighlightSchema)
  .max(maxHomeHighlights)
  // Deux fois la même entrée occuperait deux des cinq places pour un seul
  // lien, et la clé React d'une liste ne le supporterait pas non plus.
  .refine(
    (entries) =>
      new Set(entries.map((entry) => `${entry.kind}:${entry.slug}`)).size ===
      entries.length,
    { message: "duplicate_highlight" },
  );

/**
 * Ce que la ligne stockée contient, ou `undefined` si elle n'existe pas.
 *
 * La distinction compte : pas de ligne, c'est « personne n'a encore choisi »
 * et l'accueil retombe sur la liste de repli ; une ligne vide, c'est « ne
 * montre rien », et le panneau disparaît. Sans elle, vider la sélection
 * ferait réapparaître le repli, ce qu'aucun administrateur n'attendrait.
 *
 * Une valeur illisible (JSON cassé, forme inattendue) est traitée comme une
 * ligne absente : mieux vaut le repli qu'une page en erreur.
 */
export function parseHomeHighlights(
  value: string | null | undefined,
): HomeHighlight[] | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    const parsed = homeHighlightsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function serializeHomeHighlights(entries: HomeHighlight[]): string {
  return JSON.stringify(entries.map(({ kind, slug }) => ({ kind, slug })));
}
