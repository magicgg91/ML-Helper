import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bloc 137 — chaque moitié de l'échelle n'a qu'une porte, et ce n'est pas la même.
 *
 * Deux blocs de suite ont coupé au mauvais endroit. Le Bloc 108 a mis l'échelle
 * entière sous l'écran de l'outil Classement, CRUD compris, alors que tous les
 * outils la lisent. Le Bloc 135 l'a entièrement déplacée dans Configuration,
 * plages de fin de saison comprises, alors que ces plages sont le classement —
 * d'où ce qu'a trouvé le porteur de projet : une création de ligue là où l'on
 * venait éditer un classement.
 *
 * Aucun test ne tenait la découpe elle-même, dans un sens comme dans l'autre.
 * Celui-ci l'énonce sur l'arbre des sources, donc pour une porte d'entrée qu'on
 * n'aurait pas imaginée :
 *
 * - **créer, supprimer, renommer, réordonner, publier un échelon** n'est possible
 *   que depuis la section de Configuration ;
 * - **régler les seuils et les récompenses** n'est possible que depuis l'écran de
 *   l'outil Classement ;
 * - et chacun n'a qu'une route pour écrire.
 *
 * Une première version de ce fichier (PR #161, fermée) interdisait au Classement
 * de porter *quoi que ce soit* sur les ligues. C'était l'invariant inverse de
 * celui-ci, et il aurait figé la faute qu'on corrige : les plages sont
 * précisément ce que cet écran doit porter.
 */

const srcRoot = join(process.cwd(), "src");

/** Le panneau du référentiel, et l'écran du classement. */
const referentialPanel = "AdminLeaguesPanel";
const rankingScreen = "AdminRankingEditor";

/** Les deux écrans, et les deux routes : une porte chacun, et pas deux. */
const theReferentialScreen = "app/admin/config/page.tsx";
const theReferentialRoute = "app/api/admin/config/leagues/route.ts";
const theRankingScreen = "app/admin/tools/[id]/page.tsx";
const theRankingRoute = "app/api/admin/tools/ranking/route.ts";
const theModule = "lib/leagues.ts";

/**
 * Les fusions par champs : chacune nomme la moitié que sa route écrit. Elles sont
 * le mécanisme qui empêche un écran d'effacer le travail de l'autre, et le
 * mécanisme n'a de sens que si une seule route l'appelle de chaque côté.
 */
const owners = {
  // Configuration écrit l'identité et l'ordre.
  withLadderStructure: [theModule, theReferentialRoute],
  // L'outil Classement écrit les plages.
  withLadderBands: [theModule, theRankingRoute],
  // La clé de stockage : les deux routes y touchent, personne d'autre.
  leagueLadderKey: [theModule, theReferentialRoute, theRankingRoute],
} as const;
const mergeSymbols = Object.keys(owners) as (keyof typeof owners)[];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry)) return [];
    // Les tests nomment ces symboles pour les éprouver ; la règle porte sur le
    // code livré.
    if (/\.test\.tsx?$/.test(entry)) return [];
    return [relative(srcRoot, full).split("\\").join("/")];
  });
}

/**
 * Retire commentaires de bloc et de ligne. Indispensable, et pas cosmétique :
 * plusieurs fichiers nomment ces symboles dans un commentaire d'explication sans
 * les importer — `lib/ranking.ts` et `components/ranking-calculator.tsx` en
 * premier. Sans ce nettoyage la règle accuserait à tort ; et comme ces fichiers
 * existent, un nettoyage cassé fait tomber les cas de ce fichier au lieu de
 * passer inaperçu.
 */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const files = sourceFiles(srcRoot).map((path) => ({
  path,
  code: withoutComments(readFileSync(join(srcRoot, path), "utf8")),
}));

const sorted = (paths: readonly string[]) => [...paths].sort();
const usersOf = (symbol: string) =>
  files
    .filter(({ code }) => new RegExp(`\\b${symbol}\\b`).test(code))
    .map(({ path }) => path)
    .sort();

describe("Bloc 137: the two halves of the ladder, and their two doors", () => {
  it("reads a source tree at all", () => {
    // Un garde-fou sur le garde-fou : un balayage vide ferait passer tout le
    // reste pour de mauvaises raisons.
    expect(files.length).toBeGreaterThan(100);
    expect(files.map(({ path }) => path)).toContain(theReferentialScreen);
    expect(files.map(({ path }) => path)).toContain(theRankingScreen);
  });

  it("mounts the referential CRUD on the Configuration screen alone", () => {
    expect(usersOf(referentialPanel)).toEqual(
      sorted([theReferentialScreen, "components/admin-leagues-panel.tsx"]),
    );
  });

  it("mounts the bands editor on the Classement tool's screen alone", () => {
    expect(usersOf(rankingScreen)).toEqual(
      sorted([theRankingScreen, "components/admin-ranking-editor.tsx"]),
    );
  });

  it.each(mergeSymbols)("gives %s exactly one writer", (symbol) => {
    expect(usersOf(symbol)).toEqual(sorted(owners[symbol]));
  });

  it("keeps the Configuration panel out of the bands", () => {
    // La faute du Bloc 135, retournée en règle : le panneau du référentiel ne
    // doit porter aucun champ de plage. Il en dit le nombre, ce qui est une
    // lecture, et renvoie à l'écran qui les règle.
    const panel = files.find(
      ({ path }) => path === "components/admin-leagues-panel.tsx",
    );
    expect(panel).toBeDefined();
    for (const symbol of ["seasonMovements", "seasonRewardTypes", "SeasonBand"])
      expect(panel?.code, symbol).not.toMatch(new RegExp(`\\b${symbol}\\b`));
  });

  it("keeps the Classement screen out of the referential", () => {
    // Et l'inverse, qui est le constat du porteur de projet : l'écran de l'outil
    // ne doit porter aucun moyen de nommer, créer ou publier un échelon.
    const screen = files.find(
      ({ path }) => path === "components/admin-ranking-editor.tsx",
    );
    expect(screen).toBeDefined();
    for (const symbol of [
      "rungNameToStore",
      "rungNameForm",
      "leagueRungId",
      "VisibilitySwitch",
      "LangTabs",
    ])
      expect(screen?.code, symbol).not.toMatch(new RegExp(`\\b${symbol}\\b`));
  });

  it("lets exactly two routes write the ladder, one per half", () => {
    const routesWriting = files
      .filter(({ path }) => path.endsWith("/route.ts"))
      .filter(({ code }) => /\bleagueLadderKey\b/.test(code))
      .map(({ path }) => path)
      .sort();
    expect(routesWriting).toEqual(
      sorted([theReferentialRoute, theRankingRoute]),
    );
  });
});
