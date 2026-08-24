import { describe, expect, it } from "vitest";
import {
  allowedSkills,
  computeEquipmentSlot,
  createEmptyStuffState,
  equipmentOptions,
  equipmentSlotLayout,
  equipmentValueAtStar,
} from "./equipment";

describe("shared equipment model", () => {
  it("uses the exact mixed catalogs and descending rarity", () => {
    const defense = equipmentOptions("defense", "Amulette");
    expect(new Set(defense.map((item) => item.family))).toEqual(
      new Set(["Défense", "Or"]),
    );
    expect(defense[0].rarity).toBe("Légendaire");
    expect(
      equipmentOptions("attack", "Arme").every(
        (item) => item.family === "Attaque",
      ),
    ).toBe(true);
  });

  it("applies the strict allowlist to native and secondary families", () => {
    expect(allowedSkills("gold")).toEqual(["Prospérité", "Recruteur"]);
    const state = createEmptyStuffState().gold[0];
    state.equipment = { rarity: "Légendaire", setName: "Spirit Fulgur" };
    const total = computeEquipmentSlot("gold", "Amulette", state);
    expect(total).toEqual({ Prospérité: 15 });
  });

  it("uses additive progression and owned Bronze gems", () => {
    expect(equipmentValueAtStar("Vitesse", 25, 6)).toBe(50);
    const state = createEmptyStuffState().speed[0];
    state.gems = [{ skill: "Vitesse", star: 2, league: "bronze" }];
    expect(
      computeEquipmentSlot("speed", equipmentSlotLayout[0], state),
    ).toEqual({ Vitesse: 5 });
  });

  it("reads an explicit rows override instead of the static catalog when given one", () => {
    // Simulates an admin-edited reference table: a caller passing its own
    // rows must see exactly that data, not the bundled equipment-data.ts
    // defaults — this is what makes admin overrides on the Combat Equipment
    // reference table actually reach the Stuff calculators.
    const overrideRow = {
      rarity: "Commun",
      set_name: "Overridden Set",
      family: "Attaque",
      skydust: "10",
      gem_slots: "0",
      slot_type: "Amulette",
      slot_name: "",
      skill_1: "Attaque",
      value_1_pct: "999",
      skill_2: "",
      value_2_pct: "",
      skill_3: "",
      value_3_pct: "",
      skill_4: "",
      value_4_pct: "",
    };
    const options = equipmentOptions("attack", "Amulette", [overrideRow]);
    expect(options).toEqual([overrideRow]);

    const state = createEmptyStuffState().attack[0];
    state.equipment = { rarity: "Commun", setName: "Overridden Set" };
    expect(
      computeEquipmentSlot("attack", "Amulette", state, [overrideRow]),
    ).toEqual({ Attaque: 999 });
  });
});
