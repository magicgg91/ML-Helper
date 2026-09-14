import { describe, expect, it } from "vitest";
import { pageTitle } from "./page-title";

describe("pageTitle", () => {
  it("separates a translated section and detail with an em dash", () => {
    expect(pageTitle("Outils", "Villes")).toBe("Outils — Villes");
    expect(pageTitle("Guides", "Débuter")).toBe("Guides — Débuter");
  });
});
