import type { CalculatorSlug } from "./calculator-catalog";

export const referenceCatalog = [
  {
    slug: "combat-equipment",
    calculatorSlug: "combat-equipment" satisfies CalculatorSlug,
    category: "combat",
    image: "/category-combat.svg",
  },
  {
    slug: "expedition-equipment",
    calculatorSlug: "expedition-equipment" satisfies CalculatorSlug,
    category: "expedition",
    image: "/category-references.svg",
  },
  {
    slug: "level-up",
    calculatorSlug: "level-up" satisfies CalculatorSlug,
    category: "combat",
    image: "/category-combat.svg",
  },
  {
    slug: "templiers",
    calculatorSlug: "templars" satisfies CalculatorSlug,
    category: "competences",
    image: "/category-skills.svg",
  },
] as const;

export type ReferenceSlug = (typeof referenceCatalog)[number]["slug"];

export function referenceHref(slug: ReferenceSlug) {
  return `/guides/referentiels/${slug}` as const;
}
