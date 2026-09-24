import { describe, expect, it } from "vitest";
import { contentPairLocales, pickFrEn } from "./translations";
import { launchLocales } from "./launch-locales.generated";

/**
 * Bloc 125 §9: what an admin types in one language comes back in that
 * language, and does not overwrite the other.
 *
 * The bug this bloc chased was exactly this round trip failing — not in the
 * write, which always sent both fields in one payload, but in the editor,
 * which offered five languages over a model that stores two and collapsed
 * DE/ES/TR onto the English column. Typing a German name saved it into the
 * English one, showed it back on the German tab (same column), and destroyed
 * the English text with nothing said.
 */

/** The public read, for one row of admin-entered text. */
const read = (row: { fr: string; en: string }, locale: string) =>
  pickFrEn(row.fr, row.en, locale);

describe("Bloc 125 §9: the fr/en pair, saved and read back", () => {
  it("offers exactly the languages the pair is stored in", () => {
    // The editors take their tabs from this list. A language in it that has
    // no column, or a column with no tab, is the bug.
    expect([...contentPairLocales]).toEqual(["fr", "en"]);
    expect(
      contentPairLocales.every((code) => launchLocales.includes(code)),
    ).toBe(true);
  });

  it("gives each language back what was saved for it", () => {
    // Both fields in one payload, as every one of these routes already sends.
    const saved = { fr: "Commandant", en: "Commander" };
    expect(read(saved, "fr")).toBe("Commandant");
    expect(read(saved, "en")).toBe("Commander");
  });

  it("does not let one language's edit reach the other", () => {
    const before = { fr: "Commandant", en: "Commander" };
    const after = { ...before, en: "Warlord" };
    expect(read(after, "en")).toBe("Warlord");
    expect(read(after, "fr")).toBe("Commandant");
  });

  it("falls back to the other language only when its own is empty", () => {
    expect(read({ fr: "Commandant", en: "" }, "en")).toBe("Commandant");
    expect(read({ fr: "", en: "Commander" }, "fr")).toBe("Commander");
    // …and never in preference to a text that exists.
    expect(read({ fr: "Commandant", en: "Commander" }, "en")).toBe("Commander");
  });

  it("serves every other launch language the English column", () => {
    // The model has one French field and one for everybody else; this is what
    // the tabs now say, instead of pretending DE/ES/TR have columns of their
    // own and writing over English when they are used.
    const saved = { fr: "Commandant", en: "Commander" };
    for (const locale of launchLocales.filter((code) => code !== "fr"))
      expect(read(saved, locale), locale).toBe("Commander");
  });
});
