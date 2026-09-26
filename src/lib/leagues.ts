import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { leagues, type League, type LeagueSelection } from "./player-settings";
import {
  dropEmptyLocales,
  launchLocales,
  localizedText,
  translationRecord,
  type LaunchLocale,
} from "./translations";

/**
 * Bloc 135: l'échelle des ligues et des divisions, pour tout le site.
 *
 * Elle vivait dans `lib/ranking.ts`, sous la garde de l'outil Classement, qui
 * portait aussi son CRUD (`/admin/tools/ranking`). Deux conséquences :
 * n'importe quel autre outil qui aurait eu besoin de savoir dans quelle
 * division est un joueur devait passer par un module nommé d'après le
 * Classement, et le seul endroit où ajouter une division était l'écran d'un
 * outil parmi seize.
 *
 * Ce module est désormais la source unique. Il ne connaît **rien** du
 * Classement : ni ses couleurs, ni ses intervalles, ni sa mise en page — ceux-là
 * restent dans `lib/ranking.ts`, qui lit ce fichier. Ce qu'il porte, c'est
 * l'échelle elle-même : les échelons, leur ordre, ce qui est public, le
 * League Lock, les divisions d'une ligue, et le trajet d'une division vers sa
 * ligue de base dont tous les autres outils ont besoin.
 *
 * Vocabulaire — un **échelon** (`LeagueRung`) est un barreau de l'échelle :
 * une ligue de base, ou une division dans l'une d'elles. Une **plage de fin
 * de saison** (`SeasonBand`) est un « top N % » et ce qui arrive à qui y
 * termine. Les deux forment un seul enregistrement parce que le studio les
 * publie ensemble.
 */

/** Ce qu'une fin de saison fait d'un joueur. */
export const seasonMovements = ["promotion", "stay", "relegation"] as const;
export type SeasonMovement = (typeof seasonMovements)[number];

export const seasonRewardTypes = ["sapphires", "speedups", "gems"] as const;
export type SeasonRewardType = (typeof seasonRewardTypes)[number];

export type SeasonReward = { type: SeasonRewardType; quantity: number };

// movement/target sont nuls pour un seuil dont l'existence est confirmée mais
// pas la récompense (cf. Platine) — rendu « à définir » plutôt qu'inventé.
export type SeasonBand = {
  threshold: number;
  movement: SeasonMovement | null;
  // Bloc 108/A : l'identifiant de l'échelon où ce seuil envoie le joueur, et
  // non une ligue de l'énumération fixe — la liste des cibles est celle que
  // l'administration a créée. Les six entrées migrées gardent leur clé de
  // ligue comme identifiant, si bien qu'un seuil qui disait déjà
  // `league: "gold"` continue de se résoudre sans qu'aucune donnée soit
  // réécrite.
  target: string | null;
  rewards: SeasonReward[];
};

/**
 * Bloc 135 : le nom libre, dans toutes les langues du site.
 *
 * Il était une paire FR/EN (`nameFr`/`nameEn`, lue par `pickFrEn`) depuis le
 * Bloc 108. Le site en publie cinq, et un échelon inventé par le studio est
 * du contenu éditorial comme le titre d'un guide : il se stocke en objet par
 * locale, comme `ToolDescription` (Bloc 130) et le titre d'un guide, et se lit
 * par `localizedText` — repli sur l'anglais puis le français, jamais un vide.
 *
 * Une langue laissée blanche est **absente**, pas `""` : le Bloc 126/D a
 * montré ce que coûte la différence — `localizedText` considère une chaîne
 * vide comme écrite et s'arrête là, au lieu de se replier sur une langue qui
 * a quelque chose à dire.
 */
export type RungName = Partial<Record<LaunchLocale, string>>;

/**
 * Bloc 108/A+B+G : un barreau de l'échelle — une ligue, ou une division dans
 * l'une d'elles. Le studio éclate Argent/Or/Platine/Diamant en Division 2 et
 * Division 1 à partir du 07/10/2026, d'où une liste administrable plutôt
 * qu'un jeu figé de six : on peut ajouter, renommer, réordonner, désactiver
 * et supprimer sans autre bloc de développement.
 */
