import { describe, expect, it } from "vitest";
import {
  adminToolEditHref,
  formulaGuideReferenceSlugs,
  guideReferenceSlugs,
  referenceToolSlugs,
} from "./admin-tools";

describe("admin tool editor routing", () => {
  it("lists Templars as a Guides reference without excluding it from the Outils table", () => {
    expect(guideReferenceSlugs).toEqual([
      ...referenceToolSlugs,
      ...formulaGuideReferenceSlugs,
    ]);
    expect(referenceToolSlugs).not.toContain("templars");
    expect(guideReferenceSlugs).toContain("templars");
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
  it("has no edit destination for a tool with no named numeric parameters", () => {
    for (const slug of ["stuff-simulator", "stuff-comparison", "city-rewards"])
      expect(adminToolEditHref(slug)).toBeUndefined();
  });
});
