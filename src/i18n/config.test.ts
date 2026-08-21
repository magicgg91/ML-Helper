import { describe, expect, it } from "vitest";

import {
  getAvailableLocales,
  getMessagesForLocale,
  mergeMessages,
} from "./config";

describe("static translation configuration", () => {
  it("discovers locales from translation filenames", async () => {
    await expect(getAvailableLocales()).resolves.toEqual(["en", "fr"]);
  });

  it("falls back recursively to English for a missing French key", async () => {
    const messages = await getMessagesForLocale("fr");

    expect(messages).toMatchObject({
      Navigation: {
        tools: "Simulateurs",
        admin: "Admin area",
      },
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
