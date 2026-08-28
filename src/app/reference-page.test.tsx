import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferencePage from "./(public)/guides/referentiels/[slug]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const catalog: Record<string, string> = {
      "catalog.combat-equipment": "Équipements de Combat",
      "catalog.expedition-equipment": "Équipements d’Expédition",
      "catalog.level-up": "Level Up",
      "catalog.templiers": "Coût des Templiers",
      "catalog.gemmes": "Gemmes",
    };
    return (key: string) =>
      namespace === "references" && key in catalog ? catalog[key] : key;
  },
}));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "combat-equipment": true,
    "expedition-equipment": true,
    "level-up": true,
    templiers: true,
    gemmes: true,
  }),
}));
vi.mock("@/components/reference-tables", () => ({
  CombatReferenceTable: () => <div data-testid="combat-table" />,
  ExpeditionReferenceTable: () => <div data-testid="expedition-table" />,
}));
vi.mock("@/components/level-up-reference", () => ({
  LevelUpReference: () => <div data-testid="level-up-table" />,
}));
vi.mock("@/components/templars-reference", () => ({
  TemplarsReferenceTable: () => <div data-testid="templars-table" />,
}));
vi.mock("@/components/gems-reference", () => ({
  GemsReferenceTable: () => <div data-testid="gems-table" />,
}));
vi.mock("@/lib/reference-equipment-server", () => ({
  getCombatReferenceRows: async () => [],
  getCombatSkydustBase: async () => ({}),
  getCombatGemSlotsBase: async () => ({}),
  getExpeditionReferenceRows: async () => [],
  getExpeditionStarIncrements: async () => ({}),
  getExpeditionDismantleBase: async () => ({}),
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getLevelUpParameters: async () => ({}),
  getTemplarParameters: async () => ({}),
  getGemParameters: async () => ({}),
}));

afterEach(cleanup);

describe("ReferencePage", () => {
  it("Bloc35 1.3: gives the title a one-line class, same treatment as the tools page", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "expedition-equipment" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const heading = screen.getByRole("heading", {
      name: "Équipements d’Expédition",
    });
    expect(heading).toHaveClass("reference-page-title");
  });

  it("Bloc35 1.2: offers a cross-nav to switch directly to another reference", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "combat-equipment" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const nav = screen.getByRole("navigation", { name: "tabs-label" });
    for (const label of [
      "Équipements de Combat",
      "Équipements d’Expédition",
      "Level Up",
      "Coût des Templiers",
      "Gemmes",
    ]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    const currentLink = within(nav).getByText("Équipements de Combat");
    expect(currentLink).toHaveAttribute("aria-current", "page");
    const otherLink = within(nav).getByText("Équipements d’Expédition");
    expect(otherLink).toHaveAttribute(
      "href",
      "/guides/referentiels/expedition-equipment",
    );
    // Bloc 37/K: same rendering as the family-buttons pill row used inside
    // a tool (e.g. Attaque/Défense/Or/Vitesse) — not the /tools category
    // tiles.
    expect(nav).toHaveClass("family-buttons");
    expect(otherLink).not.toHaveAttribute("aria-current");
  });

  it("Bloc36/A: routes the new 'gemmes' slug to GemsReferenceTable, the 5th reference actually built", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "gemmes" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("gems-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Gemmes" });
    expect(heading).toHaveClass("reference-page-title");
  });
});
