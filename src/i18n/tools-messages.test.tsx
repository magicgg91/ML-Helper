import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { mergeMessages } from "./config";

function FallbackProbe() {
  const t = useTranslations("Navigation");
  return <span>{t("admin")}</span>;
}

describe("tool translation catalogs", () => {
  // CI fix: this used to depend on getMessagesForLocale("fr") against the
  // real messages/fr.json, where Navigation.admin happened to be missing —
  // it broke the moment that key was removed as dead (Bloc 42/D, it had no
  // production usage). mergeMessages() with a hand-built gap tests the
  // EN-fallback mechanism itself, not today's translation file content.
  it("uses the English tool text when its French key is missing", () => {
    const messages = mergeMessages(
      { Navigation: { admin: "Admin area" } },
      { Navigation: {} },
    );

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <FallbackProbe />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Admin area")).toBeVisible();
  });
});
