import { describe, expect, it } from "vitest";
import {
  hasLocalizedText,
  localizedText,
  mergeLaunchTranslations,
} from "./translations";

// Bloc 47/D review: the universal safety net for a missing translation is
// always English, never French — French is only this app's *default*
// locale for a visitor with no explicit preference (src/i18n/config.ts's
// defaultLocale), a separate concept that must never leak into this
// fallback chain.
describe("localizedText", () => {
  it("uses the active locale's own value when present", () => {
    expect(localizedText({ fr: "Bonjour", en: "Hi", de: "Hallo" }, "de")).toBe(
      "Hallo",
    );
  });

  it("falls back to English, never French, for a locale with no value of its own", () => {
    expect(localizedText({ fr: "Bonjour", en: "Hi" }, "de")).toBe("Hi");
    expect(localizedText({ fr: "Bonjour", en: "Hi" }, "es")).toBe("Hi");
    expect(localizedText({ fr: "Bonjour", en: "Hi" }, "tr")).toBe("Hi");
  });

  it("returns an empty string when neither the locale nor English has a value", () => {
    expect(localizedText({ fr: "Bonjour" }, "de")).toBe("");
    expect(localizedText({}, "fr")).toBe("");
  });

  it("still resolves fr directly when fr is the active locale itself", () => {
    expect(localizedText({ fr: "Bonjour", en: "Hi" }, "fr")).toBe("Bonjour");
  });
});

describe("multilingual dynamic content", () => {
  it("updates every launched locale without losing the not-yet-launched one (pl)", () => {
    expect(
      mergeLaunchTranslations(
        {
          fr: "Ancien",
          en: "Old",
          es: "Existente",
          de: "Bestehend",
          pl: "Istniejący",
          tr: "Mevcut",
        },
        { fr: "Nouveau", en: "New", de: "Neu", es: "Nuevo", tr: "Yeni" },
      ),
    ).toEqual({
      fr: "Nouveau",
      en: "New",
      es: "Nuevo",
      de: "Neu",
      pl: "Istniejący",
      tr: "Yeni",
    });
  });

  // Bloc 44: an omitted locale in the update (e.g. a DE field the admin
  // hasn't filled in yet) must leave the current value untouched — never
  // get coerced into an explicit empty string, which would silently break
  // localizedText()'s English fallback for that locale going forward.
  it("leaves an omitted locale untouched rather than blanking it out", () => {
    expect(
      mergeLaunchTranslations({ fr: "Bonjour" }, { fr: "Bonjour", en: "Hi" }),
    ).toEqual({ fr: "Bonjour", en: "Hi" });
  });

  // Bloc 42/F: unlike localizedText(), hasLocalizedText() never falls back
  // to English — it answers "does THIS exact locale have real content",
  // which a guide's reading page needs to decide whether to show a
  // "not translated" placeholder instead of silently substituting another
  // language.
  describe("hasLocalizedText", () => {
    it("is true only for a locale with real (non-empty) content", () => {
      expect(hasLocalizedText({ fr: "Bonjour", en: "" }, "fr")).toBe(true);
      expect(hasLocalizedText({ fr: "Bonjour", en: "" }, "en")).toBe(false);
      expect(hasLocalizedText({ fr: "Bonjour" }, "de")).toBe(false);
    });

    it("never falls back to English, unlike localizedText()", () => {
      expect(hasLocalizedText({ fr: "Bonjour", en: "Hi" }, "de")).toBe(false);
    });
  });
});
