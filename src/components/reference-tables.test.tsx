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
import enMessages from "../../messages/en.json";
import {
  CombatReferenceTable,
  ExpeditionReferenceTable,
  ReferenceTables,
} from "./reference-tables";
import { equipmentSlotLayout } from "../lib/equipment";
import { expeditionSlotLayout } from "../lib/expedition-equipment";
import {
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  defaultCombatMergeCostBase,
  defaultCombatSkydustBase,
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
    ).find((block) =>
      // startsWith, not ===: a dimmed block's h3 also carries a trailing
      // sr-only hint (Codex review, PR #61) that's part of the same text
      // content in jsdom even though it's visually hidden.
      block.querySelector("h3")?.textContent?.startsWith(setName),
    )!;
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

  // Bloc 42/C: the "Or" family's slot-label color used to be var(--gold) —
  // the same token --rarity-legendaire's tile border/background draw from,
  // near-identical by design (both intentionally gold-branded, cdc 7.1),
  // which made the pairing hard to tell apart. --gold's own definition
  // comment reserves it for genuinely Legendary data, so the family now
  // gets its own distinct --amber token instead of reusing it.
  it("gives the Or family's slot-label color its own token, distinct from the Légendaire rarity's tile color", () => {
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
    expect(label.style.color).toBe("var(--amber)");
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

  it("Codex review (PR #61): reads the tile gem count from gemSlotsBase, not the static row.gem_slots field", () => {
    // Spirit Fyra's rows all carry gem_slots: "3" in the default catalog —
    // override gemSlotsBase.Légendaire to a different value and confirm the
    // tile follows the admin-editable config, the same source the Gemmes
    // rarity summary table below already reads from.
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows}
          secondaryBase={{
            mergeCost: defaultCombatMergeCostBase,
            gemSlots: { ...defaultCombatGemSlotsBase, Légendaire: 7 },
            skydust: defaultCombatSkydustBase,
          }}
        />
      </NextIntlClientProvider>,
    );
    const block = combatBlock("Spirit Fyra");
    const gemLabels = block.querySelectorAll(".reference-tile-gems");
    expect(gemLabels.length).toBe(9);
    for (const label of gemLabels) expect(label.textContent).toContain("7");
  });

  it("Codex review (PR #61): exposes family alongside rarity in each tile's accessible name", () => {
    renderTables();
    const block = combatBlock("Spirit Fyra");
    const tile = block.querySelector<HTMLElement>(
      '.reference-tile[data-slot="Arme"]',
    )!;
    expect(tile.getAttribute("aria-label")).toBe(
      "Légendaire — Attaque — Spirit Fyra — Arme",
    );
  });

  it("Bloc40/D: every tile is visible by default, none highlighted or dimmed", () => {
    renderTables();
    const blocks = document.querySelectorAll(".reference-tile-block");
    expect(blocks.length).toBe(20); // all 20 combat sets
    for (const block of blocks) {
      expect(block.className).not.toMatch(/dim|highlight/);
    }
  });

  it("Bloc40/E: family and rarity filters both start with every option selected", () => {
    renderTables();
    for (const family of ["Attaque", "Défense", "Or", "Troupes/Vitesse"]) {
      expect(screen.getByRole("button", { name: family })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    for (const rarity of [
      "Légendaire",
      "Mythique",
      "Épique",
      "Rare",
      "Commun",
    ]) {
      expect(screen.getByRole("button", { name: rarity })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
  });

  it("Bloc40/E: rarity filter is cumulative multi-select — 2 rarities selected together show both", () => {
    renderTables();
    for (const rarity of ["Mythique", "Épique", "Rare", "Commun"])
      fireEvent.click(screen.getByRole("button", { name: rarity }));
    // Only Légendaire left selected — re-select Rare alongside it.
    fireEvent.click(screen.getByRole("button", { name: "Rare" }));
    const rarities = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).map((block) => block.dataset.rarity);
    expect(new Set(rarities)).toEqual(new Set(["Légendaire", "Rare"]));
  });

  it("Bloc40/F: deselecting a family removes its tiles from the DOM instead of dimming them", () => {
    renderTables();
    const totalBefore = document.querySelectorAll(
      ".reference-tile-block",
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Défense" }));
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    );
    expect(blocks.length).toBeLessThan(totalBefore);
    expect(blocks.some((block) => block.dataset.family === "Défense")).toBe(
      false,
    );
    expect(blocks.some((block) => block.dataset.family === "Attaque")).toBe(
      true,
    );
  });

  it("Bloc40/F: deselecting a rarity removes its tiles from the DOM instead of dimming them", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Commun" }));
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    );
    expect(blocks.some((block) => block.dataset.rarity === "Commun")).toBe(
      false,
    );
    expect(blocks.some((block) => block.dataset.rarity === "Légendaire")).toBe(
      true,
    );
  });

  it("Bloc41/A: orders Combat's set blocks by family (Attaque, Défense, Or, Troupes/Vitesse), not data insertion order", () => {
    renderTables();
    const families = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).map((block) => block.dataset.family);
    expect(families).toEqual([
      ...["Attaque", "Défense", "Or", "Troupes/Vitesse"].flatMap((family) =>
        Array(5).fill(family),
      ),
    ]);
  });

  it("Bloc41/A: orders Expedition's set blocks by family (Or, Équipement, Consommables, Troupes)", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const families = Array.from(
      document.querySelectorAll<HTMLElement>(".reference-tile-block"),
    ).map((block) => block.dataset.family);
    expect(families).toEqual([
      ...["Or", "Équipement", "Consommables", "Troupes"].flatMap((family) =>
        Array(5).fill(family),
      ),
    ]);
  });

  it("Bloc41/B: an odd number of blocks after filtering still renders every block as a plain, identically-classed grid child (no special sizing for the lone last one)", () => {
    renderTables();
    for (const family of ["Attaque", "Défense", "Troupes/Vitesse"])
      fireEvent.click(screen.getByRole("button", { name: family }));
    const blocks = document.querySelectorAll<HTMLElement>(
      ".reference-tile-block",
    );
    expect(blocks.length).toBe(5); // odd — the case that used to stretch
    const classNames = new Set(Array.from(blocks).map((b) => b.className));
    expect(classNames.size).toBe(1); // every block, including the last, is the same class
    for (const block of blocks) expect(block.getAttribute("style")).toBeNull();
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
    expect(gold.style.getPropertyValue("--pill-color")).toBe("var(--amber)");
  });

  // Bloc 42/I: this screen was redesigned in Bloc 39 (rows became tiles) and
  // an e2e test that had been selecting the family filter by its visible
  // text broke silently in a way a stable selector would have avoided —
  // data-testid keeps future redesigns from repeating that.
  it("Bloc42/I: gives family and rarity filter buttons a stable data-testid, independent of their translated label", () => {
    renderTables();
    expect(screen.getByTestId("filter-family-Attaque")).toHaveTextContent(
      "Attaque",
    );
    expect(screen.getByTestId("filter-rarity-Légendaire")).toHaveTextContent(
      "Légendaire",
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    expect(screen.getByTestId("filter-family-Or")).toHaveTextContent("Or");
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

  // Bloc 75/A+B: the 3 Combat tables (Pouciel merge cost, gem slots, Pouciel
  // at destruction) and 2 Expedition tables (Terradust merge cost,
  // Terradust at dismantle) are now genuinely merged into 1 table each —
  // one row per metric (Fusion/Gemmes/Destruction, Fusion/Destruction)
  // instead of one whole table per metric.
  it("Bloc75/A+B: shows Combat's merged Pouciel table and Expedition's merged Terradust table", () => {
    renderTables();
    const combatSecondary = screen
      .getByRole("heading", { name: "Pouciel & Gemmes" })
      .closest("section")!;
    expect(
      within(combatSecondary).getByRole("row", { name: /Fusion/ }),
    ).toBeInTheDocument();
    expect(
      within(combatSecondary).getByRole("row", { name: /Gemmes/ }),
    ).toHaveTextContent("3");
    expect(
      within(combatSecondary).getByRole("row", { name: /Destruction/ }),
    ).toHaveTextContent("160");
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    );
    const expeditionSecondary = screen
      .getByRole("heading", { name: "Terradust" })
      .closest("section")!;
    expect(
      within(expeditionSecondary).getByRole("row", { name: /Fusion/ }),
    ).toHaveTextContent("600");
    expect(
      within(expeditionSecondary).getByRole("row", { name: /Destruction/ }),
    ).toBeInTheDocument();
  });

  // Bloc 76/B: once an admin has saved a custom row label for the visitor's
  // own locale, the public table shows that text instead of its own
  // translated default — verifies both the customized row (Fusion) and an
  // untouched one (Gemmes) still falling back to the translation.
  it("Bloc76/B: shows an admin-edited row label on the public table instead of the default translation", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows}
          secondaryBase={{
            mergeCost: defaultCombatMergeCostBase,
            gemSlots: defaultCombatGemSlotsBase,
            skydust: defaultCombatSkydustBase,
            labels: { mergeCost: { fr: "Coût de fusion" } },
          }}
        />
      </NextIntlClientProvider>,
    );
    const combatSecondary = screen
      .getByRole("heading", { name: "Pouciel & Gemmes" })
      .closest("section")!;
    expect(
      within(combatSecondary).getByRole("row", { name: /Coût de fusion/ }),
    ).toBeInTheDocument();
    expect(within(combatSecondary).queryByText("Fusion")).not.toBeInTheDocument();
    expect(
      within(combatSecondary).getByRole("row", { name: /Gemmes/ }),
    ).toBeInTheDocument();
  });

  // Bloc 76/B fix (Codex review, PR #94): a label saved from the fr admin
  // must not leak into what en visitors see — before this fix, metric_label
  // was one literal string shown to every locale regardless of the
  // visitor's own. en visitors now see the translated "Merge" default,
  // never the fr-only override.
  it("Bloc76/B fix: an fr-only row label override does not leak to en visitors", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows}
          secondaryBase={{
            mergeCost: defaultCombatMergeCostBase,
            gemSlots: defaultCombatGemSlotsBase,
            skydust: defaultCombatSkydustBase,
            labels: { mergeCost: { fr: "Coût de fusion" } },
          }}
        />
      </NextIntlClientProvider>,
    );
    const combatSecondary = screen
      .getByRole("heading", { name: "Pouciel & Gems" })
      .closest("section")!;
    expect(
      within(combatSecondary).getByRole("row", { name: /Merge/ }),
    ).toBeInTheDocument();
    expect(
      within(combatSecondary).queryByText("Coût de fusion"),
    ).not.toBeInTheDocument();
  });

  it("PR #57 review (kept): formats a rarity table value ≥1000 as compact k/M/G/T/P, not the raw number", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable
          rows={combatReferenceRows}
          secondaryBase={{
            mergeCost: defaultCombatMergeCostBase,
            gemSlots: { ...defaultCombatGemSlotsBase, Légendaire: 1200 },
            skydust: defaultCombatSkydustBase,
          }}
        />
      </NextIntlClientProvider>,
    );
    const secondaryTable = screen
      .getByRole("heading", { name: "Pouciel & Gemmes" })
      .closest("section")!;
    expect(secondaryTable.textContent).toContain("1.2k");
    expect(secondaryTable.textContent).not.toContain("1200");
  });
});

