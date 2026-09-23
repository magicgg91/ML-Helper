import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { defaultCityParameters } from "../lib/city-parameters";
import type { XpTier } from "../lib/combat-calculators";
import { CombatCalculators } from "./combat-calculators";

afterEach(cleanup);

const view = (props: Partial<{ xpTiers: XpTier[] }> = {}) =>
  render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <CombatCalculators cityParameters={defaultCityParameters} {...props} />
    </NextIntlClientProvider>,
  );

/** Puts "Ma VP" at the value the brief's acceptance table uses. */
const setVp = (amount: string, unit: string) => {
  fireEvent.change(screen.getByLabelText("Unité de VP"), {
    target: { value: unit },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Ma VP" }), {
    target: { value: amount },
  });
};

/** The five ranges of one column, top to bottom. */
const rangesOf = (mode: "attacker" | "target") =>
  [0, 1, 2, 3, 4].map(
    (index) => screen.getByTestId(`xp-range-${mode}-${index}`).textContent,
  );

/** The step class of each tile of one column, top to bottom. */
const stepsOf = (mode: "attacker" | "target") =>
  [0, 1, 2, 3, 4].map((index) => {
    const tile = screen
      .getByTestId(`xp-range-${mode}-${index}`)
      .closest(".xp-tile") as HTMLElement;
    return [...tile.classList].find((name) => /^xp-tile-s\d+$/.test(name));
  });

const openDemo = () =>
  fireEvent.click(screen.getByRole("tab", { name: "Troupes en attaque démo" }));

const pickLeague = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Ligue de l’attaquant" }),
    ).getByRole("button", { name }),
  );

