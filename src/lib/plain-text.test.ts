import { describe, expect, it } from "vitest";
import { plainText } from "./plain-text";

describe("Bloc 129 §1.4 : un résumé de guide sans son balisage", () => {
  it("retire le gras que les résumés affichaient tel quel", () => {
    expect(
      plainText(
        "Découvre les bases de **Million Lords** dès la première ville.",
      ),
    ).toBe("Découvre les bases de Million Lords dès la première ville.");
  });

  it("retire aussi l'emphase, le code et le gras-italique", () => {
    expect(plainText("*Or* et ***troupes***, via `city-cost`.")).toBe(
      "Or et troupes, via city-cost.",
    );
    expect(plainText("Les _ligues_ et __la progression__.")).toBe(
      "Les ligues et la progression.",
    );
  });

  it("garde le texte d'un lien, pas son adresse", () => {
    expect(plainText("Vois [le guide des villes](/guides/villes).")).toBe(
      "Vois le guide des villes.",
    );
  });

  it("enlève une marque de titre ou de puce en tête de ligne", () => {
    expect(plainText("## Bien débuter")).toBe("Bien débuter");
    expect(plainText("- Première ville\n- Deuxième ville")).toBe(
      "Première ville\nDeuxième ville",
    );
    expect(plainText("> À retenir")).toBe("À retenir");
  });

  it("laisse tranquille un résumé qui n'a jamais eu de balisage", () => {
    const written =
      "Bronze, Argent, Or, Platine, Diamant ou Légende : ce qui change.";
    expect(plainText(written)).toBe(written);
  });

  it("ne mange pas une apostrophe ni un tiret au milieu d'un mot", () => {
    expect(plainText("L'or d'une ville — et 3-4 troupes.")).toBe(
      "L'or d'une ville — et 3-4 troupes.",
    );
  });
});
