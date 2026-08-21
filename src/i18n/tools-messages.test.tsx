import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { getMessagesForLocale } from "./config";

function FallbackProbe() {
  const t = useTranslations("Navigation");
  return <span>{t("admin")}</span>;
}

describe("tool translation catalogs", () => {
  it("uses the English tool text when its French key is missing", async () => {
    const messages = await getMessagesForLocale("fr");

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <FallbackProbe />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Admin area")).toBeVisible();
  });
});
