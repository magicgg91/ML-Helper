import { describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { buildSiteSearchResults, type SiteSearchGuide } from "./site-search";

function translateFr(key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      frMessages,
    );
  return typeof value === "string" ? value : key;
}

const guides: SiteSearchGuide[] = [
  {
    id: "guide-1",
    slug: "guide-combat",
    title: "Guide Combat",
    excerpt: "Attaquer efficacement",
  },
];

describe("buildSiteSearchResults", () => {
  it("returns nothing for an empty query", () => {
    expect(
      buildSiteSearchResults({
        query: "  ",
        locale: "fr",
        guides,
        translate: translateFr,
      }),
    ).toEqual([]);
  });

  it("matches a guide by title and routes to its page", () => {
    const results = buildSiteSearchResults({
      query: "combat",
      locale: "fr",
      guides,
      translate: translateFr,
    });
    expect(results).toContainEqual({
      type: "guide",
      id: "guide-guide-1",
      label: "Guide Combat",
      href: "/guides/guide-combat",
    });
  });

  it("matches a guide by excerpt", () => {
    const results = buildSiteSearchResults({
      query: "efficacement",
      locale: "fr",
      guides,
      translate: translateFr,
    });
    expect(results).toContainEqual(
      expect.objectContaining({ type: "guide", label: "Guide Combat" }),
    );
  });

  it("matches a reference table by its translated name and routes to the referentiel page", () => {
    const results = buildSiteSearchResults({
      query: "équipements de combat",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(results).toEqual([
      {
        type: "reference",
        id: "reference-combat-equipment",
        label: "Équipements de Combat",
        href: "/guides/referentiels/combat-equipment",
      },
    ]);
  });

  it("matches a tool by its translated name and routes to its category page", () => {
    const results = buildSiteSearchResults({
      query: "gemmes",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(results).toContainEqual({
      type: "tool",
      id: "tool-gems",
      label: "Gemmes",
      href: "/tools/competences",
    });
  });

  it("Bloc36/A: keeps the Gems tool and its reference independently searchable, even though they share the exact same label", () => {
    const results = buildSiteSearchResults({
      query: "gemmes",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(results).toContainEqual({
      type: "tool",
      id: "tool-gems",
      label: "Gemmes",
      href: "/tools/competences",
    });
    expect(results).toContainEqual({
      type: "reference",
      id: "reference-gemmes",
      label: "Gemmes",
      href: "/guides/referentiels/gemmes",
    });
  });

  it("never lists a reference table's calculator entry as a tool", () => {
    const results = buildSiteSearchResults({
      query: "level up",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(results).toEqual([
      {
        type: "reference",
        id: "reference-level-up",
        label: "Level Up",
        href: "/guides/referentiels/level-up",
      },
    ]);
  });

  it("keeps the Templars tool and its cost reference independently searchable", () => {
    const toolResults = buildSiteSearchResults({
      query: "templiers",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(toolResults).toContainEqual({
      type: "tool",
      id: "tool-templars",
      label: "Templiers",
      href: "/tools/competences",
    });
    const referenceResults = buildSiteSearchResults({
      query: "coût des templiers",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    expect(referenceResults).toEqual([
      {
        type: "reference",
        id: "reference-templiers",
        label: "Coût des Templiers",
        href: "/guides/referentiels/templiers",
      },
    ]);
  });

  it("groups results as guides, then references, then tools", () => {
    const results = buildSiteSearchResults({
      query: "e",
      locale: "fr",
      guides,
      translate: translateFr,
    });
    const types = results.map((result) => result.type);
    const lastGuide = types.lastIndexOf("guide");
    const firstReference = types.indexOf("reference");
    const lastReference = types.lastIndexOf("reference");
    const firstTool = types.indexOf("tool");
    expect(lastGuide).toBeLessThan(firstReference);
    expect(lastReference).toBeLessThan(firstTool);
  });

  it("is case-insensitive", () => {
    const results = buildSiteSearchResults({
      query: "GEMMES",
      locale: "fr",
      guides: [],
      translate: translateFr,
    });
    // Bloc36/A: the Gems tool and its reference share the exact same
    // "Gemmes" label, so both match here — same as the "gemmes" query above.
    expect(results).toHaveLength(2);
  });
});
