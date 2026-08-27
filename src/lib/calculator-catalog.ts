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
  {
    slug: "stuff-simulator",
    category: "competences",
    label: "Simulateur d’Équipement de Combat",
  },
  {
    slug: "stuff-comparison",
    category: "competences",
    label: "Comparateur d’Équipement de Combat",
  },
  { slug: "gems", category: "competences", label: "Gemmes" },
  { slug: "templars", category: "competences", label: "Templiers" },
  {
    slug: "expedition-equipment-simulator",
    category: "competences",
    label: "Simulateur d’Équipement d’Expédition",
  },
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
] as const;

export type CalculatorSlug = (typeof calculatorCatalog)[number]["slug"];
export type CalculatorAvailability = Record<CalculatorSlug, boolean>;

export const defaultCalculatorAvailability = Object.fromEntries(
  calculatorCatalog.map(({ slug }) => [slug, true]),
) as CalculatorAvailability;