export type LeagueRung = {
  /** Clé stable. Les plages pointent dessus : renommer ne les casse jamais. */
  id: string;
  /**
   * La ligue de base à laquelle cet échelon appartient, quand il en a une.
   * C'est elle qui le nomme dans les cinq langues (`game.leagues.*`) et c'est
   * elle que lisent tous les autres outils (voir `baseLeagueOf`). Nulle pour
   * un échelon qui ne correspond à aucune ligue — il doit alors porter un nom
   * libre.
   */
  league: League | null;
  /** Libellé de division ajouté au nom de la ligue, ex. « 1 ». Vide sinon. */
  division: string;
  /** Le nom libre, par langue. Vide pour un échelon nommé par sa ligue. */
  name: RungName;
  /**
   * Bloc 108/B : rang explicite sur l'échelle, bas = Bronze. L'ordre
   * d'insertion n'est délibérément PAS la source de vérité : les cibles de
   * montée et le League Lock s'en déduisent, et réordonner doit déplacer les
   * échelons sans rien supprimer ni recréer.
   */
  position: number;
  /**
   * Bloc 108/G : visibilité publique. Les futures divisions peuvent être
   * créées, remplies, et laissées inactives jusqu'à l'éclatement réel. Sans
   * rapport avec le fait que les plages soient complètes — un échelon actif
   * sans plage affiche « pas encore de données » (Bloc 108/C), il n'est pas
   * masqué.
   */
  active: boolean;
  bands: SeasonBand[];
};

export type LeagueLadder = LeagueRung[];

/** Le nom libre de cet échelon dans cette langue, ou une chaîne vide. */
export function rungFreeName(rung: LeagueRung, locale: string): string {
  return localizedText(rung.name, locale);
}

/** Les langues dans lesquelles ce nom libre est réellement écrit. */
export function rungNameLocales(name: RungName): LaunchLocale[] {
  return launchLocales.filter((locale) => (name[locale] ?? "").trim() !== "");
}

/** Si cet échelon porte un nom libre, dans n'importe quelle langue. */
export function hasRungName(name: RungName): boolean {
  return rungNameLocales(name).length > 0;
}

/** Toutes les langues, blanches là où rien n'est écrit — ce qu'un formulaire veut. */
export function rungNameForm(name: RungName): Record<LaunchLocale, string> {
  return Object.fromEntries(
    launchLocales.map((locale) => [locale, name[locale] ?? ""]),
  ) as Record<LaunchLocale, string>;
}

/** Ce qui se stocke, depuis ce qu'un formulaire tient. */
export function rungNameToStore(
  form: Partial<Record<string, string>>,
): RungName {
  return dropEmptyLocales(
    Object.fromEntries(
      launchLocales.map((locale) => [locale, (form[locale] ?? "").trim()]),
    ),
  ) as RungName;
}

function reward(type: SeasonRewardType, quantity: number): SeasonReward {
  return { type, quantity };
}

/** Une plage, dans le raccourci d'écriture de l'échelle par défaut. */
function band(
  threshold: number,
  movement: SeasonMovement | null,
  target: string | null,
  rewards: SeasonReward[] = [],
): SeasonBand {
  return { threshold, movement, target, rewards };
}

/**
 * Bloc 108/A : les six ligues livrées à l'origine, exprimées en échelons —
 * mêmes seuils, mêmes récompenses, mêmes cibles, dans l'ordre du jeu depuis
 * le Bronze. Leurs identifiants sont leurs clés de ligue, ce qui permet à une
 * plage stockée qui dit encore `league: "gold"` de continuer à pointer sur le
 * bon barreau après migration (voir `parseLeagueLadder`).
 *
 * Toutes actives : elles sont déjà en production.
 */
export const defaultLeagueLadder: LeagueLadder = [
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
    // Seuils confirmés en jeu, mouvement et récompenses non — gardés nuls
    // plutôt qu'inventés (AGENTS.md).
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
  name: {} as RungName,
  position: index,
  active: true,
  bands: entry.bands,
}));

function parseMovement(value: unknown): SeasonMovement | null {
  return seasonMovements.includes(value as SeasonMovement)
    ? (value as SeasonMovement)
    : null;
}

function parseReward(value: unknown): SeasonReward | null {
  if (!value || typeof value !== "object") return null;
  const type = (value as { type?: unknown }).type;
  const quantity = Number((value as { quantity?: unknown }).quantity);
  if (!seasonRewardTypes.includes(type as SeasonRewardType)) return null;
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  return { type: type as SeasonRewardType, quantity };
}

