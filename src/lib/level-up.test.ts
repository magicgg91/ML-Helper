import { describe, expect, it } from "vitest";
import { levelUpChestAt, levelUpTroopsAt, xpAt } from "./level-up";

describe("Level Up reference", () => {
  it.each([
    ["bronze", 32.2028 * 1.245 ** 2],
    ["gold", 49.956624],
    ["platinum", 54.899478],
    ["diamond", 32.2028 * 1.245 ** 2],
    ["legend", 32.2028 * 1.245 ** 2],
  ] as const)("uses the confirmed %s troop formula", (league, expected) =>
    expect(levelUpTroopsAt(2, league)).toBeCloseTo(expected),
  );
  it("keeps Silver explicitly unconfirmed", () =>
    expect(levelUpTroopsAt(2, "silver")).toBeNull());
  it("uses universal XP and the five-chest ten-level cycle", () => {
    expect(xpAt(1)).toBe(50);
    expect(xpAt(2)).toBe(65);
    expect(levelUpChestAt(9)).toBeNull();
    expect(levelUpChestAt(10)).toBe(0);
    expect(levelUpChestAt(50)).toBe(4);
    expect(levelUpChestAt(60)).toBe(0);
  });
});
