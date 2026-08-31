import { describe, expect, it } from "vitest";

import {
  getAvailableLocales,
  getMessagesForLocale,
  mergeMessages,
} from "./config";

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

  it("falls back recursively to English for a missing French key", async () => {
    const messages = await getMessagesForLocale("fr");

    expect(messages).toMatchObject({
      Navigation: {
        tools: "Outils",
        admin: "Admin area",
      },
    });
  });

  // Bloc 44 point 4: the delivered de/es/tr.json files predate a handful
  // of keys added later this session (the Consumables reference) — a real,
  // present-day case of "a key is missing in a newly-activated locale",
  // not a hypothetical. Confirms the same recursive EN fallback already
  // covers DE/ES/TR, no extra code needed.
  it("falls back to English for a key missing from a newly-activated locale (DE/ES/TR)", async () => {
    for (const locale of ["de", "es", "tr"]) {
      const messages = await getMessagesForLocale(locale);
      expect(messages).toMatchObject({
        admin: { guides: { "reference-consumables": "Edit Consumables" } },
      });
    }
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
