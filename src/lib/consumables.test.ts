import { describe, expect, it } from "vitest";
import { defaultConsumableRows } from "./consumables";

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
});
