import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { mergeMessages } from "./config";

function LevelUpFallbackProbe() {
  const t = useTranslations("level-up");
  return <span>{t("name")}</span>;
}

describe("guide and reference translation catalogs", () => {
  // CI fix: this used to depend on getMessagesForLocale("fr") against the
  // real messages/fr.json — but fr's level-up.name is "Level Up" too (the
  // game term is deliberately kept untranslated), so the test passed for
  // the wrong reason: it would still pass even if the EN-fallback
  // mechanism were completely broken. mergeMessages() with a hand-built
  // gap actually exercises the fallback, independent of today's content.
  it("uses the English Level Up label when its French key is missing", () => {
    const messages = mergeMessages(
      { "level-up": { name: "Level Up" } },
      { "level-up": {} },
    );

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpFallbackProbe />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Level Up")).toBeVisible();
  });
});
