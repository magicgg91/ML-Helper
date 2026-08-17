import {
  availableSkillPoints,
  skillPointMeta,
  type League,
} from "./player-settings";

export const CITY_LEVEL_MAX = 200;

export type CityStats = {
  vp: number;
  wall: number;
  gold: number;
  army: number;
};

export function vpAt(level: number): number {
  return 20 * 1.115 ** (Math.max(1, level) - 1);
}

export function wallAt(level: number): number {
  return 70 * 1.2 ** (Math.max(1, level) - 1);
}

export function upgradeCostAt(level: number): number {
  if (level <= 1) return 0;
  return level === 2 ? 10 : 10 * 1.2 ** (level - 2);
}

export function cumulativeCostAt(level: number): number {
  let total = 0;
  for (let current = 1; current <= Math.floor(level); current += 1) {
    total += upgradeCostAt(current);
  }
  return total;
}

export function cityStatsAt(level: number): CityStats {
  const vp = vpAt(level);
  return { vp, wall: wallAt(level), gold: vp * 10, army: vp * 3 };
}

export function cityUpgradeCost(
  startLevel: number,
  targetLevel: number,
): number {
  return Math.max(
    0,
    cumulativeCostAt(targetLevel) - cumulativeCostAt(startLevel),
  );
}

export function maximumReachableLevel(
  startLevel: number,
  cityCount: number,
  goldBudget: number,
): { level: number; spent: number; remaining: number } {
  const start = Math.min(CITY_LEVEL_MAX, Math.max(1, Math.floor(startLevel)));
  const count = Math.max(1, Math.floor(cityCount));
  const budget = Math.max(0, goldBudget);
  let level = start;

  while (level < CITY_LEVEL_MAX) {
    const nextCost = cityUpgradeCost(start, level + 1) * count;
    if (nextCost > budget) break;
    level += 1;
  }

  const spent = cityUpgradeCost(start, level) * count;
  return { level, spent, remaining: budget - spent };
}

export type ProductionResult = {
  perCity: CityStats;
  vpTotal: number;
  gold: { total: number; base: number; stuff: number; temple: number };
  troops: { total: number; base: number; stuff: number; temple: number };
  rewards: { gold: number; troops: number };
  fullProduction: { gold: number; troops: number; points: number };
};

export function calculateProduction(input: {
  cityCount: number;
  cityLevel: number;
  playerLevel: number;
  league: League;
  prosperousEquipment: number;
  recruiterEquipment: number;
  prosperousTemple: number;
  recruiterTemple: number;
  goldRewardHours: number;
  troopsRewardHours: number;
}): ProductionResult {
  const count = Math.max(1, Math.floor(input.cityCount));
  const perCity = cityStatsAt(input.cityLevel);
  const goldBase = perCity.gold * count;
  const troopsBase = perCity.army * count;
  const goldStuff = goldBase * (Math.max(0, input.prosperousEquipment) / 100);
  const goldTemple = goldBase * (Math.max(0, input.prosperousTemple) / 100);
  const troopsStuff =
    troopsBase * (Math.max(0, input.recruiterEquipment) / 100);
  const troopsTemple = troopsBase * (Math.max(0, input.recruiterTemple) / 100);
  const points = availableSkillPoints(input.playerLevel, input.league);
  const fullProsperous = points * skillPointMeta.prosperous.bonus;
  const fullRecruiter = points * skillPointMeta.recruiter.bonus;

  return {
    perCity,
    vpTotal: perCity.vp * count,
    gold: {
      base: goldBase,
      stuff: goldStuff,
      temple: goldTemple,
      total: goldBase + goldStuff + goldTemple,
    },
    troops: {
      base: troopsBase,
      stuff: troopsStuff,
      temple: troopsTemple,
      total: troopsBase + troopsStuff + troopsTemple,
    },
    rewards: {
      gold: goldBase * Math.max(0, input.goldRewardHours),
      troops: troopsBase * Math.max(0, input.troopsRewardHours),
    },
    fullProduction: {
      points,
      gold: goldBase * (1 + fullProsperous / 100),
      troops: troopsBase * (1 + fullRecruiter / 100),
    },
  };
}

export function formatGameNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const absolute = Math.abs(rounded);
  const units = [
    { threshold: 1e15, suffix: "P" },
    { threshold: 1e12, suffix: "T" },
    { threshold: 1e9, suffix: "G" },
    { threshold: 1e6, suffix: "M" },
    { threshold: 1e3, suffix: "k" },
  ];
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (absolute < unit.threshold) continue;
    let compact = absolute / unit.threshold;
    if (compact >= 999.995 && index > 0) {
      const next = units[index - 1];
      compact = absolute / next.threshold;
      return `${rounded < 0 ? "-" : ""}${compact.toFixed(2).replace(/\.?0+$/, "")}${next.suffix}`;
    }
    return `${rounded < 0 ? "-" : ""}${compact.toFixed(2).replace(/\.?0+$/, "")}${unit.suffix}`;
  }
  return Math.round(rounded).toLocaleString("fr-FR");
}
