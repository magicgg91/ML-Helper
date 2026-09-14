import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferencePage, {
  generateMetadata,
} from "./[locale]/(public)/referentiels/[slug]/page";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { defaultCalculatorAvailability } from "@/lib/calculator-catalog";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "fr",
  getTranslations: async (namespace: string) => {
    const catalog: Record<string, string> = {
      "catalog.combat-equipment": "Équipements de Combat",
      "catalog.expedition-equipment": "Équipements d’Expédition",
      "catalog.level-up": "Progression",
      "catalog.templars": "Templiers",
      "catalog.gems": "Gemmes",
      "catalog.shop": "Boutique",
      "catalog.events": "Événements",
    };
    return (key: string) =>
      namespace === "references" && key in catalog ? catalog[key] : key;
  },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: vi.fn(async () => ({
    "combat-equipment": true,
    "expedition-equipment": true,
    "level-up": true,
    templiers: true,
    gemmes: true,
    consommables: true,
    events: true,
  })),
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
    intro: [],
    advisors: [],
    equipment: [],
    expedition: [],
    inventory: [],
  }),
}));
vi.mock("@/components/events-reference", () => ({
  EventsReferenceTable: () => <div data-testid="events-table" />,
}));
vi.mock("@/lib/events-server", () => ({
  getEventsCatalog: async () => ({
    bronze: [],
    silver: [],
    gold: [],
    platinum: [],
    diamond: [],
    legend: [],
  }),
}));
vi.mock("@/lib/reference-equipment-server", () => ({
  getCombatReferenceRows: async () => [],
  getCombatSecondaryBase: async () => ({}),
  getExpeditionReferenceRows: async () => [],
  getExpeditionStarIncrements: async () => ({}),
  getExpeditionSecondaryBase: async () => ({}),
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getLevelUpParameters: async () => ({}),
  getTemplarParameters: async () => ({}),
  getGemParameters: async () => ({}),
}));
vi.mock("@/lib/templars-presentation-server", () => ({
  getTemplarPresentation: async () => ({}),
}));

afterEach(cleanup);

// Bloc 42/J: same requirement as every other public page — real
// description, hreflang alternates for the 5 launched locales.
describe("ReferencePage metadata (Bloc 42/J)", () => {
  it("sets a non-empty description and hreflang alternates for all 5 locales", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "fr", slug: "combat-equipment" }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.description).toBeTruthy();
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;
    expect(languages?.fr).toBe(
      "https://ml-helper.com/fr/referentiels/combat-equipment",
    );
    expect(languages?.["x-default"]).toBe(
      "https://ml-helper.com/fr/referentiels/combat-equipment",
    );
    // Bloc 91/E1: canonical resolves to the active locale's prefixed URL.
    expect(metadata.alternates?.canonical).toBe(
      "https://ml-helper.com/fr/referentiels/combat-equipment",
    );
  });
});

describe("ReferencePage", () => {
  it("Bloc35 1.3: gives the title a one-line class, same treatment as the tools page", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "expedition-equipment" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const heading = screen.getByRole("heading", {
      name: "Équipements d’Expédition",
    });
    expect(heading).toHaveClass("reference-page-title");
  });

  // Bloc 67: renamed from "Level Up" — the slug/URL stay unchanged
  // (/referentiels/level-up), only the displayed label changes.
  it("Bloc67: routes the 'level-up' slug to LevelUpReference, labelled Progression", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "level-up" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("level-up-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Progression" });
    expect(heading).toHaveClass("reference-page-title");
  });

  it("Bloc36/A: routes the new 'gems' slug to GemsReferenceTable, the 5th reference actually built", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "gems" }),
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
        params: Promise.resolve({ locale: "fr", slug: "shop" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("consumables-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Boutique" });
    expect(heading).toHaveClass("reference-page-title");
  });

  // Bloc60: the 7th reference, routed the same way as every other one.
  it("Bloc60: routes the 'events' slug to EventsReferenceTable when active", async () => {
    render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "events" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("events-table")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Événements" });
    expect(heading).toHaveClass("reference-page-title");
  });

  // Bloc60: ships inactive by default — invisible on the public site until
  // an admin has entered enough content to switch it on themselves.
  it("Bloc60: hides Événements behind the unavailable message while inactive, shows it once activated", async () => {
    vi.mocked(getCalculatorAvailability).mockResolvedValueOnce({
      ...defaultCalculatorAvailability,
      events: false,
    });
    const { unmount } = render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "events" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.queryByTestId("events-table")).not.toBeInTheDocument();
    expect(screen.getByText("single-unavailable")).toBeInTheDocument();
    unmount();

    render(
      await ReferencePage({
        params: Promise.resolve({ locale: "fr", slug: "events" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("events-table")).toBeInTheDocument();
  });
});
