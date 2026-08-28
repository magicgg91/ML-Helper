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
import { CombatReferenceTable, ReferenceTables } from "./reference-tables";
import {
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  expeditionReferenceRows,
} from "../lib/reference-equipment";

describe("ReferenceTables", () => {
  afterEach(cleanup);
  const renderTables = () =>
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceTables
          combatRows={combatReferenceRows}
          expeditionRows={expeditionReferenceRows}
        />
      </NextIntlClientProvider>,
    );

  // Bloc 37/I: the free-search box is gone — isolate a single set (all 9
  // Légendaire Attaque rows, same subset the old "Spirit Fyra" search used
  // to reach) via the rarity pills instead.
  function isolateToLegendary() {
    for (const rarity of ["Mythique", "Épique", "Rare", "Commun"])
      fireEvent.click(screen.getByRole("button", { name: rarity }));
  }

  it("filters combat equipment and applies additive stars", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    isolateToLegendary();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Niveau d’étoile" }),
      { target: { value: "5" } },
    );
    expect(screen.getByText("9 lignes — valeurs à 5★")).toBeInTheDocument();
    expect(screen.getAllByText("18%").length).toBeGreaterThan(0);
  });
  it("attempts the manifest image path for each combat equipment row", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    isolateToLegendary();
    const images = document.querySelectorAll<HTMLImageElement>(
      ".reference-equipment-image",
    );
    expect(images.length).toBe(9);
    expect(
      Array.from(images).map((image) => image.getAttribute("src")),
    ).toContain("/equipment/combat/attack-legendary-weapon.webp");
  });

  it("attempts the manifest image path for each expedition equipment row", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const image = document.querySelector<HTMLImageElement>(
      ".reference-equipment-image",
    )!;
    expect(image.getAttribute("src")).toMatch(
      /^\/equipment\/expedition\/[a-z-]+-(common|rare|epic|mythic|legendary)-[a-z-]+\.webp$/,
    );
  });

  it("colors family and rarity filter buttons to match their equipment cell / Gems colors (Bloc 31/H)", () => {
    renderTables();
    const attack = screen.getByRole("button", { name: "Attaque" });
    expect(attack.style.getPropertyValue("--pill-color")).toBe("#c0392b");
    const legendary = screen.getByRole("button", { name: "Légendaire" });
    expect(legendary.style.getPropertyValue("--pill-color")).toBe(
      "var(--rarity-legendaire)",
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const gold = screen.getAllByRole("button", { name: "Or" })[0];
    expect(gold.style.getPropertyValue("--pill-color")).toBe("var(--gold)");
  });

  it("Bloc35 4.1: widens Expedition's family filter column but leaves Combat's untouched", () => {
    renderTables();
    const combatFilters = document.querySelector(".reference-filters")!;
    expect(combatFilters.className).not.toMatch(
      /reference-filters-wide-family/,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const expeditionFilters = document.querySelector(".reference-filters")!;
    expect(expeditionFilters.className).toMatch(
      /reference-filters-wide-family/,
    );
  });

  it("Bloc35 3.1: orders combat family buttons Attaque/Défense/Or/Vitesse", () => {
    renderTables();
    const familyButtons = document
      .querySelectorAll<HTMLButtonElement>(
        ".reference-filters .family-buttons",
      )[0]
      .querySelectorAll("button");
    expect(
      Array.from(familyButtons).map((button) => button.textContent),
    ).toEqual(["Attaque", "Défense", "Or", "Troupes/Vitesse"]);
  });

  it("Bloc35 2.1: puts the image column before the rarity column on the combat table, as two separate columns", () => {
    renderTables();
    const headers = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 2)).toEqual(["Image", "Rareté"]);
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    isolateToLegendary();
    const firstRow = screen.getAllByRole("row")[1];
    const cells = firstRow.querySelectorAll("td");
    expect(cells[0].querySelector(".reference-equipment-image")).not.toBeNull();
    expect(cells[0].querySelector(".rarity-badge")).toBeNull();
    expect(cells[1].querySelector(".rarity-badge")).not.toBeNull();
  });

  it("Bloc35 2.1: puts the image column before the rarity column on the expedition table too", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 2)).toEqual(["Image", "Rareté"]);
  });

  it("Bloc35 2.2: removes Pouciel/Gemmes from the combat table's per-row columns, replaced by rarity-indexed tables", () => {
    renderTables();
    const mainHeaders = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(mainHeaders).not.toContain("Pouciel");
    expect(mainHeaders).not.toContain("Gemmes");
    // The cdc-confirmed Légendaire values, now shown in a small table
    // indexed by rarity instead of repeated on every row.
    const skydustTable = screen
      .getByRole("heading", { name: "Pouciel" })
      .closest("section")!;
    expect(within(skydustTable).getByText("160")).toBeVisible();
    const gemsTable = screen
      .getByRole("heading", { name: "Gemmes" })
      .closest("section")!;
    expect(within(gemsTable).getByText("3")).toBeVisible();
  });

  it("PR #57 review: formats a rarity table value ≥1000 as compact k/M/G/T/P, not the raw number", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows}
          gemSlotsBase={{ ...defaultCombatGemSlotsBase, Légendaire: 1200 }}
        />
      </NextIntlClientProvider>,
    );
    const gemsTable = screen
      .getByRole("heading", { name: "Gemmes" })
      .closest("section")!;
    expect(within(gemsTable).getByText("1.2k")).toBeVisible();
    expect(within(gemsTable).queryByText("1200")).not.toBeInTheDocument();
  });

  it("Bloc35 2.2: shows the Terradust-at-destruction rarity table on the expedition side, defaulting to 0", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const dismantleTable = screen
      .getByRole("heading", { name: "Terradust à la destruction" })
      .closest("section")!;
    expect(within(dismantleTable).getAllByText("0")).toHaveLength(5);
  });

  it("no longer shows the stale unconfirmed-assumption banner now that all 10 stats are confirmed", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(
      screen.queryByText(/projection par étoile est une/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Hypothèse non confirmée"),
    ).not.toBeInTheDocument();
  });

  it("Bloc37/I: drops the free-search box, sizes family/rarity/star-level 1fr/1fr/20% and right-aligns star-level", () => {
    renderTables();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    const starLabel = screen
      .getByRole("combobox", { name: "Niveau d’étoile" })
      .closest("label")!;
    expect(starLabel).toHaveClass("reference-star-filter");

    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("Bloc37/H: shows the skill/stat name and its % value on the same line, not stacked", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    isolateToLegendary();
    const row = screen.getAllByRole("row")[1];
    const pair = row.querySelector(".skill-value-row")!;
    expect(pair).toBeInTheDocument();
    expect(pair.querySelector(".reference-value")).not.toBeNull();
  });
});

