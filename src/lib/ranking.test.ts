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
      [0, 1, 1, 10],
      [1, 6, 11, 60],
      [6, 25, 61, 250],
      [25, 60, 251, 600],
      [60, 100, 601, 1000],
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
    expect(result.ranges[0].rankStart).toBe(1);
    expect(result.ranges[0].rankEnd).toBe(94);
  });

  // Bloc 62/G: every band floors its rank boundary except the 100% one,
  // which must ceil instead — confirmed case: Légende, rank 137, 86.71% ->
  // raw total 137 / 0.8671 = 157.998, so the 100% row's rankEnd is 158
  // (Math.ceil), not 157 (the Math.floor every other row correctly uses).
  it("Bloc62/G: ceils the 100% row's rank boundary instead of flooring it", () => {
    const result = calculateRanking(defaultRankingConfig.legend, 86.71, 137);
    expect(result.total).toBeCloseTo(157.998, 3);
    const lastRange = result.ranges[result.ranges.length - 1];
    expect(lastRange.threshold).toBe(100);
    expect(lastRange.rankEnd).toBe(158);
  });

  it("drops a band that holds no integer rank instead of showing a reversed range", () => {
    // total = 1 (rank 1 at 100%): every Diamond threshold below 100% floors
    // to rank 0, so those bands would show as the impossible "rankStart 1 >
    // rankEnd 0" — they must be omitted, leaving only the band that
    // actually contains rank 1.
    const result = calculateRanking(defaultRankingConfig.diamond, 100, 1);
    expect(result.total).toBe(1);
    expect(result.ranges.every((range) => range.rankStart <= range.rankEnd)).toBe(
      true,
    );
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0]).toMatchObject({
      threshold: 100,
      rankStart: 1,
      rankEnd: 1,
    });
  });

  it("never lets the same rank appear in two adjacent ranges (Bloc 31/J)", () => {
    // 1-6% covers places 1-10; 6-25% must start at 11, never restate 10.
    const result = calculateRanking(defaultRankingConfig.diamond, 1, 10);
    for (let i = 1; i < result.ranges.length; i++) {
      expect(result.ranges[i].rankStart).toBe(
        result.ranges[i - 1].rankEnd + 1,
      );
    }
    expect(result.ranges[0].rankStart).toBe(1);
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
