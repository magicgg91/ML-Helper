import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { CombatReferenceTable, ReferenceTables } from "./reference-tables";
import { equipmentSlotLayout } from "../lib/equipment";
import { expeditionSlotLayout } from "../lib/expedition-equipment";
import {
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  expeditionReferenceRows,
} from "../lib/reference-equipment";

describe("ReferenceTables — Bloc 39: tile grid", () => {
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

  function combatBlock(setName: string) {
    return Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).find((block) => block.querySelector("h3")?.textContent === setName)!;
  }

  it("groups every set into one block of 9 tiles (Combat) in the same slot order as the Combat Equipment Simulator", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const tiles = block.querySelectorAll<HTMLElement>(".reference-tile");
    expect(tiles.length).toBe(9);
    expect(Array.from(tiles).map((tile) => tile.dataset.slot)).toEqual([
      ...equipmentSlotLayout,
    ]);
  });

  it("groups every set into one block of 6 tiles (Expedition) in the same slot order as the Expedition Equipment Simulator", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const block = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    )[0];
    const tiles = block.querySelectorAll<HTMLElement>(".reference-tile");
    expect(tiles.length).toBe(6);
    expect(Array.from(tiles).map((tile) => tile.dataset.slot)).toEqual([
      ...expeditionSlotLayout,
    ]);
  });

  it("never splits a single set's tiles across two blocks (each .reference-tile-grid belongs to exactly one set)", () => {
    renderTables();
    for (const block of document.querySelectorAll<HTMLElement>(
      ".reference-tile-block",
    )) {
      const rarities = new Set(
        Array.from(block.querySelectorAll<HTMLElement>(".reference-tile")).map(
          (tile) => tile.dataset.rarity,
        ),
      );
      expect(rarities.size).toBe(1);
      expect(block.dataset.rarity).toBe([...rarities][0]);
    }
  });

  it("colors each tile's border with its own rarity, not a fixed one", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const tile = block.querySelector<HTMLElement>(".reference-tile")!;
    expect(tile.style.borderColor).toBe("var(--rarity-legendaire)");
  });

  it("colors the slot label with the equipment's family color (Bloc 31/H palette), readable on every rarity tile", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const slotLabels = block.querySelectorAll<HTMLElement>(
      ".reference-tile-slot",
    );
    // Spirit Fyra is family "Attaque" — same red used for the Attaque filter
    // pill (Bloc 31/H). jsdom normalizes the inline hex to rgb().
    for (const label of slotLabels)
      expect(label.style.color).toBe("rgb(192, 57, 43)");
  });

  it("every tile sets an explicit slot-label color across all 5 rarities (never falls back to inherited text color)", () => {
    renderTables();
    for (const label of document.querySelectorAll<HTMLElement>(
      ".reference-tile-slot",
    )) {
      expect(label.style.color).not.toBe("");
    }
  });

  // The riskiest pairing readability-wise: the "Or" family's slot-label
  // color (var(--gold)) sits on a tile whose border/background come from
  // var(--rarity-legendaire) — a near-identical gold-family hex by design
  // (both are intentionally gold-branded, cdc 7.1). They stay two distinct
  // CSS custom properties rather than collapsing to the same value, which
  // is what keeps a future palette tweak from silently breaking one without
  // the other — actual on-screen contrast is checked visually (PR report).
  it("keeps the Or family's slot-label color and the Légendaire rarity's tile color as independent tokens", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows.filter(
            (row) => row.family === "Or" && row.rarity === "Légendaire",
          )}
        />
      </NextIntlClientProvider>,
    );
    const tile = document.querySelector<HTMLElement>(".reference-tile")!;
    expect(tile.style.borderColor).toBe("var(--rarity-legendaire)");
    const label = tile.querySelector<HTMLElement>(".reference-tile-slot")!;
    expect(label.style.color).toBe("var(--gold)");
  });

  it("shows only the base 1★ value on a tile, with no way to change it", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const weaponTile = Array.from(
      block.querySelectorAll<HTMLElement>(".reference-tile"),
    ).find((tile) => tile.dataset.slot === "Arme")!;
    // skill_1 "Attaque" value_1_pct "10" for Spirit Fyra's weapon — the raw
    // base value, since valueAtStar(base, increment, 1) === base.
    expect(weaponTile.textContent).toContain("10%");
    expect(
      screen.queryByRole("combobox", { name: "Niveau d’étoile" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("shows the gem count only on Combat tiles whose rarity actually has gem slots", () => {
    renderTables();
    const legendary = combatBlock("Spirit Fyra"); // gem_slots: "3"
    expect(legendary.querySelectorAll(".reference-tile-gems").length).toBe(9);
    const commun = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).find((block) => block.dataset.rarity === "Commun")!;
    // Commun has 0 gem slots (defaultCombatGemSlotsBase.Commun) everywhere.
    expect(commun.querySelectorAll(".reference-tile-gems").length).toBe(0);
  });

  it("never shows a gem count on Expedition tiles", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(document.querySelectorAll(".reference-tile-gems").length).toBe(0);
  });

  it("attempts the manifest image path for a combat equipment tile", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const weaponTile = Array.from(
      block.querySelectorAll<HTMLElement>(".reference-tile"),
    ).find((tile) => tile.dataset.slot === "Arme")!;
    const image = weaponTile.querySelector<HTMLImageElement>(
      ".reference-equipment-image",
    )!;
    expect(image.getAttribute("src")).toBe(
      "/equipment/combat/attack-legendary-weapon.webp",
    );
  });

  it("attempts the manifest image path for an expedition equipment tile", () => {
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

  it("colors family and rarity filter buttons to match their equipment tile / Gems colors (Bloc 31/H)", () => {
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

  it("Bloc39: filters dim non-matching sets instead of hiding them — the full grid stays on screen", () => {
    renderTables();
    const totalBefore = document.querySelectorAll(
      ".reference-tile-block",
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Défense" }));
    expect(document.querySelectorAll(".reference-tile-block").length).toBe(
      totalBefore,
    );
    const attaqueBlocks = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).filter((block) => block.dataset.family === "Attaque");
    expect(attaqueBlocks.length).toBeGreaterThan(0);
    for (const block of attaqueBlocks)
      expect(block.className).toContain("reference-tile-block-dim");
    const defenseBlocks = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).filter((block) => block.dataset.family === "Défense");
    for (const block of defenseBlocks)
      expect(block.className).not.toContain("reference-tile-block-dim");
  });

  it("Bloc39: no star-level filter and no search box anywhere on either reference", () => {
    renderTables();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Niveau d’étoile" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Niveau d’étoile" }),
    ).not.toBeInTheDocument();
  });

  it("Bloc35 2.2 (kept): still shows the Pouciel/Gemmes/Terradust rarity-indexed tables", () => {
    renderTables();
    const skydustTable = screen
      .getByRole("heading", { name: "Pouciel" })
      .closest("section")!;
    expect(skydustTable.textContent).toContain("160");
    const gemsTable = screen
      .getByRole("heading", { name: "Gemmes" })
      .closest("section")!;
    expect(gemsTable.textContent).toContain("3");
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(
      screen.getByRole("heading", { name: "Terradust à la destruction" }),
    ).toBeInTheDocument();
  });

  it("PR #57 review (kept): formats a rarity table value ≥1000 as compact k/M/G/T/P, not the raw number", () => {
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
    expect(gemsTable.textContent).toContain("1.2k");
    expect(gemsTable.textContent).not.toContain("1200");
  });
});

