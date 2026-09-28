import type { CalculatorSlug } from "./calculator-catalog";
import {
  toolHref,
  type TabbedToolSlug,
  type ToolTab,
} from "./reference-catalog";

/**
 * Bloc 129 : l'adresse publique d'un outil, un par un.
 *
 * Un outil n'a pas d'URL à lui : les onze outils vivent dans quatre pages de
 * catégorie, et se désignent par le paramètre `?open=` (Bloc 53/F, étendu à
 * Villes par ce bloc). Le §3.1 (« Les plus utilisés »), le §3.2 (la liste des
 * outils sur la carte d'une catégorie) et le §3.8 (« Aller plus loin ») ont
 * tous besoin de ce lien ; il est calculé ici, une fois.
 *
 * Le type croise les onglets déclarés dans `toolTabs`, donc un onglet renommé
 * casse la compilation au lieu de renvoyer discrètement sur le premier outil
 * de la page.
 */
type TabbedEntry = {
  [Slug in TabbedToolSlug]: { category: Slug; tab: ToolTab<Slug> };
}[TabbedToolSlug];

type ToolLocation = TabbedEntry | { category: "classement" };

/**
 * La catégorie d'un outil, et l'onglet qu'il occupe quand il y en a un.
 *
 * Partiel, et volontairement : `CalculatorSlug` couvre aussi les sept
 * référentiels, qui ne sont pas des outils et n'ont rien à faire ici.
 */
const toolLocations: Partial<Record<CalculatorSlug, ToolLocation>> = {
  "city-cost": { category: "villes", tab: "cost" },
  "city-max-level": { category: "villes", tab: "max-level" },
  "city-production": { category: "villes", tab: "production" },
  "city-rewards": { category: "villes", tab: "rewards" },
  "xp-gain-rate": { category: "combat", tab: "xp" },
  "demo-attack-troops": { category: "combat", tab: "demo" },
  // Classement n'a qu'un outil : la page EST l'outil, il n'y a pas d'onglet.
  ranking: { category: "classement" },
  "stuff-simulator": { category: "competences", tab: "simulator" },
  "expedition-equipment-simulator": {
    category: "competences",
    tab: "expedition",
  },
  gems: { category: "competences", tab: "gems" },
  templars: { category: "competences", tab: "templars" },
};

/** Les catégories, dans l'ordre du §3.2 : Villes, Compétences, Combat, Classement. */
export const toolCategoryOrder = [
  "villes",
  "competences",
  "combat",
  "classement",
] as const;

export type ToolCategorySlug = (typeof toolCategoryOrder)[number];

/** Là où mène le lien d'un outil. `undefined` si le slug n'est pas un outil. */
export function toolEntryHref(slug: string): string | undefined {
  const location = toolLocations[slug as CalculatorSlug];
  if (!location) return undefined;
  return "tab" in location
    ? toolHref(location.category, location.tab)
    : `/tools/${location.category}`;
}

/** La catégorie d'un outil, pour dire « Outil · Villes » (§3.1). */
export function toolCategoryOf(slug: string): ToolCategorySlug | undefined {
  return toolLocations[slug as CalculatorSlug]?.category;
}

/** La clé de traduction du nom d'une catégorie, dans l'espace `tools`. */
export const toolCategoryLabelKeys: Record<ToolCategorySlug, string> = {
  villes: "cities",
  competences: "skills",
  combat: "combat",
  classement: "ranking",
};
