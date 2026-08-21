import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import { GuidesHub } from "./guides-hub";

const messages = {
  GuidesHub: {
    guidesTitle: "Guides",
    referencesTitle: "Référentiels",
    guideFiltersLabel: "Filtrer les guides par catégorie",
    referenceFiltersLabel: "Filtrer les référentiels par catégorie",
    all: "Tout",
    combat: "Combat",
    expedition: "Expédition",
    "combat-equipment": "Équipements de Combat",
    "expedition-equipment": "Équipement d’Expédition",
    readGuide: "Lire le guide",
    openReference: "Consulter le référentiel",
    emptyGuides: "Aucun guide publié pour le moment.",
  },
};

describe("GuidesHub", () => {
  afterEach(cleanup);

  it("keeps guide and reference filters independent", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
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
    expect(screen.queryByText("Guide clan")).toBeNull();
    expect(screen.getByText("Équipement d’Expédition")).toBeVisible();

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
      <NextIntlClientProvider locale="fr" messages={messages}>
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
