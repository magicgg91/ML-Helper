export const calculatorCatalog = [
  { slug: "city-cost", category: "villes", label: "Coût de Ville" },
  {
    slug: "city-max-level",
    category: "villes",
    label: "Niveau Max Atteignable",
  },
  { slug: "city-production", category: "villes", label: "Production" },
  {
    slug: "city-rewards",
    category: "villes",
    label: "Récompenses de Production",
  },
  { slug: "xp-gain-rate", category: "combat", label: "Taux de gain d’XP" },
  {
    slug: "demo-attack-troops",
    category: "combat",
    label: "Troupes en attaque démo",
  },
  { slug: "ranking", category: "classement", label: "Ranking" },
  // Order within "competences" (Bloc 31/C): Combat, Expedition, Gems, Templars.
  {
    slug: "stuff-simulator",
    category: "competences",
    label: "Équipement de Combat",
  },
  {
    slug: "expedition-equipment-simulator",
    category: "competences",
    label: "Équipement d’Expédition",
  },
  { slug: "gems", category: "competences", label: "Gemmes" },
  { slug: "templars", category: "competences", label: "Templiers" },
  {
    slug: "combat-equipment",
    category: "referentiels",
    label: "Équipements de Combat",
  },
  {
    slug: "expedition-equipment",
    category: "referentiels",
    label: "Équipement d’Expédition",
  },
  { slug: "level-up", category: "referentiels", label: "Level Up" },
  // Bloc 33/G: Templars' reference gets its own row, independent from the
  // "templars" tool row above — same formula params/edit point, but its
  // own active flag (see admin-tools.ts/referenceToolSlugs).
  { slug: "templiers", category: "referentiels", label: "Templiers" },
] as const;

export type CalculatorSlug = (typeof calculatorCatalog)[number]["slug"];
export type CalculatorAvailability = Record<CalculatorSlug, boolean>;

export const defaultCalculatorAvailability = Object.fromEntries(
  calculatorCatalog.map(({ slug }) => [slug, true]),
) as CalculatorAvailability;

// The catalog's own order is the single source of truth for display order
// (Bloc 31/C) — used to sort the admin Outils table instead of the
// alphabetical-by-slug DB order, which doesn't match the intended sequence.
const catalogOrder = new Map(
  calculatorCatalog.map(({ slug }, index) => [slug, index]),
);
export function byCalculatorCatalogOrder(a: { slug: string }, b: { slug: string }) {
  return (
    (catalogOrder.get(a.slug as CalculatorSlug) ?? Infinity) -
    (catalogOrder.get(b.slug as CalculatorSlug) ?? Infinity)
  );
}
