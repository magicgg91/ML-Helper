import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  availableLevelUpLeagues,
  defaultLevelUpParameters,
  hasLevelUpTroopsFormula,
  isSavableLevelUpParameters,
  levelUpChestAt,
  levelUpTroopsAt,
  levelUpXpToReach,
  xpAt,
} from "./level-up";
import { leagues } from "./player-settings";

/** defaultLevelUpParameters with one league's formula replaced. */
function withTroops(
  league: (typeof leagues)[number],
  troops: { coefficient: number; ratio: number },
) {
  return {
    ...defaultLevelUpParameters,
    troops: { ...defaultLevelUpParameters.troops, [league]: troops },
  };
}

// Bloc 107/A: the troop table Silver was reported wrong on, level by level, as
// confirmed in game by a player. Level 1 is a flat 200 outside the curve; from
// level 2 the game publishes 40.14 × 1.243^(n-1), which levelUpTroopsAt holds
// in its own `coefficient × ratio^level` form as 40.14 / 1.243 = 32.291367 —
// the pair an admin has stored for Silver.
const silverStored = { coefficient: 32.291367, ratio: 1.243 };
const silverTroopsInGame: Array<[number, number]> = [
  [1, 200],
  [2, 50],
  [3, 62],
  [4, 77],
  [5, 96],
  [6, 119],
  [7, 148],
  [8, 184],
  [9, 229],
  [10, 284],
  [12, 440],
  [13, 547],
  [20, 2500],
  [30, 22000],
  [60, 15000000],
];

describe("Bloc 107/A: Silver troops, against the values confirmed in game", () => {
  const parameters = withTroops("silver", silverStored);

  it.each(silverTroopsInGame)(
    "level %i carries %i troops",
    (level, expected) => {
      const troops = levelUpTroopsAt(level, "silver", parameters)!;
      // Within 0.5%: the published 40.14/1.243 is a fit to the game's own
      // numbers, not the game's arithmetic, and the readings above level 13
      // are rounded to two significant figures. Tightening this would be
      // pinning the fit's error, not the curve. It is loose enough to accept
      // the right ratio and nowhere near loose enough to accept a neighbour's
      // — the test below measures that gap.
      expect(Math.abs(troops / expected - 1)).toBeLessThan(0.005);
    },
  );

  // The reported symptom, named. What the player read off the page is what
  // Silver's coefficient gives under BRONZE's ratio, and the two ratios are
  // 0.002 apart: the substitution is worth under 2% at level 10 and only
  // becomes unmistakable sixty rows down. That asymmetry is the whole reason
  // it survived a check — and the reason this file now asserts on level 60.
  it("a neighbouring league's ratio costs under 2% at level 10 and over 10% at level 60", () => {
    const wrong = withTroops("silver", {
      ...silverStored,
      ratio: defaultLevelUpParameters.troops.bronze.ratio,
    });
    const drift = (level: number) =>
      levelUpTroopsAt(level, "silver", wrong)! /
        levelUpTroopsAt(level, "silver", parameters)! -
      1;
    expect(drift(10)).toBeLessThan(0.02);
    expect(drift(60)).toBeGreaterThan(0.1);
  });

  // And the defect that was suspected, which is not there: each league is
  // computed from its OWN stored pair. Every league gets a sentinel of its own
  // here, far enough apart that a borrowed row could not pass for the right
  // one — the check the report asked for on the five leagues besides Silver.
  it.each(leagues)(
    "computes %s from its own stored pair, never a neighbour's",
    (league) => {
      const sentinels = {
        ...defaultLevelUpParameters,
        troops: Object.fromEntries(
          leagues.map((other, index) => [
            other,
            { coefficient: index + 1, ratio: 1.1 + index / 100 },
          ]),
        ) as (typeof defaultLevelUpParameters)["troops"],
      };
      const own = sentinels.troops[league];
      expect(levelUpTroopsAt(5, league, sentinels)).toBeCloseTo(
        own.coefficient * own.ratio ** 5,
        10,
      );
      for (const other of leagues)
        if (other !== league)
          expect(levelUpTroopsAt(5, league, sentinels)).not.toBeCloseTo(
            sentinels.troops[other].coefficient *
              sentinels.troops[other].ratio ** 5,
            3,
          );
    },
  );
});

// Bloc 107/B: the XP column names the cost of REACHING a level, not of leaving
// it. The numbers never moved — only which row carries them.
describe("Bloc 107/B: XP is labelled by the level it buys", () => {
  it("has nothing to show at level 1, which nobody pays to reach", () =>
    expect(levelUpXpToReach(1)).toBeNull());

  it.each([
    [2, 50],
    [6, 143],
    [101, 9_535_904_272_946],
  ])("level %i costs the step that ends on it", (level, expected) => {
    expect(levelUpXpToReach(level)).toBe(expected);
    // The same value the old labelling put one row higher.
    expect(levelUpXpToReach(level)).toBe(xpAt(level - 1));
  });

  // XP takes no league, so one shift covers the whole reference: the table
  // renders this column identically whichever league is on screen.
  it("is universal, so every league reads the same column", () => {
    const perLeague = leagues.map(() => levelUpXpToReach(101));
    expect(new Set(perLeague).size).toBe(1);
  });
});