// Les lignes d'avant le Bloc 27 stockaient `target`/`reward` en phrases
// françaises libres (« Montée Or », « 100 saphirs, 7 speedup, 6 gemmes ») au
// lieu des énumérations ci-dessous. Certaines installations en ont encore, et
// sans ce repli, ré-enregistrer l'échelle les effacerait silencieusement en
// « non confirmé » (revue de la PR #47). Seulement emprunté quand la ligne
// n'a aucun champ valide de la forme récente.
const legacyMovementPrefixes: Record<string, SeasonMovement> = {
  Montée: "promotion",
  Maintien: "stay",
  Descente: "relegation",
};
const legacyLeagueNames: Record<string, League> = {
  bronze: "bronze",
  argent: "silver",
  or: "gold",
  platine: "platinum",
  diamant: "diamond",
  légende: "legend",
  legende: "legend",
};
const legacyRewardPatterns: Array<[RegExp, SeasonRewardType]> = [
  [/(\d+)\s*saphirs?/i, "sapphires"],
  [/(\d+)\s*speedups?/i, "speedups"],
  [/(\d+)\s*gemmes?/i, "gems"],
];

function parseLegacyTarget(value: unknown): {
  movement: SeasonMovement | null;
  league: League | null;
} {
  if (typeof value !== "string") return { movement: null, league: null };
  const [prefix, ...rest] = value.trim().split(/\s+/);
  const movement = legacyMovementPrefixes[prefix] ?? null;
  const league = legacyLeagueNames[rest.join(" ").toLowerCase()] ?? null;
  return movement && league
    ? { movement, league }
    : { movement: null, league: null };
}

function parseLegacyRewards(value: unknown): SeasonReward[] {
  if (typeof value !== "string") return [];
  const rewards: SeasonReward[] = [];
  for (const [pattern, type] of legacyRewardPatterns) {
    const match = value.match(pattern);
    if (match) rewards.push({ type, quantity: Number(match[1]) });
  }
  return rewards;
}

/** Transforme un nom saisi en identifiant stable, ex. « Or 1 » → « or-1 ». */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function leagueRungId(rung: {
  league: League | null;
  division: string;
  name?: RungName;
}): string {
  // L'anglais d'abord, pour qu'un identifiant reste stable si le nom français
  // est modifié plus tard. Puis le français, puis la première langue écrite —
  // un échelon nommé uniquement en allemand doit quand même avoir un
  // identifiant tiré de son nom, pas un « entry » anonyme.
  const name = rung.name ?? {};
  const free =
    name.en ||
    name.fr ||
    launchLocales.map((locale) => name[locale] ?? "").find(Boolean) ||
    "";
  const base = free
    ? slugify(free)
    : [rung.league ?? "", rung.division].filter(Boolean).map(slugify).join("-");
  return base || "entry";
}

function parseBand(value: unknown): SeasonBand | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const threshold = Number(row.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100)
    return null;
  const movement = parseMovement(row.movement);
  // `target` est la clé actuelle ; `league` est ce que la forme d'avant le
  // Bloc 108 utilisait pour la même chose, et ses valeurs étaient des clés de
  // ligue — exactement les identifiants que portent les six entrées migrées.
  const rawTarget = row.target ?? row.league;
  const target = typeof rawTarget === "string" && rawTarget ? rawTarget : null;
  // Un `movement` valide est ce qui distingue les deux formes. Sans lui, la
  // ligne peut encore être d'avant le Bloc 27, dont le `target` est une
  // phrase française (« Montée Or ») et non un identifiant — on la lit
  // ainsi avant d'abandonner. Une cible qui n'est ni l'un ni l'autre est
  // laissée telle quelle ici et effacée par `resolveTargets`, seul endroit
  // qui connaisse tous les identifiants de l'échelle.
  const legacy = movement ? null : parseLegacyTarget(rawTarget);
  const rewards = Array.isArray(row.rewards)
    ? row.rewards
        .map(parseReward)
        .filter((item): item is SeasonReward => item !== null)
    : [];
  return {
    threshold,
    movement: legacy?.movement ?? movement,
    target: legacy?.movement ? legacy.league : target,
    rewards: rewards.length ? rewards : parseLegacyRewards(row.reward),
  };
}

