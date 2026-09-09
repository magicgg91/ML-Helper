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
  // Bloc 36/A: same pattern as "templiers" above — "gemmes" is the Gems
  // reference's own row, independent from the "gems" tool row, sharing
  // only the formula params/edit point.
  { slug: "gemmes", category: "referentiels", label: "Gemmes" },
  // Bloc 43: the 6th reference, and the first with no matching "tool" row
  // at all — free CRUD data, not a formula/simulator. Bloc 44 review: slug
  // kept French ("consommables"), matching templiers/gemmes and the URL
  // documented in the original task spec.
  { slug: "consommables", category: "referentiels", label: "Consommables" },
  // Bloc 60: the 7th reference — same "no matching tool row, free CRUD
  // data" shape as consommables above, but its own catalog (league ->
  // events -> tiers) instead of a flat/grouped row list.
  { slug: "events", category: "referentiels", label: "Événements" },
] as const;

export type CalculatorSlug = (typeof calculatorCatalog)[number]["slug"];
export type CalculatorAvailability = Record<CalculatorSlug, boolean>;

export const defaultCalculatorAvailability = Object.fromEntries(
  calculatorCatalog.map(({ slug }) => [slug, true]),
) as CalculatorAvailability;
