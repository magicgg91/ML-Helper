import { describe, expect, it } from "vitest";
import { splitLeadingHeading } from "./legal-notice";
import { guideOutline } from "./guide-outline";

describe("Bloc 129 §3.7 : le titre et le corps des mentions légales", () => {
  it("sort le titre de tête du corps", () => {
    const { title, body } = splitLeadingHeading(
      "# Mentions légales\n\n## Éditeur\n\nML-Helper.",
    );
    expect(title).toBe("Mentions légales");
    expect(body).toBe("## Éditeur\n\nML-Helper.");
  });

  it("laisse intact un document qui n'ouvre pas sur un titre", () => {
    const markdown = "## Éditeur\n\nML-Helper.";
    expect(splitLeadingHeading(markdown)).toEqual({ body: markdown });
  });

  it("ne confond pas un H2 de tête avec le titre du document", () => {
    const { title } = splitLeadingHeading("## Éditeur\n\ntexte");
    expect(title).toBeUndefined();
  });

  // Les titres ne sont pas renumérotés sur cette page — le document porte
  // son propre H1 — donc le sommaire lit les H2 tels qu'ils sont écrits.
  it("liste les H2 du corps sans les renuméroter", () => {
    const { body } = splitLeadingHeading(
      "# Mentions légales\n\n## Éditeur\n\n### Adresse\n\n## Hébergeur",
    );
    expect(guideOutline(body, { shift: false })).toEqual([
      { id: "editeur", label: "Éditeur" },
      { id: "hebergeur", label: "Hébergeur" },
    ]);
    // La différence se voit sur un corps qui commence plus profond : la
    // renumérotation le remonterait en H2 et le mettrait au sommaire, alors
    // qu'ici il reste un H3 — c'est exactement ce que l'option évite.
    const deep = "### Adresse\n\n## Hébergeur";
    expect(guideOutline(deep, { shift: false }).map((h) => h.label)).toEqual([
      "Hébergeur",
    ]);
    expect(guideOutline(deep).map((h) => h.label)).toEqual([
      "Adresse",
      "Hébergeur",
    ]);
  });
});
