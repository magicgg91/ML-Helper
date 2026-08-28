import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import frMessages from "../../messages/fr.json";
import { ReferenceCatalogGrid } from "./reference-catalog-grid";

afterEach(cleanup);

// The generated translator type only accepts the namespace's known keys —
// narrower than the component's plain (key: string) => string prop type, so
// this cast just aligns the two for the test (same runtime function either way).
const t = createTranslator({
  locale: "fr",
  messages: frMessages,
  namespace: "references",
}) as (key: string) => string;

describe("ReferenceCatalogGrid (Bloc 38/O)", () => {
  it("shows the real referential illustration for every one of the 5 references", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid t={t} />
      </NextIntlClientProvider>,
    );
    for (const src of [
      "/referentials/referential-fight.webp",
      "/referentials/referential-expedition.webp",
      "/referentials/referential-levelup.webp",
      "/referentials/referential-temples.webp",
      "/referentials/referential-gems.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });

  it("falls back to the placeholder category icon if the real image fails to load", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid t={t} />
      </NextIntlClientProvider>,
    );
    const image = document.querySelector<HTMLImageElement>(
      "img[src='/referentials/referential-fight.webp']",
    )!;
    fireEvent.error(image);
    expect(
      document.querySelector("img[src='/category-combat.svg']"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("img[src='/referentials/referential-fight.webp']"),
    ).not.toBeInTheDocument();
  });

  it("uses the same square .tool-category-image box as the tool categories (Bloc 38/H)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid t={t} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getAllByRole("link")[0].querySelector(".tool-category-image"),
    ).not.toBeNull();
  });
});
