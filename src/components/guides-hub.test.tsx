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
              categories: ["combat", "clan"],
              title: "Guide combat",
              excerpt: "Attaquer efficacement",
              coverImage: "https://example.com/combat.jpg",
            },
            {
              id: "two",
              slug: "clan-guide",
              categories: ["clan"],
              title: "Guide clan",
              excerpt: "Jouer ensemble",
              coverImage: null,
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    const guideFilters = screen.getByRole("navigation", {
      name: "Filtrer les guides par catégorie",
    });
    fireEvent.click(
      within(guideFilters).getByRole("button", { name: "Combat & conquête" }),
    );
    expect(screen.getByText("Guide combat")).toBeVisible();
    expect(document.querySelector(".guide-list-cover")).toHaveAttribute(
      "src",
      "https://example.com/combat.jpg",
    );

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

  it("shows a multi-category guide through every assigned category filter", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <GuidesHub
          guides={[
            {
              id: "multi",
              slug: "multi",
              categories: ["combat", "clan", "defense"],
              title: "Guide transversal",
              excerpt: "Résumé",
              coverImage: null,
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    const filters = screen.getByRole("navigation", {
      name: "Filtrer les guides par catégorie",
    });
    for (const category of [
      "Combat & conquête",
      "Clan & stratégie collective",
      "Défense & territoire",
    ]) {
      fireEvent.click(within(filters).getByRole("button", { name: category }));
      expect(screen.getByText("Guide transversal")).toBeVisible();
    }
  });

  it("makes the whole guide card a link instead of only the read-guide text", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <GuidesHub
          guides={[
            {
              id: "one",
              slug: "combat-guide",
              categories: ["combat"],
              title: "Guide combat",
              excerpt: "Attaquer efficacement",
              coverImage: null,
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    const card = screen.getByRole("link", { name: /Guide combat/ });
    expect(card).toHaveAttribute("href", "/guides/combat-guide");
    expect(card).toHaveClass("guide-list-card");
    expect(within(card).getByText("Lire le guide")).toBeVisible();
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
