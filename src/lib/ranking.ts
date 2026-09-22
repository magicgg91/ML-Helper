import { prisma } from "./prisma";
import { leagues, type League, type LeagueSelection } from "./player-settings";

export const rankingLeagues = leagues;
export type RankingLeague = League;

export const rankMovements = ["promotion", "stay", "relegation"] as const;
export type RankMovement = (typeof rankMovements)[number];

export const rankRewardTypes = ["sapphires", "speedups", "gems"] as const;
export type RankRewardType = (typeof rankRewardTypes)[number];

export type RankReward = { type: RankRewardType; quantity: number };

// movement/target are null for a threshold that's confirmed to exist but
// whose reward isn't confirmed yet (cf. Platine) — rendered as "to be
// defined" rather than invented text.
export type RankingBand = {
  threshold: number;
  movement: RankMovement | null;
  // Bloc 108/A: the id of the ladder entry this band sends the player to,
  // not a league from the fixed enum — the target list is whatever the admin
  // has created. The six entries migrated from the old shape keep their
  // league key as their id, so bands that already said `league: "gold"` keep
  // resolving without any data being rewritten.
  target: string | null;
  rewards: RankReward[];
};

/**
 * Bloc 108/A+B+G: one rung of the ranking ladder — a league, or a division
 * inside one. The studio splits Argent/Or/Platine/Diamant into Division 2 and
 * Division 1 from 07/10/2026, so this list is admin-managed rather than a
 * fixed set of six: entries can be added, renamed, reordered, deactivated and
 * removed without another development bloc.
 *
 * Scope: the ranking tool only. The `League` enum still backs Gemmes,
 * Équipement, Templiers, Boutique and the player's own league field.
 */
export type RankingEntry = {
  /** Stable key. Bands point at it, so renaming an entry never breaks them. */
  id: string;
  /**
   * The base league this rung belongs to, when it has one. It is what gives
   * the entry a name in all five languages (game.leagues.*) — a free-text
   * name could only ever be written in one. Null for an entry that maps to no
   * league at all, which then must carry a `name`.
   */
  league: League | null;
  /** Division label appended to the league name, e.g. "1". Empty when none. */
  division: string;
  /**
   * Free name, per locale — the rename escape hatch, for a rung the studio
   * invents that maps to no league at all.
   *
   * Codex review (PR #135): a single free-text name would have shown a French
   * rename unchanged to every other language, which AGENTS.md forbids for
   * user-visible text. Admin-managed names are stored per locale in this
   * project (see templars-presentation's name_fr/name_en), and read through
   * pickFrEn, which falls back to English — the repo-wide rule for a missing
   * translation.
   */
  nameFr: string;
  nameEn: string;
  /**
   * Bloc 108/B: explicit rank on the ladder, low = bottom (Bronze). Insertion
   * order is deliberately NOT the source of truth: promotion targets and the
   * League Lock below are computed from this, and an admin reordering entries
   * must move them without deleting and recreating anything.
   */
  position: number;
  /**
   * Bloc 108/G: public visibility. The future divisions can be created now,
   * filled in, and left inactive until the split actually happens in game.
   * Independent of whether the entry's bands are complete — an active entry
   * with no bands shows a "no data yet" state (Bloc 108/C), it is not hidden.
   */
  active: boolean;
  bands: RankingBand[];
};

export type RankingLadder = RankingEntry[];

function reward(type: RankRewardType, quantity: number): RankReward {
  return { type, quantity };
}

/** A band in the shorthand the default ladder below is written in. */
function band(
  threshold: number,
  movement: RankMovement | null,
  target: string | null,
  rewards: RankReward[] = [],
): RankingBand {
  return { threshold, movement, target, rewards };
}

/**
 * Bloc 108/A: the six leagues the tool shipped with, now expressed as ladder
 * entries — same thresholds, same rewards, same targets, in game order from
 * Bronze at the bottom. Their ids are their league keys, which is what lets a
 * stored band that still says `league: "gold"` keep pointing at the right rung
 * after migration (see parseRankingLadder).
 *
 * All six are active: they are already in production.
 */
