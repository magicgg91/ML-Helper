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

export const rankMovements = ["promotion", "stay", "relegation"] as const;
export type RankMovement = (typeof rankMovements)[number];

export const rankRewardTypes = ["sapphires", "speedups", "gems"] as const;
export type RankRewardType = (typeof rankRewardTypes)[number];

export type RankReward = { type: RankRewardType; quantity: number };

// movement/league are null for a threshold that's confirmed to exist but
// whose reward isn't confirmed yet (cf. Platine) — rendered as "to be
// defined" rather than invented text.
export type RankingBand = {
  threshold: number;
  movement: RankMovement | null;
  league: RankingLeague | null;
  rewards: RankReward[];
};
export type RankingConfig = Record<RankingLeague, RankingBand[]>;

function reward(type: RankRewardType, quantity: number): RankReward {
  return { type, quantity };
}

export const defaultRankingConfig: RankingConfig = {
  bronze: [],
  silver: [
    {
      threshold: 1,
      movement: "promotion",
      league: "gold",
      rewards: [reward("sapphires", 100), reward("speedups", 7), reward("gems", 6)],
    },
    {
      threshold: 6,
      movement: "promotion",
      league: "gold",
      rewards: [reward("sapphires", 50), reward("speedups", 6), reward("gems", 4)],
    },
    {
      threshold: 15,
      movement: "promotion",
      league: "gold",
      rewards: [reward("sapphires", 25), reward("speedups", 5), reward("gems", 2)],
    },
    {
      threshold: 50,
      movement: "stay",
      league: "silver",
      rewards: [reward("sapphires", 20), reward("speedups", 4), reward("gems", 2)],
    },
    {
      threshold: 75,
      movement: "stay",
      league: "silver",
      rewards: [reward("sapphires", 15), reward("speedups", 3), reward("gems", 1)],
    },
    {
      threshold: 100,
      movement: "stay",
      league: "silver",
      rewards: [reward("sapphires", 10), reward("speedups", 2), reward("gems", 1)],
    },
  ],
  gold: [],
  platinum: [1, 6, 15, 50, 100].map((threshold) => ({
    threshold,
    movement: null,
    league: null,
    rewards: [],
  })),
  diamond: [
    { threshold: 1, movement: "promotion", league: "legend", rewards: [reward("gems", 6)] },
    { threshold: 6, movement: "promotion", league: "legend", rewards: [reward("gems", 4)] },
    { threshold: 25, movement: "stay", league: "diamond", rewards: [reward("gems", 2)] },
    { threshold: 60, movement: "stay", league: "diamond", rewards: [reward("gems", 2)] },
    { threshold: 100, movement: "relegation", league: "platinum", rewards: [reward("gems", 1)] },
  ],
  legend: [
    { threshold: 1, movement: "stay", league: "legend", rewards: [reward("gems", 7)] },
    { threshold: 6, movement: "stay", league: "legend", rewards: [reward("gems", 5)] },
    { threshold: 25, movement: "stay", league: "legend", rewards: [reward("gems", 4)] },
    { threshold: 50, movement: "stay", league: "legend", rewards: [reward("gems", 4)] },
    { threshold: 60, movement: "stay", league: "legend", rewards: [reward("gems", 3)] },
    { threshold: 100, movement: "relegation", league: "diamond", rewards: [reward("gems", 3)] },
  ],
};

export type RankingRange = RankingBand & {
  rangeStart: number;
  rankStart: number;
  rankEnd: number;
};

// Palettes par catégorie de mouvement, clair -> foncé au fil des paliers de
// cette catégorie (prototype-ml-helper-unifie.html, RANK_CATEGORY_SHADES).
const rankCategoryShades: Record<RankMovement, readonly string[]> = {
  promotion: ["#a8dcb8", "#7ec99a", "#4fae78", "#2f8c5a", "#1c6b41"],
  stay: ["#a8c9e8", "#7eabd9", "#4f8bc4", "#2f6ba6", "#1c4d80"],
  relegation: ["#f0b088", "#e8895c", "#d9633a", "#b8452a", "#8f2f1c"],
};

export function rankCategoryShade(category: RankMovement, index: number): string {
  const shades = rankCategoryShades[category];
  return shades[index % shades.length];
}

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
        rankStart: Math.floor((total * rangeStart) / 100),
        rankEnd: Math.floor((total * band.threshold) / 100),
      };
    }),
  };
}

function parseMovement(value: unknown): RankMovement | null {
  return rankMovements.includes(value as RankMovement)
    ? (value as RankMovement)
    : null;
}

function parseTargetLeague(value: unknown): RankingLeague | null {
  return rankingLeagues.includes(value as RankingLeague)
    ? (value as RankingLeague)
    : null;
}

function parseReward(value: unknown): RankReward | null {
  if (!value || typeof value !== "object") return null;
  const type = (value as { type?: unknown }).type;
  const quantity = Number((value as { quantity?: unknown }).quantity);
  if (!rankRewardTypes.includes(type as RankRewardType)) return null;
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  return { type: type as RankRewardType, quantity };
}

// Pre-Bloc-27 rows stored `target`/`reward` as free French sentences (e.g.
// "Montée Or", "100 saphirs, 7 speedup, 6 gemmes") instead of the
// movement/league/rewards enums below. Rows saved by that older admin UI
// still exist in some installs, and without this fallback re-saving the
// ranking editor would silently wipe them to "unconfirmed" (see review on
// PR #47). Only exercised when the row has no valid new-shape fields yet.
const legacyMovementPrefixes: Record<string, RankMovement> = {
  Montée: "promotion",
  Maintien: "stay",
  Descente: "relegation",
};
const legacyLeagueNames: Record<string, RankingLeague> = {
  bronze: "bronze",
  argent: "silver",
  or: "gold",
  platine: "platinum",
  diamant: "diamond",
  légende: "legend",
  legende: "legend",
};
const legacyRewardPatterns: Array<[RegExp, RankRewardType]> = [
  [/(\d+)\s*saphirs?/i, "sapphires"],
  [/(\d+)\s*speedups?/i, "speedups"],
  [/(\d+)\s*gemmes?/i, "gems"],
];

function parseLegacyTarget(
  value: unknown,
): { movement: RankMovement | null; league: RankingLeague | null } {
  if (typeof value !== "string") return { movement: null, league: null };
  const [prefix, ...rest] = value.trim().split(/\s+/);
  const movement = legacyMovementPrefixes[prefix] ?? null;
  const league = legacyLeagueNames[rest.join(" ").toLowerCase()] ?? null;
  return movement && league ? { movement, league } : { movement: null, league: null };
}

function parseLegacyRewards(value: unknown): RankReward[] {
  if (typeof value !== "string") return [];
  const rewards: RankReward[] = [];
  for (const [pattern, type] of legacyRewardPatterns) {
    const match = value.match(pattern);
    if (match) rewards.push({ type, quantity: Number(match[1]) });
  }
  return rewards;
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
        .map((row) => {
          const movement = parseMovement(row.movement);
          const league = parseTargetLeague(row.league);
          const rewards = Array.isArray(row.rewards)
            ? row.rewards
                .map(parseReward)
                .filter((item): item is RankReward => item !== null)
            : [];
          const legacyTarget =
            movement || league
              ? { movement, league }
              : parseLegacyTarget((row as { target?: unknown }).target);
          return {
            threshold: Number(row.threshold),
            movement: legacyTarget.movement,
            league: legacyTarget.league,
            rewards: rewards.length
              ? rewards
              : parseLegacyRewards((row as { reward?: unknown }).reward),
          };
        })
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
