import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { SkillsCalculators } from "./skills-calculators";
import {
  combatEquipmentData,
  expeditionEquipmentData,
} from "../lib/equipment-data";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
} from "../lib/reference-equipment";
import { defaultGemParameters } from "../lib/gem-parameters";

const combatRows = combatEquipmentData as readonly CombatReferenceRow[];
const expeditionRows =
  expeditionEquipmentData as readonly ExpeditionReferenceRow[];

function renderWithIntl(
  node: ReactNode,
  locale: "fr" | "en" = "fr",
  localeMessages: typeof frMessages | typeof enMessages = frMessages,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("SkillsCalculators", () => {
  afterEach(cleanup);

  it("labels the tabs plainly (Bloc 31/A) in the Combat, Expedition, Gems, Templars order (Bloc 31/C), with no Comparator (Bloc 31/B)", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Équipement de Combat",
      "Équipements d’Expédition",
      "Gemmes",
      "Templiers",
    ]);
    expect(
      screen.queryByRole("tab", { name: /Comparateur/ }),
    ).not.toBeInTheDocument();
    cleanup();

    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
      "en",
      enMessages,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Combat Equipment",
      "Expedition Equipment",
      "Gems",
      "Templars",
    ]);
    expect(
      screen.queryByRole("tab", { name: /Comparator/ }),
    ).not.toBeInTheDocument();
  });
  it("colors the Gems family buttons to match the equivalent Combat equipment/skill colors (Bloc 31/H)", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    const attack = screen.getByRole("button", { name: "Attaque" });
    expect(attack.style.getPropertyValue("--pill-color")).toBe("#c0392b");
    const gold = screen.getByRole("button", { name: "Or" });
    expect(gold.style.getPropertyValue("--pill-color")).toBe("var(--amber)");
  });
  it("gives Gems Optimization's family buttons a dedicated class for the mobile full-width single-line layout (Bloc 72/B)", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    const attack = screen.getByRole("button", { name: "Attaque" });
    expect(attack.parentElement).toHaveClass("family-buttons");
    expect(attack.parentElement).toHaveClass("gem-optimize-family-buttons");
  });
  it("caps mixed optimization rows at the available socket count", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    expect(screen.getByRole("combobox", { name: "Ligue ligne 1" })).toHaveValue(
      "",
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 1" }),
      { target: { value: "25" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une stat" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 2" }),
      { target: { value: "10" } },
    );
    expect(screen.getByTestId("gem-allocated")).toHaveTextContent("27");
    expect(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 2" }),
    ).toHaveValue(2);
  });
  // Bloc 82/D: the skill selector must never come pre-filled — the player
  // has to actively choose one, same "— Choisir —" placeholder pattern
  // already used for the league selector right next to it, on both modes.
  it("Bloc82/D: the Gems skill selector has no default value on either mode — '— Choisir —' until the player picks one", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Optimisation" }));
    const optimizationSkill = screen.getByRole("combobox", {
      name: "Compétence ligne 1",
    });
    expect(optimizationSkill).toHaveValue("");
    expect(
      within(optimizationSkill).getByRole("option", { name: "— Choisir —" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Budget disponible" }));
    const budgetSkill = screen.getByRole("combobox", { name: "Compétence" });
    expect(budgetSkill).toHaveValue("");
    expect(
      within(budgetSkill).getByRole("option", { name: "— Choisir —" }),
    ).toBeInTheDocument();
  });

  it("shows the budget distribution as the primary result", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Budget disponible" }));
    // Bloc 82/D: no skill pre-selected any more — pick one explicitly.
    fireEvent.change(screen.getByRole("combobox", { name: "Compétence" }), {
      target: { value: "fearless" },
    });
    const league = screen.getByRole("combobox", { name: "Ligue" });
    expect(league).toHaveValue("");
    fireEvent.change(league, { target: { value: "legend" } });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements budget" }),
      { target: { value: "3" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Budget disponible en saphirs" }),
      { target: { value: "112000" } },
    );
    expect(screen.getByTestId("gem-budget-distribution")).toHaveTextContent(
      "1 gemme 4★ + 2 gemmes 3★",
    );
    const obtainedStat = screen
      .getByText("Stat obtenue")
      .closest(".calculator-stat")!
      .querySelector("strong")!;
    expect(obtainedStat).toHaveClass("value", "emerald");
  });
  it("applies one shared level range to all five Templar skills at once", () => {
    const { container } = renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Niveau cible" }), {
      target: { value: "3" },
    });
    expect(screen.getByTestId("templar-cost")).toHaveTextContent("599 Pouciel");
    // Bloc 68/C: results are now tiles (same pattern as the Templiers
    // referentiel), not table rows.
    const tiles = container.querySelectorAll(".templars-tile");
    expect(tiles).toHaveLength(5);
    const striker = container.querySelector(
      '[data-testid="templars-calculator-tile-striker"]',
    )!;
    expect(striker).toHaveTextContent("Templier Attaque");
    // Bloc 69/B: "Bonus par Templier" already names the unit, so the value
    // itself is a bare percentage — no "/Templier" repeated after it.
    expect(striker).toHaveTextContent("Bonus par Templier : 0.25%");
    expect(striker).toHaveTextContent("0.75%");
    expect(striker).toHaveTextContent("+0.75%");
    const rusher = container.querySelector(
      '[data-testid="templars-calculator-tile-rusher"]',
    )!;
    expect(rusher).toHaveTextContent("Templier Vitesse");
    expect(rusher).toHaveTextContent("Bonus par Templier : 1%");
    expect(rusher).toHaveTextContent("3%");
    expect(rusher).toHaveTextContent("+3%");
  });
  it("uses the administrator-provided named Templar parameters", () => {
    renderWithIntl(
      <SkillsCalculators
        templarParameters={{ base: 999, ratio: 1.3 }}
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Niveau cible" }), {
      target: { value: "3" },
    });
    expect(screen.getByTestId("templar-cost")).toHaveTextContent(
      "3.99k Pouciel",
    );
  });
  // Bloc 68/C: Niveau départ / Niveau cible / Coût total merged into one
  // 3-column card (.templars-cost-fields), not the shared .calculator-fields
  // used by Gems/City/DemoAttackTroops — and the testid must still resolve
  // correctly inside that merged block.
  it("Bloc68/C: merges the level fields and the cost total into one .templars-cost-fields card", () => {
    const { container } = renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    const mergedCard = container.querySelector(".templars-cost-fields")!;
    expect(mergedCard).not.toBeNull();
    expect(
      mergedCard.querySelector('[data-testid="templar-cost"]'),
    ).not.toBeNull();
    expect(
      within(mergedCard as HTMLElement).getByRole("spinbutton", {
        name: "Niveau de départ",
      }),
    ).toBeInTheDocument();
    expect(
      within(mergedCard as HTMLElement).getByRole("spinbutton", {
        name: "Niveau cible",
      }),
    ).toBeInTheDocument();
    // No leftover generic .calculator-fields/.result-highlight blocks
    // for this calculator (would regress Gems/City's own shared class).
    expect(container.querySelector(".calculator-fields")).toBeNull();
    expect(container.querySelector(".result-highlight")).toBeNull();
    expect(container.querySelector("table")).toBeNull();
  });
  // Bloc 68/C, Bloc 68/A: the merged fields card and the result tiles reuse
  // the referentiel's own 3-col-desktop/1-col-mobile grid classes, so the
  // mobile stack + desktop 3-col merge are covered by the CSS assertions in
  // reference-styles.test.ts — this only checks the classes are actually
  // present in the rendered DOM.
  it("Bloc68/A, C: the fields card and result tiles carry the classes with the desktop-3col/mobile-1col rules", () => {
    const { container } = renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    expect(container.querySelector(".templars-cost-fields")).not.toBeNull();
    expect(container.querySelector(".templars-tile-grid")).not.toBeNull();
  });
  // Bloc 69/B: "Bonus par Templier" already names the unit, so the value
  // next to it must be a bare percentage, not "X%/Templier" — the label
  // repeated after the number too.
  it("Bloc69/B: shows a bare percentage after 'Bonus par Templier', with no redundant unit text", () => {
    const { container } = renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    const stats = container.querySelectorAll(".templars-tile-stat");
    expect(stats.length).toBeGreaterThan(0);
    for (const stat of stats) {
      if (stat.textContent?.includes("Bonus par Templier")) {
        expect(stat.textContent).toMatch(/Bonus par Templier : -?\d+(\.\d+)?%$/);
      }
    }
  });
  // Bloc 70/B: shortened tile labels — "Bonus total au niveau X" drops the
  // target-level mention (redundant with the field just above it) and
  // "Gain départ → cible" is shortened to "Gain".
  it("Bloc70/B: shows the shortened 'Bonus total' and 'Gain' tile labels, not the old longer ones", () => {
    const { container } = renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    const stats = container.querySelectorAll(".templars-tile-stat");
    expect(stats.length).toBeGreaterThan(0);
    const text = Array.from(stats)
      .map((stat) => stat.textContent)
      .join(" | ");
    expect(text).toMatch(/Bonus total : -?\d+(\.\d+)?%/);
    expect(text).toMatch(/Gain : [+-]?\d+(\.\d+)?%/);
    expect(text).not.toMatch(/Bonus total au niveau/);
    expect(text).not.toMatch(/Gain départ/);
  });
  // Bloc 69/C: target level must always be at least start+1 — same
  // commit-time-only floor as the City tool (Bloc 34/C), checked both ways:
  // raising start pushes up an equal/lower target, and typing an
  // equal/lower target directly gets pushed back up at blur.
  describe("Bloc69/C: target level >= start level + 1", () => {
    it("pushes target up when start is committed at or above it", () => {
      renderWithIntl(
        <SkillsCalculators
          combatRows={combatRows}
          expeditionRows={expeditionRows}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
      const startInput = screen.getByRole("spinbutton", {
        name: "Niveau de départ",
      });
      const targetInput = screen.getByRole("spinbutton", {
        name: "Niveau cible",
      });
      expect(targetInput).toHaveValue(1);
      fireEvent.change(startInput, { target: { value: "5" } });
      fireEvent.blur(startInput);
      expect(startInput).toHaveValue(5);
      expect(targetInput).toHaveValue(6);
    });

    it("does not push target up while start is still being typed (commits at blur only)", () => {
      renderWithIntl(
        <SkillsCalculators
          combatRows={combatRows}
          expeditionRows={expeditionRows}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
      const startInput = screen.getByRole("spinbutton", {
        name: "Niveau de départ",
      });
      const targetInput = screen.getByRole("spinbutton", {
        name: "Niveau cible",
      });
      fireEvent.change(startInput, { target: { value: "5" } });
      expect(targetInput).toHaveValue(1);
    });

    it("rejects a target committed at or below start, clamping it to start+1", () => {
      renderWithIntl(
        <SkillsCalculators
          combatRows={combatRows}
          expeditionRows={expeditionRows}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
      const startInput = screen.getByRole("spinbutton", {
        name: "Niveau de départ",
      });
      const targetInput = screen.getByRole("spinbutton", {
        name: "Niveau cible",
      });
      fireEvent.change(startInput, { target: { value: "5" } });
      fireEvent.blur(startInput);
      fireEvent.change(targetInput, { target: { value: "3" } });
      fireEvent.blur(targetInput);
      expect(targetInput).toHaveValue(6);
    });

    // Codex review on PR #88: committing start at the game's max level (20)
    // pushed target to 21, one past its own max=20, since start's own max
    // used to be 20 too. Start is now capped at 19 (mirroring the City
    // tool's start=199/target=200 headroom) so start+1 can never exceed
    // target's max.
    it("never pushes target past its own max=20, even when start is committed at its own max", () => {
      renderWithIntl(
        <SkillsCalculators
          combatRows={combatRows}
          expeditionRows={expeditionRows}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
      const startInput = screen.getByRole("spinbutton", {
        name: "Niveau de départ",
      });
      const targetInput = screen.getByRole("spinbutton", {
        name: "Niveau cible",
      });
      fireEvent.change(startInput, { target: { value: "25" } });
      fireEvent.blur(startInput);
      expect(startInput).toHaveValue(19);
      expect(targetInput).toHaveValue(20);
    });
  });
  it("Bloc55/A: shows the Templars tool->reference banner after the tool's own content", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    // Bloc 66/A: the reciprocal link's title is the renamed reference
    // label — "Templiers" exactly, not the old "Coût des Templiers".
    expect(
      screen.getByRole("link", {
        name: "Aller plus loin en vérifiant le référentiel Templiers",
      }),
    ).toHaveAttribute("href", "/referentiels/templars");
    expect(
      screen
        .getByTestId("templar-cost")
        .compareDocumentPosition(
          screen.getByRole("link", { name: /Templiers$/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  // Bloc 53/F: a reference's cross-link (Gems, Templars) now passes
  // ?open=<tab>, read server-side and forwarded here as initialTool — this
  // must select the precise tab instead of always defaulting to whichever
  // tab is firstAvailable.
  it("Bloc53/F: initialTool selects the given tab directly, instead of defaulting to the first available one", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="templars"
      />,
    );
    expect(screen.getByRole("tab", { name: "Templiers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  // Bloc 54/A: the newly-added Combat/Expedition reference->tool links pass
  // ?open=simulator / ?open=expedition — must select those tabs too, same
  // mechanism already proven for gems/templars above.
  it('Bloc54/A: initialTool="simulator" selects the Équipement de Combat tab', () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="simulator"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipement de Combat" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it('Bloc54/A: initialTool="expedition" selects the Équipements d’Expédition tab', () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="expedition"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("Bloc53/F: falls back to the first available tab when initialTool's calculator is unavailable", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        availability={{
          simulator: true,
          expedition: true,
          gems: false,
          templars: true,
        }}
        initialTool="gems"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipement de Combat" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  // Bloc 53/E: the plain "Voir le référentiel complet" link is now a
  // centered banner + mini-card, with a label adapted to the link's
  // direction (here, tool -> reference).
  it("Bloc53/E: shows the tool->reference banner with the direction-adapted label and the destination reference's title", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    expect(
      screen.getByText("Aller plus loin en vérifiant le référentiel"),
    ).toBeInTheDocument();
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Gemmes$/ })).toHaveAttribute(
      "href",
      "/referentiels/gems",
    );
    // Bloc 55/A: the cross-reference banner sits after the tool's own
    // content, not before it.
    expect(
      screen
        .getByTestId("gem-allocated")
        .compareDocumentPosition(
          screen.getByRole("link", { name: /Gemmes$/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses the administrator-provided named Gem parameters", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        gemParameters={{
          ...defaultGemParameters,
          gemPrice: { ...defaultGemParameters.gemPrice, legend: 5000 },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    // Bloc 82/D: no skill pre-selected any more — pick one explicitly.
    fireEvent.change(
      screen.getByRole("combobox", { name: "Compétence ligne 1" }),
      { target: { value: "striker" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue ligne 1" }), {
      target: { value: "legend" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 1" }),
      { target: { value: "5" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Stat cible ligne 1" }),
      { target: { value: "10" } },
    );
    // striker factor 1 × legend factor 6 = value 6; round(10 / 6) = 2 gems.
    // At the default 7000/gem this would show 14k — the overridden 5000
    // price must be the one actually used, giving 10k instead.
    expect(screen.getAllByText("10k").length).toBeGreaterThan(0);
    expect(screen.queryByText("14k")).not.toBeInTheDocument();
  });

  // Bloc 68 non-regression: the Gems league selectors are explicitly
  // excluded from the select->buttons conversion (points J/K) and must
  // stay plain <select> elements — GemOptimization's per-row league field
  // and GemBudget's league field.
  it("Bloc68: keeps the Gems league fields as plain <select> elements, not buttons", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    const rowLeague = screen.getByRole("combobox", { name: "Ligue ligne 1" });
    expect(rowLeague.tagName).toBe("SELECT");

    fireEvent.click(screen.getByRole("tab", { name: "Budget disponible" }));
    const budgetLeague = screen.getByRole("combobox", { name: "Ligue" });
    expect(budgetLeague.tagName).toBe("SELECT");

    expect(
      screen.queryByRole("group", { name: /ligue/i }),
    ).not.toBeInTheDocument();
  });
});
