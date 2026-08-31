import { describe, expect, it } from "vitest";
import { guideInputSchema } from "./guides";

// Bloc 44 review: e2e's raw API calls (predating DE/ES/TR) send only
// fr/en — the schema must still accept that instead of rejecting the
// whole request for locales nothing requires yet.
describe("guideInputSchema", () => {
  it("accepts a request that omits DE/ES/TR entirely, defaulting them to blank", () => {
    const result = guideInputSchema.safeParse({
      slug: "test-guide",
      category: ["debuter"],
      coverImage: "",
      translations: {
        fr: { title: "Titre", excerpt: "Résumé", content: "Contenu" },
        en: { title: "Title", excerpt: "Summary", content: "Content" },
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.de).toEqual({
      title: "",
      excerpt: "",
      content: "",
    });
    expect(result.data.translations.es).toEqual({
      title: "",
      excerpt: "",
      content: "",
    });
    expect(result.data.translations.tr).toEqual({
      title: "",
      excerpt: "",
      content: "",
    });
  });

  it("still requires at least one of fr/en title", () => {
    const result = guideInputSchema.safeParse({
      slug: "test-guide",
      category: ["debuter"],
      coverImage: "",
      translations: {
        fr: { title: "", excerpt: "", content: "" },
        en: { title: "", excerpt: "", content: "" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts an explicitly-sent DE/ES/TR translation too", () => {
    const result = guideInputSchema.safeParse({
      slug: "test-guide",
      category: ["debuter"],
      coverImage: "",
      translations: {
        fr: { title: "Titre", excerpt: "Résumé", content: "Contenu" },
        en: { title: "Title", excerpt: "Summary", content: "Content" },
        de: { title: "Titel", excerpt: "Auszug", content: "Inhalt" },
        es: { title: "", excerpt: "", content: "" },
        tr: { title: "", excerpt: "", content: "" },
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.de.title).toBe("Titel");
  });
});
