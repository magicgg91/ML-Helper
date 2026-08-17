import { describe, expect, it } from "vitest";
import { mergeLaunchTranslations } from "./translations";

describe("multilingual dynamic content", () => {
  it("updates FR and EN without losing planned locales", () => {
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
        { fr: "Nouveau", en: "New" },
      ),
    ).toEqual({
      fr: "Nouveau",
      en: "New",
      es: "Existente",
      de: "Bestehend",
      pl: "Istniejący",
      tr: "Mevcut",
    });
  });
});
