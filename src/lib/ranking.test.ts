import { describe, expect, it } from "vitest";
import { calculateRanking, rankBandShades, rankCategoryShade } from "./ranking";
import {
  defaultLeagueLadder,
  findLeagueRung,
  parseLeagueLadder,
  type LeagueLadder,
} from "./leagues";

/** The bands of one shipped entry, by id. */
const bandsOf = (id: string) => findLeagueRung(defaultLeagueLadder, id)!.bands;
/** The bands of one entry of a parsed ladder, by id. */
const bandsIn = (ladder: LeagueLadder, id: string) =>
  findLeagueRung(ladder, id)!.bands;

describe("ranking calculator", () => {
  it("deduces player count and computes increasing ranges", () => {
    const result = calculateRanking(bandsOf("diamond"), 1, 10);
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
      [{ threshold: 50, movement: null, target: null, rewards: [] }],
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
    const result = calculateRanking(bandsOf("legend"), 86.71, 137);
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
    const result = calculateRanking(bandsOf("diamond"), 100, 1);
    expect(result.total).toBe(1);
    expect(
      result.ranges.every((range) => range.rankStart <= range.rankEnd),
    ).toBe(true);
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0]).toMatchObject({
      threshold: 100,
      rankStart: 1,
      rankEnd: 1,
    });
  });

  it("never lets the same rank appear in two adjacent ranges (Bloc 31/J)", () => {
    // 1-6% covers places 1-10; 6-25% must start at 11, never restate 10.
    const result = calculateRanking(bandsOf("diamond"), 1, 10);
    for (let i = 1; i < result.ranges.length; i++) {
      expect(result.ranges[i].rankStart).toBe(result.ranges[i - 1].rankEnd + 1);
    }
    expect(result.ranges[0].rankStart).toBe(1);
  });

  it("rejects zero percent and keeps unknown leagues empty", () => {
    expect(calculateRanking(bandsOf("legend"), 0, 1)).toEqual({
      total: null,
      ranges: [],
    });
    expect(bandsOf("bronze")).toEqual([]);
    expect(bandsOf("gold")).toEqual([]);
  });

  it("leaves unconfirmed thresholds with no movement, target, or rewards", () => {
    for (const band of bandsOf("platinum")) {
      expect(band.movement).toBeNull();
      expect(band.target).toBeNull();
      expect(band.rewards).toEqual([]);
    }
  });

  it("normalizes editable reference data", () => {
    const config = parseLeagueLadder({
      bronze: [
        {
          threshold: 50,
          movement: "stay",
          target: "bronze",
          rewards: [{ type: "gems", quantity: 1 }],
        },
      ],
    });
    expect(bandsIn(config, "bronze")[0]).toEqual({
      threshold: 50,
      movement: "stay",
      target: "bronze",
      rewards: [{ type: "gems", quantity: 1 }],
    });
    expect(bandsIn(config, "legend")).toEqual(bandsOf("legend"));
  });

  it("drops an invalid movement, target, or reward instead of failing the whole row", () => {
    const config = parseLeagueLadder({
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
    expect(bandsIn(config, "bronze")[0]).toEqual({
      threshold: 50,
      movement: null,
      target: null,
      rewards: [{ type: "gems", quantity: 1 }],
    });
  });

  it("drops a fractional reward quantity instead of rounding it silently", () => {
    const config = parseLeagueLadder({
      bronze: [
        {
          threshold: 50,
          movement: "promotion",
          target: "silver",
          rewards: [
            { type: "gems", quantity: 1.5 },
            { type: "sapphires", quantity: 3 },
          ],
        },
      ],
    });
    expect(bandsIn(config, "bronze")[0].rewards).toEqual([
      { type: "sapphires", quantity: 3 },
    ]);
  });

  it("converts a pre-Bloc-27 row's free-text target/reward into the new shape", () => {
    const config = parseLeagueLadder({
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
    expect(bandsIn(config, "bronze")).toEqual([
      {
        threshold: 50,
        movement: "promotion",
        target: "gold",
        rewards: [
          { type: "sapphires", quantity: 100 },
          { type: "speedups", quantity: 7 },
          { type: "gems", quantity: 6 },
        ],
      },
      {
        threshold: 75,
        movement: "relegation",
        target: "silver",
        rewards: [{ type: "gems", quantity: 1 }],
      },
      {
        threshold: 90,
        movement: null,
        target: null,
        rewards: [],
      },
    ]);
  });

  it("allows confirmed ranking rows to be edited too", () => {
    const edited: LeagueLadder = structuredClone(defaultLeagueLadder);
    const band = {
      threshold: 2,
      movement: "relegation" as const,
      target: "diamond",
      rewards: [{ type: "sapphires" as const, quantity: 10 }],
    };
    findLeagueRung(edited, "legend")!.bands[0] = band;
    expect(bandsIn(parseLeagueLadder(edited), "legend")[0]).toEqual(band);
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

// Bloc 110/C: the scale and the interval tiles must paint the same interval
// the same color, and a shade depends on how many bands of the same movement
// came before it — so it cannot be recomputed independently on each side.
// Codex review (PR #139): Bloc 112 stopped drawing the deduced player count
// on the grounds that a range reaching 100% ends on it. That holds only if
// such a range is always rendered — so this pins that it survives any
// population, however small, while every range below it can be dropped.
describe("the 100% range is never dropped", () => {
  const bands = bandsOf("diamond");

  it.each([1, 2, 3, 7, 50, 1000])(
    "keeps it with a population of about %i",
    (rank) => {
      const result = calculateRanking(bands, 100, rank);
      const top = result.ranges.at(-1);
      expect(top?.threshold, `${rank} players`).toBe(100);
      // And it really does end on the deduced total, ceiled.
      expect(top?.rankEnd).toBe(Math.ceil(result.total!));
    },
  );

  it("can drop every range below it", () => {
    // One player: no lower range holds a whole rank, the top one still does.
    expect(
      calculateRanking(bands, 100, 1).ranges.map((range) => range.threshold),
    ).toEqual([100]);
  });
});

describe("rankBandShades", () => {
  it("shades bands in threshold order, light to dark within each movement", () => {
    expect(rankBandShades(bandsOf("diamond"))).toEqual([
      "#a8dcb8",
      "#7ec99a",
      "#a8c9e8",
      "#7eabd9",
      "#f0b088",
    ]);
  });

  it("does not depend on the order the bands arrive in", () => {
    const bands = bandsOf("diamond");
    expect(rankBandShades([...bands].reverse())).toEqual(rankBandShades(bands));
  });

  // The reason this exists at all: calculateRanking drops a band that holds
  // no integer rank, so the tiles are a SUBSET of the scale's bands. Each
  // range carries the index of its own band, so a dropped one cannot shift
  // the colors after it.
  it("keeps every surviving band's shade when one drops out", () => {
    const bands = bandsOf("diamond");
    const shades = rankBandShades(bands);
    // Two players: only the 60% and 100% bands hold an integer rank.
    const ranges = calculateRanking(bands, 100, 2).ranges;
    expect(ranges.map((range) => range.threshold)).toEqual([60, 100]);
    expect(ranges.map((range) => shades[range.bandIndex])).toEqual([
      "#7eabd9",
      "#f0b088",
    ]);
    // Shading the survivors on their own instead would repaint the 60% band:
    // it is the SECOND Maintien of the full ladder but the first of these two.
    expect(rankBandShades(ranges)[0]).toBe("#a8c9e8");
  });

  // Codex review (PR #137): two bands can share a threshold — the admin seeds
  // every new band row at 100 and only the range is validated — so a
  // threshold is not an identity. Keyed by it, the later band silently took
  // the earlier one's color.
  it("gives two bands on the same threshold their own shades", () => {
    expect(
      rankBandShades([
        { threshold: 100, movement: "promotion", target: null, rewards: [] },
        { threshold: 100, movement: "relegation", target: null, rewards: [] },
      ]),
    ).toEqual([
      rankCategoryShade("promotion", 0),
      rankCategoryShade("relegation", 0),
    ]);
  });

  it("numbers the ranges back to their own bands, duplicates included", () => {
    const ranges = calculateRanking(
      [
        { threshold: 50, movement: "stay", target: null, rewards: [] },
        { threshold: 100, movement: "promotion", target: null, rewards: [] },
      ],
      1,
      10,
    ).ranges;
    expect(ranges.map((range) => range.bandIndex)).toEqual([0, 1]);
  });

  it("treats a band with no movement as a Maintien, as the scale does", () => {
    expect(
      rankBandShades([
        { threshold: 10, movement: null, target: null, rewards: [] },
      ]),
    ).toEqual([rankCategoryShade("stay", 0)]);
  });
});
