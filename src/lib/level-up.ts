import { leagues, type League } from "./player-settings";

export type LevelUpParameters = {
  xp: { base: number; ratio: number };
  // Bloc 42/B: every league has a slot, so any of them can be filled in from
  // the admin — AGENTS.md requires unconfirmed data to stay editable with a
  // default value. Bloc 98/A: {0, 0} is that default, and it is what marks a
  // league as not yet confirmed (see hasLevelUpTroopsFormula below).
  troops: Record<League, { coefficient: number; ratio: number }>;
  maxLevel: number;
  columnSize: number;
  pageSize: number;
  chestInterval: number;
};

export const defaultLevelUpParameters: LevelUpParameters = {
  xp: { base: 50, ratio: 1.3 },
  troops: {
    bronze: { coefficient: 32.2028, ratio: 1.245 },
    silver: { coefficient: 0, ratio: 0 },
    gold: { coefficient: 32.49, ratio: 1.24 },
    platinum: { coefficient: 35.88, ratio: 1.237 },
    diamond: { coefficient: 32.2028, ratio: 1.245 },
    legend: { coefficient: 32.2028, ratio: 1.245 },
  },
  maxLevel: 150,
  columnSize: 30,
  pageSize: 60,
  chestInterval: 10,
};

// Bloc 98/A: which leagues have a troop formula is read from the parameters,
// never from a list of league names. The list that used to sit here — and the
// `league === "silver"` test that used to open levelUpTroopsAt — meant an admin
// could fill in Silver's coefficient and ratio, save them, and still be told by
// the public reference that Silver was unavailable: the values were in the
// database and nothing ever looked at them. Any league an admin fills in now
// simply works, and one that is emptied goes back to unconfirmed on its own.
export function hasLevelUpTroopsFormula(
  league: League,
  parameters: LevelUpParameters = defaultLevelUpParameters,
): boolean {
  const formula = parameters.troops[league];
  // Zero is what an unfilled league carries (see defaultLevelUpParameters) and
  // is also the one value that could never be a real formula: a coefficient of
  // 0 yields 0 troops at every level, a ratio of 0 yields 0 from level 2 on.
  return (
    Number.isFinite(formula?.coefficient) &&
    Number.isFinite(formula?.ratio) &&
    formula.coefficient > 0 &&
    formula.ratio > 0
  );
}

/** The leagues a player can actually consult, in game progression order. */
export function availableLevelUpLeagues(
  parameters: LevelUpParameters = defaultLevelUpParameters,
): League[] {
  return leagues.filter((league) =>
    hasLevelUpTroopsFormula(league, parameters),
  );
}

/**
 * Whether these parameters can be stored as they are.
 *
 * Bloc 98/A: a league's troop pair is either filled in (both > 0) or not known
 * yet (both 0 — the default, and what marks the league unconfirmed for the
 * public reference). The admin route used to demand that EVERY number be > 0,
 * which made the whole Progression reference unsavable for as long as any one
 * league was still blank — on a fresh install, that is Silver, so the very
 * first save an admin attempted came back 400. A half-filled pair is refused
 * too: it is neither a formula nor a blank slot.
 */
export function isSavableLevelUpParameters(
  parameters: LevelUpParameters,
): boolean {
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  if (!positive(parameters.xp.base) || !positive(parameters.xp.ratio))
    return false;
  return Object.values(parameters.troops).every(({ coefficient, ratio }) => {
    if (!Number.isFinite(coefficient) || !Number.isFinite(ratio)) return false;
    if (coefficient < 0 || ratio < 0) return false;
    return (coefficient === 0) === (ratio === 0);
  });
}

export function parseLevelUpParameters(value: unknown): LevelUpParameters {
  if (!value || typeof value !== "object")
    return structuredClone(defaultLevelUpParameters);
  const raw = value as Partial<LevelUpParameters>;
  return {
    xp: {
      base: Number(raw.xp?.base ?? 50),
      ratio: Number(raw.xp?.ratio ?? 1.3),
    },
    troops: Object.fromEntries(
      leagues.map((league) => [
        league,
        {
          coefficient: Number(
            raw.troops?.[league]?.coefficient ??
              defaultLevelUpParameters.troops[league].coefficient,
          ),
          ratio: Number(
            raw.troops?.[league]?.ratio ??
              defaultLevelUpParameters.troops[league].ratio,
          ),
        },
      ]),
    ) as LevelUpParameters["troops"],
    maxLevel: Number(raw.maxLevel ?? 150),
    columnSize: Number(raw.columnSize ?? 30),
    pageSize: Number(raw.pageSize ?? 60),
    chestInterval: Number(raw.chestInterval ?? 10),
  };
}

export function levelUpTroopsAt(
  level: number,
  league: League,
  parameters = defaultLevelUpParameters,
): number | null {
  if (!hasLevelUpTroopsFormula(league, parameters)) return null;
  if (level === 1) return 200;
  const formula = parameters.troops[league];
  return formula.coefficient * formula.ratio ** level;
}

/**
 * The XP needed to LEAVE `level` — the cost of the level -> level+1 step.
 * This is the game's own formula, and the primitive the table is built from;
 * what the table shows per row is levelUpXpToReach below.
 */
export function xpAt(level: number, parameters = defaultLevelUpParameters) {
  return Math.round(parameters.xp.base * parameters.xp.ratio ** (level - 1));
}

/**
 * The XP needed to REACH `level` — the cost of the level-1 -> level step, and
 * `null` at level 1, which nobody pays to arrive at.
 *
 * Bloc 107/B: the Progression table used to put xpAt(N) on row N, i.e. the
 * cost of leaving that level. The values were right and the labelling was
 * inverted: a player reading "niveau 101 : 12,4T" pays 9,54T to get there, and
 * 12,4T only to leave for 102. Reading a row as the price of reaching it is
 * how these tables are read in game, so the column is shifted one row down
 * rather than recomputed — the arithmetic never moved.
 *
 * XP is universal (no league enters into it), and the table renders this one
 * column for every league, so this shift covers the whole reference at once.
 *
 * The prototype is authoritative (AGENTS.md), and it still puts xpAt(n) on row
 * n, so this is a deliberate departure from it: recorded as an approved
 * evolution in docs/cahier-des-charges-ml-helper.md §7.1 and flagged at the
 * prototype's own xpAt.
 */
export function levelUpXpToReach(
  level: number,
  parameters = defaultLevelUpParameters,
): number | null {
  if (level <= 1) return null;
  return xpAt(level - 1, parameters);
}

export function levelUpChestAt(
  level: number,
  parameters = defaultLevelUpParameters,
): number | null {
  if (
    level < parameters.chestInterval ||
    level % parameters.chestInterval !== 0
  )
    return null;
  return (level / parameters.chestInterval - 1) % 5;
}
