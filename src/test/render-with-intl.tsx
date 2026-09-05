import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

export function renderWithIntl(
  ui: ReactElement,
  // Bloc 47/D: widened beyond "en" | "fr" so a test can render as a
  // DE/ES/TR visitor — English is the universal safety net (never French)
  // for any locale that isn't fr itself, matching localizedText()'s own
  // fallback order, so this ternary needs no locale-specific branches.
  locale: string = "fr",
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
