import { describe, expect, it } from "vitest";
import {
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
  const fields = ["skill_1", "value_1_pct", "skill_2"];

  it("counts the empty ones", () => {
    expect(
      countUnconfirmed(
        { skill_1: "Attaque", value_1_pct: "", skill_2: "" },
        fields,
      ),
    ).toBe(2);
  });

  it("does not count a confirmed absence", () => {
    // Bloc 37/G: "none" is a decision, "" is a gap.
    expect(
      countUnconfirmed(
        { skill_1: "none", value_1_pct: "5", skill_2: "none" },
        fields,
      ),
    ).toBe(0);
  });

  it("treats whitespace as empty", () => {
    expect(
      countUnconfirmed(
        { skill_1: "  ", value_1_pct: "5", skill_2: "x" },
        fields,
      ),
    ).toBe(1);
  });
});
