import { describe, expect, it } from "vitest";
import {
  consumableCategories,
  consumablePotionNames,
  defaultConsumableCatalog,
  emptyConsumableRow,
  parseConsumableCategory,
} from "./consumables";

function allRows() {
  return consumableCategories.flatMap(
    (category) => defaultConsumableCatalog[category],
  );
}

describe("defaultConsumableCatalog", () => {
  it("loads every item from the porteur de projet's starting list", () => {
    expect(allRows()).toHaveLength(38);
  });

  it("never invents a cost — either a confirmed non-negative number, or left empty", () => {
    for (const row of allRows()) {
      if (row.cost === "") continue;
      const value = Number(row.cost);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every row a non-empty image path, FR name and FR description", () => {
    for (const row of allRows()) {
      expect(row.image).toMatch(/^\/consumables\//);
      expect(row.name_fr.trim()).not.toBe("");
      expect(row.description_fr.trim()).not.toBe("");
    }
  });

  it("gives every row an English name and description too — AGENTS.md: all visible text goes through i18n", () => {
    for (const row of allRows()) {
      expect(row.name_en.trim()).not.toBe("");
      expect(row.description_en.trim()).not.toBe("");
    }
  });

  it("includes the items with a still-unconfirmed cost, left blank rather than invented", () => {
    const unconfirmed = allRows().filter((row) => row.cost === "");
    const names = unconfirmed.map((row) => row.name_fr);
    expect(names).toEqual(
      expect.arrayContaining([
        "Renommer votre ville",
        "Renommer votre clan",
        "Nouveau départ",
        "Changement de ville principale",
      ]),
    );
  });

  // Bloc 48/B: category is now implicit to which table (array) a row lives
  // in — every row of defaultConsumableCatalog[category] is trivially of
  // that category, so what's worth asserting is that every one of the 4
  // categories is actually populated (no accidental empty table).
  it("Bloc48/B: populates all 4 category tables", () => {
    for (const category of consumableCategories)
      expect(defaultConsumableCatalog[category].length).toBeGreaterThan(0);
  });

  it("Bloc48/B: sorts the advisors and equipment chests/urns/jars/crates into their own tables", () => {
    const nameIn = (category: (typeof consumableCategories)[number]) =>
      defaultConsumableCatalog[category].map((row) => row.name_fr);
    expect(nameIn("advisors")).toContain("Commandant");
    expect(nameIn("equipment")).toContain("Coffre");
    expect(nameIn("equipment")).toContain("Urne divine ×10");
  });

  // Bloc 48/E: the 3 HP potions move from Inventaire to Expédition.
  it("Bloc48/E: places the 3 HP potions in the expedition table", () => {
    const expeditionNames = defaultConsumableCatalog.expedition.map(
      (row) => row.name_fr,
    );
    for (const potion of consumablePotionNames)
      expect(expeditionNames).toContain(potion);
    for (const category of consumableCategories) {
      if (category === "expedition") continue;
      const names = defaultConsumableCatalog[category].map(
        (row) => row.name_fr,
      );
      for (const potion of consumablePotionNames)
        expect(names).not.toContain(potion);
    }
  });

  // Bloc 48/D: category order is alphabetical — Conseillers, Équipement,
  // Expédition, Inventaire — this is also the public table/filter order.
  it("Bloc48/D: orders categories alphabetically (advisors, equipment, expedition, inventory)", () => {
    expect(consumableCategories).toEqual([
      "advisors",
      "equipment",
      "expedition",
      "inventory",
    ]);
  });
});

describe("Bloc46/C: parseConsumableCategory", () => {
  it("passes through any of the 4 valid categories", () => {
    for (const category of consumableCategories)
      expect(parseConsumableCategory(category)).toBe(category);
  });

  it("falls back to inventory for a missing/invalid value with no matching name (a genuinely custom row)", () => {
    expect(parseConsumableCategory(undefined)).toBe("inventory");
    expect(parseConsumableCategory("not-a-category")).toBe("inventory");
    expect(
      parseConsumableCategory(undefined, "Objet ajouté par un admin"),
    ).toBe("inventory");
  });

  it("emptyConsumableRow carries no category field (Bloc 48/B: implicit by table)", () => {
    expect(emptyConsumableRow).not.toHaveProperty("category");
  });

  // Codex review (PR #69): a row saved before Bloc 46 has no category field
  // at all — recovering it by name keeps an already-edited installation's
  // advisor/expedition/equipment rows correctly categorized instead of
  // dumping everything into "inventory" on the first read after upgrade.
  it("Bloc46/C review: recovers a legacy built-in row's category by name instead of defaulting to inventory", () => {
    expect(parseConsumableCategory(undefined, "Commandant")).toBe("advisors");
    expect(parseConsumableCategory(undefined, "Sac d'expédition")).toBe(
      "expedition",
    );
    expect(parseConsumableCategory(undefined, "Coffre")).toBe("equipment");
    // Bloc 48/E: the shipped catalog now stores potions under "expedition",
    // so by-name recovery of a legacy category naturally reflects that too.
    expect(parseConsumableCategory(undefined, "Potion de 25 PV")).toBe(
      "expedition",
    );
    // An explicit valid category always wins over the name lookup.
    expect(parseConsumableCategory("inventory", "Commandant")).toBe(
      "inventory",
    );
  });
});