describe("CombatCalculators", () => {
  // Bloc 53/F: the Progression reference's cross-link passes ?open=xp,
  // forwarded here as initialTool — must select that tab directly instead
  // of always defaulting to whichever tab is firstAvailable.
  it("Bloc53/F: initialTool selects the given tab directly", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
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
      <NextIntlClientProvider locale="fr" messages={frMessages}>
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

  // Bloc 92/M2: the tools tablist wires each tab to its tabpanel
  // (aria-controls <-> id/aria-labelledby). The nested mode-switch tablist
  // Bloc 92 also covered is gone with Bloc 114/B.
  it("Bloc92/M2: wires the XP tools tab to its tabpanel", () => {
    view();
    const xpTab = screen.getByRole("tab", { name: "Taux de gain d’XP" });
    expect(xpTab).toHaveAttribute("id", "combat-tools-tab-xp");
    expect(xpTab).toHaveAttribute("aria-controls", "combat-tools-panel-xp");
    const xpPanel = document.getElementById("combat-tools-panel-xp")!;
    expect(xpPanel).toHaveAttribute("role", "tabpanel");
    expect(xpPanel).toHaveAttribute("aria-labelledby", "combat-tools-tab-xp");
  });

  // Bloc 92/H1: the XP ranges and the demo result each sit inside a
  // permanently-mounted aria-live region.
  it("Bloc92/H1: keeps the XP ranges and the demo result inside aria-live regions", () => {
    view();
    expect(
      screen.getByTestId("xp-range-attacker-0").closest('[aria-live="polite"]'),
    ).not.toBeNull();

    openDemo();
    // Bloc 92/A11y (Codex PR #116): the placeholder dropped its role="status"
    // to avoid nesting inside the live region that already announces it.
    expect(
      document.querySelector('[aria-live="polite"] .empty-state'),
    ).not.toBeNull();
    pickLeague("Bronze");
    expect(
      screen.getByTestId("demo-wall").closest('[aria-live="polite"]'),
    ).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bloc 114 — the Combat tool in tiles.
// ---------------------------------------------------------------------------
describe("Bloc 114/A: the two not-yet-built sub-tabs", () => {
  // Bloc 32/C ordering is unchanged; only how the two placeholders say so.
  it("badges them with a short pill and keeps the sentence as the tooltip", () => {
    view();
    const tabs = within(
      screen.getByRole("tablist", { name: "Outils Combat" }),
    ).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "CombatBientôt",
      "Troupes ennemiesBientôt",
      "Taux de gain d’XP",
      "Troupes en attaque démo",
    ]);
    const [combat, enemyTroops] = tabs;
    for (const tab of [combat, enemyTroops]) {
      expect(tab).toBeDisabled();
      expect(tab).toHaveAttribute("title", "Bientôt disponible");
      expect(tab.querySelector(".tab-soon-pill")).toHaveTextContent("Bientôt");
      // The asterisked treatment is for a tool that exists and is switched
      // off — a placeholder must not wear it too.
      expect(tab.querySelector(".tab-coming-soon")).toBeNull();
    }
    fireEvent.click(combat);
    expect(combat).toHaveAttribute("aria-selected", "false");
  });

  // The pill is the placeholders' own treatment: a calculator an admin has
  // disabled keeps the asterisked sentence it has carried since Bloc 33/N.
  it("leaves a switched-off calculator on the asterisked badge", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <CombatCalculators
          cityParameters={defaultCityParameters}
          availability={{ xp: true, demo: false }}
        />
      </NextIntlClientProvider>,
    );
    const demo = screen.getByRole("tab", { name: /^Troupes en attaque démo/ });
    expect(demo.querySelector(".tab-coming-soon")).toHaveTextContent(
      "Désactivé — inaccessible actuellement",
    );
    expect(demo.querySelector(".tab-soon-pill")).toBeNull();
  });
});

describe("Bloc 114/B: Taux de gain d’XP shows both roles at once", () => {
  it("has no attacker/target switch left", () => {
    view();
    expect(
      screen.queryByRole("tab", { name: "Je suis l’attaquant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Je suis la cible" }),
    ).not.toBeInTheDocument();
    // Both are headings of their own column instead.
    expect(
      screen.getByRole("heading", { name: /Je suis l’attaquant/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Je suis la cible/ }),
    ).toBeInTheDocument();
  });

  it("shows all ten tiles together, five per column", () => {
    view();
    expect(screen.getAllByTestId(/^xp-range-/)).toHaveLength(10);
    for (const mode of ["attacker", "target"] as const) {
      const list = screen.getByRole("list", {
        name: mode === "attacker" ? /Je suis l’attaquant/ : /Je suis la cible/,
      });
      expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    }
  });

  // The brief's own acceptance table, both columns at once.
  it("reads the brief's case of 11.2 G VP", () => {
    view();
    setVp("11.2", String(1_000_000_000));
    expect(rangesOf("attacker")).toEqual([
      "< 4.48G",
      "4.48G – 5.6G",
      "5.6G – 16.8G",
      "16.8G – 22.4G",
      "≥ 22.4G",
    ]);
    expect(rangesOf("target")).toEqual([
      "≥ 28G",
      "22.4G – 28G",
      "7.47G – 22.4G",
      "5.6G – 7.47G",
      "< 5.6G",
    ]);
  });

  it("paints the two columns on their own ramps", () => {
    view();
    expect(stepsOf("attacker")).toEqual([
      "xp-tile-s0",
      "xp-tile-s50",
      "xp-tile-s100",
      "xp-tile-s150",
      "xp-tile-s200",
    ]);
    expect(stepsOf("target")).toEqual([
      "xp-tile-s200",
      "xp-tile-s150",
      "xp-tile-s100",
      "xp-tile-s100",
      "xp-tile-s100",
    ]);
  });

  // The five tiers are admin-editable, so two of them may end up carrying the
  // same rate. The step is chosen by position for exactly that reason: keyed
  // by rate, the pair would share one step and the ramp would lose a rung.
  it("keeps one step per tier even when two tiers share a rate", () => {
    const tiers: XpTier[] = [
      { low: 0, high: 40, rate: 100 },
      { low: 40, high: 50, rate: 100 },
      { low: 50, high: 150, rate: 100 },
      { low: 150, high: 200, rate: 150 },
      { low: 200, high: null, rate: 200 },
    ];
    view({ xpTiers: tiers });
    expect(stepsOf("attacker")).toEqual([
      "xp-tile-s0",
      "xp-tile-s50",
      "xp-tile-s100",
      "xp-tile-s150",
      "xp-tile-s200",
    ]);
  });

  it("spaces the percent the way the reader's own language does", () => {
    view();
    const french = screen
      .getByTestId("xp-range-attacker-1")
      .closest(".xp-tile")!
      .querySelector(".xp-tile-figure")!;
    // French puts a narrow no-break space before the sign; English does not.
    expect(french.textContent).toBe("50 %d’XP");
    cleanup();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CombatCalculators cityParameters={defaultCityParameters} />
      </NextIntlClientProvider>,
    );
    const english = screen
      .getByTestId("xp-range-attacker-1")
      .closest(".xp-tile")!
      .querySelector(".xp-tile-figure")!;
    expect(english.textContent).toBe("50%of XP");
  });

  it("names who each column's rate is for", () => {
    view();
    const attacker = screen
      .getByTestId("xp-range-attacker-0")
      .closest(".xp-tile")!;
    const target = screen.getByTestId("xp-range-target-0").closest(".xp-tile")!;
    expect(attacker).toHaveTextContent("pour moi");
    expect(target).toHaveTextContent("pour l’attaquant");
    expect(attacker).toHaveTextContent("VP adverse");
  });
});

