import { leagues, type League, type SkillKey } from "./player-settings";

export type GemLeague = Exclude<League, "bronze">;
export const gemLeagues: GemLeague[] = leagues.filter(
  (league): league is GemLeague => league !== "bronze",
);

export type GemParameters = {
  skillFactor: Record<SkillKey, number>;
  leagueFactor: Record<League, number>;
  gemPrice: Record<GemLeague, number>;
};

export const defaultGemParameters: GemParameters = {
  skillFactor: {
    striker: 1,
    brave: 1,
    scavenger: 1,
    guardian: 1.5,
    fearless: 1,
    prosperous: 1.5,
    recruiter: 1.5,
    cautious: 0.5,
    salvager: 0.5,
    rusher: 2.5,
  },
  leagueFactor: {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
    diamond: 5,
    legend: 6,
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
  const finite = (candidate: unknown, fallback: number) =>
    Number.isFinite(Number(candidate)) ? Number(candidate) : fallback;
  return {
    skillFactor: Object.fromEntries(
      Object.keys(defaultGemParameters.skillFactor).map((skill) => [
        skill,
        finite(
          source.skillFactor?.[skill as SkillKey],
          defaultGemParameters.skillFactor[skill as SkillKey],
        ),
      ]),
    ) as Record<SkillKey, number>,
    leagueFactor: Object.fromEntries(
      leagues.map((league) => [
        league,
        finite(
          source.leagueFactor?.[league],
          defaultGemParameters.leagueFactor[league],
        ),
      ]),
    ) as Record<League, number>,
    gemPrice: Object.fromEntries(
      gemLeagues.map((league) => [
        league,
        finite(
          source.gemPrice?.[league],
          defaultGemParameters.gemPrice[league],
        ),
      ]),
    ) as Record<GemLeague, number>,
  };
}
