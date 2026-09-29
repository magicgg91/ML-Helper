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

const leaguePointsPerLevel: Record<League, number> = {
  bronze: 1,
  silver: 1,
  gold: 1,
  platinum: 1,
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

// Base de temple confirmée par statistique (cdc section 7.1). Ce bonus
// s'applique automatiquement, en plus de la contribution des Templiers
// du clan saisie par le joueur : Bonus_total = base + clan saisi.
export const templeBase: NumberMap<TemplarKey> = {
  striker: 20,
  guardian: 30,
  prosperous: 30,
  recruiter: 30,
  rusher: 50,
};

export type PlayerSettings = {
  level: number;
  league: LeagueSelection;
  /**
   * Bloc 108/E: the id of the ranking ladder entry the player sits on, when
   * their league is split into divisions. Deliberately separate from `league`
   * above: that one is the enum every other tool reads (Gemmes, Équipement,
   * Templiers, Boutique) and is untouched by divisions. Empty when the player
   * has not picked one, or when their league has no division configured.
   */
  division: string;
  vp: number;
  /**
   * Bloc 123 : l'unité dans laquelle le joueur saisit ses VP. Le téra rejoint
   * la liste avec le correctif d'affichage — l'échelle du site est k/M/G/T
   * (AGENTS.md), et le champ s'arrêtait au giga.
   */
  vpUnit: 1 | 1_000 | 1_000_000 | 1_000_000_000 | 1_000_000_000_000;
  equipmentSkills: NumberMap<SkillKey>;
  skillPoints: NumberMap<SkillKey>;
  templars: NumberMap<TemplarKey>;
  clanTemple: NumberMap<TemplarKey>;
  /**
   * Bloc 144 : le joueur compte-t-il ses temples dans les calculs ?
   *
   * Un seul drapeau, rangé avec les autres paramètres du joueur, donc partagé
   * par tous les outils qui lisent le bandeau : l'éteindre dans la Production
   * l'éteint dans le Coût de ville. Vrai par défaut — c'est l'état que le site
   * a toujours eu, et une sauvegarde d'avant ce bloc n'en porte rien.
   *
   * Il ne touche pas aux valeurs saisies : `clanTemple` garde ce que le joueur
   * a tapé pendant que les temples étaient exclus, et le réactiver le lui rend
   * tel quel.
   */
  includeTemples: boolean;
};

export const defaultPlayerSettings = (): PlayerSettings => ({
  level: 1,
  league: "",
  division: "",
  vp: 0,
  vpUnit: 1_000_000,
  equipmentSkills: emptySkills(),
  skillPoints: emptySkills(),
  templars: emptyTemplars(),
  clanTemple: emptyTemplars(),
  includeTemples: true,
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

/**
 * La contribution de temple d'une compétence, telle que les calculs doivent la
 * compter.
 *
 * Le champ « Temples » ne porte que la contribution du clan ; la base de temple
 * confirmée par compétence (cdc section 7.1) s'y ajoute automatiquement.
 *
 * Bloc 144 : et c'est ICI, en un seul endroit, que l'interrupteur « Temples »
 * s'applique — zéro quand le joueur les exclut. La fonction prend donc les
 * paramètres plutôt que la seule carte `clanTemple` : changer sa signature a
 * fait remonter au compilateur chacun de ses appelants, ce qu'une lecture du
 * drapeau ajoutée outil par outil n'aurait pas garanti.
 *
 * Pour afficher ce que vaudraient les temples s'ils comptaient — le « = X% »
 * barré du bandeau — on l'appelle avec `includeTemples: true` explicite plutôt
 * que d'entretenir une seconde formule à côté.
 */
export function templePercent(
  key: TemplarKey,
  settings: Pick<PlayerSettings, "clanTemple" | "includeTemples">,
): number {
  if (!settings.includeTemples) return 0;
  return templeBase[key] + settings.clanTemple[key];
}

export type TempleSkillBreakdown = {
  equipment: number;
  points: number;
  temple: number;
  total: number;
};

// The 5 temple-affected skills add a third component (temple base +
// clan contribution) before the league cap is applied to the final
// total — never to the individual components.
export function templeSkillBreakdown(
  key: TemplarKey,
  settings: Pick<
    PlayerSettings,
    | "equipmentSkills"
    | "skillPoints"
    | "clanTemple"
    | "league"
    | "includeTemples"
  >,
): TempleSkillBreakdown {
  const equipment = settings.equipmentSkills[key];
  const points = skillPercent(key, settings.skillPoints, settings.league);
  const temple = templePercent(key, settings);
  const rawTotal = equipment + points + temple;
  const cap = skillCapForLeague(key, settings.league);
  return {
    equipment,
    points,
    temple,
    total: cap === undefined ? rawTotal : Math.min(rawTotal, cap),
  };
}
