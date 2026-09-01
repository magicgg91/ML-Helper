import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsumablesReferenceTable } from "./consumables-reference";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableCatalog } from "../lib/consumables";

function emptyCatalog(): ConsumableCatalog {
  return { intro: [], advisors: [], equipment: [], expedition: [], inventory: [] };
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
      within(introSection).queryByRole("columnheader", { name: "Coût (Saphirs)" }),
    ).not.toBeInTheDocument();
    expect(within(introSection).queryByText("10500")).not.toBeInTheDocument();
  });

  // Bloc 58/A: unlike the 4 category tables, the Intro table is never
  // affected by the category filters — it stays visible whatever the
  // filter selection is.
  it("Bloc58/A: the Intro table stays visible when every category filter is deselected", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    for (const category of [
      "advisors",
      "equipment",
      "expedition",
      "inventory",
    ])
      fireEvent.click(screen.getByTestId(`filter-category-${category}`));
    expect(
      screen.getByRole("heading", { name: "Introduction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Saphirs")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Équipement" }),
    ).not.toBeInTheDocument();
  });

  it("Bloc58/A: skips rendering intro rows when the table is still empty (nothing invented)", () => {
    render(<ConsumablesReferenceTable catalog={emptyCatalog()} />);
    const introSection = screen
      .getByRole("heading", { name: "Introduction" })
      .closest("section")!;
    expect(within(introSection).queryAllByRole("row")).toHaveLength(1);
  });

  // Bloc 58/B: the Image column header text is dropped — the image itself
  // keeps rendering normally in the column.
  // Bloc 64/C: only the Intro table is left here (the 4 category listings
  // are tile grids now), so this is 1 table, not 5.
  it("Bloc58/B: has no 'Image' column header text on the Intro table, but still renders the images", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(
      screen.queryByRole("columnheader", { name: "Image" }),
    ).not.toBeInTheDocument();
    const tables = document.querySelectorAll("table.consumables-table");
    expect(tables).toHaveLength(1);
    for (const table of tables) {
      const headerCells = table.querySelectorAll("thead th");
      expect(headerCells[0].textContent).toBe("");
    }
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("shows the raw cost, never compacted to k/M", () => {
    render(<ConsumablesReferenceTable catalog={catalog} />);
    expect(screen.getByText("10500")).toBeInTheDocument();
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
    render(
      <ConsumablesReferenceTable catalog={catalogMissingEn} />,
      "en",
    );
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

  // Bloc 64/C: the 4 category listings are tile grids — image on the left,
  // bold name then description on the right, sapphire cost as a badge in
  // the tile's top-right corner, on the name's own line.
  it("Bloc64/C: renders each category as a tile grid, image + name + description + cost badge", () => {
    const { container } = render(<ConsumablesReferenceTable catalog={catalog} />);
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
    expect(heading.querySelector(".consumable-tile-cost")).toHaveTextContent(
      "10500",
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
    expect(screen.getByText("divine", { selector: "strong" })).toBeInTheDocument();
    expect(
      screen.getByText("objets rares", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
