import { describe, expect, it } from "vitest";
import { launchLocales } from "./launch-locales.generated";
import {
  hasLocalizedField,
  localizedFieldForm,
  localizedFieldLocales,
  localizedFieldToStore,
  parseLocalizedField,
  parseLocalizedFieldPair,
} from "./localized-field";
import { localizedText } from "./translations";

/**
 * Bloc 127/A.1 : le champ éditorial N langues, pour lui-même.
 *
 * Les quatre écrans de l'audit s'appuient dessus (Boutique dans cette PR,
 * Templiers, Équipements et Événements dans les deux suivantes), tout comme le
 * nom libre d'un échelon (Bloc 135) et la description d'un outil (Bloc 130) qui
 * en portaient chacun leur copie.
 */
describe("Bloc 127/A.1 : le champ éditorial, par langue", () => {
  it("relit les langues dans lesquelles il est écrit, et pas les autres", () => {
    expect(parseLocalizedField({ fr: "Commandant", de: "Kommandant" })).toEqual({
      fr: "Commandant",
      de: "Kommandant",
    });
    expect(parseLocalizedField({})).toEqual({});
    for (const stored of [null, undefined, "Commandant", 42, []])
      expect(parseLocalizedField(stored)).toEqual({});
  });

  it("ignore une langue que le site ne publie pas", () => {
    // Une clé que personne ne peut éditer et que rien n'affiche n'a pas à
    // revenir comme si c'était une traduction.
    expect(parseLocalizedField({ fr: "Oui", jp: "はい" })).toEqual({ fr: "Oui" });
  });

  it("tient une langue blanche pour absente, à la lecture comme à l'écriture", () => {
    // Le cœur du Bloc 126/D : `localizedText` tient `""` pour écrit et
    // s'arrête dessus. Une langue vide qui traverserait annulerait le repli.
    expect(parseLocalizedField({ fr: "Commandant", en: "" })).toEqual({
      fr: "Commandant",
    });
    expect(parseLocalizedField({ fr: "Commandant", en: "   " })).toEqual({
      fr: "Commandant",
    });
    expect(localizedFieldToStore({ fr: "Commandant", en: "" })).toEqual({
      fr: "Commandant",
    });
    expect(localizedFieldToStore({ fr: "Commandant", en: " " })).toEqual({
      fr: "Commandant",
    });
    expect(localizedFieldToStore({})).toEqual({});
  });

  it("dit dans quelles langues il est écrit, et s'il l'est du tout", () => {
    const field = { fr: "Commandant", de: "Kommandant" };
    expect(localizedFieldLocales(field)).toEqual(["fr", "de"]);
    expect(hasLocalizedField(field)).toBe(true);
    expect(hasLocalizedField({})).toBe(false);
    expect(hasLocalizedField({ en: "" })).toBe(false);
  });

  it("donne au formulaire les cinq langues, blanches là où rien n'est écrit", () => {
    const form = localizedFieldForm({ en: "Commander" });
    expect(Object.keys(form)).toEqual([...launchLocales]);
    expect(form).toEqual({ fr: "", en: "Commander", de: "", es: "", tr: "" });
  });

  it("garde le texte tel quel, espaces de bord retirés", () => {
    expect(localizedFieldToStore({ fr: "  Commandant  " })).toEqual({
      fr: "Commandant",
    });
    // Un Markdown multi-ligne traverse sans être touché à l'intérieur.
    const markdown = "## Titre\n\n- une puce\n- une autre";
    expect(parseLocalizedField({ fr: markdown })).toEqual({ fr: markdown });
  });

  describe("le repli sur la paire FR/EN d'avant la migration", () => {
    it("lit la paire quand l'objet par langue n'est pas encore là", () => {
      expect(
        parseLocalizedFieldPair(undefined, {
          fr: "Commandant",
          en: "Commander",
        }),
      ).toEqual({ fr: "Commandant", en: "Commander" });
      // Une paire à moitié remplie ne fabrique pas une langue vide.
      expect(
        parseLocalizedFieldPair(undefined, { fr: "Commandant", en: "" }),
      ).toEqual({ fr: "Commandant" });
    });

    it("préfère l'objet par langue dès qu'il porte quelque chose", () => {
      // Une ligne déjà migrée puis traduite en allemand ne doit pas retomber
      // sur une paire restée en base.
      expect(
        parseLocalizedFieldPair(
          { de: "Kommandant" },
          { fr: "Commandant", en: "Commander" },
        ),
      ).toEqual({ de: "Kommandant" });
    });

    it("rend un champ vide quand ni l'un ni l'autre n'est écrit", () => {
      expect(parseLocalizedFieldPair({}, { fr: "", en: "" })).toEqual({});
      expect(parseLocalizedFieldPair(null, { fr: null, en: 7 })).toEqual({});
    });
  });

  describe("ce que le visiteur lit", () => {
    it("sert sa langue à qui l'a, l'anglais aux autres", () => {
      const field = parseLocalizedField({
        fr: "Commandant",
        en: "Commander",
        de: "Kommandant",
      });
      expect(localizedText(field, "de")).toBe("Kommandant");
      expect(localizedText(field, "fr")).toBe("Commandant");
      // Les langues non traduites lisent l'anglais — jamais un vide.
      for (const locale of ["es", "tr"])
        expect(localizedText(field, locale), locale).toBe("Commander");
    });

    it("se replie sur le français quand l'anglais manque aussi", () => {
      const field = parseLocalizedField({ fr: "Commandant" });
      for (const locale of launchLocales)
        expect(localizedText(field, locale), locale).toBe("Commandant");
    });
  });
});
