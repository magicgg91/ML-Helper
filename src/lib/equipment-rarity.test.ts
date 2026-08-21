import { describe, expect, it } from "vitest";
import { derivedEquipmentValues } from "./equipment-rarity";

describe("equipment rarity derived fields", () => {
  it.each([
    ["Commun", 3, 0], ["Rare", 10, 0], ["Épique", 30, 1],
    ["Mythique", 120, 2], ["Légendaire", 160, 3],
  ])("derives %s", (rarity, skydust, gemSlots) => {
    expect(derivedEquipmentValues(rarity)).toEqual({ skydust, gemSlots });
  });
});

