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
      label: "1 gemme 4★ + 2 gemmes 3★",
      baseGems: 16,
      actualStat: 60,
    });
  });
  it("maximizes a budget using adjacent star levels", () => {
    expect(optimizeGemBudget(96000, 6000, 5, 3)).toMatchObject({
      label: "1 gemme 4★ + 2 gemmes 3★",
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
  it("uses the exact lookup table rather than a formula", () => {
    expect(templarCumulativeCost(3)).toBe(599);
    expect(templarUpgradeCost(1, 3)).toBe(449);
    expect(templarUpgradeCost(3, 1)).toBe(449);
  });
});
