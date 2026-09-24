import { describe, expect, it } from "vitest";
import {
  parseToolDescription,
  toolDescriptionForm,
  toolDescriptionToStore,
} from "./tool-description";

describe("Bloc 130: the description of a tool or a reference", () => {
  it("reads back the languages it was written in", () => {
    expect(
      parseToolDescription({ fr: "Le coût d’une ville.", de: "Der Preis." }),
    ).toEqual({ fr: "Le coût d’une ville.", de: "Der Preis." });
  });

  it("is empty on a record nobody has described", () => {
    // What every row holds today: the column exists and says nothing.
    expect(parseToolDescription({})).toEqual({});
    expect(toolDescriptionForm({})).toEqual({
      fr: "",
      en: "",
      de: "",
      es: "",
      tr: "",
    });
  });

  it("survives a stored value that is not a record at all", () => {
    for (const stored of [null, undefined, "texte", 42, ["fr"]])
      expect(parseToolDescription(stored)).toEqual({});
  });

  it("ignores a language the site does not ship", () => {
    // A key nobody can edit and nothing renders has no business coming back
    // as if it were a translation.
    expect(parseToolDescription({ fr: "Oui", jp: "はい" })).toEqual({
      fr: "Oui",
    });
  });

  it("gives a form every language, blank where nothing is written", () => {
    expect(toolDescriptionForm({ en: "The cost of a city." })).toEqual({
      fr: "",
      en: "The cost of a city.",
      de: "",
      es: "",
      tr: "",
    });
  });

  describe("what gets stored", () => {
    it("keeps the languages that say something", () => {
      expect(
        toolDescriptionToStore({ fr: "Le coût", en: "The cost", de: "" }),
      ).toEqual({ fr: "Le coût", en: "The cost" });
    });

    it("drops a language left blank rather than storing an empty string", () => {
      // Bloc 126/D: an explicit "" is a translation that exists and says
      // nothing, and localizedText stops there instead of falling back to a
      // language that has something to say.
      expect(toolDescriptionToStore({ fr: "Le coût", en: "" })).toEqual({
        fr: "Le coût",
      });
    });

    it("treats a field cleared to whitespace as cleared", () => {
      expect(toolDescriptionToStore({ fr: "   " })).toEqual({});
    });

    it("trims what it keeps", () => {
      expect(toolDescriptionToStore({ fr: "  Le coût  " })).toEqual({
        fr: "Le coût",
      });
    });

    it("stores nothing at all for a description emptied everywhere", () => {
      expect(toolDescriptionToStore({ fr: "", en: "", de: "" })).toEqual({});
    });
  });
});
