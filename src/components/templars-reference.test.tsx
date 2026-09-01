import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultTemplarParameters } from "../lib/templar-parameters";
import { TemplarsReferenceTable } from "./templars-reference";

afterEach(cleanup);
describe("TemplarsReferenceTable", () => {
  // Bloc 64/E: the 20 levels are split over 2 side-by-side tables of 10,
  // so the header row is counted twice — 22 rows for 20 levels.
  it("shows the full 1-20 level cost table with running totals", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(22);
    // Level 3 is the 3rd data row of the first table (row 0 is its header).
    const level3 = rows[3].querySelectorAll("td");
    expect(level3[0]).toHaveTextContent("3");
    expect(level3[1]).toHaveTextContent("254");
    expect(level3[2]).toHaveTextContent("599");
  });

  // Bloc 64/E: 2 columns of exactly 10 levels each — the Level Up layout,
  // minus the pagination Level Up needs for its far longer level range.
  it("Bloc64/E: splits the 20 levels into 2 tables of 10 rows, with no pagination", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    for (const table of tables)
      expect(table.querySelectorAll("tbody tr")).toHaveLength(10);
    // Levels run 1-10 down the left table, 11-20 down the right one.
    const firstColumnLevels = Array.from(
      tables[0].querySelectorAll("tbody tr td:first-child"),
    ).map((cell) => cell.textContent);
    expect(firstColumnLevels[0]).toBe("1");
    expect(firstColumnLevels[9]).toBe("10");
    const secondColumnLevels = Array.from(
      tables[1].querySelectorAll("tbody tr td:first-child"),
    ).map((cell) => cell.textContent);
    expect(secondColumnLevels[0]).toBe("11");
    expect(secondColumnLevels[9]).toBe("20");
    expect(container.querySelector(".split-reference-tables")).not.toBeNull();
    expect(container.querySelector(".pagination")).toBeNull();
  });

  it("uses the administrator-provided named Templar parameters", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={{ base: 999, ratio: 1.3 }} />
      </NextIntlClientProvider>,
    );
    const level1 = screen.getAllByRole("row")[1].querySelectorAll("td");
    expect(level1[1]).toHaveTextContent("999");
  });

  // Bloc 53/F: this link used to point at the generic /tools/competences
  // category (landing on whichever tab happened to be firstAvailable) —
  // now it points at the exact Templiers calculator tab.
  it("links back to the precise Templiers calculator, not the generic Compétences category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Templiers$/ })).toHaveAttribute(
      "href",
      "/tools/competences?open=templars",
    );
  });

  it("Bloc38/M: shares the .reference-simple-table class with Gemmes/Level Up, for the same alternating-row style", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    for (const table of screen.getAllByRole("table"))
      expect(table).toHaveClass("reference-simple-table");
  });
});
