import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { normalizeStoredValue } from "./consumables-server";
import {
  consumableCategories,
  defaultConsumableCatalog,
  type ConsumableRow,
} from "./consumables";

function rowsOf(catalog: ReturnType<typeof normalizeStoredValue>) {
  return consumableCategories.flatMap((category) => catalog[category]);
}

// Bloc 48/B+E: existing Bloc46-categorized data (and even older,
// pre-category data) must be automatically redistributed into the new
// 4-table shape on read — no manual re-entry, and the 3 potions must land
// in "expedition" regardless of what was previously persisted.
describe("normalizeStoredValue (Bloc 48/B+E migration)", () => {
  it("falls back to the compiled-in defaults when nothing is stored", () => {
    expect(normalizeStoredValue(null)).toEqual(defaultConsumableCatalog);
    expect(normalizeStoredValue(undefined)).toEqual(defaultConsumableCatalog);
  });

  it("passes a new grouped-object shape straight through, losslessly", () => {
    const stored = {
      intro: [],
      advisors: [],
      equipment: [{ ...defaultConsumableCatalog.equipment[0] }],
      expedition: [],
      inventory: [],
    };
    expect(normalizeStoredValue(stored)).toEqual(stored);
  });

  // Bloc 58/A: "intro" is a 5th table with the exact same shape as the 4
  // category tables — stored and read back losslessly the same way, and a
  // pre-Bloc58 stored value (no "intro" key at all) comes back as an empty
  // table rather than throwing or dropping the rest of the catalog.
  it("Bloc58/A: passes the intro table through losslessly when present", () => {
    const stored = {
      intro: [{ ...defaultConsumableCatalog.equipment[0], name_fr: "Saphirs" }],
      advisors: [],
      equipment: [],
      expedition: [],
      inventory: [],
    };
    expect(normalizeStoredValue(stored).intro).toEqual(stored.intro);
  });

  it("Bloc58/A: a pre-Bloc58 stored catalog with no intro key comes back with an empty intro table", () => {
    const stored = {
      advisors: [],
      equipment: [{ ...defaultConsumableCatalog.equipment[0] }],
      expedition: [],
      inventory: [],
    };
    expect(normalizeStoredValue(stored).intro).toEqual([]);
  });

  it("fills in a missing category as an empty array rather than dropping the whole catalog", () => {
    const stored = {
      equipment: [{ ...defaultConsumableCatalog.equipment[0] }],
    };
    const result = normalizeStoredValue(stored);
    expect(result.advisors).toEqual([]);
    expect(result.expedition).toEqual([]);
    expect(result.inventory).toEqual([]);
    expect(result.equipment).toHaveLength(1);
  });

  it("Bloc46 legacy shape: regroups a flat array with a category field per row, losslessly", () => {
    const legacyRow = (
      overrides: Partial<ConsumableRow> & { category: string; name_fr: string },
    ) => ({
      image: "/consumables/x.webp",
      name_en: "X",
      description_fr: "D",
      description_en: "D",
      cost: "10",
      ...overrides,
    });
    const stored = [
      legacyRow({ category: "advisors", name_fr: "Commandant" }),
      legacyRow({ category: "equipment", name_fr: "Coffre" }),
      legacyRow({ category: "inventory", name_fr: "Objet perso" }),
    ];
    const result = normalizeStoredValue(stored);
    expect(rowsOf(result)).toHaveLength(3);
    expect(result.advisors.map((r) => r.name_fr)).toEqual(["Commandant"]);
    expect(result.equipment.map((r) => r.name_fr)).toEqual(["Coffre"]);
    expect(result.inventory.map((r) => r.name_fr)).toEqual(["Objet perso"]);
    // The category field itself is dropped — it's now implicit to the table.
    expect(result.advisors[0]).not.toHaveProperty("category");
  });

  it("pre-Bloc46 legacy shape: recovers category by name from a flat array with no category field at all", () => {
    const stored = [
      {
        image: "/consumables/advisor-commander.webp",
        name_fr: "Commandant",
        name_en: "Commander",
        description_fr: "D",
        description_en: "D",
        cost: "800",
      },
    ];
    const result = normalizeStoredValue(stored);
    expect(result.advisors.map((r) => r.name_fr)).toEqual(["Commandant"]);
  });

  // Bloc 48/E: even an already-Bloc46-migrated installation, where potions
  // were persisted with an explicit category: "inventory", must have them
  // relocated to "expedition" on the next read — the override always wins.
  it("Bloc48/E: relocates a potion to expedition even when explicitly stored under inventory", () => {
    const stored = [
      {
        image: "/consumables/25-hp-potion.webp",
        name_fr: "Potion de 25 PV",
        name_en: "25 HP Potion",
        description_fr: "D",
        description_en: "D",
        cost: "250",
        category: "inventory",
      },
    ];
    const result = normalizeStoredValue(stored);
    expect(result.inventory).toEqual([]);
    expect(result.expedition.map((r) => r.name_fr)).toEqual([
      "Potion de 25 PV",
    ]);
  });

  // Codex review (PR #71): the grouped shape must re-home potions too, not
  // just the legacy flat-array path — a row saved under the wrong category
  // via the PUT endpoint (or a manual DB edit) must self-correct on read,
  // same as the array path already did.
  it("Bloc48/E follow-up: relocates a potion stored under the wrong category in the grouped shape", () => {
    const stored = {
      advisors: [],
      equipment: [],
      expedition: [],
      inventory: [
        {
          image: "/consumables/25-hp-potion.webp",
          name_fr: "Potion de 25 PV",
          name_en: "25 HP Potion",
          description_fr: "D",
          description_en: "D",
          cost: "250",
        },
      ],
    };
    const result = normalizeStoredValue(stored);
    expect(result.inventory).toEqual([]);
    expect(result.expedition.map((r) => r.name_fr)).toEqual([
      "Potion de 25 PV",
    ]);
  });

  // A prior draft of this function spread the shared emptyConsumableCatalog
  // constant instead of building fresh arrays each call — every grouped
  // result ended up pushing into the very same array instances, so a row
  // added by one call would silently leak into every other call's result
  // for that same category.
  it("never shares row arrays across separate calls", () => {
    const advisorRow = {
      image: "/consumables/advisor-commander.webp",
      name_fr: "Commandant",
      name_en: "Commander",
      description_fr: "D",
      description_en: "D",
      cost: "800",
    };
    const withAdvisor = normalizeStoredValue([advisorRow]);
    const withoutAdvisor = normalizeStoredValue([]);
    expect(withAdvisor.advisors).toHaveLength(1);
    expect(withoutAdvisor.advisors).toEqual([]);
  });

  it("ignores malformed entries instead of throwing", () => {
    const stored = [null, "not an object", 42];
    const result = normalizeStoredValue(stored);
    expect(rowsOf(result)).toHaveLength(0);
  });
});
