import type { League } from "./player-settings";

export const confirmedLevelUpLeagues = [
  "bronze",
  "gold",
  "platinum",
  "diamond",
  "legend",
] as const;
export type ConfirmedLevelUpLeague = (typeof confirmedLevelUpLeagues)[number];
export type LevelUpParameters = {
  xp: { base: number; ratio: number };
  troops: Record<
    ConfirmedLevelUpLeague,
    { coefficient: number; ratio: number }
  >;
  maxLevel: number;
  columnSize: number;
  pageSize: number;
  chestInterval: number;
};

export const defaultLevelUpParameters: LevelUpParameters = {
  xp: { base: 50, ratio: 1.3 },
  troops: {
    bronze: { coefficient: 32.2028, ratio: 1.245 },
    gold: { coefficient: 32.49, ratio: 1.24 },
    platinum: { coefficient: 35.88, ratio: 1.237 },
    diamond: { coefficient: 32.2028, ratio: 1.245 },
    legend: { coefficient: 32.2028, ratio: 1.245 },
  },
  maxLevel: 150,
  columnSize: 30,
  pageSize: 60,
  chestInterval: 10,
};

export function parseLevelUpParameters(value: unknown): LevelUpParameters {
  if (!value || typeof value !== "object")
    return structuredClone(defaultLevelUpParameters);
  const raw = value as Partial<LevelUpParameters>;
  return {
    xp: {
      base: Number(raw.xp?.base ?? 50),
      ratio: Number(raw.xp?.ratio ?? 1.3),
    },
    troops: Object.fromEntries(
      confirmedLevelUpLeagues.map((league) => [
        league,
        {
          coefficient: Number(
            raw.troops?.[league]?.coefficient ??
              defaultLevelUpParameters.troops[league].coefficient,
          ),
          ratio: Number(
            raw.troops?.[league]?.ratio ??
              defaultLevelUpParameters.troops[league].ratio,
          ),
        },
      ]),
    ) as LevelUpParameters["troops"],
    maxLevel: Number(raw.maxLevel ?? 150),
    columnSize: Number(raw.columnSize ?? 30),
    pageSize: Number(raw.pageSize ?? 60),
    chestInterval: Number(raw.chestInterval ?? 10),
  };
}

export function levelUpTroopsAt(
  level: number,
  league: League,
  parameters = defaultLevelUpParameters,
): number | null {
  if (league === "silver") return null;
  if (level === 1) return 200;
  const formula = parameters.troops[league];
  return formula.coefficient * formula.ratio ** level;
}

export function xpAt(level: number, parameters = defaultLevelUpParameters) {
  return Math.round(parameters.xp.base * parameters.xp.ratio ** (level - 1));
}

export function levelUpChestAt(
  level: number,
  parameters = defaultLevelUpParameters,
): number | null {
  if (
    level < parameters.chestInterval ||
    level % parameters.chestInterval !== 0
  )
    return null;
  return (level / parameters.chestInterval - 1) % 5;
}
