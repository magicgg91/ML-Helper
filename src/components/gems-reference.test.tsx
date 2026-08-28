import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultGemParameters } from "../lib/gem-parameters";
import { GemsReferenceTable } from "./gems-reference";

afterEach(cleanup);

describe("GemsReferenceTable (Bloc 36/A)", () => {
  it("shows the 6x11 table: 1 sapphire-cost row + 10 skill rows, 6 league columns", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const headerCells = screen.getAllByRole("row")[0].querySelectorAll("th");
    expect(headerCells).toHaveLength(7); // empty corner + 6 leagues
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(12); // header + price row + 10 skill rows
    for (const row of rows.slice(1))
      expect(row.querySelectorAll("td")).toHaveLength(6);
  });

  it("orders the 10 skills alphabetically by their displayed (French) name, not the technical key", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const skillRows = screen.getAllByRole("row").slice(2); // skip header + price row
    const labels = skillRows.map((row) => row.querySelector("th")!.textContent);
    expect(labels).toEqual([
      "Attaque",
      "Bravoure",
      "Charognard",
      "Défense",
      "Intrépide",
      "Prospérité",
      "Recruteur",
      "Récupération",
      "Recycleur",
      "Vitesse",
    ]);
  });

  it("shows the locked sapphire-cost formula's values, compact-formatted, with Bronze marked not purchasable", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const priceRow = screen.getAllByRole("row")[1];
    expect(priceRow.querySelector("th")).toHaveTextContent("Coût en saphirs");
    const cells = priceRow.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("—"); // Bronze: not purchasable
    expect(cells[1]).toHaveTextContent("3k"); // Argent: 3000
    expect(cells[5]).toHaveTextContent("7k"); // Légende: 7000
  });

  it("shows the real per-cell gem image (skill x league) with its confirmed percentage value", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const strikerRow = screen
      .getAllByRole("row")
      .find((row) => row.querySelector("th")?.textContent === "Attaque")!;
    const image = within(strikerRow).getByRole("img", {
      name: "Attaque Bronze",
    });
    expect(image).toHaveAttribute("src", "/gems/gem-striker-bronze.webp");
    expect(within(strikerRow).getAllByText("1%")[0]).toBeInTheDocument();
  });

  it("links back to the Compétences tools category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Ouvrir les Outils Compétences" }),
    ).toHaveAttribute("href", "/tools/competences");
  });
});