describe("CombatReferenceTable — Bloc 37/G: explicit 'no skill' vs. not-yet-filled-in", () => {
  afterEach(cleanup);
  const baseRow = combatReferenceRows[0];

  it('shows "—" when the admin explicitly picked "Rien" for a skill slot', () => {
    const rows = [
      { ...baseRow, family: "Attaque", skill_2: "Aucune", value_2_pct: "" },
    ];
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={rows} />
      </NextIntlClientProvider>,
    );
    const row = screen.getAllByRole("row")[1];
    const cells = row.querySelectorAll("td");
    // Column order: image, rarity, set name, slot, skill1..4 — skill_2 is
    // the 6th cell.
    expect(cells[5]).toHaveTextContent("—");
    expect(cells[5].querySelector(".unconfirmed")).toBeNull();
  });

  it('still shows "À compléter en admin" when a skill slot is genuinely not filled in yet', () => {
    const rows = [
      { ...baseRow, family: "Attaque", skill_2: "", value_2_pct: "" },
    ];
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={rows} />
      </NextIntlClientProvider>,
    );
    const row = screen.getAllByRole("row")[1];
    const cells = row.querySelectorAll("td");
    expect(cells[5].querySelector(".unconfirmed")).toHaveTextContent(
      "À compléter en admin",
    );
  });
});
