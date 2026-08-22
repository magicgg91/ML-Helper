import { describe, expect, it } from "vitest";
import {
  calculateRanking,
  defaultRankingConfig,
  parseRankingConfig,
  rankCategory,
  rankCategoryShade,
} from "./ranking";

describe("ranking calculator", () => {
  it("deduces player count and computes increasing ranges", () => {
    const result = calculateRanking(defaultRankingConfig.diamond, 1, 10);
    expect(result.total).toBe(1000);
    expect(
      result.ranges.map((range) => [
        range.rangeStart,
        range.threshold,
        range.rankStart,
        range.rankEnd,
      ]),
    ).toEqual([
      [0, 1, 0, 10],
      [1, 6, 10, 60],
      [6, 25, 60, 250],
      [25, 60, 250, 600],
      [60, 100, 600, 1000],
    ]);
  });

  it("rejects zero percent and keeps unknown leagues empty", () => {
    expect(calculateRanking(defaultRankingConfig.legend, 0, 1)).toEqual({
      total: null,
      ranges: [],
    });
    expect(defaultRankingConfig.bronze).toEqual([]);
    expect(defaultRankingConfig.gold).toEqual([]);
  });

  it("normalizes editable reference data", () => {
    const config = parseRankingConfig({
      bronze: [{ threshold: 50, target: "Maintien", reward: "1 gemme" }],
    });
    expect(config.bronze[0]).toEqual({
      threshold: 50,
      target: "Maintien",
      reward: "1 gemme",
    });
    expect(config.legend).toEqual(defaultRankingConfig.legend);
  });

  it("allows confirmed ranking rows to be edited too", () => {
    const edited = structuredClone(defaultRankingConfig);
    edited.legend[0] = {
      threshold: 2,
      target: "Cible modifiée",
      reward: "Récompense modifiée",
    };
    expect(parseRankingConfig(edited).legend[0]).toEqual(edited.legend[0]);
  });
});

describe("rankCategory", () => {
  it.each([
    ["Montée Or", "montee"],
    ["Descente Diamant", "descente"],
    ["Maintien Légende", "maintien"],
    ["À définir dans l’administration", "maintien"],
  ] as const)("classifies %s as %s", (target, expected) => {
    expect(rankCategory(target)).toBe(expected);
  });
});

describe("rankCategoryShade", () => {
  it("goes from light to dark as the index grows within a category", () => {
    expect(rankCategoryShade("montee", 0)).toBe("#a8dcb8");
    expect(rankCategoryShade("montee", 1)).toBe("#7ec99a");
    expect(rankCategoryShade("descente", 0)).toBe("#f0b088");
  });
  it("cycles back to the lightest shade past the palette length", () => {
    expect(rankCategoryShade("maintien", 5)).toBe(rankCategoryShade("maintien", 0));
  });
});
