import { describe, expect, it } from "vitest";
import { rarityClassName } from "./equipment-rarity";

describe("rarityClassName", () => {
  it.each([
    ["Commun", "commun"],
    ["Rare", "rare"],
    ["Épique", "epique"],
    ["Mythique", "mythique"],
    ["Légendaire", "legendaire"],
  ])("strips accents and lowercases %s", (rarity, expected) => {
    expect(rarityClassName(rarity)).toBe(expected);
  });
});
