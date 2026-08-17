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
});
