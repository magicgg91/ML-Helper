import { describe, expect, it } from "vitest";
import { adminToolEditHref } from "./admin-tools";

describe("admin tool editor routing", () => {
  it("points all three City tools to one shared editor", () => {
    for (const slug of ["city-cost", "city-max-level", "city-production"])
      expect(adminToolEditHref(`id-${slug}`, slug)).toBe("/admin/tools/city-parameters");
  });
  it("uses dedicated parameter editors where required", () => {
    expect(adminToolEditHref("ranking-id", "ranking")).toBe("/admin/tools/ranking");
    expect(adminToolEditHref("templars-id", "templars")).toBe("/admin/tools/templars");
  });
});