// Bloc 68/M: mobile-only filter grid classes on Combat/Expedition
// referentiels — family filter (4 buttons) gets a 2-column grid, rarity
// filter (5 buttons) gets the 3+2 split grid. Both classes are already
// fully defined/tested in globals.css (scaffolding commit); this only
// checks the class names land on the right <div>s.
describe("Bloc 68/M: mobile filter grids (family 2-col, rarity 3+2) on Combat/Expedition referentiels", () => {
  afterEach(cleanup);

  it("Combat: family filter div carries both family-buttons and reference-filter-grid-2", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={combatReferenceRows} />
      </NextIntlClientProvider>,
    );
    const familyGroup = screen.getByTestId("filter-family-Attaque").closest(
      ".family-buttons",
    )!;
    expect(familyGroup.className).toContain("family-buttons");
    expect(familyGroup.className).toContain("reference-filter-grid-2");
  });

  it("Combat: rarity filter div carries both family-buttons and reference-filter-grid-rarity", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={combatReferenceRows} />
      </NextIntlClientProvider>,
    );
    const rarityGroup = screen
      .getByTestId("filter-rarity-Légendaire")
      .closest(".family-buttons")!;
    expect(rarityGroup.className).toContain("family-buttons");
    expect(rarityGroup.className).toContain("reference-filter-grid-rarity");
  });

  it("Expedition: family filter div carries both family-buttons and reference-filter-grid-2", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ExpeditionReferenceTable rows={expeditionReferenceRows} />
      </NextIntlClientProvider>,
    );
    const familyGroup = screen.getByTestId("filter-family-Or").closest(
      ".family-buttons",
    )!;
    expect(familyGroup.className).toContain("family-buttons");
    expect(familyGroup.className).toContain("reference-filter-grid-2");
  });

  it("Expedition: rarity filter div carries both family-buttons and reference-filter-grid-rarity", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ExpeditionReferenceTable rows={expeditionReferenceRows} />
      </NextIntlClientProvider>,
    );
    const rarityGroup = screen
      .getByTestId("filter-rarity-Commun")
      .closest(".family-buttons")!;
    expect(rarityGroup.className).toContain("family-buttons");
    expect(rarityGroup.className).toContain("reference-filter-grid-rarity");
  });

  // Non-regression: rarityOrder in lib/equipment.ts is deliberately
  // rarest-to-commonest (reverse of the site's usual convention), and the
  // .reference-filter-grid-rarity CSS (nth-child based) assumes this exact
  // DOM order — Légendaire+Mythique on row 1, Épique+Rare+Commun on row 2.
  // Reordering rarityOrder or the button rendering would silently break
  // that grouping without any visible error, so guard the order here.
  it("Bloc 68/M non-regression: rarity filter buttons render rarest-first — Légendaire, Mythique, Épique, Rare, Commun — never Commun-first", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={combatReferenceRows} />
      </NextIntlClientProvider>,
    );
    const rarityGroup = screen
      .getByTestId("filter-rarity-Légendaire")
      .closest(".family-buttons")!;
    const buttons = Array.from(
      rarityGroup.querySelectorAll<HTMLElement>("button"),
    );
    expect(buttons.map((button) => button.dataset.testid)).toEqual([
      "filter-rarity-Légendaire",
      "filter-rarity-Mythique",
      "filter-rarity-Épique",
      "filter-rarity-Rare",
      "filter-rarity-Commun",
    ]);
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Légendaire",
      "Mythique",
      "Épique",
      "Rare",
      "Commun",
    ]);
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

// Bloc 54/A: this direction (reference -> tool) was entirely missing for
// Combat/Expedition equipment — the reverse (tool -> reference) already
// existed since Bloc 53/E. Both must now link to the exact simulator tab,
// not the generic /tools/competences category.
describe("Bloc 54/A: reference -> tool cross-link (Combat/Expedition equipment)", () => {
  afterEach(cleanup);

  it("Combat Equipment reference links to the exact Équipement de Combat simulator tab", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatReferenceTable rows={combatReferenceRows} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: /Équipement de Combat$/ }),
    ).toHaveAttribute("href", "/tools/competences?open=simulator");
  });

  it("Expedition Equipment reference links to the exact Équipements d’Expédition simulator tab", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ExpeditionReferenceTable rows={expeditionReferenceRows} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: /Équipements d’Expédition$/ }),
    ).toHaveAttribute("href", "/tools/competences?open=expedition");
  });
});