describe("CombatReferenceTable — Bloc 37/G: explicit 'no skill' vs. not-yet-filled-in (kept)", () => {
  afterEach(cleanup);
  const baseSet = (() => {
    const first = combatReferenceRows.find(
      (row) => row.set_name === "Spirit Fyra",
    )!;
    return combatReferenceRows.filter(
      (row) => row.set_name === first.set_name && row.rarity === first.rarity,
    );
  })();

  it('shows "—" when the admin explicitly picked "Rien" for a skill slot', () => {
    const rows = baseSet.map((row) =>
      row.slot_type === "Arme"
        ? { ...row, skill_2: "none", value_2_pct: "" }
        : row,
    );
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={rows} />
      </NextIntlClientProvider>,
    );
    const tile = document.querySelector<HTMLElement>(
      '.reference-tile[data-slot="Arme"]',
    )!;
    const skill2 = tile.querySelector('[data-skill="2"]')!;
    expect(skill2.textContent).toBe("—");
    expect(skill2.querySelector(".unconfirmed")).toBeNull();
  });

  it('still shows "À compléter en admin" when a skill slot is genuinely not filled in yet', () => {
    const rows = baseSet.map((row) =>
      row.slot_type === "Arme" ? { ...row, skill_2: "", value_2_pct: "" } : row,
    );
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={rows} />
      </NextIntlClientProvider>,
    );
    const tile = document.querySelector<HTMLElement>(
      '.reference-tile[data-slot="Arme"]',
    )!;
    const skill2 = tile.querySelector('[data-skill="2"]')!;
    expect(skill2.querySelector(".unconfirmed")).toHaveTextContent(
      "À compléter en admin",
    );
  });
});
