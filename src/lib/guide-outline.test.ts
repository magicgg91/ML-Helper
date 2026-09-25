import { describe, expect, it } from "vitest";
import { guideOutline, headingId, shiftedHeadingLevels } from "./guide-outline";

describe("Bloc 129 §3.5 : le sommaire d'un guide", () => {
  it("liste les titres qui seront rendus en H2", () => {
    expect(
      guideOutline("## Premiers pas\n\ntexte\n\n## L'or\n\n### Détail"),
    ).toEqual([
      { id: "premiers-pas", label: "Premiers pas" },
      { id: "l-or", label: "L'or" },
    ]);
  });

  it("suit la renumérotation du rendu, pas le niveau écrit", () => {
    // Un corps qui ouvre sur `#` voit ce titre rendu en H2 (il passe sous le
    // H1 de la page) : il est au sommaire. Ses `##` deviennent des H3.
    expect(guideOutline("# Tout en haut\n\n## Dessous")).toEqual([
      { id: "tout-en-haut", label: "Tout en haut" },
    ]);
  });

  it("ignore un dièse qui vit dans un bloc de code", () => {
    expect(guideOutline("## Vrai titre\n\n```\n# pas un titre\n```\n")).toEqual(
      [{ id: "vrai-titre", label: "Vrai titre" }],
    );
  });

  it("départage deux titres identiques", () => {
    expect(guideOutline("## Bilan\n\n## Bilan").map((h) => h.id)).toEqual([
      "bilan",
      "bilan-2",
    ]);
  });

  it("compte les titres non listés dans la numérotation des ancres", () => {
    // Le H3 « Bilan » consomme l'ancre « bilan » au rendu ; le H2 « Bilan »
    // qui suit doit donc recevoir « bilan-2 » ici aussi, sinon le lien du
    // sommaire tomberait sur le H3.
    expect(guideOutline("## Intro\n\n### Bilan\n\n## Bilan")).toEqual([
      { id: "intro", label: "Intro" },
      { id: "bilan-2", label: "Bilan" },
    ]);
  });

  it("n'a rien à lister dans un guide sans titre", () => {
    expect(guideOutline("Juste un paragraphe.")).toEqual([]);
  });

  describe("les identifiants d'ancre", () => {
    it("retirent accents et ponctuation", () => {
      expect(headingId("Coût de Ville : le mur")).toBe("cout-de-ville-le-mur");
    });

    it("gardent quelque chose même d'un titre entièrement ponctué", () => {
      expect(headingId("« ? »")).toBe("section");
    });
  });

  describe("la renumérotation", () => {
    it("ferme un saut de niveau écrit par l'auteur", () => {
      expect(shiftedHeadingLevels([2, 4, 4, 2])).toEqual([2, 3, 3, 2]);
    });

    it("remonte un corps qui commence trop profond", () => {
      expect(shiftedHeadingLevels([3, 4])).toEqual([2, 3]);
    });
  });
});
