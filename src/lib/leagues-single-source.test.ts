import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bloc 137 — une seule porte pour créer ou modifier une ligue.
 *
 * Le Bloc 135 a sorti le CRUD des ligues et des divisions de l'outil Classement
 * pour en faire une section de Configuration, et l'a affirmé livré. Le porteur
 * de projet a pourtant retrouvé l'édition de ligue dans le Classement : sur le
 * code déployé, neuf jours plus vieux que le correctif — pas sur `dev`. Le
 * déplacement était donc juste, et ses tests aussi.
 *
 * Ce que personne ne tenait, c'est **l'absence**. Les tests du Bloc 135
 * vérifiaient ce qui avait été construit — la section existe, le tableau Outils
 * y renvoie — jamais qu'aucun autre écran ne portait plus la même capacité. Une
 * branche `id === "ranking"` remise dans l'écran d'édition, un panneau monté
 * ailleurs, une seconde route d'écriture : rien ne tombait.
 *
 * D'où ce fichier, qui énonce la règle produit elle-même plutôt qu'un symptôme :
 * **un seul écran monte le CRUD, une seule route écrit l'échelle, et le
 * Classement n'en porte aucun des deux** — vérifié sur l'arbre des sources, donc
 * vrai pour une porte d'entrée qu'on n'a pas imaginée ici.
 */

const srcRoot = join(process.cwd(), "src");

/** Le composant du CRUD. */
const crudComponent = "AdminLeaguesPanel";

/** Le seul écran autorisé à monter le CRUD. */
const theOneScreen = "app/admin/config/page.tsx";
/** La seule route autorisée à écrire l'échelle. */
const theOneRoute = "app/api/admin/config/leagues/route.ts";
/** Le panneau lui-même : il est le CRUD, il porte donc les symboles d'écriture. */
const thePanel = "components/admin-leagues-panel.tsx";
/** Le module de l'échelle, qui définit ces symboles. */
const theModule = "lib/leagues.ts";

/**
 * Les deux symboles sans lesquels on ne peut pas écrire l'échelle, et la liste
 * exhaustive des fichiers livrés qui les portent. Écrite en clair plutôt que
 * calculée : c'est l'inventaire qu'on veut relire, et tout nouvel entrant doit
 * être ajouté ici à la main — donc vu, discuté, et non glissé au passage.
 *
 * `leagueLadderKey` est la clé de la ligne de `reference_tables` : la route la
 * nomme pour l'écrire, le module pour la définir. Le panneau ne la connaît pas —
 * il envoie son échelle à la route et ignore où elle est rangée.
 */
const writeSymbolOwners = {
  // La clé de stockage : seuls le module qui la définit et la route qui écrit.
  leagueLadderKey: [theModule, theOneRoute],
  // Le validateur d'écriture : le module, la route qui refuse une échelle
  // invalide, et le panneau qui grise « Enregistrer » avant de l'envoyer.
  isSavableLeagueLadder: [theModule, thePanel, theOneRoute],
} as const;
const writeSymbols = Object.keys(
  writeSymbolOwners,
) as (keyof typeof writeSymbolOwners)[];

/**
 * Les sous-arbres qui appartiennent au Classement — l'admin des outils, son API,
 * et les composants de l'outil public. Aucun ne doit porter de capacité
 * d'écriture de l'échelle, ni monter le CRUD.
 */
const rankingOwned = [
  "app/admin/tools/",
  "app/api/admin/tools/",
  "components/ranking-calculator.tsx",
  "components/ranking-icons.tsx",
  "components/league-rung-label.ts",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry)) return [];
    // Les tests parlent de ces symboles pour les éprouver ; la règle porte sur
    // le code livré.
    if (/\.test\.tsx?$/.test(entry)) return [];
    return [relative(srcRoot, full).split("\\").join("/")];
  });
}

/**
 * Retire commentaires de bloc et de ligne. Indispensable, et pas cosmétique :
 * `components/ranking-calculator.tsx` et `lib/ranking.ts` nomment
 * `isSavableLeagueLadder` dans un commentaire d'explication, sans l'importer.
 * Sans ce nettoyage, la règle ci-dessous accuserait le Classement à tort — et
 * comme ces deux fichiers existent aujourd'hui, un nettoyage cassé ferait
 * tomber les cas de ce fichier au lieu de passer inaperçu.
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

describe("Bloc 137: creating or editing a league has exactly one door", () => {
  it("reads a source tree at all", () => {
    // Un garde-fou sur le garde-fou : si le balayage ne trouvait plus rien, les
    // cas suivants passeraient pour de mauvaises raisons.
    expect(files.length).toBeGreaterThan(100);
    expect(files.map(({ path }) => path)).toContain(theOneScreen);
  });

  it("mounts the leagues CRUD on the Configuration screen and nowhere else", () => {
    expect(usersOf(crudComponent)).toEqual(sorted([theOneScreen, thePanel]));
  });

  it.each(writeSymbols)(
    "lets only the leagues route write the ladder (%s)",
    (symbol) => {
      expect(usersOf(symbol)).toEqual(sorted(writeSymbolOwners[symbol]));
    },
  );

  it("leaves the Classement — admin and public — without any of it", () => {
    const owned = files.filter(({ path }) =>
      rankingOwned.some((prefix) => path.startsWith(prefix)),
    );
    // Le Classement a bien des fichiers : sinon la règle ne vérifierait rien.
    expect(owned.length).toBeGreaterThan(0);
    const offenders = owned.flatMap(({ path, code }) =>
      [crudComponent, ...writeSymbols]
        .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(code))
        .map((symbol) => `${path} → ${symbol}`),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the ladder's write endpoint single, under Configuration", () => {
    const routesWriting = files
      .filter(({ path }) => path.endsWith("/route.ts"))
      .filter(({ code }) =>
        writeSymbols.some((s) => new RegExp(`\\b${s}\\b`).test(code)),
      )
      .map(({ path }) => path);
    expect(routesWriting).toEqual([theOneRoute]);
  });
});
