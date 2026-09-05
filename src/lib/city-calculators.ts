import {
  availableSkillPoints,
  skillPointMeta,
  type League,
} from "./player-settings";
import { defaultCityParameters, type CityParameters } from "./city-parameters";

const CITY_LEVEL_MAX = 200;

export type CityStats = {
  vp: number;
  wall: number;
  gold: number;
  army: number;
};

function vpAt(
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

export type BonusBreakdown = {
  base: number;
  stuff: number;
  temple: number;
  total: number;
};

// Décomposition base/stuff/temple partagée entre Production et les
// résultats Coût/Niveau Max (cdc: réutiliser le pattern Production
// plutôt que de le dupliquer par calculateur).
export function bonusBreakdown(
  base: number,
  equipmentPercent: number,
  templePercent: number,
): BonusBreakdown {
  const stuff = base * (Math.max(0, equipmentPercent) / 100);
  const temple = base * (Math.max(0, templePercent) / 100);
  return { base, stuff, temple, total: base + stuff + temple };
}

export type ProductionResult = {
  perCity: CityStats;
  vpTotal: number;
  gold: BonusBreakdown;
  troops: BonusBreakdown;
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
  },
  parameters: CityParameters = defaultCityParameters,
): ProductionResult {
  const count = Math.max(1, Math.floor(input.cityCount));
  const perCity = cityStatsAt(input.cityLevel, input.league, parameters);
  const goldBase = perCity.gold * count;
  const troopsBase = perCity.army * count;
  const gold = bonusBreakdown(
    goldBase,
    input.prosperousEquipment,
    input.prosperousTemple,
  );
  const troops = bonusBreakdown(
    troopsBase,
    input.recruiterEquipment,
    input.recruiterTemple,
  );
  const points = availableSkillPoints(input.playerLevel, input.league);
  const fullProsperous = points * skillPointMeta.prosperous.bonus;
  const fullRecruiter = points * skillPointMeta.recruiter.bonus;

  return {
    perCity,
    vpTotal: perCity.vp * count,
    gold,
    troops,
    fullProduction: {
      points,
      gold: goldBase * (1 + fullProsperous / 100),
      troops: troopsBase * (1 + fullRecruiter / 100),
    },
  };
}

// Calculateur autonome "Récompenses de Production" (bloc 18) — la
// production de base est désormais saisie directement par le joueur
// (plus dérivée du nombre de villes/niveau), mais la formule reste
// inchangée : bonus = production_base × heures_reçues (cdc section 7.1).
export function calculateReward(base: number, hours: number): number {
  return base * hours;
}
