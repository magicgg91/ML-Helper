export const leagues = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legend",
] as const;

export type League = (typeof leagues)[number];
export type LeagueSelection = League | "";

export const skillKeys = [
  "striker",
  "brave",
  "scavenger",
  "guardian",
  "fearless",
  "prosperous",
  "recruiter",
  "cautious",
  "salvager",
  "rusher",
] as const;

export type SkillKey = (typeof skillKeys)[number];

export const templarKeys = [
  "striker",
  "guardian",
  "prosperous",
  "recruiter",
  "rusher",
] as const;

export type TemplarKey = (typeof templarKeys)[number];
export type NumberMap<Key extends string> = Record<Key, number>;

type Prerequisite =
  | { skill: SkillKey; min: number }
  | { orSkills: ReadonlyArray<{ skill: SkillKey; min: number }> };

type SkillPointMeta = {
  bonus: number;
  cap: number | { legend: number; default: number } | null;
  baseByLeague: Partial<Record<League, number>> | null;
  prerequisite: Prerequisite | null;
};

export const leaguePointsPerLevel: Record<League, number> = {
  bronze: 1,
  silver: 1,
  gold: 1,
  platinum: 2,
  diamond: 2,
  legend: 2,
};

export const skillPointMeta: Record<SkillKey, SkillPointMeta> = {
  striker: { bonus: 2, cap: null, baseByLeague: null, prerequisite: null },
  guardian: { bonus: 3, cap: null, baseByLeague: null, prerequisite: null },
  scavenger: {
    bonus: 2,
    cap: null,
    baseByLeague: null,
    prerequisite: { skill: "striker", min: 5 },
  },
  salvager: {
    bonus: 1,
    cap: null,
    baseByLeague: null,
    prerequisite: { skill: "guardian", min: 5 },
  },
  prosperous: { bonus: 3, cap: null, baseByLeague: null, prerequisite: null },
  cautious: {
    bonus: 1,
    cap: 50,
    baseByLeague: null,
    prerequisite: { skill: "prosperous", min: 10 },
  },
  recruiter: { bonus: 3, cap: null, baseByLeague: null, prerequisite: null },
  rusher: {
    bonus: 5,
    cap: null,
    baseByLeague: null,
    prerequisite: { skill: "recruiter", min: 10 },
  },
  fearless: {
    bonus: 1,
    cap: { legend: 75, default: 90 },
    baseByLeague: {
      bronze: 50,
      silver: 50,
      gold: 33,
      platinum: 1,
      diamond: 1,
      legend: 1,
    },
    prerequisite: {
      orSkills: [
        { skill: "recruiter", min: 5 },
        { skill: "striker", min: 5 },
      ],
    },
  },
  brave: {
    bonus: 1,
    cap: { legend: 75, default: 90 },
    baseByLeague: {
      bronze: 50,
      silver: 50,
      gold: 33,
      platinum: 1,
      diamond: 1,
      legend: 1,
    },
    prerequisite: {
      orSkills: [
        { skill: "guardian", min: 5 },
        { skill: "recruiter", min: 5 },
      ],
    },
  },
};

export const emptySkills = (): NumberMap<SkillKey> =>
  Object.fromEntries(skillKeys.map((key) => [key, 0])) as NumberMap<SkillKey>;

export const emptyTemplars = (): NumberMap<TemplarKey> =>
  Object.fromEntries(
    templarKeys.map((key) => [key, 0]),
  ) as NumberMap<TemplarKey>;

export const clanTempleMinimums: NumberMap<TemplarKey> = {
  striker: 20,
  guardian: 30,
  prosperous: 30,
  recruiter: 30,
  rusher: 50,
};

export type PlayerSettings = {
  level: number;
  league: LeagueSelection;
  vp: number;
  vpUnit: 1 | 1_000 | 1_000_000 | 1_000_000_000;
  equipmentSkills: NumberMap<SkillKey>;
  skillPoints: NumberMap<SkillKey>;
  templars: NumberMap<TemplarKey>;
  clanTemple: NumberMap<TemplarKey>;
};

export const defaultPlayerSettings = (): PlayerSettings => ({
  level: 1,
  league: "",
  vp: 0,
  vpUnit: 1_000_000,
  equipmentSkills: emptySkills(),
  skillPoints: emptySkills(),
  templars: emptyTemplars(),
  clanTemple: { ...clanTempleMinimums },
});

