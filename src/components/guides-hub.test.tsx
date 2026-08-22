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

  it("filters guides by category, with no search box", () => {
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

    expect(screen.queryByRole("searchbox")).toBeNull();

    const guideFilters = screen.getByRole("navigation", {
      name: "Filtrer les guides par catégorie",
    });
    fireEvent.click(
      within(guideFilters).getByRole("button", { name: "Combat & conquête" }),
    );
    expect(screen.getByText("Guide combat")).toBeVisible();
    expect(screen.queryByText("Guide clan")).toBeNull();
    expect(document.querySelector(".guide-list-cover")).toHaveAttribute(
      "src",
      "https://example.com/combat.jpg",
    );
  });

  it("renders the references section as a plain grid, with no category filter", () => {
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

    expect(
      screen.queryByRole("navigation", {
        name: "Filtrer les référentiels par catégorie",
      }),
    ).toBeNull();
    expect(screen.getByText("Équipements de Combat")).toBeVisible();
    expect(screen.getByText("Équipement d’Expédition")).toBeVisible();
    expect(screen.getByText("Level Up")).toBeVisible();
  });

  it("renders the guide category filter as directly clickable chips, no dropdown", () => {
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

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();

    const guideFilters = screen.getByRole("navigation", {
      name: "Filtrer les guides par catégorie",
    });
    const allChip = within(guideFilters).getByRole("button", {
      name: "Tout",
    });
    expect(allChip).toHaveClass("guide-filter-chip");
    expect(allChip).toHaveAttribute("aria-pressed", "true");

    const combatChip = within(guideFilters).getByRole("button", {
      name: "Combat & conquête",
    });
    expect(combatChip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(combatChip);
    expect(combatChip).toHaveAttribute("aria-pressed", "true");
    expect(allChip).toHaveAttribute("aria-pressed", "false");
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

  it("renders the cover image inside a full-width media wrapper", () => {
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
              coverImage: "https://example.com/combat.jpg",
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    const card = screen.getByRole("link", { name: /Guide combat/ });
    const media = card.querySelector(".guide-list-media");
    expect(media).toBeInTheDocument();
    expect(media?.querySelector("img.guide-list-cover")).toHaveAttribute(
      "src",
      "https://example.com/combat.jpg",
    );
  });

  it("keeps the media wrapper when a guide has no cover image", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <GuidesHub
          guides={[
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
    const card = screen.getByRole("link", { name: /Guide clan/ });
    const media = card.querySelector(".guide-list-media");
    expect(media).toBeInTheDocument();
    expect(media?.querySelector("img")).toBeNull();
  });

  it("shows the guide's primary category as a badge on the cover", () => {
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
    const multiCategoryCard = screen.getByRole("link", {
      name: /Guide combat/,
    });
    expect(
      within(multiCategoryCard).getByText("Combat & conquête +1"),
    ).toBeVisible();

    const singleCategoryCard = screen.getByRole("link", {
      name: /Guide clan/,
    });
    expect(
      within(singleCategoryCard).getByText("Clan & stratégie collective"),
    ).toBeVisible();
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