describe("Bloc 114/C: Troupes en attaque démo in tiles", () => {
  it("puts the city level in the parameters card, beside the league", () => {
    view();
    openDemo();
    const cityLevel = screen.getByRole("spinbutton", {
      name: "Niveau de ville visée",
    });
    const league = screen.getByRole("group", { name: "Ligue de l’attaquant" });
    const card = cityLevel.closest(".calculator-card");
    expect(card).toContainElement(league);
    // It is a parameter, not a result: no tile holds it any more.
    expect(cityLevel.closest(".tool-tile")).toBeNull();
    // Bloc 114/A.3: the counter the reader varies carries the violet border.
    expect(cityLevel.closest(".calculator-field")).toHaveClass(
      "city-level-target",
    );
  });

  it("gives the wall and the troops one tile each, the troops highlighted", () => {
    view();
    openDemo();
    expect(screen.getByText(/Choisis une ligue/)).toBeInTheDocument();
    pickLeague("Diamant");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau de ville visée" }),
      { target: { value: "135" } },
    );
    expect(screen.getByTestId("demo-wall")).toHaveTextContent("2.85T");
    expect(screen.getByTestId("demo-troops")).toHaveTextContent("856.06G");

    const wallTile = screen.getByTestId("demo-wall").closest(".tool-tile")!;
    const troopsTile = screen.getByTestId("demo-troops").closest(".tool-tile")!;
    expect(wallTile).not.toBe(troopsTile);
    // The answer wears the violet; the wall it has to get through does not.
    expect(troopsTile).toHaveClass("tool-tile-highlight");
    expect(wallTile).not.toHaveClass("tool-tile-highlight");
    // Bloc 88/E: still no percentage anywhere in the tool.
    expect(troopsTile.closest(".tool-summary")).not.toHaveTextContent("%");
  });

  it("titles the section and recalls the parameters", () => {
    view();
    openDemo();
    pickLeague("Diamant");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau de ville visée" }),
      { target: { value: "135" } },
    );
    // Bloc 117: the heading no longer repeats the level the chip beside it
    // already carries.
    expect(
      screen.getByRole("heading", { name: "Résultat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Attaquant Diamant · ville niveau 135"),
    ).toBeInTheDocument();
  });

  it("recalculates live when either parameter changes", () => {
    view();
    openDemo();
    pickLeague("Bronze");
    const before = screen.getByTestId("demo-troops").textContent;
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau de ville visée" }),
      { target: { value: "50" } },
    );
    expect(screen.getByTestId("demo-troops").textContent).not.toBe(before);
    const troopsAtBronze = screen.getByTestId("demo-troops").textContent;
    const wallAtBronze = screen.getByTestId("demo-wall").textContent;
    pickLeague("Diamant");
    expect(screen.getByTestId("demo-troops").textContent).not.toBe(
      troopsAtBronze,
    );
    // The wall is the target city's own, so a change of attacker league
    // moves the troops it takes and leaves the wall where it was.
    expect(screen.getByTestId("demo-wall").textContent).toBe(wallAtBronze);
  });
});

// ---------------------------------------------------------------------------
// Bloc 117 — the Troupes en attaque démo heading, likewise.
//
// "Attaque d'une ville niveau 135" repeated the level the chip beside it
// carries. The heading is "Résultat"; the chip keeps the whole detail, and
// keeps its phone-width short form.
// ---------------------------------------------------------------------------
describe("Bloc 117: the demo heading loses what the chip already says", () => {
  const section = () => screen.getByTestId("demo-troops").closest("section")!;
  const heading = () =>
    section().querySelector(".calculator-heading")!.textContent;
  const chip = () => section().querySelector(".tool-recall")!.textContent;

  const showResult = () => {
    view();
    openDemo();
    pickLeague("Diamant");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau de ville visée" }),
      { target: { value: "135" } },
    );
  };

  it("reads 'Résultat', and the chip still carries league and level", () => {
    showResult();
    expect(heading()).toBe("Résultat");
    expect(chip()).toBe("Attaquant Diamant · ville niveau 135");
    // The figures under it are unmoved.
    expect(screen.getByTestId("demo-wall")).toHaveTextContent("2.85T");
    expect(screen.getByTestId("demo-troops")).toHaveTextContent("856.06G");
  });

  // On a phone the chip drops the level (Bloc 114/C) — the heading is a fixed
  // string either way, so it must not start carrying it back.
  it("keeps the heading, and the chip's short form, at a phone width", () => {
    const wide = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      showResult();
      expect(heading()).toBe("Résultat");
      expect(chip()).toBe("Attaquant Diamant");
      expect(screen.getByTestId("demo-troops")).toHaveTextContent("856.06G");
    } finally {
      window.matchMedia = wide;
    }
  });
});
