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

  it("floors a non-integer rank instead of rounding it up past the real cutoff", () => {
    // total = 189, threshold 50% -> 94.5 places. Rounding to 95 would tell a
    // player they're safe when the 95th player has actually been relegated.
    const result = calculateRanking(
      [{ threshold: 50, movement: null, league: null, rewards: [] }],
      100,
      189,
    );
    expect(result.ranges[0].rankStart).toBe(0);
    expect(result.ranges[0].rankEnd).toBe(94);
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
          movement: "stay",
          league: "bronze",
          rewards: [{ type: "gems", quantity: 1 }],
        },
      ],
    });
    expect(config.bronze[0]).toEqual({
      threshold: 50,
      movement: "stay",
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

  it("drops a fractional reward quantity instead of rounding it silently", () => {
    const config = parseRankingConfig({
      bronze: [
        {
          threshold: 50,
          movement: "promotion",
          league: "silver",
          rewards: [
            { type: "gems", quantity: 1.5 },
            { type: "sapphires", quantity: 3 },
          ],
        },
      ],
    });
    expect(config.bronze[0].rewards).toEqual([{ type: "sapphires", quantity: 3 }]);
  });

  it("converts a pre-Bloc-27 row's free-text target/reward into the new shape", () => {
    const config = parseRankingConfig({
      bronze: [
        {
          threshold: 50,
          target: "Montée Or",
          reward: "100 saphirs, 7 speedup, 6 gemmes",
        },
        {
          threshold: 75,
          target: "Descente Argent",
          reward: "1 gemme",
        },
        {
          threshold: 90,
          target: "À définir dans l’administration",
          reward: "À définir dans l’administration",
        },
      ],
    });
    expect(config.bronze).toEqual([
      {
        threshold: 50,
        movement: "promotion",
        league: "gold",
        rewards: [
          { type: "sapphires", quantity: 100 },
          { type: "speedups", quantity: 7 },
          { type: "gems", quantity: 6 },
        ],
      },
      {
        threshold: 75,
        movement: "relegation",
        league: "silver",
        rewards: [{ type: "gems", quantity: 1 }],
      },
      {
        threshold: 90,
        movement: null,
        league: null,
        rewards: [],
      },
    ]);
  });

  it("allows confirmed ranking rows to be edited too", () => {
    const edited = structuredClone(defaultRankingConfig);
    edited.legend[0] = {
      threshold: 2,
      movement: "relegation",
      league: "diamond",
      rewards: [{ type: "sapphires", quantity: 10 }],
    };
    expect(parseRankingConfig(edited).legend[0]).toEqual(edited.legend[0]);
  });
});

describe("rankCategoryShade", () => {
  it("goes from light to dark as the index grows within a category", () => {
    expect(rankCategoryShade("promotion", 0)).toBe("#a8dcb8");
    expect(rankCategoryShade("promotion", 1)).toBe("#7ec99a");
    expect(rankCategoryShade("relegation", 0)).toBe("#f0b088");
  });
  it("cycles back to the lightest shade past the palette length", () => {
    expect(rankCategoryShade("stay", 5)).toBe(rankCategoryShade("stay", 0));
  });
});
