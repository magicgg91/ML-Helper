import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultTemplarParameters } from "../lib/templar-parameters";
import { defaultTemplarPresentationCatalog } from "../lib/templars-presentation";
import { templarKeys } from "../lib/player-settings";
import { skillColor } from "../lib/game-images";
import { TemplarsReferenceTable } from "./templars-reference";

afterEach(cleanup);
describe("TemplarsReferenceTable", () => {
  // Bloc 64/E: the 20 levels are split over 2 side-by-side tables of 10,
  // so the header row is counted twice — 22 rows for 20 levels.
  it("shows the full 1-20 level cost table with running totals", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
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
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
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
        <TemplarsReferenceTable
          parameters={{ base: 999, ratio: 1.3 }}
          presentation={defaultTemplarPresentationCatalog}
        />
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
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Templiers$/ })).toHaveAttribute(
      "href",
      "/tools/competences?open=templars",
    );
  });

  // Bloc 66/D: the level-20 cost must show as the full digit sequence, not
  // compacted to "21,9k" — this table's values never exceed 5 digits, so
  // compaction only hurts readability (same reasoning as Gemmes' price row).
  it("Bloc66/D: never compacts the cost to k/M notation, even at level 20", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const tables = screen.getAllByRole("table");
    const level20Row = tables[1].querySelectorAll("tbody tr")[9];
    const cells = level20Row.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("20");
    expect(cells[1]).toHaveTextContent("21929");
    expect(cells[1].textContent).not.toMatch(/[kKmMgG]/);
  });

  // Bloc 66/D: the currency was previously absent from the column headers,
  // making the figures look unitless — "Pouciel" now appears alongside.
  it("Bloc66/D: shows the Pouciel currency in both cost column headers", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    for (const table of screen.getAllByRole("table")) {
      const headers = table.querySelectorAll("th");
      expect(headers[1]).toHaveTextContent("Coût du niveau (Pouciel)");
      expect(headers[2]).toHaveTextContent("Coût cumulé (Pouciel)");
    }
  });

  it("Bloc38/M: shares the .reference-simple-table class with Gemmes/Level Up, for the same alternating-row style", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    for (const table of screen.getAllByRole("table"))
      expect(table).toHaveClass("reference-simple-table");
  });

  // Bloc 66/B: the new presentation section — one tile per Templar, always
  // in templarKeys' own fixed order (already alphabetical on the French
  // competence names), rendered before the cost table below it.
  it("Bloc66/B: renders 5 presentation tiles, in templarKeys order, before the cost table", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const tiles = container.querySelectorAll(".templars-tile");
    expect(tiles).toHaveLength(5);
    for (const key of templarKeys)
      expect(
        container.querySelector(`[data-testid="templars-tile-${key}"]`),
      ).not.toBeNull();
    const grid = container.querySelector(".templars-tile-grid");
    const costTable = container.querySelector(".split-reference-tables");
    expect(grid).not.toBeNull();
    expect(costTable).not.toBeNull();
    expect(
      grid!.compareDocumentPosition(costTable!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // Bloc 66/B: "Titre de la tuile : 'Templier [Compétence]'" — not just the
  // competence name alone.
  it('Bloc66/B: titles each tile "Templier [Compétence]"', () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    for (const competence of ["Attaque", "Défense", "Or", "Recruteur", "Vitesse"])
      expect(
        screen.getByRole("heading", { name: `Templier ${competence}` }),
      ).toBeInTheDocument();
  });

  // Bloc 66/B, renamed Bloc 68/D: "En dessous du titre : Base Temple, puis
  // Bonus par templier" — both values shown, seeded from the
  // already-confirmed templeBase/templarRates constants.
  it("Bloc66/B: shows Base Temple then the per-templar Bonus below each title", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const rusherTile = container.querySelector(
      '[data-testid="templars-tile-rusher"]',
    )!;
    const stats = rusherTile.querySelectorAll(".templars-tile-stat");
    expect(stats).toHaveLength(2);
    expect(stats[0]).toHaveTextContent("Base Temple");
    expect(stats[0]).toHaveTextContent("50%");
    expect(stats[1]).toHaveTextContent("Bonus par templier");
    expect(stats[1]).toHaveTextContent("1%");
  });

  // Bloc 68/D: "Bonus donné par 1 templier" → "Bonus par templier" — no
  // trace of the old wording should remain.
  it("Bloc68/D: no longer shows the old 'Bonus donné par 1 Templier' wording", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.queryByText("Bonus donné par 1 Templier"),
    ).not.toBeInTheDocument();
  });

  // Bloc 68/C: an unconfirmed (cleared) Base Temple/Bonus must never render
  // a broken "%" suffix on an empty value — same "—" precedent as Gemmes'
  // price row and Boutique's cost badge.
  it("Bloc68/C: shows a — placeholder instead of a bare % when Base Temple/Bonus is empty", () => {
    const catalog = {
      ...defaultTemplarPresentationCatalog,
      rusher: {
        ...defaultTemplarPresentationCatalog.rusher,
        temple_base: "",
        bonus: "",
      },
    };
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={catalog}
        />
      </NextIntlClientProvider>,
    );
    const rusherTile = container.querySelector(
      '[data-testid="templars-tile-rusher"]',
    )!;
    const stats = rusherTile.querySelectorAll(".templars-tile-stat");
    expect(stats[0]).toHaveTextContent("Base Temple : —");
    expect(stats[1]).toHaveTextContent("Bonus par templier : —");
  });

  // Bloc 68/B: the 5 real illustrations delivered to public/templars/ are
  // wired into the default catalog — no placeholder image path remains.
  it("Bloc68/B: renders the real delivered image for each of the 5 Templiers tiles", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const expectedImages: Record<string, string> = {
      striker: "/templars/templar-striker.webp",
      guardian: "/templars/templar-guardian.webp",
      prosperous: "/templars/templar-prosperous.webp",
      recruiter: "/templars/templar-recruiter.webp",
      rusher: "/templars/templar-rusher.webp",
    };
    for (const key of templarKeys) {
      const tile = container.querySelector(
        `[data-testid="templars-tile-${key}"]`,
      )!;
      const image = tile.querySelector("img")!;
      expect(image).toHaveAttribute("src", expectedImages[key]);
    }
  });

  // Bloc 66/B: colored by the associated competence, same per-skill
  // palette as Gemmes' own tiles (skillColor).
  it("Bloc66/B: colors each tile by its associated competence", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const strikerTile = container.querySelector(
      '[data-testid="templars-tile-striker"]',
    ) as HTMLElement;
    const guardianTile = container.querySelector(
      '[data-testid="templars-tile-guardian"]',
    ) as HTMLElement;
    expect(strikerTile).toHaveStyle({ borderColor: skillColor("striker") });
    expect(guardianTile).toHaveStyle({ borderColor: skillColor("guardian") });
    expect(strikerTile.style.borderColor).not.toBe(
      guardianTile.style.borderColor,
    );
  });

  // Bloc 66/B: "Image à gauche, 6rem (cohérent avec Boutique, Bloc 65)".
  it("Bloc66/B: places the image left via .templars-tile-image, Boutique's own class pattern", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable
          parameters={defaultTemplarParameters}
          presentation={defaultTemplarPresentationCatalog}
        />
      </NextIntlClientProvider>,
    );
    const strikerTile = container.querySelector(
      '[data-testid="templars-tile-striker"]',
    )!;
    expect(strikerTile.firstElementChild).toHaveClass("templars-tile-image");
  });
});
