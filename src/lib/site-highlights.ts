import type {
  CalculatorAvailability,
  CalculatorSlug,
} from "./calculator-catalog";
import { parseGuideCategories, type GuideCategory } from "./guide-categories";
import type { HomeHighlight } from "./home-highlights";
import { referenceCatalog, referenceHref } from "./reference-catalog";
import {
  toolCategoryOf,
  toolEntryHref,
  type ToolCategorySlug,
} from "./tool-links";

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

/**
 * Le panneau « Mis en avant » de l'accueil quand personne n'a encore choisi.
 *
 * Bloc 132 §4 : la sélection est éditoriale et vit en base désormais (voir
 * `home-highlights.ts`). Cette liste n'est plus que le repli, pour que le
 * panneau ne soit jamais vide à la livraison — c'est ce que le §4 demande
 * explicitement.
 *
 * Les slugs sont ceux de l'URL publique, comme dans la sélection stockée :
 * « shop » et non `consommables`, « gems » et non `gemmes` (Bloc 48/F les a
 * séparés). Une seule convention des deux côtés, sinon il faudrait traduire
 * dans les deux sens selon la provenance.
 */
export const fallbackHighlights: HomeHighlight[] = [
  { kind: "tool", slug: "city-cost" },
  { kind: "tool", slug: "city-production" },
  { kind: "tool", slug: "city-max-level" },
  { kind: "reference", slug: "shop" },
  { kind: "reference", slug: "gems" },
];

/**
 * Bloc 132 §5 : les quatre référentiels de la section « Retrouve les données
 * clés » de l'accueil.
 *
 * Le Bloc 129 y montrait les sept, ce qui faisait de la section un doublon
 * de l'index. Quatre suffisent à dire ce qu'on trouve là, et la recette les
 * nomme : Boutique, Événements, Gemmes, Progression. Ce sont des slugs
 * publics, comme partout ailleurs dans ce fichier. L'ordre d'affichage est
 * alphabétique sur le libellé traduit, pas sur cette liste — « Événements »
 * ne se classe pas au même endroit selon la langue.
 */
export const homeReferenceSlugs = ["shop", "events", "gems", "level-up"];

/**
 * Une entrée de la sélection, retrouvée dans les catalogues et en base.
 *
 * La page en fait des cartes : c'est elle qui traduit les libellés d'outils
 * et de référentiels, et ce qui se traduit reste hors d'ici — cette
 * fonction est pure, donc testable sans base ni traducteur.
 */
export type ResolvedHighlight =
  | {
      kind: "tool";
      slug: CalculatorSlug;
      href: string;
      category: ToolCategorySlug;
      image: string;
    }
  | { kind: "reference"; slug: string; href: string; image: string }
  | {
      kind: "guide";
      slug: string;
      href: string;
      title: string;
      image: string | null;
    };

/**
 * Résout la sélection, en laissant tomber ce qui n'est plus visible.
 *
 * Un outil désactivé en administration, un référentiel pas encore ouvert,
 * un guide dépublié : chacun disparaît de l'accueil sans qu'on retouche la
 * sélection. C'est la contrepartie assumée d'une liste stockée en JSON
 * plutôt qu'en table liée — la base ne garantit pas que la cible existe,
 * donc c'est ici qu'on vérifie.
 */
export function resolveHomeHighlights(
  entries: HomeHighlight[],
  context: {
    active: CalculatorAvailability;
    /** Les guides publiés, déjà localisés par la page. */
    guides: { slug: string; title: string; coverImage: string | null }[];
    /** L'illustration d'une catégorie d'outils. */
    categoryImage: (category: ToolCategorySlug) => string | undefined;
  },
): ResolvedHighlight[] {
  return entries.flatMap((entry): ResolvedHighlight[] => {
    if (entry.kind === "tool") {
      const slug = entry.slug as CalculatorSlug;
      const href = toolEntryHref(slug);
      const category = toolCategoryOf(slug);
      const image = category ? context.categoryImage(category) : undefined;
      if (!href || !category || !image || !context.active[slug]) return [];
      return [{ kind: "tool", slug, href, category, image }];
    }
    if (entry.kind === "reference") {
      const reference = referenceCatalog.find(
        (candidate) => candidate.slug === entry.slug,
      );
      if (!reference || !context.active[reference.calculatorSlug]) return [];
      return [
        {
          kind: "reference",
          slug: reference.slug,
          href: referenceHref(reference.slug),
          image: reference.image,
        },
      ];
    }
    const guide = context.guides.find(
      (candidate) => candidate.slug === entry.slug,
    );
    if (!guide) return [];
    return [
      {
        kind: "guide",
        slug: guide.slug,
        href: `/guides/${guide.slug}`,
        title: guide.title,
        image: guide.coverImage,
      },
    ];
  });
}

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