function parseBands(value: unknown): SeasonBand[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parseBand)
    .filter((item): item is SeasonBand => item !== null)
    .sort((a, b) => a.threshold - b.threshold);
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/**
 * Bloc 135 : le nom libre, quelle que soit la forme stockée.
 *
 * La migration `20260926000000_leagues_divisions_central` réécrit
 * `nameFr`/`nameEn` en objet par locale, et c'est la forme que lit la
 * première branche. La seconde reste pour ce que la migration ne peut pas
 * atteindre : une sauvegarde restaurée d'avant elle, une installation dont
 * l'image n'a pas encore tourné. Elle ne coûte que trois lignes, et sans
 * elle un nom de division disparaîtrait de l'écran sans rien dire.
 */
function parseRungName(row: Record<string, unknown>): RungName {
  const stored = translationRecord(row.name);
  const written = launchLocales
    .map((locale) => [locale, text(stored[locale])] as const)
    .filter(([, value]) => value !== "");
  if (written.length) return Object.fromEntries(written) as RungName;
  return dropEmptyLocales({
    fr: text(row.nameFr),
    en: text(row.nameEn),
  }) as RungName;
}

function parseRung(value: unknown, index: number): LeagueRung | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const league = leagues.includes(row.league as League)
    ? (row.league as League)
    : null;
  const division = text(row.division);
  const name = parseRungName(row);
  // Un échelon sans ligue ni nom ne pourrait pas être nommé du tout.
  if (!league && !hasRungName(name)) return null;
  const id =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : leagueRungId({ league, division, name });
  const position = Number(row.position);
  return {
    id,
    league,
    division,
    name,
    position: Number.isFinite(position) ? position : index,
    // Absent veut dire actif : tout échelon qui existait avant le Bloc 108 est
    // en production, et un drapeau manquant ne doit jamais en masquer un.
    active: row.active === undefined ? true : Boolean(row.active),
    bands: parseBands(row.bands),
  };
}

/**
 * Bloc 108/A : lit l'échelle stockée, dans quelque forme qu'elle soit.
 *
 * Avant ce bloc, l'outil stockait `{ bronze: [...], silver: [...], … }` — six
 * clés fixes, chacune portant les plages de sa ligue. Cette forme est migrée
 * ici, à la lecture, exactement comme les lignes en phrases françaises
 * d'avant le Bloc 27 plus haut : chaque ligue devient un échelon avec sa clé
 * de ligue comme identifiant, dans l'ordre du jeu, actif, plages reprises
 * telles quelles. Rien n'est réécrit en base avant le prochain
 * enregistrement, et rien n'est perdu.
 */
export function parseLeagueLadder(value: unknown): LeagueLadder {
  if (!value || typeof value !== "object") return defaultLeagueLadder;
  if (Array.isArray(value)) {
    const rungs = value
      .map(parseRung)
      .filter((rung): rung is LeagueRung => rung !== null);
    return rungs.length
      ? resolveTargets(orderedLadder(rungs))
      : defaultLeagueLadder;
  }
  // Forme héritée : une clé par ligue de l'énumération fixe. Chaque ligue
  // devient un échelon, y compris celle dont l'objet stocké n'avait pas la
  // clé — elle garde les plages livrées avec ce fichier, exactement comme le
  // faisait l'analyseur précédent, pour qu'une ligne partielle ne puisse pas
  // vider une ligue au passage.
  const source = value as Record<string, unknown>;
  if (!leagues.some((league) => Array.isArray(source[league])))
    return defaultLeagueLadder;
  return resolveTargets(
    leagues.map((league, index) => ({
      id: league,
      league,
      division: "",
      name: {} as RungName,
      position: index,
      active: true,
      bands: Array.isArray(source[league])
        ? parseBands(source[league])
        : findLeagueRung(defaultLeagueLadder, league)!.bands,
    })),
  );
}

/**
 * Efface toute cible de plage qui ne nomme aucun échelon de cette échelle.
 *
 * Une cible est un identifiant, et un identifiant peut disparaître — une
 * administration supprime le barreau qu'une plage visait. La plage reste (son
 * seuil et ses récompenses sont toujours réels), mais sa destination devient
 * inconnue, c'est-à-dire exactement l'état « à définir » que l'outil sait
 * déjà rendre.
 */
