import { describe, expect, it } from "vitest";
import { adminToolEditHref } from "./admin-tools";

describe("admin tool editor routing", () => {
  it("points all three City tools to one shared editor", () => {
    for (const slug of ["city-cost", "city-max-level", "city-production"])
      expect(adminToolEditHref(slug)).toBe("/admin/tools/city-parameters");
  });
  it("uses dedicated parameter editors where required", () => {
    expect(adminToolEditHref("ranking")).toBe("/admin/tools/ranking");
    expect(adminToolEditHref("templars")).toBe("/admin/tools/templars");
  });
  it("has no edit destination for a tool with no named numeric parameters", () => {
    for (const slug of [
      "gems",
      "stuff-simulator",
      "stuff-comparison",
      "xp-gain-rate",
      "demo-attack-troops",
      "city-rewards",
    ])
      expect(adminToolEditHref(slug)).toBeUndefined();
  });
});
