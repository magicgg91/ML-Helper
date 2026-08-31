import type { CalculatorSlug } from "./calculator-catalog";

// Bloc 38/O: `image` is the real AI-generated illustration for each
// reference (single source of truth, `public/referentials/`); `fallbackImage`
// is the previous placeholder category icon, shown instead if the file is
// ever missing (via GameImage) — same pattern as toolCategories in
// tool-category-grid.tsx.
export const referenceCatalog = [
  {
    slug: "combat-equipment",
    calculatorSlug: "combat-equipment" satisfies CalculatorSlug,
    category: "combat",
    image: "/referentials/referential-fight.webp",
    fallbackImage: "/category-combat.svg",
  },
  {
    slug: "expedition-equipment",
    calculatorSlug: "expedition-equipment" satisfies CalculatorSlug,
    category: "expedition",
    image: "/referentials/referential-expedition.webp",
    fallbackImage: "/category-references.svg",
  },
  {
    slug: "level-up",
    calculatorSlug: "level-up" satisfies CalculatorSlug,
    category: "combat",
    image: "/referentials/referential-levelup.webp",
    fallbackImage: "/category-combat.svg",
  },
  {
    slug: "templiers",
    calculatorSlug: "templiers" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-temples.webp",
    fallbackImage: "/category-skills.svg",
  },
  {
    slug: "gemmes",
    calculatorSlug: "gemmes" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-gems.webp",
    fallbackImage: "/category-skills.svg",
  },
  {
    slug: "consumables",
    calculatorSlug: "consumables" satisfies CalculatorSlug,
    category: "consommables",
    image: "/referentials/referential-consumables.webp",
    fallbackImage: "/category-references.svg",
  },
] as const;

export type ReferenceSlug = (typeof referenceCatalog)[number]["slug"];

export function referenceHref(slug: ReferenceSlug) {
  return `/guides/referentiels/${slug}` as const;
}