function resolveTargets(ladder: LeagueLadder): LeagueLadder {
  const ids = new Set(ladder.map((rung) => rung.id));
  return ladder.map((rung) => ({
    ...rung,
    bands: rung.bands.map((item) =>
      item.target && ids.has(item.target) ? item : { ...item, target: null },
    ),
  }));
}

/** Bloc 108/B : l'échelle dans son ordre explicite, barreau du bas d'abord. */
export function orderedLadder(ladder: LeagueLadder): LeagueLadder {
  return [...ladder]
    .sort((a, b) => a.position - b.position)
    .map((rung, index) => ({ ...rung, position: index }));
}

/** Bloc 108/C+G : ce que le public voit — les échelons actifs, dans l'ordre. */
export function activeLadder(ladder: LeagueLadder): LeagueLadder {
  return orderedLadder(ladder).filter((rung) => rung.active);
}

/**
 * Bloc 108/D : le barreau sous lequel un joueur ne peut pas descendre cette
 * saison — deux barreaux sous celui où il est.
 *
 * Calculé sur l'échelle ACTIVE : un échelon préparé mais pas encore allumé
 * n'existe pas pour le joueur et ne doit pas décaler le compte.
 *
 * L'exemple du studio, sur l'échelle une fois les divisions en place : Or 1 →
 * Or 2 → Argent 1, donc un joueur en Or 1 est bloqué à Argent 1.
 *
 * Bloc 111 : ce qui se passe près du bas est spécifié, et c'est un
 * écrasement plutôt que l'« aucune réponse » livrée à l'origine. Le barreau
 * du bas est un PLANCHER — le Bronze aujourd'hui — et un plancher n'est
 * jamais un verrou : il n'y a rien dessous à protéger, et il n'est jamais
 * rendu comme verrou d'un autre barreau non plus. Le trajet arrière est donc
 * raccourci jusqu'à tomber quelque part de valide :
 *
 *   Bronze    → aucun verrou, c'est le plancher
 *   Argent 2  → lui-même : même un barreau en arrière serait le plancher
 *   Argent 1  → Argent 2 : deux barreaux en arrière seraient le plancher
 *
 * « Bronze » est lu par sa position, pas par sa clé de ligue, pour la même
 * raison que tout le reste de ce fichier (Bloc 108) : l'échelle est celle
 * qu'une administration a ordonnée, donc le plancher est le barreau qui se
 * trouve en bas.
 */
export const leagueLockDepth = 2;

export function leagueLockFor(
  ladder: LeagueLadder,
  rungId: string,
): LeagueRung | null {
  const active = activeLadder(ladder);
  const index = active.findIndex((rung) => rung.id === rungId);
  if (index < 0) return null;
  // Le plancher n'a rien sous lui où être bloqué.
  if (index === 0) return null;
  // On remonte, mais jamais sur le plancher ni au-delà — le trajet se
  // raccourcit jusqu'à zéro barreau, où l'échelon est son propre verrou.
  return active[Math.max(index - leagueLockDepth, 1)];
}

/** Bloc 108/E : les divisions actives configurées sous une ligue de base. */
export function divisionsForLeague(
  ladder: LeagueLadder,
  league: LeagueSelection,
): LeagueLadder {
  if (!league) return [];
  return activeLadder(ladder).filter(
    (rung) => rung.league === league && rung.division !== "",
  );
}

export function findLeagueRung(
  ladder: LeagueLadder,
  rungId: string,
): LeagueRung | undefined {
  return ladder.find((rung) => rung.id === rungId);
}

/**
 * Bloc 135 §4 : la ligue de base d'un échelon, pour tous les outils qui n'ont
 * que faire des divisions.
 *
 * C'est le seul trajet légitime d'une division vers les paramètres des autres
 * outils, et il y en avait zéro : le Classement lisait l'échelon, et Gemmes,
 * Progression, Événements, Villes et Équipement lisaient `player.league`
 * chacun de leur côté — l'accord entre les deux ne tenait qu'à
 * `divisionsForLeague`, qui ne propose au joueur que des divisions de sa
 * propre ligue. Vrai aujourd'hui, et invérifiable : rien dans le code ne
 * disait que la division d'un joueur devait retomber sur sa ligue.
 *
 * Nommée ici, la règle devient testable, et un échelon « libre » (sans ligue
 * de base) rend `null` au lieu de laisser un appelant indexer un
 * `Record<League, …>` avec une valeur qui n'y est pas.
 *
 * Un identifiant qui ne nomme aucun échelon rend `null` lui aussi : c'est ce
 * qui arrive à une division que l'administration a supprimée depuis, et dont
 * l'identifiant dort encore dans le `localStorage` d'un joueur.
 */
