import { describe, expect, it } from "vitest";
import {
  calculateRanking,
  defaultRankingConfig,
  parseRankingConfig,
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

  it("leaves unconfirmed thresholds with no movement, league, or rewards", () => {
    for (const band of defaultRankingConfig.platinum) {
      expect(band.movement).toBeNull();
      expect(band.league).toBeNull();
      expect(band.rewards).toEqual([]);
    }
  });

  it("normalizes editable reference data", () => {
    const config = parseRankingConfig({
      bronze: [
        {
          threshold: 50,
          movement: "maintien",
          league: "bronze",
          rewards: [{ type: "gems", quantity: 1 }],
        },
      ],
    });
    expect(config.bronze[0]).toEqual({
      threshold: 50,
      movement: "maintien",
      league: "bronze",
      rewards: [{ type: "gems", quantity: 1 }],
    });
    expect(config.legend).toEqual(defaultRankingConfig.legend);
  });

  it("drops an invalid movement, league, or reward instead of failing the whole row", () => {
    const config = parseRankingConfig({
      bronze: [
        {
          threshold: 50,
          movement: "not-a-movement",
          league: "not-a-league",
          rewards: [
            { type: "gems", quantity: 1 },
            { type: "not-a-reward", quantity: 5 },
            { type: "sapphires", quantity: 0 },
          ],
        },
      ],
    });
    expect(config.bronze[0]).toEqual({
      threshold: 50,
      movement: null,
      league: null,
      rewards: [{ type: "gems", quantity: 1 }],
    });
  });

  it("allows confirmed ranking rows to be edited too", () => {
    const edited = structuredClone(defaultRankingConfig);
    edited.legend[0] = {
      threshold: 2,
      movement: "descente",
      league: "diamond",
      rewards: [{ type: "sapphires", quantity: 10 }],
    };
    expect(parseRankingConfig(edited).legend[0]).toEqual(edited.legend[0]);
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
