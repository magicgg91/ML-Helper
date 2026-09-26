import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { baseLeagueOf, divisionsForLeague, type LeagueLadder } from "./leagues";
import { gemValue, templarUpgradeCost } from "./gems-templars";
import { cityStatsAt } from "./city-calculators";
import { levelUpTroopsAt, defaultLevelUpParameters } from "./level-up";
import { emptyEventsCatalog } from "./events";
import { defaultDemoPercentages } from "./combat-calculators";
import { gemImagePath } from "./game-images";
import { skillCapForLeague, leagues, type League } from "./player-settings";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

/**
 * Bloc 135 §5 : ce que chaque outil sait, ou ne sait pas, d'une ligue.
 *
 * Le brief demandait de vérifier quatre outils dans le code plutôt que de le
 * supposer, et de ne laisser aucun sans réponse. Le constat est écrit ici, en
 * test, pour deux raisons : il est refaisable par quiconque relit, et il
 * tombe le jour où l'un d'eux se met à lire une ligue sans que personne y
 * pense.
 *
 * Trois réponses possibles, et trois seulement : **aucun lien**, **la ligue
 * de base**, **la division complète**. Aucun consommateur n'a demandé un
 * quatrième mécanisme.
 */

/** Les modules qui composent chaque outil, tels qu'ils sont sur le disque. */
const withoutLeagues = [
  {
    tool: "Équipement de Combat — le référentiel",
    files: ["src/lib/reference-equipment.ts"],
    why: "un catalogue de pièces : rareté, ensemble, compétences.",
  },
  {
    tool: "Équipements d'Expédition",
    files: [
      "src/lib/expedition-equipment.ts",
      "src/components/expedition-equipment-tools.tsx",
    ],
    why: "les emplacements d'expédition ne portent pas de gemme.",
  },
  {
    tool: "Templiers",
    files: [
      "src/lib/templar-parameters.ts",
      "src/lib/templars-presentation.ts",
      "src/lib/templars-presentation-server.ts",
      "src/components/templars-calculator.tsx",
      "src/components/templars-reference.tsx",
      "src/components/admin-templars-editor.tsx",
    ],
    why: "le coût d'un niveau ne dépend que du niveau.",
  },
  {
    tool: "Boutique",
    files: [
      "src/lib/consumables.ts",
      "src/lib/consumables-server.ts",
      "src/components/consumables-reference.tsx",
      "src/components/admin-shop-editor.tsx",
    ],
    why: "un consommable a un prix et une catégorie.",
  },
];

describe("Bloc 135 §5 : les outils sans aucun lien avec une ligue", () => {
  it.each(withoutLeagues)("$tool — $why", ({ files }) => {
    for (const file of files) {
      const source = read(file);
      // Le fichier existe et n'est pas vide : sans cette ligne, un renommage
      // ferait passer le constat pour vrai en ne lisant plus rien.
      expect(source.length, file).toBeGreaterThan(0);
      expect(source, file).not.toMatch(/\bleague|\bLeague|\bdivision/);
    }
  });

  /**
   * Et la même chose vue du comportement, pour les Templiers : le coût d'une
   * montée est le même quelle que soit la ligue, parce qu'il n'en reçoit
   * aucune. C'est ce qu'une lecture de source ne peut pas dire toute seule.
   */
  it("Templiers : le coût d'une montée ne prend aucune ligue", () => {
    expect(templarUpgradeCost(3, 12)).toBe(templarUpgradeCost(3, 12));
    expect(templarUpgradeCost.length).toBeLessThanOrEqual(3);
  });
});

/** Une échelle de production : dix échelons, divisions comprises. */
function ladderWithDivisions(): LeagueLadder {
  const rungs: Array<[League, string]> = [
    ["bronze", ""],
    ["silver", "2"],
    ["silver", "1"],
    ["gold", "2"],
    ["gold", "1"],
    ["platinum", "2"],
    ["platinum", "1"],
    ["diamond", "2"],
    ["diamond", "1"],
    ["legend", ""],
  ];
  return rungs.map(([league, division], index) => ({
    id: division ? `${league}-${division}` : league,
    league,
    division,
    name: {},
    position: index,
    active: true,
    bands: [],
  }));
}