export function baseLeagueOf(
  ladder: LeagueLadder,
  rungId: string,
): League | null {
  return findLeagueRung(ladder, rungId)?.league ?? null;
}

/**
 * Si cette liste d'échelons peut être stockée telle quelle — ce que Configuration
 * enregistre. Les identifiants doivent être uniques : c'est sur eux que pointent
 * les plages, donc un doublon rendrait une cible ambiguë. Et un échelon sans
 * ligue de base doit porter un nom libre, sinon rien ne le nomme.
 *
 * Bloc 137 : séparé de la validation des plages, parce que les deux moitiés de
 * l'échelle sont enregistrées par deux écrans. Celui de Configuration ne voit
 * pas les plages et n'a pas à en répondre.
 */
export function isSavableLadderStructure(
  structure: readonly LeagueRungStructure[],
): boolean {
  if (!structure.length) return false;
  const ids = new Set<string>();
  for (const rung of structure) {
    if (!rung.id) return false;
    if (ids.has(rung.id)) return false;
    ids.add(rung.id);
    if (!rung.league && !hasRungName(rung.name)) return false;
  }
  return true;
}

/**
 * Si cette échelle entière peut être stockée telle quelle : la liste, plus les
 * plages. C'est ce que vérifient les **deux** routes après fusion — chacune
 * n'écrit que sa moitié, mais ce qui part en base est une échelle complète, et
 * c'est elle qui doit tenir.
 */
export function isSavableLeagueLadder(ladder: LeagueLadder): boolean {
  if (!isSavableLadderStructure(ladderStructure(ladder))) return false;
  for (const rung of ladder)
    for (const item of rung.bands)
      if (item.threshold <= 0 || item.threshold > 100) return false;
  return true;
}

/**
 * Bloc 137 — l'échelle a deux propriétaires, et chacun n'écrit que sa moitié.
 *
 * Le Bloc 135 a déplacé l'échelle entière dans Configuration, plages de fin de
 * saison comprises. C'était couper au mauvais endroit : la **liste** des
 * échelons est un référentiel du site (qui existe, comment il s'appelle, dans
 * quel ordre, s'il est public), mais les **plages** sont le classement
 * lui-même, donc le paramètre de l'outil Classement. Les deux se gèrent
 * maintenant sur deux écrans.
 *
 * Ils partagent une seule ligne de `reference_tables`, d'où ces deux fusions.
 * Chaque écran renvoie l'état qu'il connaît ; la fusion ne reporte sur la
 * ligne stockée que les champs dont cet écran est propriétaire. Sans elle, le
 * dernier à enregistrer écraserait le travail de l'autre : régler des seuils
 * annulerait un renommage fait entre-temps, et réordonner la liste effacerait
 * les seuils.
 *
 * L'appariement se fait par identifiant, ce qui est sûr parce qu'un
 * identifiant est engendré une fois et jamais recalculé (voir `leagueRungId`
 * et `uniqueRungId`) : renommer ou déplacer un échelon ne le change pas.
 */
export type LeagueRungStructure = Omit<LeagueRung, "bands">;

/** L'identité des échelons, sans les plages — ce que Configuration édite. */
export function ladderStructure(ladder: LeagueLadder): LeagueRungStructure[] {
  // Champ par champ, et non « tout sauf les plages » : `LeagueRungStructure`
  // étant un `Omit`, le jour où un échelon gagne un champ d'identité, c'est
  // `tsc` qui rappelle de le faire voyager ici.
  return orderedLadder(ladder).map((rung) => ({
    id: rung.id,
    league: rung.league,
    division: rung.division,
    name: rung.name,
    position: rung.position,
    active: rung.active,
  }));
}

/**
 * La liste telle que Configuration vient de l'enregistrer, en gardant les
 * plages déjà stockées de chaque échelon. Un échelon qui vient d'être créé n'en
 * a aucune ; un échelon supprimé emporte les siennes, ce qui est bien le sens
 * d'une suppression.
 */
