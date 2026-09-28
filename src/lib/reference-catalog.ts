import type { CalculatorSlug } from "./calculator-catalog";

// Bloc 38/O: `image` is the real AI-generated illustration for each
// reference (single source of truth, `public/referentials/`) — same pattern
// as toolCategories in tool-category-grid.tsx.
//
// Bloc 104: there is no placeholder path beside it any more. It named the
// icons this catalog used before the illustrations existed
// (`/category-*.svg`), and those files were deleted once every reference had
// its own; the field kept pointing at them, so the "graceful fallback" was a
// second broken image behind the first. Nor was it free: the grids pass that
// element as a prop to a client component, React serialises it into the RSC
// payload, and React emits a preload hint for any <img> it finds there —
// five 404s on the homepage alone, for an element the page never rendered.
// Callers pass `fallback={null}` now, as most GameImage callers already did.
// catalog-images.test.ts keeps every path here pointing at a file that ships.
export const referenceCatalog = [
  {
    slug: "combat-equipment",
    calculatorSlug: "combat-equipment" satisfies CalculatorSlug,
    category: "combat",
    image: "/referentials/referential-fight.webp",
  },
  {
    slug: "expedition-equipment",
    calculatorSlug: "expedition-equipment" satisfies CalculatorSlug,
    category: "expedition",
    image: "/referentials/referential-expedition.webp",
  },
  {
    slug: "level-up",
    calculatorSlug: "level-up" satisfies CalculatorSlug,
    category: "combat",
    image: "/referentials/referential-levelup.webp",
  },
  {
    slug: "templars",
    calculatorSlug: "templiers" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-temples.webp",
  },
  {
    slug: "gems",
    calculatorSlug: "gemmes" satisfies CalculatorSlug,
    category: "competences",
    image: "/referentials/referential-gems.webp",
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
  },
  {
    // Bloc 60: 7th reference — "Événements" is a deliberate working name,
    // already used elsewhere for the unrelated seasonal-events mechanic;
    // kept as-is per the bloc's explicit instruction, to reconsider later.
    slug: "events",
    calculatorSlug: "events" satisfies CalculatorSlug,
    category: "combat",
    // Bloc 62/H: real illustration deposited — same treatment as the other 6.
    image: "/referentials/referential-events.webp",
  },
] as const;

export type ReferenceSlug = (typeof referenceCatalog)[number]["slug"];

export function referenceHref(slug: ReferenceSlug) {
  return `/referentiels/${slug}` as const;
}

// Bloc 93/M4: the other direction of the same cross-link. Bloc 53/F gave the
// tool pages a `?open=<tab>` contract so a reference can land on a precise
// calculator, but the 5 links using it were written as string literals and
// nothing tied them to the tabs the pages actually accept — a renamed tab
// would have silently degraded each link to "whichever tab is first".
// Listing the tabs here makes toolHref("combat", "gems") a type error, and
// gives the tool page one source of truth to validate `?open=` against.
// Bloc 129 : Villes rejoint le contrat. Le §3.2 demande que la carte d'une
// catégorie liste des liens vers chacun de ses outils, et le §3.1 met trois
// outils de Villes dans « Les plus utilisés » — sans ?open=, ces liens
// tombaient tous sur le premier onglet de la page. Les clés sont celles que
// la page utilise déjà côté client (city-calculators.tsx), donc c'est la même
// contrainte qu'ailleurs : renommer un onglet devient une erreur de type.
export const toolTabs = {
  combat: ["xp", "demo"],
  competences: ["simulator", "expedition", "gems", "templars"],
  villes: ["cost", "max-level", "production", "rewards"],
} as const;

export type TabbedToolSlug = keyof typeof toolTabs;
export type ToolTab<Slug extends TabbedToolSlug> =
  (typeof toolTabs)[Slug][number];

export function toolHref<Slug extends TabbedToolSlug>(
  slug: Slug,
  tab: ToolTab<Slug>,
) {
  return `/tools/${slug}?open=${tab}` as const;
}

/** Narrows a raw `?open=` value to a tab the given tool actually has. */
export function toolTab<Slug extends TabbedToolSlug>(
  slug: Slug,
  value: string | string[] | undefined,
): ToolTab<Slug> | undefined {
  return typeof value === "string" &&
    (toolTabs[slug] as readonly string[]).includes(value)
    ? (value as ToolTab<Slug>)
    : undefined;
}