export function availableSkillPoints(
  level: number,
  league: LeagueSelection,
): number {
  return league
    ? Math.max(0, Math.floor(level) - 1) * leaguePointsPerLevel[league]
    : 0;
}

export function allocatedSkillPoints(points: NumberMap<SkillKey>): number {
  return skillKeys.reduce((total, key) => total + points[key], 0);
}

function prerequisiteSatisfied(
  prerequisite: Prerequisite,
  points: NumberMap<SkillKey>,
): boolean {
  if ("orSkills" in prerequisite) {
    return prerequisite.orSkills.some(({ skill, min }) => points[skill] >= min);
  }
  return points[prerequisite.skill] >= prerequisite.min;
}

export function skillPrerequisiteSatisfied(
  key: SkillKey,
  points: NumberMap<SkillKey>,
): boolean {
  const prerequisite = skillPointMeta[key].prerequisite;
  return prerequisite ? prerequisiteSatisfied(prerequisite, points) : true;
}

export function allocateSkillPoints(
  current: NumberMap<SkillKey>,
  key: SkillKey,
  requested: number,
  level: number,
  league: LeagueSelection,
): NumberMap<SkillKey> {
  const next = { ...current, [key]: Math.max(0, Math.floor(requested)) };
  const budget = availableSkillPoints(level, league);
  const prerequisite = skillPointMeta[key].prerequisite;

  if (
    prerequisite &&
    next[key] > 0 &&
    !prerequisiteSatisfied(prerequisite, next)
  ) {
    const target =
      "orSkills" in prerequisite ? prerequisite.orSkills[0] : prerequisite;
    const others = skillKeys.reduce(
      (total, candidate) =>
        candidate === key || candidate === target.skill
          ? total
          : total + next[candidate],
      0,
    );
    const sharedBudget = Math.max(0, budget - others);
    if (sharedBudget < target.min) {
      next[target.skill] = sharedBudget;
      next[key] = 0;
    } else {
      next[target.skill] = target.min;
    }
  }

  const overflow = allocatedSkillPoints(next) - budget;
  if (overflow > 0) next[key] = Math.max(0, next[key] - overflow);
  return next;
}

export function fitSkillPointsToBudget(
  current: NumberMap<SkillKey>,
  level: number,
  league: LeagueSelection,
): NumberMap<SkillKey> {
  const next = { ...current };
  let overflow =
    allocatedSkillPoints(next) - availableSkillPoints(level, league);
  for (const key of [...skillKeys].reverse()) {
    if (overflow <= 0) break;
    const removed = Math.min(next[key], overflow);
    next[key] -= removed;
    overflow -= removed;
  }
  return next;
}

// Plafond confirmé (cdc section 7.1) : 50% pour Récupération, 90% pour
// Intrépide/Bravoure (75% en Légende), aucun plafond pour les 7 autres.
// Source unique pour tout total affiché ou calculé à partir d'une
// compétence — bloc "Points de compétence", résumé replié, champ
// "Statistiques données par l'équipement", et tout calculateur qui
// consommerait ces stats.
export function skillCapForLeague(
  key: SkillKey,
  league: LeagueSelection,
): number | undefined {
  const cap = skillPointMeta[key].cap;
  if (cap === null) return undefined;
  if (typeof cap === "number") return cap;
  return league === "legend" ? cap.legend : cap.default;
}

export function skillPercent(
  key: SkillKey,
  points: NumberMap<SkillKey>,
  league: LeagueSelection,
): number {
  const meta = skillPointMeta[key];
  const base = league ? (meta.baseByLeague?.[league] ?? 0) : 0;
  const raw = base + points[key] * meta.bonus;
  const cap = skillCapForLeague(key, league);
  return cap === undefined ? raw : Math.min(raw, cap);
}

export function combinedSkillPercent(
  key: SkillKey,
  settings: Pick<PlayerSettings, "equipmentSkills" | "skillPoints" | "league">,
): number {
  const total =
    settings.equipmentSkills[key] +
    skillPercent(key, settings.skillPoints, settings.league);
  const cap = skillCapForLeague(key, settings.league);
  return cap === undefined ? total : Math.min(total, cap);
}
