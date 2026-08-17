import type { League, SkillKey, TemplarKey } from "./player-settings";

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
  label: string;
  baseGems: number;
  actualStat: number;
  stars: Array<{ stars: number; count: number }>;
};

function distributionLabel(
  stars: Array<{ stars: number; count: number }>,
): string {
  return (
    stars
      .filter(({ count }) => count > 0)
      .map(
        ({ stars: level, count }) =>
          `${count} gemme${count > 1 ? "s" : ""} ${level}★`,
      )
      .join(" + ") || "Aucune gemme"
  );
}

export function optimizeGemTarget(
  target: number,
  value: number,
  slots: number,
): GemDistribution {
  const available = Math.max(0, Math.floor(slots));
  const units = Math.max(0, Math.round(Math.max(0, target) / value));
  if (available === 0 || units === 0)
    return { label: "Aucune gemme", baseGems: 0, actualStat: 0, stars: [] };
  if (units <= available) {
    const stars = [{ stars: 1, count: units }];
    return {
      label: distributionLabel(stars),
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
    label: distributionLabel(stars),
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
      label: distributionLabel(stars),
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
    label: distributionLabel(stars),
    stars,
    baseGems,
    actualStat,
    slotsUsed: available,
    cost,
    remaining: budget - cost,
  };
}

export const templarCosts = [
  150, 195, 254, 330, 428, 557, 724, 941, 1224, 1591, 2068, 2688, 3495, 4543,
  5907, 7678, 9981, 12976, 16868, 21929,
];
export const templarRates: Record<TemplarKey, number> = {
  striker: 0.25,
  guardian: 0.25,
  prosperous: 0.5,
  recruiter: 0.5,
  rusher: 1,
};

export function normalizeTemplarCostRows(
  input: readonly { level: number; cost: number }[],
): number[] {
  const rows = input
    .filter(
      (row) =>
        Number.isFinite(Number(row.level)) && Number.isFinite(Number(row.cost)),
    )
    .sort((a, b) => a.level - b.level);
  if (rows[0]?.level === 0) {
    const migrated =
      Number(rows[0].cost) === 0 ? rows.slice(1, 21) : rows.slice(0, 20);
    return migrated.map((row) => Number(row.cost));
  }
  return rows
    .filter((row) => row.level >= 1 && row.level <= 20)
    .map((row) => Number(row.cost));
}

export function templarCumulativeCost(
  level: number,
  costs: readonly number[] = templarCosts,
): number {
  return costs
    .slice(0, Math.max(0, Math.min(20, Math.floor(level))))
    .reduce((sum, cost) => sum + cost, 0);
}

export function templarUpgradeCost(
  start: number,
  target: number,
  costs: readonly number[] = templarCosts,
): number {
  return Math.abs(
    templarCumulativeCost(target, costs) - templarCumulativeCost(start, costs),
  );
}
