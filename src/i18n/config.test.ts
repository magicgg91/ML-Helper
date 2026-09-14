import { describe, expect, it } from "vitest";

import { getAvailableLocales, mergeMessages } from "./config";

describe("static translation configuration", () => {
  it("discovers locales from translation filenames", async () => {
    // Bloc 44: DE/ES/TR activated alongside FR/EN — this reads the
    // filesystem directly (messages/*.json), so no other code change was
    // needed to make them discoverable.
    await expect(getAvailableLocales()).resolves.toEqual([
      "de",
      "en",
      "es",
      "fr",
      "tr",
    ]);
  });

  // CI fix: this test used to assert on a key that happened to be missing
  // from a real translation file (Navigation.admin in fr.json, then later
  // admin.guides.reference-consommables in de/es/tr.json) — it broke the
  // moment someone filled in that gap, even though the fallback mechanism
  // itself was unaffected. Exercising mergeMessages() directly with a
  // hand-built gap keeps the assertion tied to the mechanism, not to
  // today's translation coverage.
  it("falls back recursively to English for a key missing from a locale", () => {
    const merged = mergeMessages(
      { Navigation: { tools: "Tools", admin: "Admin area" } },
      { Navigation: { tools: "Outils" } },
    );

    expect(merged).toEqual({
      Navigation: { tools: "Outils", admin: "Admin area" },
    });
  });

  it("falls back to English for a key missing from a newly-activated locale (DE/ES/TR pattern)", () => {
    const merged = mergeMessages(
      { admin: { guides: { "reference-consommables": "Edit Consumables" } } },
      { admin: { guides: {} } },
    );

    expect(merged).toEqual({
      admin: { guides: { "reference-consommables": "Edit Consumables" } },
    });
  });

  it("keeps localized keys that do not exist in the fallback", () => {
    expect(
      mergeMessages(
        { Navigation: { tools: "Simulators" } },
        { Navigation: { tools: "Simulateurs", localOnly: "Locale" } },
      ),
    ).toEqual({
      Navigation: { tools: "Simulateurs", localOnly: "Locale" },
    });
  });
});
