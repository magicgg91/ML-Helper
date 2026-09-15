import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  availableLevelUpLeagues,
  defaultLevelUpParameters,
  hasLevelUpTroopsFormula,
  isSavableLevelUpParameters,
  levelUpChestAt,
  levelUpTroopsAt,
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
