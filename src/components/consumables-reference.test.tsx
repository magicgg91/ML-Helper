import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsumablesReferenceTable } from "./consumables-reference";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableCatalog } from "../lib/consumables";

const emptyIntro = { fr: "", en: "", de: "", es: "", tr: "" };

function emptyCatalog(): ConsumableCatalog {
  return { advisors: [], equipment: [], expedition: [], inventory: [] };
}

const catalog: ConsumableCatalog = {
  ...emptyCatalog(),
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

  it("renders the markdown intro zone above the tables", () => {
    render(
      <ConsumablesReferenceTable
        intro={{
          ...emptyIntro,
          fr: "## Introduction FR",
          en: "## Introduction EN",
        }}
        catalog={catalog}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Introduction FR" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
  });

  it("skips the intro zone entirely when it's still empty (nothing invented)", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
    expect(document.querySelector(".markdown-content")).not.toBeInTheDocument();
  });

  it("shows the raw cost, never compacted to k/M", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
    expect(screen.getByText("10500")).toBeInTheDocument();
    expect(screen.queryByText(/10[.,]5k/i)).not.toBeInTheDocument();
  });

  it("shows a placeholder instead of inventing a value for an unconfirmed cost", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
    expect(screen.getByText("Non défini")).toBeInTheDocument();
  });

  it("falls back to French text when the English translation is still empty", () => {
    const catalogMissingEn: ConsumableCatalog = {
      ...emptyCatalog(),
      equipment: [{ ...catalog.equipment[0], name_en: "", description_en: "" }],
    };
    render(
      <ConsumablesReferenceTable
        intro={emptyIntro}
        catalog={catalogMissingEn}
      />,
      "en",
    );
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
  });

  // Bloc 47/D review: item name/description have no de/es/tr fields at
  // all, so a non-fr/non-en visitor always hits the fallback — it must
  // land on English (the universal safety net), never French.
  it("Bloc47/D: shows the English name/description to a DE visitor, never the French one", () => {
    render(
      <ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />,
      "de",
    );
    expect(screen.getByText("Divine Jar ×10")).toBeInTheDocument();
    expect(screen.queryByText("Jarre divine ×10")).not.toBeInTheDocument();
  });

  // Bloc 48/B: category is no longer a column — it's now which of the 4
  // separate titled tables a row lives in.
  it("Bloc48/B: renders 4 separate titled tables, one per category, with no Type column", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
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
    const jarRow = screen.getByText("Jarre divine ×10").closest("tr");
    expect(jarRow).not.toHaveTextContent("Équipement");
  });

  // Bloc 48/D: category order is alphabetical (Conseillers, Équipement,
  // Expédition, Inventaire) for both the table order and the filter
  // buttons, and the two stay in sync.
  it("Bloc48/D: orders both the tables and the filter buttons alphabetically", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
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
    render(<ConsumablesReferenceTable intro={emptyIntro} catalog={catalog} />);
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
});
