import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { getMessagesForLocale } from "./config";

function LevelUpFallbackProbe() {
  const t = useTranslations("level-up");
  return <span>{t("name")}</span>;
}

describe("guide and reference translation catalogs", () => {
  it("uses the English Level Up label when its French key is missing", async () => {
    const messages = await getMessagesForLocale("fr");

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpFallbackProbe />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Level Up")).toBeVisible();
  });
});