export const defaultRankingLadder: RankingLadder = [
  { league: "bronze", bands: [] },
  {
    league: "silver",
    bands: [
      band(1, "promotion", "gold", [
        reward("sapphires", 100),
        reward("speedups", 7),
        reward("gems", 6),
      ]),
      band(6, "promotion", "gold", [
        reward("sapphires", 50),
        reward("speedups", 6),
        reward("gems", 4),
      ]),
      band(15, "promotion", "gold", [
        reward("sapphires", 25),
        reward("speedups", 5),
        reward("gems", 2),
      ]),
      band(50, "stay", "silver", [
        reward("sapphires", 20),
        reward("speedups", 4),
        reward("gems", 2),
      ]),
      band(75, "stay", "silver", [
        reward("sapphires", 15),
        reward("speedups", 3),
        reward("gems", 1),
      ]),
      band(100, "stay", "silver", [
        reward("sapphires", 10),
        reward("speedups", 2),
        reward("gems", 1),
      ]),
    ],
  },
  { league: "gold", bands: [] },
  {
    league: "platinum",
    // Thresholds confirmed in game, movement and rewards not yet — kept as
    // nulls rather than invented (AGENTS.md).
    bands: [1, 6, 15, 50, 100].map((threshold) => band(threshold, null, null)),
  },
  {
    league: "diamond",
    bands: [
      band(1, "promotion", "legend", [reward("gems", 6)]),
      band(6, "promotion", "legend", [reward("gems", 4)]),
      band(25, "stay", "diamond", [reward("gems", 2)]),
      band(60, "stay", "diamond", [reward("gems", 2)]),
      band(100, "relegation", "platinum", [reward("gems", 1)]),
    ],
  },
  {
    league: "legend",
    bands: [
      band(1, "stay", "legend", [reward("gems", 7)]),
      band(6, "stay", "legend", [reward("gems", 5)]),
      band(25, "stay", "legend", [reward("gems", 4)]),
      band(50, "stay", "legend", [reward("gems", 4)]),
      band(60, "stay", "legend", [reward("gems", 3)]),
      band(100, "relegation", "diamond", [reward("gems", 3)]),
    ],
  },
].map((entry, index) => ({
  id: entry.league,
  league: entry.league as League,
  division: "",
  nameFr: "",
  nameEn: "",
  position: index,
  active: true,
  bands: entry.bands,
}));

export type RankingRange = RankingBand & {
  rangeStart: number;
  rankStart: number;
  rankEnd: number;
  /**
   * Codex review (PR #137): where this range's band sits once the bands are
   * sorted by threshold. It is the band's only unique handle — a threshold is
   * not one, since an admin can save two bands on the same one — and it is
   * what lets a caller line a range back up with its own band after the
   * filter below has dropped some.
   */
  bandIndex: number;
};

// Palettes par catégorie de mouvement, clair -> foncé au fil des paliers de
// cette catégorie (prototype-ml-helper-unifie.html, RANK_CATEGORY_SHADES).
const rankCategoryShades: Record<RankMovement, readonly string[]> = {
  promotion: ["#a8dcb8", "#7ec99a", "#4fae78", "#2f8c5a", "#1c6b41"],
  stay: ["#a8c9e8", "#7eabd9", "#4f8bc4", "#2f6ba6", "#1c4d80"],
  relegation: ["#f0b088", "#e8895c", "#d9633a", "#b8452a", "#8f2f1c"],
};

export function rankCategoryShade(
  category: RankMovement,
  index: number,
): string {
  const shades = rankCategoryShades[category];
  return shades[index % shades.length];
}

/**
 * Bloc 110/C: the shade of every band, in sorted-by-threshold order.
 *
 * The visual scale and the interval tiles must paint the same interval the
 * same color — that is the whole point of the tiles carrying a color at all.
 * A shade depends on how many bands of the same movement came before it, so
 * it cannot be recomputed independently on each side: the tiles are built
 * from calculateRanking's ranges, which DROP any band holding no integer
 * rank, and a dropped band would shift every later shade. Both sides read
 * this one list instead, built from the bands themselves — the scale by its
 * own sorted index, a tile by its range's bandIndex.
 *
 * Codex review (PR #137): a list, indexed by position, not a map keyed by
 * threshold. Two bands can share a threshold — the admin's Add action seeds
 * every new row at 100 and isSavableRankingLadder only checks the range — and
 * keying by it made the later band silently overwrite the earlier one's
 * shade, so the interval actually drawn could wear another category's color.
 */
export function rankBandShades(bands: RankingBand[]): string[] {
  const counters: Record<RankMovement, number> = {
    promotion: 0,
    stay: 0,
    relegation: 0,
  };
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  return sorted.map((band) => {
    const category = band.movement ?? "stay";
    const shade = rankCategoryShade(category, counters[category]);
    counters[category] += 1;
    return shade;
  });
}

