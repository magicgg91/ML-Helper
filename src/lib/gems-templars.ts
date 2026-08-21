import type { League, SkillKey, TemplarKey } from "./player-settings";
import { defaultTemplarParameters, templarLevelCost, type TemplarParameters } from "./templar-parameters";

export type GemLeague = Exclude<League, "bronze">;
export type GemFamily = "attack" | "defense" | "gold" | "speed";

export const gemFamilies: Record<GemFamily, SkillKey[]> = {
  attack: ["striker", "scavenger", "fearless"],
  defense: ["brave", "guardian", "salvager", "cautious"],
  gold: ["prosperous", "recruiter"],
  speed: ["rusher"],
};

const leagueFactor: Record<League, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
  legend: 6,
};
const skillFactor: Record<SkillKey, number> = {
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
};

export function gemValue(skill: SkillKey, league: League): number {
  return skillFactor[skill] * leagueFactor[league];
}

export const gemPrice: Record<GemLeague, number> = {
  silver: 3000,
  gold: 4000,
  platinum: 5000,
  diamond: 6000,
  legend: 7000,
};

export type GemDistribution = {
  baseGems: number;
  actualStat: number;
  stars: Array<{ stars: number; count: number }>;
};

export function optimizeGemTarget(
  target: number,
  value: number,
  slots: number,
): GemDistribution {
  const available = Math.max(0, Math.floor(slots));
  const units = Math.max(0, Math.round(Math.max(0, target) / value));
  if (available === 0 || units === 0)
    return { baseGems: 0, actualStat: 0, stars: [] };
  if (units <= available) {
    const stars = [{ stars: 1, count: units }];
    return {
      baseGems: units,
      actualStat: units * value,
      stars,
    };
  }
  const base = Math.floor(units / available);
  const high = units % available;
  const low = available - high;
  const stars = [
    { stars: base + 1, count: high },
    { stars: base, count: low },
  ].filter(({ count }) => count > 0);
  const baseGems = stars.reduce(
    (sum, item) => sum + item.count * 2 ** (item.stars - 1),
    0,
  );
  return {
    baseGems,
    actualStat: units * value,
    stars,
  };
}

export function optimizeGemBudget(
  budget: number,
  price: number,
  value: number,
  slots: number,
) {
  const available = Math.max(1, Math.min(27, Math.floor(slots)));
  const affordable = Math.max(0, Math.floor(Math.max(0, budget) / price));
  if (affordable === 0)
    return {
      ...optimizeGemTarget(0, value, available),
      slotsUsed: 0,
      cost: 0,
      remaining: Math.max(0, budget),
    };
  if (affordable <= available) {
    const stars = [{ stars: 1, count: affordable }];
    const cost = affordable * price;
    return {
      stars,
      baseGems: affordable,
      actualStat: affordable * value,
      slotsUsed: affordable,
      cost,
      remaining: budget - cost,
    };
  }
  let base = 1;
  while (available * 2 ** base <= affordable) base += 1;
  const lowerCost = 2 ** (base - 1);
  const high = Math.min(
    available,
    Math.floor((affordable - available * lowerCost) / lowerCost),
  );
  const low = available - high;
  const stars = [
    { stars: base + 1, count: high },
    { stars: base, count: low },
  ].filter(({ count }) => count > 0);
  const baseGems = stars.reduce(
    (sum, item) => sum + item.count * 2 ** (item.stars - 1),
    0,
  );
  const cost = baseGems * price;
  const actualStat = stars.reduce(
    (sum, item) => sum + item.count * item.stars * value,
    0,
  );
  return {
    stars,
    baseGems,
    actualStat,
    slotsUsed: available,
    cost,
    remaining: budget - cost,
  };
}

export const templarRates: Record<TemplarKey, number> = {
  striker: 0.25,
  guardian: 0.25,
  prosperous: 0.5,
  recruiter: 0.5,
  rusher: 1,
};

export function templarCumulativeCost(
  level: number,
  parameters: TemplarParameters = defaultTemplarParameters,
): number {
  return Array.from({ length: Math.max(0, Math.min(20, Math.floor(level))) }, (_, index) =>
    templarLevelCost(index + 1, parameters),
  ).reduce((sum, cost) => sum + cost, 0);
}

export function templarUpgradeCost(
  start: number,
  target: number,
  parameters: TemplarParameters = defaultTemplarParameters,
): number {
  return Math.abs(
    templarCumulativeCost(target, parameters) - templarCumulativeCost(start, parameters),
  );
}
