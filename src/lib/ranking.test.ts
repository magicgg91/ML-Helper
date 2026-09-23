import { describe, expect, it } from "vitest";
import {
  activeLadder,
  calculateRanking,
  defaultRankingLadder,
  divisionsForLeague,
  findRankingEntry,
  isSavableRankingLadder,
  leagueLockFor,
  orderedLadder,
  parseRankingLadder,
  rankBandShades,
  rankCategoryShade,
  rankingEntryId,
  type RankingEntry,
  type RankingLadder,
} from "./ranking";

/** The bands of one shipped entry, by id. */
const bandsOf = (id: string) =>
  findRankingEntry(defaultRankingLadder, id)!.bands;
/** The bands of one entry of a parsed ladder, by id. */
const bandsIn = (ladder: RankingLadder, id: string) =>
  findRankingEntry(ladder, id)!.bands;

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
    const config = parseRankingLadder({
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
    const config = parseRankingLadder({
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
    const config = parseRankingLadder({
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
    const config = parseRankingLadder({
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
    const edited: RankingLadder = structuredClone(defaultRankingLadder);
    const band = {
      threshold: 2,
      movement: "relegation" as const,
      target: "diamond",
      rewards: [{ type: "sapphires" as const, quantity: 10 }],
    };
    findRankingEntry(edited, "legend")!.bands[0] = band;
    expect(bandsIn(parseRankingLadder(edited), "legend")[0]).toEqual(band);
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

// Bloc 108/A: the six leagues the tool shipped with, and everything an admin
// had already configured for them, have to survive the move to a dynamic
// ladder. The stored row is not rewritten by a SQL migration — it is read
// through parseRankingLadder, which accepts both shapes, exactly as this file
// already did for the pre-Bloc-27 French-sentence rows.
describe("Bloc 108/A: migrating the six fixed leagues to a ladder", () => {
  /** A stored row in the pre-Bloc-108 shape, with real configured data. */
  const stored = {
    bronze: [],
    silver: [
      {
        threshold: 1,
        movement: "promotion",
        league: "gold",
        rewards: [
          { type: "sapphires", quantity: 100 },
          { type: "speedups", quantity: 7 },
          { type: "gems", quantity: 6 },
        ],
      },
    ],
    gold: [],
    platinum: [{ threshold: 50, movement: null, league: null, rewards: [] }],
    diamond: [
      {
        threshold: 100,
        movement: "relegation",
        league: "platinum",
        rewards: [{ type: "gems", quantity: 1 }],
      },
    ],
    legend: [],
  };

  it("keeps all six, in game order, active, with their league keys as ids", () => {
    const ladder = parseRankingLadder(stored);
    expect(ladder.map((entry) => entry.id)).toEqual([
      "bronze",
      "silver",
      "gold",
      "platinum",
      "diamond",
      "legend",
    ]);
    expect(ladder.map((entry) => entry.position)).toEqual([0, 1, 2, 3, 4, 5]);
    // They are already in production: none of them may arrive switched off.
    expect(ladder.every((entry) => entry.active)).toBe(true);
    expect(ladder.every((entry) => entry.division === "")).toBe(true);
  });

  it("carries every configured band across, rewards included", () => {
    const ladder = parseRankingLadder(stored);
    expect(bandsIn(ladder, "silver")).toEqual(
      stored.silver.map((row) => ({
        threshold: row.threshold,
        movement: row.movement,
        target: row.league,
        rewards: row.rewards,
      })),
    );
    // Speedups specifically: the reward type Bloc 108/H is about.
    expect(bandsIn(ladder, "silver")[0].rewards).toContainEqual({
      type: "speedups",
      quantity: 7,
    });
    // A threshold confirmed without a movement stays unconfirmed, not dropped.
    expect(bandsIn(ladder, "platinum")).toHaveLength(1);
    expect(bandsIn(ladder, "platinum")[0].movement).toBeNull();
  });

  it("re-points every promotion and relegation at the migrated entry", () => {
    const ladder = parseRankingLadder(stored);
    // `league: "gold"` becomes `target: "gold"`, which is a real id on the
    // new ladder — the whole reason the six keep their league keys.
    expect(bandsIn(ladder, "silver")[0].target).toBe("gold");
    expect(findRankingEntry(ladder, "gold")).toBeDefined();
    expect(bandsIn(ladder, "diamond")[0].target).toBe("platinum");
  });

  it("clears a target that names no entry, rather than leaving it dangling", () => {
    const ladder = parseRankingLadder([
      {
        id: "bronze",
        league: "bronze",
        division: "",
        nameFr: "",
        nameEn: "",
        position: 0,
        active: true,
        bands: [
          { threshold: 50, movement: "promotion", target: "deleted-rung" },
        ],
      },
    ]);
    expect(bandsIn(ladder, "bronze")[0].target).toBeNull();
    // The band itself survives: its threshold is still real.
    expect(bandsIn(ladder, "bronze")[0].threshold).toBe(50);
  });

  it("refuses a ladder whose ids collide, because a target would be ambiguous", () => {
    const twice = (id: string): RankingEntry => ({
      id,
      league: "gold",
      division: "1",
      nameFr: "",
      nameEn: "",
      position: 0,
      active: true,
      bands: [],
    });
    expect(isSavableRankingLadder([twice("gold-1")])).toBe(true);
    expect(isSavableRankingLadder([twice("gold-1"), twice("gold-1")])).toBe(
      false,
    );
    expect(isSavableRankingLadder([])).toBe(false);
  });

  it("builds an id from the league and division, or from a free name", () => {
    expect(rankingEntryId({ league: "gold", division: "1" })).toBe("gold-1");
    // Codex review (PR #135): the free name is stored per locale, and the id
    // is built from the English one first so editing the French name later
    // cannot move an id that bands already point at.
    expect(
      rankingEntryId({
        league: null,
        division: "",
        nameFr: "Élite Suprême",
        nameEn: "Supreme Elite",
      }),
    ).toBe("supreme-elite");
    expect(
      rankingEntryId({ league: null, division: "", nameFr: "Élite Suprême" }),
    ).toBe("elite-supreme");
  });
});

/** The ladder once the studio's divisions exist, bottom rung first. */
function ladderWithDivisions(
  overrides: Partial<Record<string, Partial<RankingEntry>>> = {},
): RankingLadder {
  const rungs: Array<[string, string]> = [
    ["bronze", ""],
    ["silver", "2"],
    ["silver", "1"],
    ["gold", "2"],
    ["gold", "1"],
    ["platinum", "2"],
    ["platinum", "1"],
    ["diamond", "2"],
    ["diamond", "1"],
    ["legend", ""],
  ];
  return rungs.map(([league, division], index) => {
    const id = division ? `${league}-${division}` : league;
    return {
      id,
      league: league as RankingEntry["league"],
      division,
      nameFr: "",
      nameEn: "",
      position: index,
      active: true,
      bands: [],
      ...overrides[id],
    };
  });
}

// Bloc 108/D: the League Lock is new — the game has always had it, the tool
// never showed it. No admin field: it is two rungs down the ladder.
describe("Bloc 108/D: the League Lock is computed, never typed in", () => {
  it("reproduces the studio's own example: Or 1 locks at Argent 1", () => {
    // Or 1 -> Or 2 -> Argent 1, two rungs down.
    expect(leagueLockFor(ladderWithDivisions(), "gold-1")?.id).toBe("silver-1");
  });

  it.each([
    ["gold-2", "silver-2"],
    ["platinum-1", "gold-1"],
    ["diamond-2", "platinum-2"],
    ["legend", "diamond-2"],
  ])("locks %s at %s", (from, expected) => {
    expect(leagueLockFor(ladderWithDivisions(), from)?.id).toBe(expected);
  });

  // Bloc 111: the three cases near the floor, which Bloc 108 left
  // unspecified and answered with a plain "none". Bronze is the floor: never
  // a lock for anyone, and never locked itself.
  it.each([
    // Already the floor — nothing below it to be held at.
    ["bronze", null],
    // One rung back would be the floor, so the walk shortens to zero rungs.
    ["silver-2", "silver-2"],
    // Two rungs back would be the floor, so it shortens to one.
    ["silver-1", "silver-2"],
  ])("clamps the lock of %s to %s near the floor", (from, expected) => {
    expect(leagueLockFor(ladderWithDivisions(), from)?.id ?? null).toBe(
      expected,
    );
  });

  // The rule stated as the property, not as the three cases: whatever the
  // ladder, the floor is never handed back as anyone's lock.
  it("never returns the ladder's floor as a lock target", () => {
    const ladders = [
      defaultRankingLadder,
      ladderWithDivisions(),
      // A floor split into divisions, and a ladder switched down to two
      // rungs — the shortest one where a lock can exist at all.
      ladderWithDivisions({ "gold-1": { active: false } }),
      ladderWithDivisions({
        "gold-1": { active: false },
        "gold-2": { active: false },
        "silver-1": { active: false },
      }),
    ];
    for (const ladder of ladders) {
      const active = activeLadder(ladder);
      const floor = active[0]!.id;
      for (const entry of active)
        expect(
          leagueLockFor(ladder, entry.id)?.id,
          `${entry.id} on a ${active.length}-rung ladder`,
        ).not.toBe(floor);
    }
  });

  // And the walk is only ever shortened, never lengthened: no rung is locked
  // at something above itself.
  it("never locks a rung above itself", () => {
    const active = activeLadder(ladderWithDivisions());
    for (const [index, entry] of active.entries()) {
      const lock = leagueLockFor(ladderWithDivisions(), entry.id);
      if (!lock) continue;
      expect(
        active.findIndex((item) => item.id === lock.id),
        `${entry.id} locks at ${lock.id}`,
      ).toBeLessThanOrEqual(index);
    }
  });

  // Bloc 108/B: the lock is a consequence of the order, so reordering must
  // move it. This is the assertion that would fail if insertion order were
  // used as the source of truth instead of the explicit position.
  it("follows a reordering of the ladder", () => {
    const swapped = ladderWithDivisions({
      "gold-2": { position: 4 },
      "gold-1": { position: 3 },
    });
    // Or 1 is now BELOW Or 2, so it sits two rungs above Argent 2.
    expect(leagueLockFor(swapped, "gold-1")?.id).toBe("silver-2");
    expect(leagueLockFor(swapped, "gold-2")?.id).toBe("silver-1");
  });

  // Bloc 108/G: an entry an admin has prepared but not switched on does not
  // exist for the player, so it must not shift the count either.
  it("counts only active rungs", () => {
    const pending = ladderWithDivisions({ "gold-2": { active: false } });
    // With Or 2 switched off the ladder reads Argent 2, Argent 1, Or 1.
    expect(leagueLockFor(pending, "gold-1")?.id).toBe("silver-2");
    expect(activeLadder(pending).map((entry) => entry.id)).not.toContain(
      "gold-2",
    );
  });

  it("has no answer for an entry that is not on the ladder at all", () => {
    expect(leagueLockFor(ladderWithDivisions(), "nowhere")).toBeNull();
  });
});

// Bloc 108/E: the player settings' division field is driven by what an admin
// has really configured — never by a hard-coded list of divisions.
describe("Bloc 108/E: the divisions offered for a league", () => {
  it("is empty for a league with no division configured", () => {
    expect(divisionsForLeague(defaultRankingLadder, "gold")).toEqual([]);
    expect(divisionsForLeague(ladderWithDivisions(), "bronze")).toEqual([]);
    expect(divisionsForLeague(ladderWithDivisions(), "legend")).toEqual([]);
  });

  it("lists that league's divisions, in ladder order, once they exist", () => {
    expect(
      divisionsForLeague(ladderWithDivisions(), "gold").map((e) => e.id),
    ).toEqual(["gold-2", "gold-1"]);
  });

  it("leaves out a division that is not active yet", () => {
    const pending = ladderWithDivisions({ "gold-1": { active: false } });
    expect(divisionsForLeague(pending, "gold").map((e) => e.id)).toEqual([
      "gold-2",
    ]);
  });

  it("has nothing to offer when no league is chosen", () => {
    expect(divisionsForLeague(ladderWithDivisions(), "")).toEqual([]);
  });
});

// Bloc 108/B: order is explicit, and orderedLadder renumbers positions so an
// admin never has to keep them contiguous by hand.
describe("Bloc 108/B: explicit order", () => {
  it("sorts on position, not on the order the entries happen to be in", () => {
    const shuffled = [...ladderWithDivisions()].reverse();
    expect(orderedLadder(shuffled).map((entry) => entry.id)).toEqual(
      ladderWithDivisions().map((entry) => entry.id),
    );
  });

  it("renumbers gaps away, so positions stay 0..n-1", () => {
    const sparse = ladderWithDivisions({
      bronze: { position: 5 },
      "silver-2": { position: 90 },
    });
    expect(orderedLadder(sparse).map((entry) => entry.position)).toEqual([
      ...Array(10).keys(),
    ]);
  });
});
