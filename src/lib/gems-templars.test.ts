import { describe, expect, it } from "vitest";
import {
  gemValue,
  optimizeGemBudget,
  optimizeGemTarget,
  templarCumulativeCost,
  templarUpgradeCost,
} from "./gems-templars";

describe("gems", () => {
  it("uses the confirmed per-skill and per-league values", () => {
    expect(gemValue("prosperous", "legend")).toBe(9);
    expect(gemValue("cautious", "silver")).toBe(1);
  });
  it("distributes target units as uniformly as possible", () => {
    expect(optimizeGemTarget(60, 6, 3)).toMatchObject({
      baseGems: 16,
      actualStat: 60,
      stars: [
        { stars: 4, count: 1 },
        { stars: 3, count: 2 },
      ],
    });
  });
  it("maximizes a budget using adjacent star levels", () => {
    expect(optimizeGemBudget(96000, 6000, 5, 3)).toMatchObject({
      baseGems: 16,
      actualStat: 50,
      cost: 96000,
      remaining: 0,
    });
    expect(optimizeGemBudget(0, 7000, 6, 27)).toMatchObject({
      baseGems: 0,
      cost: 0,
      remaining: 0,
    });
  });
});

describe("templars", () => {
  it("uses the named base and ratio formula", () => {
    expect(templarCumulativeCost(3)).toBe(599);
    expect(templarUpgradeCost(0, 1)).toBe(150);
    expect(templarUpgradeCost(0, 3)).toBe(599);
    expect(templarUpgradeCost(1, 3)).toBe(449);
    expect(templarUpgradeCost(3, 1)).toBe(449);
    expect(templarUpgradeCost(19, 20)).toBe(21929);
  });
  it("accepts administrator-provided named parameters", () => {
    expect(templarUpgradeCost(0, 2, { base: 100, ratio: 2 })).toBe(300);
  });
});
