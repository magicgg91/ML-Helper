import {
  availableSkillPoints,
  skillPointMeta,
  type League,
} from "./player-settings";
import { defaultCityParameters, type CityParameters } from "./city-parameters";

export const CITY_LEVEL_MAX = 200;

export type CityStats = {
  vp: number;
  wall: number;
  gold: number;
  army: number;
};

export function vpAt(
  level: number,
  parameters: CityParameters = defaultCityParameters,
): number {
  return parameters.vp.base * parameters.vp.ratio ** (Math.max(1, level) - 1);
}

export function wallAt(
  level: number,
  parameters: CityParameters = defaultCityParameters,
): number {
  return (
    parameters.walls.base * parameters.walls.ratio ** (Math.max(1, level) - 1)
  );
}

export function upgradeCostAt(
  level: number,
  parameters: CityParameters = defaultCityParameters,
): number {
  if (level <= 1) return 0;
  return level === 2
    ? parameters.cost.base
    : parameters.cost.base * parameters.cost.ratio ** (level - 2);
}

export function cumulativeCostAt(
  level: number,
  parameters: CityParameters = defaultCityParameters,
): number {
  let total = 0;
  for (let current = 1; current <= Math.floor(level); current += 1) {
    total += upgradeCostAt(current, parameters);
  }
  return total;
}

export function cityStatsAt(
  level: number,
  league: League = "legend",
  parameters: CityParameters = defaultCityParameters,
): CityStats {
  const vp = vpAt(level, parameters);
  const multipliers = parameters.multipliers[league];
  return {
    vp,
    wall: wallAt(level, parameters),
    gold: vp * multipliers.gold,
    army: vp * multipliers.army,
  };
}

export function cityUpgradeCost(
  startLevel: number,
  targetLevel: number,
  parameters: CityParameters = defaultCityParameters,
): number {
  return Math.max(
    0,
    cumulativeCostAt(targetLevel, parameters) -
      cumulativeCostAt(startLevel, parameters),
  );
}

export function maximumReachableLevel(
  startLevel: number,
  cityCount: number,
  goldBudget: number,
  parameters: CityParameters = defaultCityParameters,
): { level: number; spent: number; remaining: number } {
  const start = Math.min(CITY_LEVEL_MAX, Math.max(1, Math.floor(startLevel)));
  const count = Math.max(1, Math.floor(cityCount));
  const budget = Math.max(0, goldBudget);
  let level = start;

  while (level < CITY_LEVEL_MAX) {
    const nextCost = cityUpgradeCost(start, level + 1, parameters) * count;
    if (nextCost > budget) break;
    level += 1;
  }

  const spent = cityUpgradeCost(start, level, parameters) * count;
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

export function calculateProduction(
  input: {
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
  },
  parameters: CityParameters = defaultCityParameters,
): ProductionResult {
  const count = Math.max(1, Math.floor(input.cityCount));
  const perCity = cityStatsAt(input.cityLevel, input.league, parameters);
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
