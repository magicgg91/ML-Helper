import { describe, expect, it } from "vitest";
import {
  clearOrphanValues,
  countUnconfirmed,
  groupEquipmentSets,
  type EquipmentSetRow,
} from "./admin-equipment-sets";

const row = (
  set_name: string,
  family = "Or",
  rarity = "Légendaire",
): EquipmentSetRow => ({ set_name, family, rarity });

describe("Bloc 119: grouping equipment rows by set", () => {
  it("keeps the rows' own positions, which are their identity", () => {
    const groups = groupEquipmentSets([
      row("Spirit Fulgur"),
      row("Autre"),
      row("Spirit Fulgur"),
    ]);
    expect(groups.map((group) => group.name)).toEqual([
      "Spirit Fulgur",
      "Autre",
    ]);
    expect(groups[0].indexes).toEqual([0, 2]);
    expect(groups[1].indexes).toEqual([1]);
  });

  it("reads the family and rarity back off the rows", () => {
    const [group] = groupEquipmentSets([row("Set", "Attaque", "Rare")]);
    expect(group.families).toEqual(["Attaque"]);
    expect(group.rarities).toEqual(["Rare"]);
    expect(group.consistent).toBe(true);
  });

  it("says so when a set's rows disagree, instead of picking one", () => {
    const [group] = groupEquipmentSets([
      row("Set", "Attaque", "Rare"),
      row("Set", "Défense", "Rare"),
    ]);
    expect(group.consistent).toBe(false);
    expect(group.families).toEqual(["Attaque", "Défense"]);
  });

  it("catches a rarity that disagrees too", () => {
    const [group] = groupEquipmentSets([
      row("Set", "Or", "Rare"),
      row("Set", "Or", "Épique"),
    ]);
    expect(group.consistent).toBe(false);
    expect(group.rarities).toEqual(["Rare", "Épique"]);
  });

  it("makes a group of the unnamed rows too, rather than dropping them", () => {
    const groups = groupEquipmentSets([row(""), row("")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].indexes).toEqual([0, 1]);
  });
});

describe("Bloc 119: counting the values nobody has confirmed", () => {
  // Bloc 126/C: one standalone field, and two (skill, percentage) pairs —
  // the shape the Combat screen really passes, four pairs instead of two.
  const fields = {
    own: ["slot_name"],
    pairs: [
      ["skill_1", "value_1_pct"],
      ["skill_2", "value_2_pct"],
    ],
  } as const;

  it("counts a standalone field that is empty", () => {
    expect(countUnconfirmed({ slot_name: "" }, fields)).toBe(1);
    expect(countUnconfirmed({ slot_name: "Marteau" }, fields)).toBe(0);
  });

  // The case the brief protects: this is a real gap, somebody can open the
  // game, read the number and fill it in.
  it("counts a percentage missing beside a skill that exists", () => {
    expect(
      countUnconfirmed(
        { slot_name: "Marteau", skill_1: "Attaque", value_1_pct: "" },
        fields,
      ),
    ).toBe(1);
  });

  it("counts nothing for a pair whose skill is blank", () => {
    // 30 of the 180 delivered Combat rows have no third skill and 117 no
    // fourth. Counted flat, each of those absences used to show up twice —
    // once for the skill, once for the percentage that cannot exist without
    // it — as work waiting to be done that nobody could ever do.
    expect(
      countUnconfirmed(
        { slot_name: "Marteau", skill_2: "", value_2_pct: "" },
        fields,
      ),
    ).toBe(0);
  });

  it("counts nothing for a pair whose skill is an explicit none", () => {
    // Bloc 37/G: "none" is a decision, "" is silence. Neither is a skill, so
    // neither gives the percentage beside it anything to describe.
    expect(
      countUnconfirmed(
        { slot_name: "Marteau", skill_2: "none", value_2_pct: "" },
        fields,
      ),
    ).toBe(0);
  });

  it("treats whitespace as empty, on either side of a pair", () => {
    expect(
      countUnconfirmed(
        { slot_name: "  ", skill_1: "Attaque", value_1_pct: "  " },
        fields,
      ),
    ).toBe(2);
    expect(
      countUnconfirmed(
        { slot_name: "Marteau", skill_1: "  ", value_1_pct: "  " },
        fields,
      ),
    ).toBe(0);
  });

  it("counts a missing field as missing, not as an error", () => {
    // A row that predates a column simply does not have the key.
    expect(countUnconfirmed({}, fields)).toBe(1);
  });
});

// Codex review (PR #150): disabling the field was not enough on its own.
describe("clearing a percentage that has lost its skill", () => {
  const fields = {
    own: ["slot_name"],
    pairs: [
      ["skill_1", "value_1_pct"],
      ["skill_2", "value_2_pct"],
    ],
  } as const;

  it("empties a percentage whose skill is blank or none", () => {
    expect(
      clearOrphanValues(
        { skill_1: "", value_1_pct: "10", skill_2: "none", value_2_pct: "5" },
        fields,
      ),
    ).toEqual({
      skill_1: "",
      value_1_pct: "",
      skill_2: "none",
      value_2_pct: "",
    });
  });

  it("leaves a percentage that belongs to a skill alone", () => {
    const row = { skill_1: "Attaque", value_1_pct: "10" };
    expect(clearOrphanValues(row, fields)).toEqual(row);
  });

  it("returns the very same row when there is nothing to clear", () => {
    // Identity, so a save of untouched rows changes no object at all.
    const row = { skill_1: "Attaque", value_1_pct: "10", skill_2: "" };
    expect(clearOrphanValues(row, fields)).toBe(row);
  });

  it("does not invent a percentage the row never had", () => {
    expect(clearOrphanValues({ skill_1: "" }, fields)).toEqual({ skill_1: "" });
  });

  it("leaves the fields that stand on their own untouched", () => {
    expect(
      clearOrphanValues(
        { slot_name: "Marteau", skill_1: "", value_1_pct: "10" },
        fields,
      ),
    ).toMatchObject({ slot_name: "Marteau", value_1_pct: "" });
  });
});
