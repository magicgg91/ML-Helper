import { describe, expect, it } from "vitest";
import {
  consumableCategories,
  defaultConsumableRows,
  emptyConsumableRow,
  parseConsumableCategory,
} from "./consumables";

describe("defaultConsumableRows", () => {
  it("loads every item from the porteur de projet's starting list", () => {
    expect(defaultConsumableRows).toHaveLength(38);
  });

  it("never invents a cost — either a confirmed non-negative number, or left empty", () => {
    for (const row of defaultConsumableRows) {
      if (row.cost === "") continue;
      const value = Number(row.cost);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every row a non-empty image path, FR name and FR description", () => {
    for (const row of defaultConsumableRows) {
      expect(row.image).toMatch(/^\/consumables\//);
      expect(row.name_fr.trim()).not.toBe("");
      expect(row.description_fr.trim()).not.toBe("");
    }
  });

  it("gives every row an English name and description too — AGENTS.md: all visible text goes through i18n", () => {
    for (const row of defaultConsumableRows) {
      expect(row.name_en.trim()).not.toBe("");
      expect(row.description_en.trim()).not.toBe("");
    }
  });

  it("includes the items with a still-unconfirmed cost, left blank rather than invented", () => {
    const unconfirmed = defaultConsumableRows.filter((row) => row.cost === "");
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

  // Bloc 46/C: every row is assigned one of the 4 categories.
  it("Bloc46/C: assigns every row a valid category", () => {
    for (const row of defaultConsumableRows)
      expect(consumableCategories).toContain(row.category);
  });

  it("Bloc46/C: sorts the advisors and equipment chests/urns/jars/crates into their own categories", () => {
    const categoryOf = (name: string) =>
      defaultConsumableRows.find((row) => row.name_fr === name)?.category;
    expect(categoryOf("Commandant")).toBe("advisors");
    expect(categoryOf("Sac d'expédition")).toBe("expedition");
    expect(categoryOf("Coffre")).toBe("equipment");
    expect(categoryOf("Urne divine ×10")).toBe("equipment");
    expect(categoryOf("Potion de 25 PV")).toBe("inventory");
  });
});

describe("Bloc46/C: parseConsumableCategory", () => {
  it("passes through any of the 4 valid categories", () => {
    for (const category of consumableCategories)
      expect(parseConsumableCategory(category)).toBe(category);
  });

  it("falls back to inventory for a missing or invalid value (legacy rows saved before Bloc 46)", () => {
    expect(parseConsumableCategory(undefined)).toBe("inventory");
    expect(parseConsumableCategory("not-a-category")).toBe("inventory");
    expect(emptyConsumableRow.category).toBe("inventory");
  });
});
