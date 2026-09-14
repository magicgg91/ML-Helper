import { wallAt } from "./city-calculators";
import { defaultCityParameters, type CityParameters } from "./city-parameters";
import type { League } from "./player-settings";

export type XpMode = "attacker" | "target";
export type XpTier = { low: number; high: number | null; rate: number };

export const defaultXpTiers: XpTier[] = [
  { low: 0, high: 40, rate: 0 },
  { low: 40, high: 50, rate: 50 },
  { low: 50, high: 150, rate: 100 },
  { low: 150, high: 200, rate: 150 },
  { low: 200, high: null, rate: 200 },
];

export const defaultDemoPercentages: Record<League, number> = {
  bronze: 100,
  silver: 50,
  gold: 40,
  platinum: 40,
  diamond: 30,
  legend: 30,
};

export function parseXpTiers(value: unknown): XpTier[] {
  if (!value || typeof value !== "object" || !("tiers" in value))
    return structuredClone(defaultXpTiers);
  const tiers = (value as { tiers?: unknown }).tiers;
  if (!Array.isArray(tiers) || tiers.length !== 5)
    return structuredClone(defaultXpTiers);
  return tiers.map((tier, index) => {
    const candidate = tier as Partial<XpTier>;
    return {
      low: Number(candidate.low ?? defaultXpTiers[index].low),
      high:
        candidate.high === null
          ? null
          : Number(candidate.high ?? defaultXpTiers[index].high),
      rate: Number(candidate.rate ?? defaultXpTiers[index].rate),
    };
  });
}

export function parseDemoPercentages(value: unknown): Record<League, number> {
  const percentages =
    value && typeof value === "object" && "percentages" in value
      ? (value as { percentages?: unknown }).percentages
      : undefined;
  if (!percentages || typeof percentages !== "object")
    return { ...defaultDemoPercentages };
  return Object.fromEntries(
    Object.entries(defaultDemoPercentages).map(([league, fallback]) => [
      league,
      Number((percentages as Record<string, unknown>)[league] ?? fallback),
    ]),
  ) as Record<League, number>;
}

export function xpRateForRatio(ratio: number, tiers = defaultXpTiers) {
  return tiers.find(
    ({ low, high }) => ratio >= low && (high === null || ratio < high),
  )?.rate;
}

export type XpOpponentRange = XpTier & {
  minimum: number;
  maximum: number | null;
};

export function xpOpponentRanges(
  ownVp: number,
  mode: XpMode,
  tiers = defaultXpTiers,
): XpOpponentRange[] {
  const vp = Math.max(0, ownVp);
  return tiers.map((tier) => {
    if (mode === "attacker") {
      return {
        ...tier,
        minimum: (tier.low / 100) * vp,
        maximum: tier.high === null ? null : (tier.high / 100) * vp,
      };
    }
    return {
      ...tier,
      minimum: tier.high === null ? 0 : vp / (tier.high / 100),
      maximum: tier.low === 0 ? null : vp / (tier.low / 100),
    };
  });
}

export function demoAttackTroops(
  cityLevel: number,
  league: League,
  cityParameters: CityParameters = defaultCityParameters,
  percentages = defaultDemoPercentages,
) {
  const wall = wallAt(cityLevel, cityParameters);
  return {
    wall,
    percentage: percentages[league],
    troops: (wall * percentages[league]) / 100,
  };
}
