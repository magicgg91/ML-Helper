import { describe, expect, it } from "vitest";
import {
  adminReferenceEditHref,
  toolParameterSource,
  toolUsingReference,
} from "./admin-tool-sources";
import { adminToolEditHref, referenceToolSlugs } from "./admin-tools";
import { calculatorCatalog } from "./calculator-catalog";

const tools = calculatorCatalog.filter(
  ({ slug }) => !(referenceToolSlugs as readonly string[]).includes(slug),
);

describe("Bloc 119: where a tool's parameters come from", () => {
  it("answers for every tool of the catalogue, with nothing left undefined", () => {
    // The column has no empty cell: a tool added later that nothing here
    // knows about would come back "none", which is a claim — this test is
    // what makes that claim deliberate rather than a default.
    expect(tools).toHaveLength(11);
    for (const { slug } of tools)
      expect(toolParameterSource(slug).kind, slug).toMatch(
        /^(own|shared|reference|none)$/,
      );
  });

  it("groups the three Villes tools on one shared screen", () => {
    const source = toolParameterSource("city-cost");
    expect(source).toEqual({
      kind: "shared",
      href: "/admin/tools/city-parameters",
      tools: ["city-cost", "city-max-level", "city-production"],
    });
    // The other two say the same thing, so the pastille "Utilisé par N
    // outils" reads the same from whichever row was clicked.
    for (const slug of ["city-max-level", "city-production"])
      expect(toolParameterSource(slug)).toEqual(source);
  });

  it("derives that list from the editor links, not from a second copy", () => {
    // Everything in the shared list really opens that screen: the day a
    // fourth Villes tool joins them, it joins the pastille too, with no
    // edit here.
    const source = toolParameterSource("city-cost");
    if (source.kind !== "shared") throw new Error("attendu: shared");
    for (const slug of source.tools)
      expect(adminToolEditHref(slug)).toBe(source.href);
  });

  it("sends a tool with its own parameters to its own screen", () => {
    expect(toolParameterSource("ranking")).toEqual({
      kind: "own",
      href: "/admin/tools/ranking",
    });
    expect(toolParameterSource("gems")).toEqual({
      kind: "own",
      href: "/admin/tools/gems",
    });
    for (const slug of ["templars", "xp-gain-rate", "demo-attack-troops"])
      expect(toolParameterSource(slug)).toEqual({
        kind: "own",
        href: adminToolEditHref(slug),
      });
  });

  it("points the two equipment simulators at the reference they read", () => {
    // Neither has parameters of its own: the public page feeds them the
    // reference's rows.
    expect(toolParameterSource("stuff-simulator")).toEqual({
      kind: "reference",
      reference: "combat-equipment",
      href: "/admin/referentiels/reference-combat-equipment",
    });
    expect(toolParameterSource("expedition-equipment-simulator")).toEqual({
      kind: "reference",
      reference: "expedition-equipment",
      href: "/admin/referentiels/reference-expedition-equipment",
    });
  });

  it("says plainly that Récompenses de Production has nothing to edit", () => {
    // Its calculator takes no parameter at all — every number is typed by
    // the player — so the row shows a sentence, not an empty cell.
    expect(toolParameterSource("city-rewards")).toEqual({ kind: "none" });
    expect(adminToolEditHref("city-rewards")).toBeUndefined();
  });

  it("names only real tools and real references", () => {
    const slugs = new Set(calculatorCatalog.map(({ slug }) => slug));
    for (const { slug } of tools) {
      const source = toolParameterSource(slug);
      if (source.kind === "reference") {
        expect(slugs).toContain(source.reference);
        expect(referenceToolSlugs).toContain(source.reference);
      }
      if (source.kind === "shared")
        for (const shared of source.tools) expect(slugs).toContain(shared);
    }
  });
});

describe("Bloc 119: which tool uses a reference", () => {
  it("links the four references a tool depends on", () => {
    expect(toolUsingReference("combat-equipment")).toBe("stuff-simulator");
    expect(toolUsingReference("expedition-equipment")).toBe(
      "expedition-equipment-simulator",
    );
    // These two are the other direction: the reference is edited through the
    // tool's own screen, because they share their formula parameters.
    expect(toolUsingReference("gemmes")).toBe("gems");
    expect(toolUsingReference("templiers")).toBe("templars");
  });

  it("leaves the three free-standing references unlinked", () => {
    // Progression, Consommables and Événements feed no simulator: their row
    // shows an em dash, not a broken link.
    for (const slug of ["level-up", "consommables", "events"])
      expect(toolUsingReference(slug), slug).toBeUndefined();
  });

  it("covers every reference of the catalogue one way or the other", () => {
    expect(referenceToolSlugs).toHaveLength(7);
    for (const slug of referenceToolSlugs) {
      const tool = toolUsingReference(slug);
      if (tool !== undefined)
        expect(
          tools.map((entry) => entry.slug),
          `${slug} pointe sur un outil inconnu`,
        ).toContain(tool);
    }
  });
});

describe("Bloc 119: where a reference is edited", () => {
  it("uses its own screen when it has one", () => {
    expect(adminReferenceEditHref("consommables")).toBe(
      "/admin/referentiels/reference-consommables",
    );
    expect(adminReferenceEditHref("events")).toBe(
      "/admin/referentiels/reference-events",
    );
  });

  it("uses the tool's screen when the two share their parameters", () => {
    // The `from=referentiels` provenance is what sends the editor's back
    // link to Référentiels rather than to Outils — a references_manager
    // cannot open Outils at all.
    expect(adminReferenceEditHref("gemmes")).toBe(
      "/admin/tools/gems?from=referentiels",
    );
    expect(adminReferenceEditHref("templiers")).toBe(
      "/admin/tools/templars?from=referentiels",
    );
  });
});
