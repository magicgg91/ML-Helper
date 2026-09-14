import { describe, expect, it } from "vitest";
import { parseGuideCategories } from "./guide-categories";

describe("guide categories", () => {
  it("accepts multiple current categories", () => {
    expect(parseGuideCategories(["combat", "clan", "invalid"])).toEqual([
      "combat",
      "clan",
    ]);
  });

  it("keeps legacy category values readable during migration", () => {
    expect(parseGuideCategories("debutants")).toEqual(["debuter"]);
    expect(parseGuideCategories("stuff")).toEqual(["equipement"]);
  });
});
