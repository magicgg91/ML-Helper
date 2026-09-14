import { leagues, skillKeys, type League, type SkillKey } from "./player-settings";

export type GemLeague = Exclude<League, "bronze">;
export const gemLeagues: GemLeague[] = leagues.filter(
  (league): league is GemLeague => league !== "bronze",
);

// One independent value per skill/league cell (cdc + AGENTS.md "le prototype
// fait foi": ported as-is from the prototype's GEM_VALUES_FR, not factored
// into a skill factor × league factor model — a factored model can't express
// an isolated per-cell correction).
export type GemParameters = {
  skillLeagueValue: Record<SkillKey, Record<League, number>>;
  gemPrice: Record<GemLeague, number>;
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
    gemPrice: Object.fromEntries(
      gemLeagues.map((league) => [
        league,
        positive(
          source.gemPrice?.[league],
          defaultGemParameters.gemPrice[league],
        ),
      ]),
    ) as Record<GemLeague, number>,
  };
}
