import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferencePage, {
  generateMetadata,
} from "./(public)/referentiels/[slug]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const catalog: Record<string, string> = {
      "catalog.combat-equipment": "Équipements de Combat",
      "catalog.expedition-equipment": "Équipements d’Expédition",
      "catalog.level-up": "Level Up",
      "catalog.templars": "Coût des Templiers",
      "catalog.gems": "Gemmes",
      "catalog.shop": "Boutique",
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
    consommables: true,
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
vi.mock("@/components/consumables-reference", () => ({
  ConsumablesReferenceTable: () => <div data-testid="consumables-table" />,
}));
vi.mock("@/lib/consumables-server", () => ({
  getConsumableCatalog: async () => ({
    advisors: [],
    equipment: [],
    expedition: [],
    inventory: [],
  }),
  getConsumablesIntro: async () => ({ fr: "", en: "" }),
}));
vi.mock("@/lib/reference-equipment-server", () => ({
  getCombatReferenceRows: async () => [],
  getCombatSkydustBase: async () => ({}),
  getCombatGemSlotsBase: async () => ({}),
  getCombatMergeCostBase: async () => ({}),
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

// Bloc 42/J: same requirement as every other public page — real
// description, hreflang alternates for the 5 launched locales.
describe("ReferencePage metadata (Bloc 42/J)", () => {
  it("sets a non-empty description and hreflang alternates for all 5 locales", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "combat-equipment" }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.description).toBeTruthy();
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;
    expect(languages?.fr).toBe(
      "https://ml-helper.com/referentiels/combat-equipment",
    );
    expect(languages?.["x-default"]).toBe(
      "https://ml-helper.com/referentiels/combat-equipment",
    );
  });
});

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

  it("Bloc36/A: routes the new 'gems' slug to GemsReferenceTable, the 5th reference actually built", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "gems" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("gems-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Gemmes" });
    expect(heading).toHaveClass("reference-page-title");
  });

  // Bloc 48/F: renamed Consommables -> Boutique, URL /consommables ->
  // /shop, no redirect from the old URL (no indexed traffic to preserve).
  it("Bloc48/F: routes the 'shop' slug to ConsumablesReferenceTable, labelled Boutique", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "shop" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("consumables-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Boutique" });
    expect(heading).toHaveClass("reference-page-title");
  });
});
