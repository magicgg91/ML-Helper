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
    slug: "templars",
    calculatorSlug: "templiers" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-temples.webp",
    fallbackImage: "/category-skills.svg",
  },
  {
    slug: "gems",
    calculatorSlug: "gemmes" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-gems.webp",
    fallbackImage: "/category-skills.svg",
  },
  {
    // Bloc 48/F: public label/URL renamed Consommables -> Boutique
    // (slug "shop", no redirect from the old /consommables URL — no
    // indexed traffic to preserve yet). Internal technical keys (file
    // names, calculatorSlug, ReferenceTable/StaticContent DB keys, API
    // routes) stay unchanged per AGENTS.md — only this public slug moves.
    slug: "shop",
    calculatorSlug: "consommables" satisfies CalculatorSlug,
    category: "consommables",
    // Bloc 51: real illustration deposited (public/referentials/), same as
    // the other 5 references — was a placeholder-only entry before.
    image: "/referentials/referential-shop.webp",
    fallbackImage: "/category-references.svg",
  },
  {
    // Bloc 60: 7th reference — "Événements" is a deliberate working name,
    // already used elsewhere for the unrelated seasonal-events mechanic;
    // kept as-is per the bloc's explicit instruction, to reconsider later.
    slug: "events",
    calculatorSlug: "events" satisfies CalculatorSlug,
    category: "combat",
    // Bloc 62/H: real illustration deposited — same treatment as the other
    // 6 (GameImage still falls back gracefully to fallbackImage if it's
    // ever missing).
    image: "/referentials/referential-events.webp",
    fallbackImage: "/category-combat.svg",
  },
] as const;

export type ReferenceSlug = (typeof referenceCatalog)[number]["slug"];

export function referenceHref(slug: ReferenceSlug) {
  return `/referentiels/${slug}` as const;
}
