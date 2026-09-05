import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultCityParameters } from "../lib/city-parameters";
import { CombatCalculators } from "./combat-calculators";

afterEach(cleanup);
const view = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <CombatCalculators cityParameters={defaultCityParameters} />
    </NextIntlClientProvider>,
  );

describe("CombatCalculators", () => {
  it("shows five XP tiers in both modes", () => {
    view();
    expect(screen.getAllByTestId(/xp-range-/)).toHaveLength(5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Ma VP" }), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Je suis la cible" }));
    expect(screen.getAllByTestId(/xp-range-/)).toHaveLength(5);
    expect(screen.getByTestId("xp-range-200")).toHaveTextContent("< 500k");
  });

  it("shows the 2 not-yet-implemented Combat placeholders, disabled, ahead of the 2 working tools, in the fixed order (Bloc 32/C)", () => {
    view();
    const tabs = within(
      screen.getByRole("tablist", { name: "Outils Combat" }),
    ).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Combat Bientôt disponible",
      "Troupes ennemies Bientôt disponible",
      "Taux de gain d’XP",
      "Troupes en attaque démo",
    ]);
    const [combat, enemyTroops] = tabs;
    expect(combat).toBeDisabled();
    expect(combat).toHaveAttribute("title", "Bientôt disponible");
    expect(enemyTroops).toBeDisabled();
    expect(enemyTroops).toHaveAttribute("title", "Bientôt disponible");
    fireEvent.click(combat);
    expect(combat).toHaveAttribute("aria-selected", "false");
  });

  it("shows the 'coming soon' text permanently, not only on hover (Bloc 33/N)", () => {
    view();
    const combat = screen.getByRole("tab", { name: /^Combat/ });
    expect(combat.querySelector(".tab-coming-soon")).toHaveTextContent(
      "Bientôt disponible",
    );
  });

  // Bloc 67: the reciprocal direction — this tool now links back to its
  // paired reference too (previously missing entirely), using the
  // renamed "Progression" label from the same single source of truth
  // (references.catalog.level-up) that drives the page/nav/tiles.
  it("Bloc67: shows a cross-link to the Progression reference from the XP Gain Rate tool", () => {
    view();
    const link = screen.getByRole("link", { name: /Progression$/ });
    expect(link).toHaveAttribute("href", "/referentiels/level-up");
  });

  // Bloc 68 review (Codex): Progression's own independent active flag
  // (Bloc 33/G) can be off while the xp-gain-rate tool itself stays
  // available — the link must not send visitors to a reference page that
  // only shows the "unavailable" message.
  it("Bloc68 review: hides the cross-link to Progression when its reference is independently disabled", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CombatCalculators
          cityParameters={defaultCityParameters}
          levelUpReferenceActive={false}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.queryByRole("link", { name: /Progression$/ }),
    ).not.toBeInTheDocument();
  });

  // Bloc 53/F: the Progression reference's cross-link now passes ?open=xp,
  // forwarded here as initialTool — must select that tab directly instead
  // of always defaulting to whichever tab is firstAvailable.
  it("Bloc53/F: initialTool selects the given tab directly", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CombatCalculators
          cityParameters={defaultCityParameters}
          initialTool="demo"
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  // Bloc 68/J: the league field is now a button group (LeagueButtons),
  // not a <select> — same interaction pattern as league-select.test.tsx.
  it("calculates demo troops from the shared wall parameters", () => {
    view();
    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    const league = screen.getByRole("group", { name: "Ligue de l’attaquant" });
    for (const button of within(league).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Choisis une ligue");
    fireEvent.click(within(league).getByRole("button", { name: "Bronze" }));
    expect(screen.getByTestId("demo-wall")).toHaveTextContent("70");
    expect(screen.getByTestId("demo-wall")).not.toHaveClass("emerald");
    expect(screen.getByTestId("demo-troops")).toHaveTextContent("70");
    expect(screen.getByTestId("demo-troops")).toHaveClass("emerald");
  });

  // Bloc 88/A: the league block keeps its visible "Ligue de l’attaquant"
  // title and the mobile 2x3 grid class (league-buttons-grid), and its
  // buttons now take 50% of the full-width block on desktop
  // (league-buttons-half). The city-level field moved out to the result
  // tile (Bloc 88/C), so the league field is no longer on a shared inline
  // row.
  it("Bloc88/A: the league block has a visible title, the 2x3 grid class and the 50% modifier", () => {
    view();
    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    const league = screen.getByRole("group", { name: "Ligue de l’attaquant" });
    const wrapper = league.closest(".demo-attack-league-field");
    expect(wrapper).toContainElement(league);
    expect(wrapper).toHaveTextContent("Ligue de l’attaquant");
    expect(league).toHaveClass("league-buttons-grid");
    expect(league).toHaveClass("league-buttons-half");
  });

  // Bloc 88/C-E: the target-city-level field lives inside the result tile,
  // editing it recalculates live, and no percentage is shown anywhere.
  it("Bloc88/C-E: city-level field is in the tile, recalculates live, shows no percentage", () => {
    view();
    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    const league = screen.getByRole("group", { name: "Ligue de l’attaquant" });
    fireEvent.click(within(league).getByRole("button", { name: "Bronze" }));

    const tile = screen.getByTestId("demo-wall").closest(".demo-attack-tile");
    expect(tile).not.toBeNull();
    // The city-level field is inside the tile, next to the results.
    const cityLevel = screen.getByRole("spinbutton", {
      name: "Niveau de ville visée",
    });
    expect(tile).toContainElement(cityLevel);
    expect(tile).toContainElement(screen.getByTestId("demo-troops"));

    // Live recalculation: raising the city level changes both values.
    const wallBefore = screen.getByTestId("demo-wall").textContent;
    const troopsBefore = screen.getByTestId("demo-troops").textContent;
    fireEvent.change(cityLevel, { target: { value: "50" } });
    expect(screen.getByTestId("demo-wall").textContent).not.toBe(wallBefore);
    expect(screen.getByTestId("demo-troops").textContent).not.toBe(
      troopsBefore,
    );

    // Bloc 88/E: no percentage anywhere in the tool.
    expect(tile).not.toHaveTextContent("%");
  });

  // Bloc 89/B: each result value now sits in its own nested mini-tile
  // (.demo-attack-inner-tile) inside the main result tile — the wall and the
  // maximum-troops values in two distinct inner tiles. The lighter grey,
  // centering, 50% width and equal thirds are paint/geometry, covered by the
  // e2e spec.
  it("Bloc89/B: wall and troops each sit in their own nested mini-tile", () => {
    view();
    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    const league = screen.getByRole("group", { name: "Ligue de l’attaquant" });
    fireEvent.click(within(league).getByRole("button", { name: "Bronze" }));

    const wallTile = screen
      .getByTestId("demo-wall")
      .closest(".demo-attack-inner-tile") as HTMLElement | null;
    const troopsTile = screen
      .getByTestId("demo-troops")
      .closest(".demo-attack-inner-tile") as HTMLElement | null;
    expect(wallTile).not.toBeNull();
    expect(troopsTile).not.toBeNull();
    // Two distinct inner tiles, both inside the main result tile.
    expect(wallTile).not.toBe(troopsTile);
    const tile = screen.getByTestId("demo-wall").closest(".demo-attack-tile");
    expect(tile).toContainElement(wallTile);
    expect(tile).toContainElement(troopsTile);
    // They keep the shared .total-box styling hook.
    expect(wallTile).toHaveClass("total-box");
    expect(troopsTile).toHaveClass("total-box");
  });

  // Bloc 92/M2: both the main tools tablist and the nested XP mode-switch
  // tablist wire each tab to its tabpanel (aria-controls <-> id/aria-labelledby).
  it("Bloc92/M2: wires the XP tools tab and the nested mode tabs to their tabpanels", () => {
    view();
    // Main tools tablist (XP is the default active tab).
    const xpTab = screen.getByRole("tab", { name: "Taux de gain d’XP" });
    expect(xpTab).toHaveAttribute("id", "combat-tools-tab-xp");
    expect(xpTab).toHaveAttribute("aria-controls", "combat-tools-panel-xp");
    const xpPanel = document.getElementById("combat-tools-panel-xp")!;
    expect(xpPanel).toHaveAttribute("role", "tabpanel");
    expect(xpPanel).toHaveAttribute("aria-labelledby", "combat-tools-tab-xp");

    // Nested mode-switch tablist inside XpGainRate (attacker is the default).
    const attackerTab = screen.getByRole("tab", {
      name: "Je suis l’attaquant",
    });
    expect(attackerTab).toHaveAttribute("id", "combat-mode-tab-attacker");
    expect(attackerTab).toHaveAttribute(
      "aria-controls",
      "combat-mode-panel-attacker",
    );
    const attackerPanel = document.getElementById(
      "combat-mode-panel-attacker",
    )!;
    expect(attackerPanel).toHaveAttribute("role", "tabpanel");
    expect(attackerPanel).toHaveAttribute(
      "aria-labelledby",
      "combat-mode-tab-attacker",
    );
    // Switching mode moves the panel id to the newly active tab.
    fireEvent.click(screen.getByRole("tab", { name: "Je suis la cible" }));
    const targetPanel = document.getElementById("combat-mode-panel-target")!;
    expect(targetPanel).toHaveAttribute("role", "tabpanel");
    expect(targetPanel).toHaveAttribute(
      "aria-labelledby",
      "combat-mode-tab-target",
    );
  });

  // Bloc 92/H1: the XP opponent-VP table and the Demo Attack wall/troops
  // result each sit inside a permanently-mounted aria-live region.
  it("Bloc92/H1: keeps the XP ranges and the demo result inside aria-live regions", () => {
    view();
    expect(
      screen.getAllByTestId(/xp-range-/)[0].closest('[aria-live="polite"]'),
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    expect(
      screen.getByRole("status").closest('[aria-live="polite"]'),
    ).not.toBeNull();
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "Ligue de l’attaquant" }),
      ).getByRole("button", { name: "Bronze" }),
    );
    expect(
      screen.getByTestId("demo-wall").closest('[aria-live="polite"]'),
    ).not.toBeNull();
  });
});