describe("Level Up reference", () => {
  it.each([
    ["bronze", 32.2028 * 1.245 ** 2],
    ["gold", 49.956624],
    ["platinum", 54.899478],
    ["diamond", 32.2028 * 1.245 ** 2],
    ["legend", 32.2028 * 1.245 ** 2],
  ] as const)("uses the confirmed %s troop formula", (league, expected) =>
    expect(levelUpTroopsAt(2, league)).toBeCloseTo(expected),
  );
  it("has nothing to show for a league whose formula was never filled in", () =>
    expect(levelUpTroopsAt(2, "silver")).toBeNull());
  it("uses universal XP and the five-chest ten-level cycle", () => {
    expect(xpAt(1)).toBe(50);
    expect(xpAt(2)).toBe(65);
    expect(levelUpChestAt(9)).toBeNull();
    expect(levelUpChestAt(10)).toBe(0);
    expect(levelUpChestAt(50)).toBe(4);
    expect(levelUpChestAt(60)).toBe(0);
  });
});

// Bloc 98/A: an admin could fill in Silver's coefficient and ratio, save them,
// and the public reference would still refuse the league — availability was a
// list of league names in the code, not a question asked of the data. These
// tests are written over whichever league is passed in, never over "silver",
// because the fix is meant to hold for any league.
describe("which leagues the Progression reference can show", () => {
  it("accepts any league once its two values are stored", () => {
    // The reported bug, in one assertion: Silver ships unfilled and unusable…
    expect(hasLevelUpTroopsFormula("silver")).toBe(false);
    expect(levelUpTroopsAt(2, "silver")).toBeNull();

    // …and an admin filling it in is all it takes to make it work.
    const filled = withTroops("silver", { coefficient: 30, ratio: 1.24 });
    expect(hasLevelUpTroopsFormula("silver", filled)).toBe(true);
    expect(levelUpTroopsAt(2, "silver", filled)).toBeCloseTo(30 * 1.24 ** 2);
  });

  it("drops a league again when its values are cleared", () => {
    // The same rule in reverse, on a league that has always been confirmed —
    // proof that nothing is hard-coded on either side.
    const cleared = withTroops("legend", { coefficient: 0, ratio: 0 });
    expect(hasLevelUpTroopsFormula("legend", cleared)).toBe(false);
    expect(levelUpTroopsAt(2, "legend", cleared)).toBeNull();
    // Level 1 is a flat 200 for a league that has a formula; a league without
    // one must not sneak that value through either.
    expect(levelUpTroopsAt(1, "legend", cleared)).toBeNull();
  });

  it.each([
    ["a missing coefficient", { coefficient: 0, ratio: 1.24 }],
    ["a missing ratio", { coefficient: 30, ratio: 0 }],
    ["a negative coefficient", { coefficient: -30, ratio: 1.24 }],
    ["a NaN ratio", { coefficient: 30, ratio: Number.NaN }],
  ])("refuses %s, which could never produce a real curve", (_, troops) =>
    expect(
      hasLevelUpTroopsFormula("silver", withTroops("silver", troops)),
    ).toBe(false),
  );

  it("lists the available leagues in game progression order", () => {
    // Bloc 98/C: Bronze → Légende, the order of the shared league list.
    expect(availableLevelUpLeagues()).toEqual([
      "bronze",
      "gold",
      "platinum",
      "diamond",
      "legend",
    ]);
    const filled = withTroops("silver", { coefficient: 30, ratio: 1.24 });
    expect(availableLevelUpLeagues(filled)).toEqual([...leagues]);
  });

  it("names no league in the logic itself", () => {
    // What made the bug possible, and what must not come back: a league name
    // written into the code deciding what the reference will show. Comments
    // may still name Silver — the one above does.
    for (const file of [
      "src/lib/level-up.ts",
      "src/components/level-up-reference.tsx",
    ]) {
      const code = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//"))
        .join("\n");
      for (const league of leagues)
        expect(code, `${file} still names ${league}`).not.toContain(
          `"${league}"`,
        );
    }
  });
});

// Bloc 98/A: the admin route used to refuse any payload containing a zero,
// which meant the whole Progression reference could not be saved at all while
// one league was still blank — and on a fresh install Silver always is, so the
// first save an admin ever attempted came back 400.
describe("saving Progression parameters", () => {
  it("accepts a league left blank, which is how a league stays unconfirmed", () =>
    expect(isSavableLevelUpParameters(defaultLevelUpParameters)).toBe(true));

  it("accepts that same league once it is filled in", () =>
    expect(
      isSavableLevelUpParameters(
        withTroops("silver", { coefficient: 30, ratio: 1.24 }),
      ),
    ).toBe(true));

  it.each([
    ["half filled in", { coefficient: 30, ratio: 0 }],
    ["half filled in the other way", { coefficient: 0, ratio: 1.24 }],
    ["negative", { coefficient: -30, ratio: 1.24 }],
    ["not a number", { coefficient: Number.NaN, ratio: 1.24 }],
  ])("still refuses a %s formula", (_, troops) =>
    expect(isSavableLevelUpParameters(withTroops("silver", troops))).toBe(
      false,
    ),
  );

  it("still requires the XP curve, which no league can do without", () => {
    expect(
      isSavableLevelUpParameters({
        ...defaultLevelUpParameters,
        xp: { base: 0, ratio: 1.3 },
      }),
    ).toBe(false);
  });
});
