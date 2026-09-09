export const cityLeagues = ["bronze", "silver", "gold", "platinum", "diamond", "legend"] as const;
export type CityLeague = (typeof cityLeagues)[number];

export type CityParameters = {
  vp: { base: number; ratio: number };
  walls: { base: number; ratio: number };
  cost: { base: number; ratio: number };
  multipliers: Record<CityLeague, { army: number; gold: number }>;
};

export const defaultCityParameters: CityParameters = {
  vp: { base: 20, ratio: 1.115 },
  walls: { base: 70, ratio: 1.2 },
  cost: { base: 10, ratio: 1.2 },
  multipliers: {
    bronze: { army: 2, gold: 5 }, silver: { army: 2.25, gold: 6.25 },
    gold: { army: 2.75, gold: 8.75 }, platinum: { army: 2.75, gold: 8.75 },
    diamond: { army: 3, gold: 10 }, legend: { army: 3, gold: 10 },
  },
};

export function parseCityParameters(value: unknown): CityParameters {
  if (!value || typeof value !== "object") return structuredClone(defaultCityParameters);
  const source = value as Partial<CityParameters>;
  const finite = (candidate: unknown, fallback: number) => Number.isFinite(Number(candidate)) ? Number(candidate) : fallback;
  return {
    vp: { base: finite(source.vp?.base, 20), ratio: finite(source.vp?.ratio, 1.115) },
    walls: { base: finite(source.walls?.base, 70), ratio: finite(source.walls?.ratio, 1.2) },
    cost: { base: finite(source.cost?.base, 10), ratio: finite(source.cost?.ratio, 1.2) },
    multipliers: Object.fromEntries(cityLeagues.map((league) => [league, {
      army: finite(source.multipliers?.[league]?.army, defaultCityParameters.multipliers[league].army),
      gold: finite(source.multipliers?.[league]?.gold, defaultCityParameters.multipliers[league].gold),
    }])) as CityParameters["multipliers"],
  };
}

