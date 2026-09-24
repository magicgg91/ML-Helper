import type { CalculatorSlug } from "./calculator-catalog";
import { parseGuideCategories, type GuideCategory } from "./guide-categories";
import type { ToolCategorySlug } from "./tool-links";

/**
 * Bloc 129 : les listes que le brief demande de rendre configurables plutôt
 * que de les écrire dans un composant — le guide mis en avant (§3.4), le
 * panneau « Les plus utilisés » de l'accueil (§3.1), l'outil associé à un
 * guide (§3.4) et la section « Aller plus loin » d'une page outil (§3.8).
 *
 * Elles vivent ici, en un seul endroit, pour deux raisons : le brief l'exige
 * pour le guide mis en avant (« désigné par un champ ou un identifiant de
 * configuration, pas en dur dans le composant »), et parce que chacune est
 * un choix éditorial qui bougera sans qu'on touche au rendu.
 *
 * Aucune de ces listes n'est obligatoire : ce qui n'est pas renseigné n'est
 * pas affiché. C'est la règle du §5 — ne rien inventer, masquer plutôt que
 * de montrer un vide.
 */

/**
 * Le guide de la carte « Commence ici ».
 *
 * `slug` d'abord, parce que c'est ce qui désigne un guide sans ambiguïté.
 * Tant qu'il n'est pas renseigné, on prend le plus ancien guide publié de
 * `category` : « Bien débuter dans Million Lords » est le premier guide
 * écrit du site et le premier de la catégorie « Débuter & progresser ». Le
 * repli évite que la carte disparaisse faute d'une valeur, mais c'est un
 * repli : dès que le slug de production est connu, il se met ici.
 */
export const featuredGuide: {
  slug: string;
  category: GuideCategory;
} = { slug: "", category: "debuter" };

/** Ce que le panneau « Les plus utilisés » de l'accueil met en avant (§3.1). */
export type HighlightEntry =
  { kind: "tool"; slug: CalculatorSlug } | { kind: "reference"; slug: string };

export const mostUsedEntries: HighlightEntry[] = [
  { kind: "tool", slug: "city-cost" },
  { kind: "tool", slug: "city-production" },
  { kind: "tool", slug: "city-max-level" },
  { kind: "reference", slug: "consommables" },
  { kind: "reference", slug: "gemmes" },
];

/**
 * L'outil associé à un guide, pour la pastille « Outil : … » de l'index des
 * guides (§3.4). Clé : le slug du guide.
 *
 * Vide à la livraison : le §3.4 donne les quatre associations par titre de
 * guide (Production → Production, Villes → Coût de ville, Ligues →
 * Classement, Clan → aucun), mais les slugs de production ne sont pas dans
 * le dépôt et un slug inventé pointerait à côté. Sans entrée, la pastille
 * n'est pas rendue — voir le PR, qui liste ce qui reste à renseigner.
 */
export const guideToolLinks: Record<string, CalculatorSlug> = {};

/**
 * La section « Aller plus loin » d'une page outil (§3.8) : les guides et
 * outils voisins à proposer. Section masquée sans entrée, comme le demande
 * le brief.
 *
 * Clé : le slug de la catégorie, pas celui d'un outil. Une page de catégorie
 * héberge plusieurs outils derrière des onglets côté client, et la section
 * vit sous la page, pas sous l'onglet — la clé suit donc ce que la page sait
 * d'elle-même.
 *
 * Vide à la livraison : les guides se désignent par slug, et ceux de
 * production ne sont pas dans le dépôt (voir le PR).
 */
export type FurtherReadingEntry =
  { kind: "guide"; slug: string } | { kind: "tool"; slug: CalculatorSlug };

export const furtherReading: Partial<
  Record<ToolCategorySlug, FurtherReadingEntry[]>
> = {};

/**
 * Le guide de la carte « Commence ici », choisi parmi les guides publiés.
 *
 * Renvoie `undefined` si rien ne correspond — aucune carte plutôt qu'une
 * carte vide. Ne trie pas la liste reçue sur place : elle vient d'une page
 * qui s'en sert aussi pour autre chose.
 */
export function resolveFeaturedGuide<
  T extends { slug: string; category: unknown; publishedAt: Date | null },
>(guides: T[]): T | undefined {
  if (featuredGuide.slug) {
    const exact = guides.find((guide) => guide.slug === featuredGuide.slug);
    if (exact) return exact;
  }
  return [...guides]
    .filter((guide) =>
      parseGuideCategories(guide.category).includes(featuredGuide.category),
    )
    .sort(
      (a, b) =>
        (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0),
    )[0];
}
