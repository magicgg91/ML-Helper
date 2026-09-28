import { describe, expect, it } from "vitest";
import {
  countLegalNoticePlaceholders,
  defaultEnglishLegalNotice,
  defaultFrenchLegalNotice,
  legalNoticePlaceholders,
} from "./legal-notice";

describe("Bloc 119: the legal notice's unfinished fields", () => {
  it("finds every bracketed field of the French default", () => {
    const found = legalNoticePlaceholders(defaultFrenchLegalNotice);
    expect(found).toContain("[NOM DE L'ÉDITEUR — À COMPLÉTER]");
    expect(found).toContain("[ADRESSE DE L'HÉBERGEUR — À COMPLÉTER]");
    // The cookie note is bracketed and addressed to the site owner too: it
    // must not reach a reader of the public page either.
    expect(found).toContain(
      "[À AJUSTER SI DES COOKIES SONT AJOUTÉS ULTÉRIEUREMENT.]",
    );
  });

  it("counts the same number of fields in both shipped languages", () => {
    // The two defaults are translations of one another. A marker wording the
    // regex does not know would make one of the two count zero — this is the
    // check that catches it, rather than a screen quietly reporting "rien à
    // traiter".
    const french = countLegalNoticePlaceholders(defaultFrenchLegalNotice);
    expect(french).toBe(7);
    expect(countLegalNoticePlaceholders(defaultEnglishLegalNotice)).toBe(
      french,
    );
  });

  it("returns them in the order they appear in the text", () => {
    const [first] = legalNoticePlaceholders(defaultFrenchLegalNotice);
    // "Aller au premier" scrolls to this one, so the order is not incidental.
    expect(first).toBe("[NOM DE L'ÉDITEUR — À COMPLÉTER]");
  });

  it("reports nothing for a notice that has been filled in", () => {
    const filled = defaultFrenchLegalNotice
      .replaceAll(/\[[^\]]*À COMPLÉTER\]/g, "Jean Dupont")
      .replaceAll(/\[[^\]]*À AJUSTER[^\]]*\]/g, "");
    expect(countLegalNoticePlaceholders(filled)).toBe(0);
  });

  it("does not mistake an ordinary markdown link for a field", () => {
    expect(
      legalNoticePlaceholders("Voir [le site](https://example.com) pour plus."),
    ).toEqual([]);
  });

  it("counts again from the start on every call", () => {
    // A module-level global regex would keep its lastIndex and return half
    // the fields to the second caller: three screens ask, in one render.
    const once = countLegalNoticePlaceholders(defaultFrenchLegalNotice);
    expect(countLegalNoticePlaceholders(defaultFrenchLegalNotice)).toBe(once);
    expect(countLegalNoticePlaceholders(defaultFrenchLegalNotice)).toBe(once);
  });
});
