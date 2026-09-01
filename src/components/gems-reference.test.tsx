import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
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

  it("Bloc38/E: shows the locked sapphire-cost formula's raw values, not compact-formatted, with Bronze marked not purchasable", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const priceRow = screen.getAllByRole("row")[1];
    expect(priceRow.querySelector("th")).toHaveTextContent("Coût en saphirs");
    const cells = priceRow.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("—"); // Bronze: not purchasable
    expect(cells[1]).toHaveTextContent("3000"); // Argent, not "3k"
    expect(cells[5]).toHaveTextContent("7000"); // Légende, not "7k"
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

  it("Bloc38/C: puts the gem image and its % value in the same wrapping element, not stacked", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    const strikerRow = screen
      .getAllByRole("row")
      .find((row) => row.querySelector("th")?.textContent === "Attaque")!;
    const cell = strikerRow.querySelectorAll("td")[0];
    const wrapper = cell.querySelector(".gems-value-row")!;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.querySelector("img")).not.toBeNull();
    expect(wrapper).toHaveTextContent("1%");
  });

  it("Bloc38/F: uses the exact English skill names, not a literal translation", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    for (const label of [
      "Striker",
      "Guardian",
      "Brave",
      "Prosperous",
      "Rusher",
      "Cautious",
      "Fearless",
      "Recruiter",
      "Scavenger",
      "Salvager",
    ]) {
      expect(
        screen
          .getAllByRole("row")
          .some((row) => row.textContent?.includes(label)),
      ).toBe(true);
    }
    // Confirms the fix — these mistranslations must no longer appear.
    expect(screen.queryByText("Attack")).not.toBeInTheDocument();
    expect(screen.queryByText("Bravery")).not.toBeInTheDocument();
    expect(screen.queryByText("Defense")).not.toBeInTheDocument();
    expect(screen.queryByText("Prosperity")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovery")).not.toBeInTheDocument();
    expect(screen.queryByText("Speed")).not.toBeInTheDocument();
  });

  // Bloc 53/F: this link used to point at the generic /tools/competences
  // category (landing on whichever tab happened to be firstAvailable) —
  // now it points at the exact Gems calculator tab.
  it("links back to the precise Gemmes calculator, not the generic Compétences category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <GemsReferenceTable parameters={defaultGemParameters} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "Gemmes" })).toHaveAttribute(
      "href",
      "/tools/competences?open=gems",
    );
  });
});
