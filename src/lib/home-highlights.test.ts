import { describe, expect, it } from "vitest";
import {
  maxHomeHighlights,
  parseHomeHighlights,
  serializeHomeHighlights,
} from "./home-highlights";
import { fallbackHighlights, resolveHomeHighlights } from "./site-highlights";
import { defaultCalculatorAvailability } from "./calculator-catalog";

const guides = [
  { slug: "bien-debuter", title: "Bien débuter", coverImage: null },
  { slug: "clan", title: "Le clan", coverImage: "https://img/clan.jpg" },
];

const context = {
  active: defaultCalculatorAvailability,
  guides,
  categoryImage: (category: string) => `/tools/${category}.webp`,
};

/**
 * Bloc 132 §4 : la sélection est du JSON dans une ligne de configuration,
 * pas une table liée. C'est un choix assumé pour cinq entrées ordonnées,
 * mais il déplace deux garanties de la base vers ce code : la forme de la
 * valeur, et l'existence de ce qu'elle désigne.
 */
describe("parseHomeHighlights", () => {
  it("relit ce qu'elle a écrit, dans l'ordre", () => {
    const entries = [
      { kind: "guide" as const, slug: "bien-debuter" },
      { kind: "tool" as const, slug: "city-cost" },
    ];
    expect(parseHomeHighlights(serializeHomeHighlights(entries))).toEqual(
      entries,
    );
  });

  // Pas de ligne et ligne vide ne veulent pas dire la même chose : l'une
  // déclenche le repli, l'autre masque le panneau.
  it("distingue l'absence de ligne d'une sélection vide", () => {
    expect(parseHomeHighlights(null)).toBeUndefined();
    expect(parseHomeHighlights(undefined)).toBeUndefined();
    expect(parseHomeHighlights("[]")).toEqual([]);
  });

  it("traite une valeur illisible comme une absence de ligne", () => {
    // Mieux vaut le repli qu'une page d'accueil en erreur.
    for (const value of ["", "{", "null", '{"kind":"tool"}', '[{"kind":"x"}]'])
      expect(parseHomeHighlights(value), value).toBeUndefined();
  });

  it("refuse plus de cinq entrées", () => {
    const six = Array.from({ length: maxHomeHighlights + 1 }, (_, index) => ({
      kind: "guide" as const,
      slug: `guide-${index}`,
    }));
    expect(parseHomeHighlights(JSON.stringify(six))).toBeUndefined();
  });

  it("refuse deux fois la même entrée", () => {
    expect(
      parseHomeHighlights(
        JSON.stringify([
          { kind: "tool", slug: "city-cost" },
          { kind: "tool", slug: "city-cost" },
        ]),
      ),
    ).toBeUndefined();
  });

  // Un outil et un guide peuvent porter le même slug sans se confondre :
  // c'est la paire (nature, slug) qui identifie une entrée.
  it("ne confond pas deux natures au même slug", () => {
    const entries = [
      { kind: "tool" as const, slug: "gems" },
      { kind: "reference" as const, slug: "gems" },
    ];
    expect(parseHomeHighlights(JSON.stringify(entries))).toEqual(entries);
  });
});

describe("resolveHomeHighlights", () => {
  it("garde l'ordre de la sélection", () => {
    expect(
      resolveHomeHighlights(
        [
          { kind: "reference", slug: "gems" },
          { kind: "guide", slug: "clan" },
          { kind: "tool", slug: "city-cost" },
        ],
        context,
      ).map((entry) => entry.href),
    ).toEqual([
      "/referentiels/gems",
      "/guides/clan",
      "/tools/villes?open=cost",
    ]);
  });

  it("laisse tomber un outil désactivé en administration", () => {
    expect(
      resolveHomeHighlights([{ kind: "tool", slug: "city-cost" }], {
        ...context,
        active: { ...context.active, "city-cost": false },
      }),
    ).toEqual([]);
  });

  it("laisse tomber un référentiel pas encore ouvert", () => {
    expect(
      resolveHomeHighlights([{ kind: "reference", slug: "events" }], {
        ...context,
        active: { ...context.active, events: false },
      }),
    ).toEqual([]);
  });

  it("laisse tomber un guide qui n'est pas dans la liste publiée", () => {
    expect(
      resolveHomeHighlights([{ kind: "guide", slug: "brouillon" }], context),
    ).toEqual([]);
  });

  it("laisse tomber un slug inconnu plutôt que de fabriquer un lien", () => {
    expect(
      resolveHomeHighlights(
        [
          { kind: "tool", slug: "outil-inexistant" },
          { kind: "reference", slug: "referentiel-inexistant" },
        ],
        context,
      ),
    ).toEqual([]);
  });

  /**
   * Le référentiel « Boutique » s'écrit « shop » dans l'URL et
   * `consommables` en base (Bloc 48/F). La sélection retient le slug public,
   * et c'est le catalogue qui fait le pont vers l'état d'activation.
   */
  it("désigne un référentiel par son slug public, pas par sa clé technique", () => {
    expect(
      resolveHomeHighlights([{ kind: "reference", slug: "shop" }], context),
    ).toEqual([
      {
        kind: "reference",
        slug: "shop",
        href: "/referentiels/shop",
        image: "/referentials/referential-shop.webp",
      },
    ]);
    expect(
      resolveHomeHighlights(
        [{ kind: "reference", slug: "consommables" }],
        context,
      ),
    ).toEqual([]);
  });

  it("résout entièrement la liste de repli", () => {
    expect(resolveHomeHighlights(fallbackHighlights, context)).toHaveLength(
      fallbackHighlights.length,
    );
  });
});
