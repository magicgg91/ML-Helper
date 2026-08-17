import { describe, expect, it } from "vitest";
import {
  calculateRanking,
  defaultRankingConfig,
  parseRankingConfig,
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
});
