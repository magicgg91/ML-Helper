import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { GuidesHub } from "./guides-hub";

describe("GuidesHub", () => {
  afterEach(cleanup);

  it("keeps guide and reference filters independent", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <GuidesHub
          guides={[
            {
              id: "one",
              slug: "combat-guide",
              category: "Combat",
              title: "Guide combat",
              excerpt: "Attaquer efficacement",
            },
            {
              id: "two",
              slug: "clan-guide",
              category: "Clan",
              title: "Guide clan",
              excerpt: "Jouer ensemble",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    const guideFilters = screen.getByRole("navigation", {
      name: "Filtrer les guides par catégorie",
    });
    fireEvent.click(
      within(guideFilters).getByRole("button", { name: "Combat" }),
    );
    expect(screen.getByText("Guide combat")).toBeVisible();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher dans les guides" }),
      { target: { value: "introuvable" } },
    );
    expect(
      screen.getByText("Aucun guide ne correspond à ces filtres."),
    ).toBeVisible();
    expect(screen.getByText("Équipement d’Expédition")).toBeVisible();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher dans les guides" }),
      { target: { value: "" } },
    );
    expect(screen.queryByText("Guide clan")).toBeNull();

    const referenceFilters = screen.getByRole("navigation", {
      name: "Filtrer les référentiels par catégorie",
    });
    fireEvent.click(
      within(referenceFilters).getByRole("button", { name: "Combat" }),
    );
    expect(screen.getByText("Équipements de Combat")).toBeVisible();
    expect(screen.queryByText("Équipement d’Expédition")).toBeNull();
    expect(screen.getByText("Guide combat")).toBeVisible();
  });

  it("uses the canonical reference routes", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <GuidesHub guides={[]} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: /Équipements de Combat/ }),
    ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");
    expect(
      screen.getByRole("link", { name: /Équipement d’Expédition/ }),
    ).toHaveAttribute("href", "/guides/referentiels/expedition-equipment");
  });
});