export function calculateRanking(
  bands: RankingBand[],
  percentage: number,
  rank: number,
) {
  if (percentage <= 0) return { total: null, ranges: [] as RankingRange[] };
  const total = Math.max(1, rank) / (percentage / 100);
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  // Only rankEnd is derived from this band's own percentage. rankStart
  // chains off the previous range's rankEnd (+1) instead of being
  // recomputed from this band's own starting percentage — otherwise the
  // same floored rank could land at both the end of one range and the
  // start of the next (Bloc 31/J).
  let previousRankEnd = 0;
  return {
    total,
    // A small enough population can leave a band with no integer rank in
    // it at all (its own rankEnd still floors to the previous band's
    // rankEnd or lower) — chaining still advances previousRankEnd for the
    // next band, but a band with rankStart > rankEnd holds zero players
    // and is dropped rather than shown as a nonsensical reversed range.
    ranges: sorted
      .map((band, index) => {
        const rangeStart = index === 0 ? 0 : sorted[index - 1].threshold;
        // Bloc 62/G: every band floors its rank boundary EXCEPT the 100%
        // one — that row represents the deduced total player count itself
        // (rankEnd = total at threshold 100), and flooring it would silently
        // undercount by up to 1 player (e.g. rank 137 at 86.71% -> raw
        // 157.998, floor 157, ceil 158 — the real total is estimated, but
        // ceil is the correct rounding direction for it specifically).
        const rankEnd =
          band.threshold === 100
            ? Math.ceil((total * band.threshold) / 100)
            : Math.floor((total * band.threshold) / 100);
        const rankStart = previousRankEnd + 1;
        previousRankEnd = rankEnd;
        return { ...band, rangeStart, rankStart, rankEnd, bandIndex: index };
      })
      .filter((range) => range.rankStart <= range.rankEnd),
  };
}

function parseMovement(value: unknown): RankMovement | null {
  return rankMovements.includes(value as RankMovement)
    ? (value as RankMovement)
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

function parseLegacyTarget(value: unknown): {
  movement: RankMovement | null;
  league: RankingLeague | null;
} {
  if (typeof value !== "string") return { movement: null, league: null };
  const [prefix, ...rest] = value.trim().split(/\s+/);
  const movement = legacyMovementPrefixes[prefix] ?? null;
  const league = legacyLeagueNames[rest.join(" ").toLowerCase()] ?? null;
  return movement && league
    ? { movement, league }
    : { movement: null, league: null };
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

/** Slugifies an admin-typed name into a stable id, e.g. "Or 1" -> "or-1". */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function rankingEntryId(entry: {
  league: League | null;
  division: string;
  nameFr?: string;
  nameEn?: string;
}): string {
  // English first, so an id stays stable if the French name is edited later.
  const free = entry.nameEn || entry.nameFr || "";
  const base = free
    ? slugify(free)
    : [entry.league ?? "", entry.division]
        .filter(Boolean)
        .map(slugify)
        .join("-");
  return base || "entry";
}

function parseBand(value: unknown): RankingBand | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const threshold = Number(row.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100)
    return null;
  const movement = parseMovement(row.movement);
  // `target` is the current key; `league` is what the pre-Bloc-108 shape used
  // for the same thing, and its values were league keys — which are exactly
  // the ids the six migrated entries carry.
  const rawTarget = row.target ?? row.league;
  const target = typeof rawTarget === "string" && rawTarget ? rawTarget : null;
  // A valid `movement` is what tells the two shapes apart. Without one, the
  // row may still be a pre-Bloc-27 one, whose `target` is a French sentence
  // ("Montée Or") rather than an id — read it that way before giving up. A
  // target that is neither is left as-is here and cleared by resolveTargets,
  // which is the only place that knows every id on the ladder.
  const legacy = movement ? null : parseLegacyTarget(rawTarget);
  const rewards = Array.isArray(row.rewards)
    ? row.rewards
        .map(parseReward)
        .filter((item): item is RankReward => item !== null)
    : [];
  return {
    threshold,
    movement: legacy?.movement ?? movement,
    target: legacy?.movement ? legacy.league : target,
    rewards: rewards.length ? rewards : parseLegacyRewards(row.reward),
  };
}

function parseBands(value: unknown): RankingBand[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parseBand)
    .filter((item): item is RankingBand => item !== null)
    .sort((a, b) => a.threshold - b.threshold);
}

function parseEntry(value: unknown, index: number): RankingEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const league = leagues.includes(row.league as League)
    ? (row.league as League)
    : null;
  const division = typeof row.division === "string" ? row.division.trim() : "";
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const nameFr = text(row.nameFr);
  const nameEn = text(row.nameEn);
  // An entry with neither a league nor a name could not be labelled at all.
  if (!league && !nameFr && !nameEn) return null;
  const id =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : rankingEntryId({ league, division, nameFr, nameEn });
  const position = Number(row.position);
  return {
    id,
    league,
    division,
    nameFr,
    nameEn,
    position: Number.isFinite(position) ? position : index,
    // Absent means active: every entry that existed before Bloc 108 is in
    // production, and a missing flag must never silently hide one.
    active: row.active === undefined ? true : Boolean(row.active),
    bands: parseBands(row.bands),
  };
}

