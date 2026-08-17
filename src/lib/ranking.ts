import { prisma } from "./prisma";

export const rankingLeagues = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legend",
] as const;
export type RankingLeague = (typeof rankingLeagues)[number];

export type RankingBand = { threshold: number; target: string; reward: string };
export type RankingConfig = Record<RankingLeague, RankingBand[]>;

const placeholder = "À définir dans l’administration";

export const defaultRankingConfig: RankingConfig = {
  bronze: [],
  silver: [
    [1, "Montée Or", "100 saphirs, 7 speedup, 6 gemmes"],
    [6, "Montée Or", "50 saphirs, 6 speedup, 4 gemmes"],
    [15, "Montée Or", "25 saphirs, 5 speedup, 2 gemmes"],
    [50, "Maintien Argent", "20 saphirs, 4 speedup, 2 gemmes"],
    [75, "Maintien Argent", "15 saphirs, 3 speedup, 1 gemme"],
    [100, "Maintien Argent", "10 saphirs, 2 speedup, 1 gemme"],
  ].map(([threshold, target, reward]) => ({
    threshold: Number(threshold),
    target: String(target),
    reward: String(reward),
  })),
  gold: [],
  platinum: [1, 6, 15, 50, 100].map((threshold) => ({
    threshold,
    target: placeholder,
    reward: placeholder,
  })),
  diamond: [
    [1, "Montée Légende", "6 gemmes"],
    [6, "Montée Légende", "4 gemmes"],
    [25, "Maintien Diamant", "2 gemmes"],
    [60, "Maintien Diamant", "2 gemmes"],
    [100, "Descente Platine", "1 gemme"],
  ].map(([threshold, target, reward]) => ({
    threshold: Number(threshold),
    target: String(target),
    reward: String(reward),
  })),
  legend: [
    [1, "Maintien Légende", "7 gemmes"],
    [6, "Maintien Légende", "5 gemmes"],
    [25, "Maintien Légende", "4 gemmes"],
    [50, "Maintien Légende", "4 gemmes"],
    [60, "Maintien Légende", "3 gemmes"],
    [100, "Descente Diamant", "3 gemmes"],
  ].map(([threshold, target, reward]) => ({
    threshold: Number(threshold),
    target: String(target),
    reward: String(reward),
  })),
};

export type RankingRange = RankingBand & {
  rangeStart: number;
  rankStart: number;
  rankEnd: number;
};

export function calculateRanking(
  bands: RankingBand[],
  percentage: number,
  rank: number,
) {
  if (percentage <= 0) return { total: null, ranges: [] as RankingRange[] };
  const total = Math.max(1, rank) / (percentage / 100);
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  return {
    total,
    ranges: sorted.map((band, index) => {
      const rangeStart = index === 0 ? 0 : sorted[index - 1].threshold;
      return {
        ...band,
        rangeStart,
        rankStart: Math.round((total * rangeStart) / 100),
        rankEnd: Math.round((total * band.threshold) / 100),
      };
    }),
  };
}

export function parseRankingConfig(value: unknown): RankingConfig {
  if (!value || typeof value !== "object") return defaultRankingConfig;
  const source = value as Partial<Record<RankingLeague, unknown>>;
  return Object.fromEntries(
    rankingLeagues.map((league) => {
      const rows = Array.isArray(source[league])
        ? source[league]
        : defaultRankingConfig[league];
      const valid = rows
        .filter((row): row is RankingBand =>
          Boolean(
            row &&
            typeof row === "object" &&
            Number.isFinite(Number((row as RankingBand).threshold)),
          ),
        )
        .map((row) => ({
          threshold: Number(row.threshold),
          target: String(row.target || placeholder),
          reward: String(row.reward || placeholder),
        }))
        .filter((row) => row.threshold > 0 && row.threshold <= 100)
        .sort((a, b) => a.threshold - b.threshold);
      return [league, valid];
    }),
  ) as RankingConfig;
}

export async function getRankingConfig(): Promise<RankingConfig> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: "ranking_leagues" },
  });
  return table ? parseRankingConfig(table.rows) : defaultRankingConfig;
}
