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

// Bloc 107/A: the troop table Silver was reported wrong on, level by level,
// as confirmed in game by a player. Level 1 is a flat 200 outside the curve;
// from level 2 the game's formula is 40.14 × 1.243^(n-1).
//
// The point of the table is the CONVENTION, which nothing in the code used to
// state. levelUpTroopsAt computes `coefficient × ratio^level`, so the
// coefficient it stores is the game's divided by the ratio: 40.14 / 1.243 =
// 32.2928. An admin who types the game's own 40.14 gets every row shifted one
// level up — 284 troops on level 9, where the game puts them on level 10 —
// which is precisely the bug this bloc came from, and it lived in the stored
// value, not in the arithmetic.
const silverFromTheGame = { coefficient: 40.14 / 1.243, ratio: 1.243 };
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
];

describe("Bloc 107/A: Silver troops, against the values confirmed in game", () => {
  const parameters = withTroops("silver", silverFromTheGame);

  it.each(silverTroopsInGame)(
    "level %i carries %i troops",
    (level, expected) => {
      const troops = levelUpTroopsAt(level, "silver", parameters)!;
      // Within one troop: the published 40.14/1.243 is a fit to the game's own
      // numbers, not the game's arithmetic, and it drifts by ~1 by level 12.
      // Tightening this would be pinning the fit's error, not the curve.
      expect(Math.round(troops)).toBeGreaterThanOrEqual(expected - 1);
      expect(Math.round(troops)).toBeLessThanOrEqual(expected + 1);
    },
  );

  // The shift itself, named: typing the game's coefficient straight in moves
  // level 10's value onto level 9.
  it("shifts the whole table one level up if the game's coefficient is stored raw", () => {
    const raw = withTroops("silver", { coefficient: 40.14, ratio: 1.243 });
    expect(Math.round(levelUpTroopsAt(9, "silver", raw)!)).toBe(284);
    expect(Math.round(levelUpTroopsAt(10, "silver", parameters)!)).toBe(284);
  });

  // And the five leagues that ship with a formula are NOT shifted: Bronze's
  // curve is near-identical to Silver's (40.09/1.245 against 40.14/1.243), so
  // its level 2 has to land on Silver's confirmed 50, not on 40.
  it.each(["bronze", "gold", "platinum", "diamond", "legend"] as const)(
    "%s is stored in that same convention, so its curve is not shifted",
    (league) => {
      const { coefficient, ratio } = defaultLevelUpParameters.troops[league];
      expect(levelUpTroopsAt(2, league)).toBeCloseTo(coefficient * ratio ** 2);
      // The level-2 value of a league whose coefficient is ~40 once divided
      // out: shifted, it would read ~40 instead.
      expect(levelUpTroopsAt(2, league)!).toBeGreaterThan(44);
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
