import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsumablesReferenceTable } from "./consumables-reference";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableCatalog } from "../lib/consumables";

function emptyCatalog(): ConsumableCatalog {
  return {
    intro: [],
    advisors: [],
    equipment: [],
    expedition: [],
    inventory: [],
  };
}

const introRow = {
  image: "/consumables/sapphires.webp",
  name_fr: "Saphirs",
  name_en: "Sapphires",
  description_fr: "Description intro FR",
  description_en: "Description intro EN",
  cost: "",
};

const catalog: ConsumableCatalog = {
  ...emptyCatalog(),
  intro: [introRow],
  equipment: [
    {
      image: "/consumables/mighty-jar.webp",
      name_fr: "Jarre divine ×10",
      name_en: "Divine Jar ×10",
      description_fr: "Description FR",
      description_en: "Description EN",
      cost: "10500",
    },
  ],
  inventory: [
    {
      image: "/consumables/city-rename.webp",
      name_fr: "Renommer votre ville",
      name_en: "Rename Your City",
      description_fr: "Description FR 2",
      description_en: "Description EN 2",
      cost: "",
    },
  ],
};

describe("ConsumablesReferenceTable", () => {
  afterEach(cleanup);

  // Bloc 58/A: the free-text markdown intro zone is gone, replaced by a
  // structured "Intro" table — same pattern as the category tables.
  it("Bloc58/A: renders the Intro table, with its own title and rows", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(
      screen.getByRole("heading", { name: "Introduction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Saphirs")).toBeInTheDocument();
    expect(screen.getByText("Description intro FR")).toBeInTheDocument();
  });

  // Bloc 58/A: Intro is always the first block on the page, before the
  // category filters and the 4 category tables.
  it("Bloc58/A: renders the Intro table first, before the filters and category tables", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    const introHeading = screen.getByRole("heading", { name: "Introduction" });
    const filters = document.querySelector(".reference-filters")!;
    expect(
      introHeading.compareDocumentPosition(filters) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // Bloc 58/A: Intro has no Coût column — 3 columns only.
  it("Bloc58/A: the Intro table has no Coût column", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    const introSection = screen
      .getByRole("heading", { name: "Introduction" })
      .closest("section")!;
    expect(
      within(introSection).queryByRole("columnheader", {
        name: "Coût (Saphirs)",
      }),
    ).not.toBeInTheDocument();
    expect(within(introSection).queryByText("10500")).not.toBeInTheDocument();
  });

  // Bloc 58/A: unlike the 4 category tables, the Intro table is never
  // affected by the category filters — it stays visible whatever the
  // filter selection is.
  it("Bloc58/A: the Intro table stays visible when every category filter is deselected", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    for (const category of ["advisors", "equipment", "expedition", "inventory"])
      fireEvent.click(screen.getByTestId(`filter-category-${category}`));
    expect(
      screen.getByRole("heading", { name: "Introduction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Saphirs")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Équipement" }),
    ).not.toBeInTheDocument();
  });

  // Bloc 65/A: Intro is a tile grid now — an empty Intro renders its
  // heading and an empty grid, never an invented row.
  it("Bloc58/A: skips rendering intro tiles when Intro is still empty (nothing invented)", () => {
    render(<ConsumablesReferenceTable catalog={emptyCatalog()} />);
    const introSection = screen
      .getByRole("heading", { name: "Introduction" })
      .closest("section")!;
    expect(introSection.querySelectorAll(".consumable-tile")).toHaveLength(0);
    expect(introSection.querySelector(".consumable-tile-grid")).not.toBeNull();
  });

  // Bloc 58/B dropped the "Image" column header text while keeping the
  // image itself. Bloc 65/A finishes the job: Boutique has no table left
  // at all on the public page — Intro is a tile grid like the 4
  // categories — so no column header of any kind survives, images do.
  it("Bloc58/B, Bloc65/A: renders no table on the public page at all, but still shows every image", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(
      screen.queryByRole("columnheader", { name: "Image" }),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll("table")).toHaveLength(0);
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  // Bloc 64/C review: the badge carries the sapphire unit now (the column
  // header that used to name it is gone), so the amount reads through the
  // same localized, digit-grouped message Ranking's rewards use — still
  // the full amount, never compacted to k/M.
  it("shows the full cost, never compacted to k/M", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(screen.getByText(/10\s?500 saphirs/)).toBeInTheDocument();
    expect(screen.queryByText(/10[.,]5k/i)).not.toBeInTheDocument();
  });

  it("shows a placeholder instead of inventing a value for an unconfirmed cost", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(screen.getByText("Non défini")).toBeInTheDocument();
  });

  it("falls back to French text when the English translation is still empty", () => {
    const catalogMissingEn: ConsumableCatalog = {
      ...emptyCatalog(),
      equipment: [{ ...catalog.equipment[0], name_en: "", description_en: "" }],
    };
    render(<ConsumablesReferenceTable catalog={catalogMissingEn} />, "en");
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
  });

  // Bloc 47/D review: item name/description have no de/es/tr fields at
  // all, so a non-fr/non-en visitor always hits the fallback — it must
  // land on English (the universal safety net), never French.
  it("Bloc47/D: shows the English name/description to a DE visitor, never the French one", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />, "de");
    expect(screen.getByText("Divine Jar ×10")).toBeInTheDocument();
    expect(screen.queryByText("Jarre divine ×10")).not.toBeInTheDocument();
  });

  // Bloc 48/B: category is no longer a column — it's now which of the 4
  // separate titled sections a row lives in (tile grids since Bloc 64/C).
  it("Bloc48/B: renders 4 separate titled category sections, with no Type column", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(
      screen.getByRole("heading", { name: "Conseillers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Équipement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Expédition" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Inventaire" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Catégorie" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Type" }),
    ).not.toBeInTheDocument();
    const jarTile = screen
      .getByText("Jarre divine ×10")
      .closest(".consumable-tile");
    expect(jarTile).not.toHaveTextContent("Équipement");
  });

  // Bloc 48/D: category order is alphabetical (Conseillers, Équipement,
  // Expédition, Inventaire) for both the table order and the filter
  // buttons, and the two stay in sync.
  it("Bloc48/D: orders both the tables and the filter buttons alphabetically", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    // Bloc 58/A: Intro's own <h2> comes first — scope to the headings that
    // follow it to keep asserting just the 4 category tables' order.
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => text !== "Introduction");
    expect(headings).toEqual([
      "Conseillers",
      "Équipement",
      "Expédition",
      "Inventaire",
    ]);
    const buttons = screen
      .getAllByRole("button")
      .filter((button) =>
        button.dataset.testid?.startsWith("filter-category-"),
      );
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Conseillers",
      "Équipement",
      "Expédition",
      "Inventaire",
    ]);
  });

  // Bloc 48/B: a deselected filter button fully removes its table from the
  // DOM (Bloc41's full-hide pattern), not just dims/hides its rows.
  it("Bloc48/B: fully hides a category's table when its filter is deselected", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    const equipmentButton = screen.getByTestId("filter-category-equipment");
    expect(equipmentButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
    expect(screen.getByText("Renommer votre ville")).toBeInTheDocument();

    fireEvent.click(equipmentButton);
    expect(equipmentButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Jarre divine ×10")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Équipement" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Renommer votre ville")).toBeInTheDocument();
  });

  // Bloc 65/A: Intro renders as tiles too — same grid, same tile, same
  // colors as the 4 category listings — but never a cost badge, since its
  // entries explain a currency rather than being priced items.
  it("Bloc65/A: renders Intro as tiles, structured like the categories but with no cost badge", () => {
    const { container } = render(
      <ConsumablesReferenceTable catalog={catalog} />,
    );
    const introSection = screen
      .getByRole("heading", { name: "Introduction" })
      .closest("section")!;
    expect(introSection.querySelector(".consumable-tile-grid")).not.toBeNull();
    const introTile = screen
      .getByText("Saphirs")
      .closest(".consumable-tile")! as HTMLElement;
    // Same structure as a category tile: image, then name + description.
    expect(introTile.firstElementChild?.tagName).toBe("IMG");
    expect(introTile.firstElementChild).toHaveClass("consumable-tile-image");
    expect(introTile.querySelector(".consumable-tile-name")).toHaveTextContent(
      "Saphirs",
    );
    expect(
      introTile.querySelector(".consumable-tile-description"),
    ).toHaveTextContent("Description intro FR");
    // The one difference: no price badge anywhere in the Intro grid.
    expect(introTile.querySelector(".consumable-tile-cost")).toBeNull();
    expect(introSection.querySelectorAll(".consumable-tile-cost")).toHaveLength(
      0,
    );
    // A category tile in the same render still has its badge.
    expect(
      screen
        .getByText("Jarre divine ×10")
        .closest(".consumable-tile")!
        .querySelector(".consumable-tile-cost"),
    ).not.toBeNull();
    // Same tile class on both, so they share the grey styling.
    expect(introTile.className).toBe(
      screen.getByText("Jarre divine ×10").closest(".consumable-tile")!
        .className,
    );
    expect(container.querySelectorAll("table")).toHaveLength(0);
  });

  // Bloc 64/C: the 4 category listings are tile grids — image on the left,
  // bold name then description on the right, sapphire cost as a badge in
  // the tile's top-right corner, on the name's own line.
  it("Bloc64/C: renders each category as a tile grid, image + name + description + cost badge", () => {
    const { container } = render(
      <ConsumablesReferenceTable catalog={catalog} />,
    );
    const grid = container.querySelector(".consumable-tile-grid");
    expect(grid).not.toBeNull();
    const jarTile = screen
      .getByText("Jarre divine ×10")
      .closest(".consumable-tile")!;
    expect(jarTile).not.toBeNull();
    // The image comes first in the tile, at the same 5rem size the table used.
    expect(jarTile.firstElementChild?.tagName).toBe("IMG");
    expect(jarTile.firstElementChild).toHaveClass("consumable-tile-image");
    // Name in bold, with the cost badge as its row-mate (top right).
    const heading = jarTile.querySelector(".consumable-tile-heading")!;
    expect(heading.querySelector(".consumable-tile-name")?.tagName).toBe(
      "STRONG",
    );
    // Bloc 64/C review: the unit rides with the amount, so the currency
    // isn't left to the badge's color alone.
    expect(heading.querySelector(".consumable-tile-cost")).toHaveTextContent(
      /10\s?500 saphirs/,
    );
    expect(
      jarTile.querySelector(".consumable-tile-description"),
    ).toHaveTextContent("Description FR");
    // No table left for the category listings — the Intro one is separate.
    expect(jarTile.closest("table")).toBeNull();
  });

  // Bloc 64/C: an unconfirmed cost still shows its placeholder in the
  // badge, as the Coût column did.
  it("Bloc64/C: shows the cost placeholder in the badge when the cost is unknown", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    const cityTile = screen
      .getByText("Renommer votre ville")
      .closest(".consumable-tile")!;
    expect(cityTile.querySelector(".consumable-tile-cost")).toHaveTextContent(
      "Non défini",
    );
  });

  // Bloc 68/L: the category filter buttons form a full-width 2-column grid
  // on mobile (shared class, CSS defined once in globals.css) instead of
  // the default wrap.
  it("Bloc68/L: the category filter group carries the shared mobile 2-column grid class", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    const filterGroup = screen.getByTestId(
      "filter-category-equipment",
    ).parentElement!;
    expect(filterGroup).toHaveClass("family-buttons");
    expect(filterGroup).toHaveClass("reference-filter-grid-2");
  });

  // Bloc 62/B: **bold** in Nom/Description renders identically here as it
  // does in the admin editor's live preview — same shared renderer.
  it("Bloc62/B: renders **bold** markers in Nom/Description as <strong>", () => {
    const boldCatalog: ConsumableCatalog = {
      ...emptyCatalog(),
      equipment: [
        {
          image: "/consumables/mighty-jar.webp",
          name_fr: "Jarre **divine**",
          name_en: "Divine Jar",
          description_fr: "Contient des **objets rares**",
          description_en: "Contains rare items",
          cost: "10500",
        },
      ],
    };
    render(<ConsumablesReferenceTable catalog={boldCatalog} />);
    expect(
      screen.getByText("divine", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("objets rares", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
