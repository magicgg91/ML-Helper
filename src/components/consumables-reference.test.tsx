import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsumablesReferenceTable } from "./consumables-reference";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableRow } from "../lib/consumables";

const emptyIntro = { fr: "", en: "", de: "", es: "", tr: "" };

const rows: ConsumableRow[] = [
  {
    image: "/consumables/mighty-jar.webp",
    name_fr: "Jarre divine ×10",
    name_en: "Divine Jar ×10",
    description_fr: "Description FR",
    description_en: "Description EN",
    cost: "10500",
    category: "equipment",
  },
  {
    image: "/consumables/city-rename.webp",
    name_fr: "Renommer votre ville",
    name_en: "Rename Your City",
    description_fr: "Description FR 2",
    description_en: "Description EN 2",
    cost: "",
    category: "inventory",
  },
];

describe("ConsumablesReferenceTable", () => {
  afterEach(cleanup);

  it("renders the markdown intro zone above the items table", () => {
    render(
      <ConsumablesReferenceTable
        intro={{
          ...emptyIntro,
          fr: "## Introduction FR",
          en: "## Introduction EN",
        }}
        rows={rows}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Introduction FR" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
  });

  it("skips the intro zone entirely when it's still empty (nothing invented)", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} rows={rows} />);
    expect(document.querySelector(".markdown-content")).not.toBeInTheDocument();
  });

  it("shows the raw cost, never compacted to k/M", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} rows={rows} />);
    expect(screen.getByText("10500")).toBeInTheDocument();
    expect(screen.queryByText(/10[.,]5k/i)).not.toBeInTheDocument();
  });

  it("shows a placeholder instead of inventing a value for an unconfirmed cost", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} rows={rows} />);
    expect(screen.getByText("Non défini")).toBeInTheDocument();
  });

  it("falls back to French text when the English translation is still empty", () => {
    const rowsMissingEn: ConsumableRow[] = [
      { ...rows[0], name_en: "", description_en: "" },
    ];
    render(
      <ConsumablesReferenceTable intro={emptyIntro} rows={rowsMissingEn} />,
      "en",
    );
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
  });

  // Bloc 46/C: a dedicated column shows each row's category.
  it("Bloc46/C: displays a category column with each row's category", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} rows={rows} />);
    expect(
      screen.getByRole("columnheader", { name: "Catégorie" }),
    ).toBeInTheDocument();
    const jarRow = screen.getByText("Jarre divine ×10").closest("tr");
    const renameRow = screen.getByText("Renommer votre ville").closest("tr");
    expect(jarRow).toHaveTextContent("Équipement");
    expect(renameRow).toHaveTextContent("Inventaire");
  });

  // Bloc 46/C: a filter row above the table, same principle as the family/
  // rarity filters — cumulative multi-select, everything shown by default.
  it("Bloc46/C: filters rows by category via the filter buttons", () => {
    render(<ConsumablesReferenceTable intro={emptyIntro} rows={rows} />);
    const equipmentButton = screen.getByTestId("filter-category-equipment");
    expect(equipmentButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Jarre divine ×10")).toBeInTheDocument();
    expect(screen.getByText("Renommer votre ville")).toBeInTheDocument();

    fireEvent.click(equipmentButton);
    expect(equipmentButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Jarre divine ×10")).not.toBeInTheDocument();
    expect(screen.getByText("Renommer votre ville")).toBeInTheDocument();
  });
});
