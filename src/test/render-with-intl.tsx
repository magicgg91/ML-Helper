import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

export function renderWithIntl(
  ui: ReactElement,
  locale: "en" | "fr" = "fr",
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "fr" ? fr : en}
    >
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
