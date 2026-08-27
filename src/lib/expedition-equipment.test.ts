import { describe, expect, it } from "vitest";
import {
  computeExpeditionSlot,
  computeExpeditionTotal,
  createEmptyExpeditionState,
  expeditionOptions,
  expeditionSlotLayout,
  findExpeditionEquipment,
} from "./expedition-equipment";
import { expeditionReferenceRows } from "./reference-equipment";

function fullVannaState() {
  const state = createEmptyExpeditionState();
  return state.map((slot) => ({ ...slot, equipment: { rarity: "Légendaire", setName: "Vanna" } }));
}

describe("expedition equipment", () => {
  it("creates 6 empty slots in the confirmed grid order", () => {
    expect(expeditionSlotLayout).toEqual([
      "Cape",
      "Longue-vue",
      "Sacoche",
      "Boussole",
      "Torche",
      "Pioche",
    ]);
    const state = createEmptyExpeditionState();
    expect(state).toHaveLength(6);
    expect(state.every((slot) => slot.equipment === null && slot.star === 1)).toBe(
      true,
    );
  });

  it("finds equipment by slot and selection, ignoring other slots' matches", () => {
    const item = findExpeditionEquipment(
      "Cape",
      { rarity: "Légendaire", setName: "Vanna" },
      expeditionReferenceRows,
    );
    expect(item?.secondary_stat_name).toBe("Vitalité");
    expect(
      findExpeditionEquipment("Pioche", null, expeditionReferenceRows),
    ).toBeUndefined();
  });

  it("lists a slot's options across rarities, ordered richest first", () => {
    const options = expeditionOptions("Cape", expeditionReferenceRows);
    expect(options.every((item) => item.slot === "Cape")).toBe(true);
    expect(options[0].rarity).toBe("Légendaire");
    expect(options.at(-1)?.rarity).toBe("Commun");
  });

  it("computes one slot's primary and secondary stat at 1★", () => {
    const total = computeExpeditionSlot(
      "Cape",
      { equipment: { rarity: "Légendaire", setName: "Vanna" }, star: 1 },
      expeditionReferenceRows,
    );
    expect(total).toEqual({ Or: 5.4, Vitalité: 45 });
  });

  it("returns nothing for an empty slot", () => {
    expect(
      computeExpeditionSlot(
        "Cape",
        { equipment: null, star: 1 },
        expeditionReferenceRows,
      ),
    ).toEqual({});
  });

  it("aggregates all 6 slots of a set into the 4 primary + up to 6 secondary stats", () => {
    const total = computeExpeditionTotal(fullVannaState(), expeditionReferenceRows);
    expect(total.Or).toBeCloseTo(5.4 * 6);
    expect(total).toMatchObject({
      Vitalité: 45,
      Perception: 5.4,
      Récupération: 18,
      Vitesse: 22.5,
      Esquive: 5.4,
      Chance: 45,
    });
  });

  it("applies the confirmed per-star increments to every stat when upgrading", () => {
    const state = fullVannaState().map((slot) => ({ ...slot, star: 2 }));
    const total = computeExpeditionTotal(state, expeditionReferenceRows);
    expect(total.Or).toBeCloseTo(5.7 * 6);
    expect(total.Vitalité).toBeCloseTo(47.5);
    expect(total.Perception).toBeCloseTo(5.7);
    expect(total.Récupération).toBeCloseTo(19);
    expect(total.Vitesse).toBeCloseTo(23.8);
    expect(total.Esquive).toBeCloseTo(5.7);
    expect(total.Chance).toBeCloseTo(47.5);
  });

  it("drops a rarity's secondary stat below Épique instead of inventing one", () => {
    const state = createEmptyExpeditionState();
    state[0] = {
      equipment: { rarity: "Commun", setName: "Prospector" },
      star: 1,
    };
    const total = computeExpeditionTotal(state, expeditionReferenceRows);
    expect(Object.keys(total)).toEqual(["Or"]);
  });
});
