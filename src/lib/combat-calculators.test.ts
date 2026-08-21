import { describe, expect, it } from "vitest";
import {
  demoAttackTroops,
  xpOpponentRanges,
  xpRateForRatio,
} from "./combat-calculators";

describe("XP gain rate", () => {
  it.each([
    [0, 0],
    [39.999, 0],
    [40, 50],
    [49.999, 50],
    [50, 100],
    [149.999, 100],
    [150, 150],
    [199.999, 150],
    [200, 200],
  ])(
    "uses inclusive lower and exclusive upper boundaries at %s",
    (ratio, rate) => expect(xpRateForRatio(ratio)).toBe(rate),
  );

  it("converts all five tiers when the player attacks", () => {
    expect(
      xpOpponentRanges(1000, "attacker").map(({ minimum, maximum }) => [
        minimum,
        maximum,
      ]),
    ).toEqual([
      [0, 400],
      [400, 500],
      [500, 1500],
      [1500, 2000],
      [2000, null],
    ]);
  });

  it("inverts all five tiers when the player is the target", () => {
    expect(
      xpOpponentRanges(1000, "target").map(({ minimum, maximum }) => [
        minimum,
        maximum,
      ]),
    ).toEqual([
      [2500, null],
      [2000, 2500],
      [1000 / 1.5, 2000],
      [500, 1000 / 1.5],
      [0, 500],
    ]);
  });
});

describe("demo attack troops", () => {
  it.each([
    ["bronze", 70],
    ["silver", 35],
    ["gold", 28],
    ["diamond", 21],
  ] as const)("covers the %s percentage band", (league, troops) =>
    expect(demoAttackTroops(1, league).troops).toBe(troops),
  );
});
