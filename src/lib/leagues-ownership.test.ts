import { describe, expect, it } from "vitest";
import {
  ladderBands,
  ladderStructure,
  withLadderBands,
  withLadderStructure,
  type LeagueLadder,
  type SeasonBand,
} from "./leagues";

/**
 * Bloc 137 — les deux moitiés de l'échelle, et ce qu'aucune ne doit emporter.
 *
 * Le Bloc 135 avait mis l'échelle entière dans Configuration. La liste des
 * échelons y appartient ; les plages de fin de saison, non — c'est le
 * classement, donc le paramètre de l'outil Classement. Les deux écrans se
 * partagent maintenant une seule ligne de `reference_tables`, et c'est la seule
 * chose vraiment délicate de ce bloc : sans fusion par champs, le dernier à
 * enregistrer écrase le travail de l'autre.
 *
 * Ces cas sont écrits comme deux administrateurs qui travaillent en même temps,
 * parce que c'est exactement la situation que la fusion existe pour tenir.
 */

const band = (threshold: number, sapphires: number): SeasonBand => ({
  threshold,
  movement: "promotion",
  target: "silver",
  rewards: [{ type: "sapphires", quantity: sapphires }],
});

/** Trois échelons, dont un portant un nom libre et un inactif. */
const stored: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [band(10, 100)],
  },
  {
    id: "silver-2",
    league: "silver",
    division: "2",
    name: {},
    position: 1,
    active: true,
    bands: [band(20, 200), band(50, 50)],
  },
  {
    id: "studio-cup",
    league: null,
    division: "",
    name: { fr: "Coupe du studio", en: "Studio cup" },
    position: 2,
    active: false,
    bands: [band(30, 300)],
  },
];

describe("Bloc 137: Configuration owns the list, the Classement tool owns the bands", () => {
  it("splits the ladder into the two halves the two screens edit", () => {
    expect(ladderStructure(stored).map((rung) => rung.id)).toEqual([
      "bronze",
      "silver-2",
      "studio-cup",
    ]);
    // L'identité voyage en entier — y compris le nom libre par langue et le
    // drapeau public, que Configuration édite.
    expect(ladderStructure(stored)[2]).toEqual({
      id: "studio-cup",
      league: null,
      division: "",
      name: { fr: "Coupe du studio", en: "Studio cup" },
      position: 2,
      active: false,
    });
    // Et pas les plages : c'est tout l'objet de la découpe.
    expect(ladderStructure(stored)[2]).not.toHaveProperty("bands");
    expect(ladderBands(stored)).toEqual({
      bronze: [band(10, 100)],
      "silver-2": [band(20, 200), band(50, 50)],
      "studio-cup": [band(30, 300)],
    });
  });

  describe("saving the list from Configuration", () => {
    it("keeps every band of every rung it did not touch", () => {
      // Le cas du Bloc 137 : renommer et réordonner ne doit rien coûter au
      // classement.
      const renamedAndReordered = ladderStructure(stored)
        .map((rung) =>
          rung.id === "studio-cup"
            ? { ...rung, name: { fr: "Coupe des fondateurs" } }
            : rung,
        )
        .reverse();
      const merged = withLadderStructure(stored, renamedAndReordered);
      expect(merged.map((rung) => rung.id)).toEqual([
        "studio-cup",
        "silver-2",
        "bronze",
      ]);
      expect(merged[0].name).toEqual({ fr: "Coupe des fondateurs" });
      // Chaque échelon a suivi avec ses plages, malgré le changement d'ordre.
      expect(ladderBands(merged)).toEqual(ladderBands(stored));
    });

    it("renumbers positions from the saved order, not from what it was sent", () => {
      // Bloc 108/B : la position est l'index dans la liste. Un écran qui
      // renvoie des positions périmées ne doit pas les imposer.
      const stale = ladderStructure(stored)
        .reverse()
        .map((rung) => ({ ...rung, position: 99 }));
      expect(withLadderStructure(stored, stale).map((r) => r.position)).toEqual(
        [0, 1, 2],
      );
    });

    it("gives a rung that has just been created no bands at all", () => {
      const withNewRung = [
        ...ladderStructure(stored),
        {
          id: "legend",
          league: "legend" as const,
          division: "",
          name: {},
          position: 3,
          active: true,
        },
      ];
      const merged = withLadderStructure(stored, withNewRung);
      expect(merged[3].id).toBe("legend");
      expect(merged[3].bands).toEqual([]);
    });

    it("lets a deleted rung take its bands with it", () => {
      const withoutSilver = ladderStructure(stored).filter(
        (rung) => rung.id !== "silver-2",
      );
      const merged = withLadderStructure(stored, withoutSilver);
      expect(merged.map((rung) => rung.id)).toEqual(["bronze", "studio-cup"]);
      expect(ladderBands(merged)).not.toHaveProperty("silver-2");
    });
  });

  describe("saving the bands from the Classement tool", () => {
    it("keeps the name, order and public flag of every rung", () => {
      // L'autre moitié du même risque : régler des seuils ne doit pas défaire
      // un renommage ni une désactivation faits dans Configuration.
      const { ladder, ignored } = withLadderBands(stored, {
        bronze: [band(15, 150)],
      });
      expect(ignored).toEqual([]);
      expect(ladder[0].bands).toEqual([band(15, 150)]);
      expect(ladderStructure(ladder)).toEqual(ladderStructure(stored));
    });

    it("leaves untouched the bands of a rung it was not sent", () => {
      const { ladder } = withLadderBands(stored, { bronze: [] });
      expect(ladder[0].bands).toEqual([]);
      expect(ladder[1].bands).toEqual(stored[1].bands);
      expect(ladder[2].bands).toEqual(stored[2].bands);
    });

    it("names the rungs deleted meanwhile instead of resurrecting them", () => {
      // Deux administrateurs : l'un supprime un échelon depuis Configuration,
      // l'autre avait l'écran du Classement ouvert et enregistre. Ce qui existe
      // encore est appliqué, ce qui n'existe plus est nommé — ni perdu en
      // silence, ni ressuscité.
      const { ladder, ignored } = withLadderBands(stored, {
        bronze: [band(15, 150)],
        "diamond-2": [band(90, 900)],
      });
      expect(ignored).toEqual(["diamond-2"]);
      expect(ladder.map((rung) => rung.id)).toEqual([
        "bronze",
        "silver-2",
        "studio-cup",
      ]);
      expect(ladder[0].bands).toEqual([band(15, 150)]);
    });

    it("never adds or removes a rung, whatever it is sent", () => {
      const { ladder } = withLadderBands(stored, {
        unknown: [band(1, 1)],
        other: [],
      });
      expect(ladder.map((rung) => rung.id)).toEqual(
        stored.map((rung) => rung.id),
      );
    });
  });

  it("round-trips: splitting then re-merging changes nothing", () => {
    const viaStructure = withLadderStructure(stored, ladderStructure(stored));
    expect(viaStructure).toEqual(stored);
    const { ladder, ignored } = withLadderBands(stored, ladderBands(stored));
    expect(ignored).toEqual([]);
    expect(ladder).toEqual(stored);
  });

  it("does not let either screen mutate the stored ladder in place", () => {
    const snapshot = structuredClone(stored);
    withLadderStructure(stored, ladderStructure(stored).reverse());
    withLadderBands(stored, { bronze: [] });
    expect(stored).toEqual(snapshot);
  });
});
