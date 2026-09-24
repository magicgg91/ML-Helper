import { leagues, skillKeys, type League, type SkillKey } from "./player-settings";

export type GemLeague = Exclude<League, "bronze">;
export const gemLeagues: GemLeague[] = leagues.filter(
  (league): league is GemLeague => league !== "bronze",
);

/**
 * What one gem costs, by league.
 *
 * Bloc 126/B: Bronze is here too, and it is the one league whose price may be
 * missing. The game has no Bronze gem shop today — which is why the public
 * reference has always printed a dash there — so the price is `null` until
 * somebody types one in. It is a slot rather than an absent key so that every
 * reader gets `null` and none has to reason about `undefined`; the admin
 * shows it as an empty field, and the day the studio opens a Bronze shop,
 * filling that field is the whole change.
 */
export type GemPrices = Record<GemLeague, number> & { bronze: number | null };

// One independent value per skill/league cell (cdc + AGENTS.md "le prototype
// fait foi": ported as-is from the prototype's GEM_VALUES_FR, not factored
// into a skill factor × league factor model — a factored model can't express
// an isolated per-cell correction).
export type GemParameters = {
  skillLeagueValue: Record<SkillKey, Record<League, number>>;
  gemPrice: GemPrices;
};

export const defaultGemParameters: GemParameters = {
  skillLeagueValue: {
    striker: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
    brave: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
    scavenger: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
    guardian: {
      bronze: 1.5,
      silver: 3,
      gold: 4.5,
      platinum: 6,
      diamond: 7.5,
      legend: 9,
    },
    fearless: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
    prosperous: {
      bronze: 1.5,
      silver: 3,
      gold: 4.5,
      platinum: 6,
      diamond: 7.5,
      legend: 9,
    },
    recruiter: {
      bronze: 1.5,
      silver: 3,
      gold: 4.5,
      platinum: 6,
      diamond: 7.5,
      legend: 9,
    },
    cautious: {
      bronze: 0.5,
      silver: 1,
      gold: 1.5,
      platinum: 2,
      diamond: 2.5,
      legend: 3,
    },
    salvager: {
      bronze: 0.5,
      silver: 1,
      gold: 1.5,
      platinum: 2,
      diamond: 2.5,
      legend: 3,
    },
    rusher: {
      bronze: 2.5,
      silver: 5,
      gold: 7.5,
      platinum: 10,
      diamond: 12.5,
      legend: 15,
    },
  },
  gemPrice: {
    bronze: null,
    silver: 3000,
    gold: 4000,
    platinum: 5000,
    diamond: 6000,
    legend: 7000,
  },
};

export function parseGemParameters(value: unknown): GemParameters {
  if (!value || typeof value !== "object")
    return structuredClone(defaultGemParameters);
  const source = value as Partial<GemParameters>;
  const positive = (candidate: unknown, fallback: number) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const optionalPositive = (candidate: unknown): number | null => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  return {
    skillLeagueValue: Object.fromEntries(
      skillKeys.map((skill) => [
        skill,
        Object.fromEntries(
          leagues.map((league) => [
            league,
            positive(
              source.skillLeagueValue?.[skill]?.[league],
              defaultGemParameters.skillLeagueValue[skill][league],
            ),
          ]),
        ) as Record<League, number>,
      ]),
    ) as Record<SkillKey, Record<League, number>>,
    gemPrice: {
      ...(Object.fromEntries(
        gemLeagues.map((league) => [
          league,
          positive(
            source.gemPrice?.[league],
            defaultGemParameters.gemPrice[league],
          ),
        ]),
      ) as Record<GemLeague, number>),
      // Bloc 126/B: Bronze is the one price that is allowed to be missing, so
      // it has no default to fall back on. Anything that is not a usable
      // price — absent, blank, zero, negative, not a number — reads back as
      // "no Bronze price", which is the empty field the admin sees and the
      // dash the public page prints.
      bronze: optionalPositive(source.gemPrice?.bronze),
    },
  };
}