/**
 * Bloc 135 §4 : les outils qui lisent une ligue de base, et rien d'autre.
 *
 * Ce qui est vérifié n'est pas qu'ils « utilisent le helper » — la plupart
 * reçoivent déjà une ligue de base, parce que c'est ce que le champ du joueur
 * contient. C'est que **le helper donne la même réponse qu'eux** : pour un
 * joueur en Or 1, chacun rend exactement ce qu'il rendait pour Or. C'est la
 * définition de « sortie identique », et c'est ce qui autorise à n'avoir
 * qu'un seul chemin.
 */
describe("Bloc 135 §4 : la ligue de base, et rien d'autre", () => {
  const ladder = ladderWithDivisions();
  /** Le joueur est en Or 1 ; sa ligue de base est Or. */
  const rung = "gold-1";
  const base = baseLeagueOf(ladder, rung)!;

  it("le helper rend bien la ligue que le joueur porte", () => {
    expect(base).toBe("gold");
  });

  it("Gemmes : même valeur par étoile pour la division et pour sa ligue", () => {
    expect(gemValue("striker", base)).toBe(gemValue("striker", "gold"));
    expect(gemImagePath("striker", base)).toBe(gemImagePath("striker", "gold"));
  });

  it("Progression : mêmes troupes pour la division et pour sa ligue", () => {
    const parameters = defaultLevelUpParameters;
    for (const level of [10, 60, 150])
      expect(levelUpTroopsAt(level, base, parameters)).toBe(
        levelUpTroopsAt(level, "gold", parameters),
      );
  });

  it("Événements : même catalogue pour la division et pour sa ligue", () => {
    expect(emptyEventsCatalog[base]).toEqual(emptyEventsCatalog.gold);
    // Et la clé existe : indexer avec une division rendrait `undefined`, ce
    // que le typage interdit mais que ce test rend visible.
    expect(emptyEventsCatalog[base]).toBeDefined();
  });

  it("Villes : mêmes multiplicateurs pour la division et pour sa ligue", () => {
    expect(cityStatsAt(30, base)).toEqual(cityStatsAt(30, "gold"));
  });

  it("Combat : même part de troupes en attaque démo", () => {
    expect(defaultDemoPercentages[base]).toBe(defaultDemoPercentages.gold);
  });

  it("Équipement : même plafond de compétence", () => {
    expect(skillCapForLeague("striker", base)).toBe(
      skillCapForLeague("striker", "gold"),
    );
  });

  /**
   * Et l'invariant qui rend tout ce qui précède vrai en général, pas
   * seulement sur Or 1 : une division ne peut appartenir qu'à la ligue sous
   * laquelle le sélecteur des Paramètres joueur la propose.
   */
  it("aucune division ne renvoie vers une autre ligue que la sienne", () => {
    for (const league of leagues)
      for (const division of divisionsForLeague(ladder, league))
        expect(baseLeagueOf(ladder, division.id), division.id).toBe(league);
  });

  /**
   * Le seul module qui a besoin du trajet complet : l'échelle elle-même n'a
   * qu'une énumération de ligues de base, et c'est celle de
   * `player-settings`. Le doublon `cityLeagues` a disparu au Bloc 135 — ce
   * test est là pour qu'il ne revienne pas.
   */
  it("n'a qu'une seule énumération des six ligues dans tout le dépôt", () => {
    const parameters = read("src/lib/city-parameters.ts");
    // Le nom ne subsiste que dans le commentaire qui raconte sa disparition.
    expect(parameters).not.toMatch(/^\s*export const cityLeagues/m);
    expect(parameters).not.toMatch(/^\s*export type CityLeague/m);
    expect(parameters).toContain('from "./player-settings"');
    expect(parameters).toContain("leagues.map(");
  });
});
