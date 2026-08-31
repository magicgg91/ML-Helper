import { describe, expect, it } from "vitest";
import { mergeLaunchTranslations } from "./translations";

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
  // localizedText()'s fr/en fallback for that locale going forward.
  it("leaves an omitted locale untouched rather than blanking it out", () => {
    expect(
      mergeLaunchTranslations({ fr: "Bonjour" }, { fr: "Bonjour", en: "Hi" }),
    ).toEqual({ fr: "Bonjour", en: "Hi" });
  });
});
