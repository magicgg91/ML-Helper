import { describe, expect, it } from "vitest";
import { adminToolEditHref, referenceToolSlugs } from "./admin-tools";

describe("admin tool editor routing", () => {
  it("lists Templiers among the independent references, not excluded from the Outils table (Bloc 33/G)", () => {
    expect(referenceToolSlugs).toContain("templiers");
    expect(referenceToolSlugs).not.toContain("templars");
  });
  it("points all three City tools to one shared editor", () => {
    for (const slug of ["city-cost", "city-max-level", "city-production"])
      expect(adminToolEditHref(slug)).toBe("/admin/tools/city-parameters");
  });
  it("uses dedicated parameter editors where required", () => {
    expect(adminToolEditHref("ranking")).toBe("/admin/tools/ranking");
    expect(adminToolEditHref("templars")).toBe("/admin/tools/templars");
    expect(adminToolEditHref("xp-gain-rate")).toBe("/admin/tools/xp-gain-rate");
    expect(adminToolEditHref("demo-attack-troops")).toBe(
      "/admin/tools/demo-attack-troops",
    );
    expect(adminToolEditHref("gems")).toBe("/admin/tools/gems");
  });
  it("points Templiers' reference to the same shared formula editor as the Templars tool (Bloc 33/G)", () => {
    expect(adminToolEditHref("templiers")).toBe(
      "/admin/tools/templars?from=referentiels",
    );
  });
  it("Bloc35 7.1, updated Bloc 50: carries provenance so the editor knows which table it was opened from", () => {
    expect(adminToolEditHref("templars")).not.toContain("from=referentiels");
    expect(adminToolEditHref("templiers")).toContain("from=referentiels");
  });
  it("has no edit destination for a tool with no named numeric parameters", () => {
    for (const slug of ["stuff-simulator", "city-rewards"])
      expect(adminToolEditHref(slug)).toBeUndefined();
  });

  it("Bloc36/A: lists Gemmes among the independent references and shares the Gems editor, same pattern as Templiers", () => {
    expect(referenceToolSlugs).toContain("gemmes");
    expect(referenceToolSlugs).not.toContain("gems");
    expect(adminToolEditHref("gems")).not.toContain("from=referentiels");
    expect(adminToolEditHref("gemmes")).toBe(
      "/admin/tools/gems?from=referentiels",
    );
  });

  it("Bloc43/44: lists Consumables among the independent references, with no shared tool to edit — falls through to /admin/referentiels/reference-consommables (public slug kept French per review)", () => {
    expect(referenceToolSlugs).toContain("consommables");
    expect(adminToolEditHref("consommables")).toBeUndefined();
  });

  it("Bloc60: lists Events among the independent references, with no shared tool to edit — falls through to /admin/referentiels/reference-events", () => {
    expect(referenceToolSlugs).toContain("events");
    expect(adminToolEditHref("events")).toBeUndefined();
  });
});
