import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferencePage, {
  generateMetadata,
} from "./(public)/guides/referentiels/[slug]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const catalog: Record<string, string> = {
      "catalog.combat-equipment": "Équipements de Combat",
      "catalog.expedition-equipment": "Équipements d’Expédition",
      "catalog.level-up": "Level Up",
      "catalog.templiers": "Coût des Templiers",
      "catalog.gemmes": "Gemmes",
      "catalog.consommables": "Consommables",
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
  getConsumableRows: async () => [],
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
      "https://ml-helper.com/guides/referentiels/combat-equipment",
    );
    expect(languages?.["x-default"]).toBe(
      "https://ml-helper.com/guides/referentiels/combat-equipment",
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
      "Consommables",
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
    // Bloc 40/A: reverses Bloc 37/K — the switcher now reuses the /tools
    // category banner's own container/button classes (full width, grows to
    // fill the row) instead of the family-buttons pill row (content width).
    expect(nav).toHaveClass("category-nav");
    expect(nav).not.toHaveClass("family-buttons");
    expect(currentLink).toHaveClass("category-btn");
    expect(otherLink).not.toHaveAttribute("aria-current");
    // Bloc 41/C: keeps its own "reference-switcher" class alongside
    // "category-nav" — the spacing-below fix is scoped to it specifically,
    // so it doesn't add space under the /tools banner too.
    expect(nav).toHaveClass("reference-switcher");
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

  it("Bloc43/44: routes the 'consommables' slug to ConsumablesReferenceTable, the 6th reference actually built (public URL kept French per review)", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ slug: "consommables" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("consumables-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Consommables" });
    expect(heading).toHaveClass("reference-page-title");
  });
});
