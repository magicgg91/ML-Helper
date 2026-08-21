import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { getMessagesForLocale } from "./config";

function CombatFallbackProbe() {
  const t = useTranslations("xp-gain-rate");
  return <span>{t("name")}</span>;
}

describe("tool translation catalogs", () => {
  it("uses the English tool text when its French key is missing", async () => {
    const messages = await getMessagesForLocale("fr");

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CombatFallbackProbe />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("XP Gain Rate")).toBeVisible();
  });
});