export function withLadderStructure(
  current: LeagueLadder,
  structure: LeagueRungStructure[],
): LeagueLadder {
  const bandsById = new Map(current.map((rung) => [rung.id, rung.bands]));
  return structure.map((rung, index) => ({
    ...rung,
    position: index,
    bands: bandsById.get(rung.id) ?? [],
  }));
}

/** Les plages par identifiant d'échelon — ce que l'outil Classement édite. */
export function ladderBands(
  ladder: LeagueLadder,
): Record<string, SeasonBand[]> {
  return Object.fromEntries(ladder.map((rung) => [rung.id, rung.bands]));
}

/**
 * Les plages telles que l'outil Classement vient de les enregistrer, sur
 * l'identité et l'ordre déjà stockés.
 *
 * Un identifiant que l'échelle ne connaît plus est **ignoré et nommé**, pas
 * refusé : il désigne un échelon supprimé depuis Configuration pendant que
 * l'écran du Classement était ouvert. Refuser toute la sauvegarde ferait perdre
 * au second administrateur un travail qui ne pose aucun problème, et le
 * ressusciter irait contre la suppression — d'où la troisième voie, appliquer
 * ce qui existe encore et dire ce qui a été laissé de côté. Un échelon dont
 * l'écran n'envoie rien garde ses plages : il n'était pas à l'écran, il n'a
 * rien à perdre.
 */
export function withLadderBands(
  current: LeagueLadder,
  bands: Record<string, SeasonBand[]>,
): { ladder: LeagueLadder; ignored: string[] } {
  const known = new Set(current.map((rung) => rung.id));
  return {
    ladder: current.map((rung) =>
      rung.id in bands ? { ...rung, bands: bands[rung.id] } : rung,
    ),
    ignored: Object.keys(bands).filter((id) => !known.has(id)),
  };
}

/**
 * Bloc 135 : la clé de la ligne qui porte l'échelle.
 *
 * Renommée depuis `ranking_leagues` par la migration
 * `20260926000000_leagues_divisions_central` : l'échelle n'appartient plus à
 * l'outil Classement, et une clé qui le nomme encore enverrait le prochain
 * lecteur au mauvais endroit.
 */
export const leagueLadderKey = "leagues_divisions";
/** L'ancienne clé, lue en repli — voir `getLeagueLadder`. */
const legacyLeagueLadderKey = "ranking_leagues";

/**
 * Le client minimal qu'une lecture de l'échelle demande : le client Prisma, ou
 * celui d'une transaction en cours.
 *
 * Bloc 137, revue Codex : les deux routes qui écrivent l'échelle doivent la lire
 * *dans* leur transaction. Chacune n'écrit que sa moitié en la fusionnant sur ce
 * qu'elle a lu ; une lecture faite avant la transaction laisse une fenêtre où
 * deux enregistrements simultanés partent du même instantané, et le second
 * réécrit la ligne entière — donc défait l'autre moitié, ce que toute la
 * mécanique existe pour empêcher.
 */
export type LeagueLadderReader = {
  referenceTable: Pick<PrismaClient["referenceTable"], "findMany">;
};

export async function readLeagueLadder(
  client: LeagueLadderReader,
): Promise<LeagueLadder> {
  // Les deux clés d'un seul aller-retour, la nouvelle d'abord. Le repli
  // existe pour la fenêtre où l'application tourne sans que
  // `prisma migrate deploy` ait encore renommé la ligne : sans lui, l'échelle
  // que l'administration a construite disparaîtrait du site public au profit
  // des six ligues par défaut, sans le moindre message.
  const rows = await client.referenceTable.findMany({
    where: { key: { in: [leagueLadderKey, legacyLeagueLadderKey] } },
    select: { key: true, rows: true },
  });
  const stored =
    rows.find((row) => row.key === leagueLadderKey) ??
    rows.find((row) => row.key === legacyLeagueLadderKey);
  return stored ? parseLeagueLadder(stored.rows) : defaultLeagueLadder;
}

/** L'échelle, pour un lecteur qui n'est pas au milieu d'une transaction. */
export async function getLeagueLadder(): Promise<LeagueLadder> {
  return readLeagueLadder(prisma);
}