/**
 * Bloc 108/A: reads the stored ladder, whichever shape it is in.
 *
 * Before this bloc the tool stored `{ bronze: [...], silver: [...], ... }` —
 * six fixed keys, each holding that league's bands. That shape is migrated
 * here, on read, exactly as the pre-Bloc-27 French-sentence rows already were
 * further up this file: every league becomes an entry with its league key as
 * its id, in game order, active, and its bands carried over untouched. No
 * stored row is rewritten until the next admin save, and nothing is lost.
 */
export function parseRankingLadder(value: unknown): RankingLadder {
  if (!value || typeof value !== "object") return defaultRankingLadder;
  if (Array.isArray(value)) {
    const entries = value
      .map(parseEntry)
      .filter((entry): entry is RankingEntry => entry !== null);
    return entries.length
      ? resolveTargets(orderedLadder(entries))
      : defaultRankingLadder;
  }
  // Legacy shape: one key per league of the fixed enum. Every league becomes
  // an entry, including one the stored object never had a key for — it keeps
  // the bands this file ships with, exactly as the previous parser did, so a
  // partial row cannot blank a league on its way through.
  const source = value as Record<string, unknown>;
  if (!leagues.some((league) => Array.isArray(source[league])))
    return defaultRankingLadder;
  return resolveTargets(
    leagues.map((league, index) => ({
      id: league,
      league,
      division: "",
      nameFr: "",
      nameEn: "",
      position: index,
      active: true,
      bands: Array.isArray(source[league])
        ? parseBands(source[league])
        : findRankingEntry(defaultRankingLadder, league)!.bands,
    })),
  );
}

/**
 * Clears any band target that names no entry on this ladder.
 *
 * A target is an entry id, and an id can disappear — an admin deletes the
 * rung a band pointed at. The band itself stays (its threshold and rewards
 * are still real), but its destination becomes unknown, which is exactly the
 * "to be defined" state the tool already had a rendering for.
 */
function resolveTargets(ladder: RankingLadder): RankingLadder {
  const ids = new Set(ladder.map((entry) => entry.id));
  return ladder.map((entry) => ({
    ...entry,
    bands: entry.bands.map((item) =>
      item.target && ids.has(item.target) ? item : { ...item, target: null },
    ),
  }));
}

/** Bloc 108/B: the ladder in explicit position order, bottom rung first. */
export function orderedLadder(ladder: RankingLadder): RankingLadder {
  return [...ladder]
    .sort((a, b) => a.position - b.position)
    .map((entry, index) => ({ ...entry, position: index }));
}

/** Bloc 108/C+G: what the public page shows — active entries, in order. */
export function activeLadder(ladder: RankingLadder): RankingLadder {
  return orderedLadder(ladder).filter((entry) => entry.active);
}

/**
 * Bloc 108/D: the rung a player cannot be relegated below this season — two
 * rungs under the one they are in.
 *
 * Computed over the ACTIVE ladder: an entry an admin has prepared but not
 * switched on yet does not exist for the player, and must not shift the
 * count. Null when there are fewer than two rungs below, which is the honest
 * answer near the bottom of the ladder rather than clamping to Bronze.
 *
 * The studio's own example, on the ladder once the divisions are in: Or 1 ->
 * Or 2 -> Argent 1, so a player in Or 1 is locked at Argent 1.
 */
export const leagueLockDepth = 2;

export function leagueLockFor(
  ladder: RankingLadder,
  entryId: string,
): RankingEntry | null {
  const active = activeLadder(ladder);
  const index = active.findIndex((entry) => entry.id === entryId);
  if (index < 0) return null;
  return active[index - leagueLockDepth] ?? null;
}

/** Bloc 108/E: the active divisions configured under one base league. */
export function divisionsForLeague(
  ladder: RankingLadder,
  league: LeagueSelection,
): RankingLadder {
  if (!league) return [];
  return activeLadder(ladder).filter(
    (entry) => entry.league === league && entry.division !== "",
  );
}

export function findRankingEntry(
  ladder: RankingLadder,
  entryId: string,
): RankingEntry | undefined {
  return ladder.find((entry) => entry.id === entryId);
}

/**
 * Whether this ladder can be stored as it is. Ids must be unique — they are
 * what bands point at, so a duplicate would make a target ambiguous.
 */
export function isSavableRankingLadder(ladder: RankingLadder): boolean {
  if (!ladder.length) return false;
  const ids = new Set<string>();
  for (const entry of ladder) {
    if (!entry.id) return false;
    if (ids.has(entry.id)) return false;
    ids.add(entry.id);
    if (!entry.league && !entry.nameFr && !entry.nameEn) return false;
    for (const item of entry.bands)
      if (item.threshold <= 0 || item.threshold > 100) return false;
  }
  return true;
}

export async function getRankingLadder(): Promise<RankingLadder> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: "ranking_leagues" },
  });
  return table ? parseRankingLadder(table.rows) : defaultRankingLadder;
}
