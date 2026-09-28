import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultPlayerSettings } from "../lib/player-settings";
import { CityCalculators } from "./city-calculators";
import {
  playerSettingsChangedEvent,
  playerStorageKey,
} from "./player-settings-panel";

/** Bloc 113: the tile a testId's value sits in. */
const tileOf = (testId: string) =>
  screen.getByTestId(testId).closest<HTMLElement>(".tool-tile")!;
/** One row of a breakdown table, by the source it names. */
const rowOf = (tableTestId: string, label: string) =>
  within(screen.getByTestId(tableTestId))
    .getByText(label, { selector: "th" })
    .closest<HTMLElement>("tr")!;
/** A breakdown table's first value column, keyed by source. */
const startColumn = (tableTestId: string) =>
  Object.fromEntries(
    [
      ...screen
        .getByTestId(tableTestId)
        .querySelectorAll<HTMLElement>("tbody tr, tfoot tr.tool-row-total"),
    ].map((row) => [
      row.querySelector("th")!.textContent,
      row.querySelector("td")!.textContent,
    ]),
  );

describe("CityCalculators", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("calculates city cost and maximum level", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    // Bloc 113/A.5: the figure and its unit are two elements — the unit is
    // set smaller beside it rather than glued into the value.
    expect(screen.getByTestId("city-cost-total")).toHaveTextContent("10");
    expect(
      within(tileOf("city-cost-total")).getByText("or"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Nombre de villes" }),
      {
        target: { value: "2" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Or disponible" }),
      { target: { value: "0.044" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de l’or disponible"), {
      target: { value: "1000" },
    });
    expect(screen.getByTestId("max-level-result")).toHaveTextContent("3");
  });

  it("Bloc 34/C: lets the target level be typed digit by digit without a premature reset", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    const target = screen.getByRole("spinbutton", { name: "Niveau cible" });
    // Regression test: target starts at 2 with an effective min of 2 — the
    // pre-Bloc-34 bug clamped on every keystroke, so typing "100" got reset
    // to "2" right after the leading "1" and could never progress further.
    fireEvent.change(target, { target: { value: "1" } });
    expect(target).toHaveValue(1);
    fireEvent.change(target, { target: { value: "10" } });
    expect(target).toHaveValue(10);
    fireEvent.change(target, { target: { value: "100" } });
    expect(target).toHaveValue(100);
    fireEvent.blur(target);
    expect(target).toHaveValue(100);
  });

  it("keeps the target level strictly above the starting level, enforced on blur — not on every keystroke", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    const start = screen.getByRole("spinbutton", {
      name: "Niveau de départ",
    });
    const target = screen.getByRole("spinbutton", { name: "Niveau cible" });

    fireEvent.change(start, { target: { value: "12" } });
    expect(start).toHaveValue(12);
    // Bloc 34/C: the push-up only happens once start is committed (blur) —
    // not while the user is still typing into it.
    expect(target).toHaveValue(2);
    fireEvent.blur(start);
    expect(target).toHaveValue(13);

    fireEvent.change(target, { target: { value: "8" } });
    expect(target).toHaveValue(8);
    fireEvent.blur(target);
    expect(start).toHaveValue(12);
    expect(target).toHaveValue(13);
  });

  it("starts each City tool without a league and places its selector first", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    for (const tab of [
      "Coût de Ville",
      "Niveau Max Atteignable",
      "Production",
    ]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      const group = screen.getByRole("group", { name: "Ligue" });
      for (const button of within(group).getAllByRole("button"))
        expect(button).toHaveAttribute("aria-pressed", "false");
      // Bloc 69/E: the league group is now wrapped in its own
      // .calculator-league-field (for the visible "Ligue" title) instead
      // of being a bare direct child — that wrapper is still first.
      const wrapper = group.closest(
        ".calculator-fields-inline",
      )?.firstElementChild;
      expect(wrapper).toContainElement(group);
      expect(wrapper).toHaveTextContent("Ligue");
      expect(group).toHaveClass("league-buttons-grid");
      expect(screen.getByText(/Choisis une ligue/)).toBeInTheDocument();
    }
  });

  it("reads production bonuses from persisted player settings", () => {
    const settings = defaultPlayerSettings();
    settings.level = 11;
    settings.league = "legend";
    settings.equipmentSkills.prosperous = 10;
    window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    expect(screen.getByText("280/h")).toBeInTheDocument();
    expect(screen.getByTestId("full-production-gold")).toHaveTextContent(
      "320/h",
    );
    expect(
      screen.getByTestId("full-production-gold").closest("strong"),
    ).toHaveClass("tool-value-green");
  });

  it("no longer shows Récompenses in the Production tab (extracted to its own tab)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    expect(screen.queryByText("Bonus or obtenu")).toBeNull();
    expect(screen.queryByText("Bonus armée obtenu")).toBeNull();
    expect(screen.queryByText("Heures reçues")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    ).toBeInTheDocument();
  });

  it("computes the Or block bonus from a base production and hours received, applying the unit selector", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Production d’or de base" }),
      { target: { value: "2" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de production d’or"), {
      target: { value: "1000" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures reçues — Or" }),
      { target: { value: "5" } },
    );
    const goldBonus = screen.getByTestId("city-rewards-gold");
    expect(goldBonus).toHaveTextContent("10k");
    expect(goldBonus.closest("strong")).toHaveClass("tool-value-green");
  });

  it("computes the Armée block bonus independently from the Or block", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Production d’or de base" }),
      { target: { value: "100" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures reçues — Or" }),
      { target: { value: "10" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Production d’armée de base",
      }),
      { target: { value: "4" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de production d’armée"), {
      target: { value: "1000000" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures reçues — Armée" }),
      { target: { value: "2" } },
    );

    expect(screen.getByTestId("city-rewards-gold")).toHaveTextContent("1k");
    expect(screen.getByTestId("city-rewards-army")).toHaveTextContent("8M");
  });

  it("renders the Armée and Or blocks as two separate cards, not a mixed form", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    // Bloc 91/M5: the reward card titles are <h2> (were <h3>, skipping a
    // level under the tool page's <h1>). Bloc 113/E: Armée comes first.
    const cards = document.querySelectorAll<HTMLElement>(".tool-reward-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector("h2")).toHaveTextContent("Armée");
    expect(cards[1].querySelector("h2")).toHaveTextContent("Or");
    expect(
      within(cards[0]).getByRole("spinbutton", {
        name: "Production d’armée de base",
      }),
    ).toBeInTheDocument();
    expect(
      within(cards[1]).getByRole("spinbutton", {
        name: "Production d’or de base",
      }),
    ).toBeInTheDocument();
  });

  it("reacts immediately when player settings change", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    const settings = defaultPlayerSettings();
    settings.level = 6;
    settings.league = "legend";
    window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    act(() => {
      window.dispatchEvent(
        new CustomEvent(playerSettingsChangedEvent, { detail: settings }),
      );
    });
    expect(screen.getByTestId("full-production-gold")).toHaveTextContent(
      "260/h",
    );
  });

  it.each([
    ["bronze", "130", "52", "100/h", "40/h"],
    ["silver", "163", "59", "125/h", "45/h"],
    ["gold", "228", "72", "175/h", "55/h"],
    ["platinum", "228", "72", "175/h", "55/h"],
    ["diamond", "260", "78", "200/h", "60/h"],
    ["legend", "260", "78", "200/h", "60/h"],
  ] as const)(
    "shows the %s multipliers in all three City tools",
    (league, boostedGold, boostedArmy, baseGold, baseArmy) => {
      const settings = defaultPlayerSettings();
      settings.league = league;
      window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
      render(
        <NextIntlClientProvider locale="fr" messages={messages}>
          <CityCalculators />
        </NextIntlClientProvider>,
      );

      // Bloc 113/B: the boosted production per city is the starting column
      // of the breakdown table — the tile beside it carries the GAIN, which
      // is a different figure.
      expect(startColumn("city-cost-gold-table")["Total / ville"]).toBe(
        boostedGold,
      );
      expect(startColumn("city-cost-army-table")["Total / ville"]).toBe(
        boostedArmy,
      );

      // Bloc 113/C deliberately leaves Niveau Max with tiles only: it no
      // longer prints an absolute production anywhere, so there is nothing
      // to assert there — the same multipliers are covered above and below.
      fireEvent.click(screen.getByRole("tab", { name: "Production" }));
      // Bloc 113/D: the tile carries the boosted total for the whole set —
      // one city here, so the same figure as the cost tab's per-city total.
      // The raw base the tile used to show is the table's Base row.
      expect(screen.getByTestId("city-production-gold")).toHaveTextContent(
        `${boostedGold}/h`,
      );
      expect(screen.getByTestId("city-production-army")).toHaveTextContent(
        `${boostedArmy}/h`,
      );
      expect(startColumn("city-production-gold-table").Base).toBe(
        baseGold.replace("/h", ""),
      );
      expect(startColumn("city-production-army-table").Base).toBe(
        baseArmy.replace("/h", ""),
      );
    },
  );

  it("shows the base city-only value first with a separate Stuff/Temple breakdown and the total in evidence", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    // La base de temple pour Prospérité (30%, cdc section 7.1) s'applique
    // automatiquement même sans contribution de clan saisie (voir templeBase).
    // Bloc 113/B: one table per resource, its starting column holding what
    // the two Départ/Cible blocks used to print side by side.
    expect(startColumn("city-cost-gold-table")).toEqual({
      Base: "200",
      Temple: "60",
      // Bloc 113/A.8: a source producing nothing is greyed, with an em dash
      // where its gap would be.
      Stuff: "0",
      "Total / ville": "260",
    });
    const stuff = rowOf("city-cost-gold-table", "Stuff");
    expect(within(stuff).getByText("—")).toBeInTheDocument();
    expect(stuff.querySelectorAll(".tool-value-muted").length).toBeGreaterThan(
      0,
    );
  });

  it("splits gold/army bonuses between equipment and clan temple in the results", () => {
    const settings = defaultPlayerSettings();
    settings.league = "legend";
    settings.equipmentSkills.prosperous = 10;
    // Contribution des Templiers du clan uniquement (20%) ; la base de
    // temple pour Prospérité (30%, cdc section 7.1) s'ajoute automatiquement
    // pour un bonus de temple total de 50%.
    settings.clanTemple.prosperous = 20;
    // v: 2 marks this as already-current-format data (clan contribution
    // only), so safePlayerSettings doesn't treat it as a pre-migration
    // full-total save and subtract the base back out.
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({ ...settings, v: 2 }),
    );
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    expect(startColumn("city-cost-gold-table")).toEqual({
      Base: "200",
      Temple: "100",
      Stuff: "20",
      "Total / ville": "320",
    });

    // Bloc 113/C: Niveau Max no longer repeats this breakdown — it belongs
    // to the Production sub-tab, and printing it twice is what this bloc
    // removes.
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    expect(document.querySelector(".tool-table")).toBeNull();
  });

  it("merges Coût de Ville's 2 result blocks into a single Total block (Bloc 33/C)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    // Only one result heading now — the old separate "Pour 1 ville" title
    // is gone.
    expect(screen.queryByText("Pour 1 ville")).not.toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Total" });
    const section = heading.closest("section")!;
    // Bloc 113/B: the five tiles, in the order the bloc fixes — Armée before
    // Or, and no rentability tile.
    for (const testId of [
      "city-cost-total",
      "city-cost-wall",
      "city-cost-vp",
      "city-cost-army",
      "city-cost-gold",
    ])
      expect(within(section).getByTestId(testId)).toBeInTheDocument();
    expect(
      [...section.querySelectorAll(".tool-tile .tool-tile-label")].map(
        (label) => label.textContent,
      ),
    ).toEqual(["Coût", "Mur", "VP gagnés", "Armée / h", "Or / h"]);
    // The breakdowns are their own cards under it, Armée first.
    expect(
      [...document.querySelectorAll(".tool-breakdown")].map(
        (card) => card.querySelector("h2")!.textContent,
      ),
    ).toEqual(["Armée / h par ville", "Or / h par ville"]);
  });

  it("keeps Remparts as plain start/target levels, never multiplied by the city count (Bloc 33/C)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    const wallAtOne = screen.getByTestId("city-cost-wall").textContent;
    const totalAtOne = screen.getByTestId("city-cost-total").textContent;
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Nombre de villes" }),
      { target: { value: "5" } },
    );
    // Coût scales with the city count...
    expect(screen.getByTestId("city-cost-total").textContent).not.toBe(
      totalAtOne,
    );
    // ...Remparts (a level, identical for every upgraded city) does not.
    expect(screen.getByTestId("city-cost-wall").textContent).toBe(wallAtOne);
  });

  it("merges Niveau Max Atteignable's 2 result blocks into a single Total block, verified against the real component (Bloc 33/L)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    expect(
      screen.queryByText("Ville seule (niveau atteint)"),
    ).not.toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Total" });
    const section = heading.closest("section")!;
    for (const testId of [
      "max-level-result",
      "city-max-level-remaining",
      "city-max-level-vp",
      "city-max-level-army",
      "city-max-level-gold",
    ])
      expect(within(section).getByTestId(testId)).toBeInTheDocument();
    // Bloc 113/C: no wall tile — a wall total over several cities is not a
    // quantity — and nothing at all under the tiles.
    expect(screen.queryByTestId("city-max-level-wall")).toBeNull();
    expect(screen.queryByText("Mur")).toBeNull();
    expect(section.nextElementSibling).toBeNull();
  });

  // Bloc 92/M2: the active tools tab is wired to its rendered tabpanel via
  // matching aria-controls / id / aria-labelledby.
  it("Bloc92/M2: wires each City tools tab to its tabpanel", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    const costTab = screen.getByRole("tab", { name: "Coût de Ville" });
    expect(costTab).toHaveAttribute("id", "city-tools-tab-cost");
    expect(costTab).toHaveAttribute("aria-controls", "city-tools-panel-cost");
    const costPanel = document.getElementById("city-tools-panel-cost")!;
    expect(costPanel).toHaveAttribute("role", "tabpanel");
    expect(costPanel).toHaveAttribute("aria-labelledby", "city-tools-tab-cost");

    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    const maxPanel = document.getElementById("city-tools-panel-max-level")!;
    expect(maxPanel).toHaveAttribute("role", "tabpanel");
    expect(maxPanel).toHaveAttribute(
      "aria-labelledby",
      "city-tools-tab-max-level",
    );
  });

  // Bloc 92/H1: the cost result (placeholder + computed totals) lives in a
  // permanently-mounted aria-live region.
  it("Bloc92/H1: keeps the City cost result inside an aria-live region", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    // Bloc 92/A11y (Codex PR #116): the placeholder no longer carries its own
    // role="status" (it would nest inside this live region); assert it sits in
    // the live region by its class instead.
    expect(
      document.querySelector('[aria-live="polite"] .empty-state'),
    ).not.toBeNull();
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name: "Légende",
      }),
    );
    expect(
      screen.getByTestId("city-cost-total").closest('[aria-live="polite"]'),
    ).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bloc 113: the four sub-tabs, rebuilt as tiles.
//
// The figures asserted here are the ones that do NOT depend on the player's
// own equipment and temple: a cost, a wall, a VP gain, a reachable level, a
// reward. Anything boosted by those settings is covered by the per-league
// cases above, which set them explicitly.
// ---------------------------------------------------------------------------
describe("Bloc 113: the Villes tool in tiles", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const show = () =>
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
  const pickLeague = (name: string) =>
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name,
      }),
    );
  const setField = (name: string, value: string) =>
    fireEvent.change(screen.getByRole("spinbutton", { name }), {
      target: { value },
    });
  const badgeOf = (testId: string) =>
    tileOf(testId).querySelector(".tool-badge")?.textContent ?? null;

  it("Coût: reads the brief's own case for 10 cities from 100 to 120", () => {
    show();
    pickLeague("Diamant");
    setField("Nombre de villes", "10");
    setField("Niveau de départ", "100");
    fireEvent.blur(
      screen.getByRole("spinbutton", { name: "Niveau de départ" }),
    );
    setField("Niveau cible", "120");
    expect(screen.getByTestId("city-cost-total")).toHaveTextContent("1.29T");
    expect(screen.getByTestId("city-cost-wall")).toHaveTextContent("+180.38G");
    expect(screen.getByTestId("city-cost-vp")).toHaveTextContent("+74.9M");
    // The wall grows 38.34-fold; one decimal, French separator.
    expect(badgeOf("city-cost-wall")).toBe("×38,3");
    // Bloc 113/A.9: the chip recalls what the figures were computed from.
    expect(
      screen.getByText("10 villes · Diamant · niveau 100 → 120"),
    ).toBeInTheDocument();
  });

  it("Niveau max: reads the brief's own case for 5 cities from 130 with 7.3T", () => {
    show();
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    pickLeague("Diamant");
    setField("Nombre de villes", "5");
    setField("Niveau de départ", "130");
    setField("Or disponible", "7.3");
    fireEvent.change(screen.getByLabelText("Unité de l’or disponible"), {
      target: { value: String(1_000_000_000_000) },
    });
    expect(screen.getByTestId("max-level-result")).toHaveTextContent("135");
    expect(badgeOf("max-level-result")).toBe("+5");
    expect(tileOf("max-level-result")).toHaveClass("tool-tile-highlight");
    expect(screen.getByTestId("city-max-level-remaining")).toHaveTextContent(
      "1.2T",
    );
    expect(screen.getByTestId("city-max-level-vp")).toHaveTextContent(
      "+90.74M",
    );
    // The ratio is the player's bonuses cancelling out, so it holds whatever
    // the equipment and temple are.
    expect(badgeOf("city-max-level-army")).toBe("×1,7");
    expect(badgeOf("city-max-level-gold")).toBe("×1,7");
  });

  it("Récompenses: reads the brief's own two cases", () => {
    show();
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    setField("Production d’armée de base", "3.78");
    fireEvent.change(screen.getByLabelText("Unité de production d’armée"), {
      target: { value: String(1_000_000_000) },
    });
    setField("Heures reçues — Armée", "144");
    setField("Production d’or de base", "24.19");
    fireEvent.change(screen.getByLabelText("Unité de production d’or"), {
      target: { value: String(1_000_000_000) },
    });
    setField("Heures reçues — Or", "240");
    expect(screen.getByTestId("city-rewards-army")).toHaveTextContent(
      "544.32G",
    );
    expect(screen.getByTestId("city-rewards-gold")).toHaveTextContent("5.81T");
  });

  // Bloc 113/A.6 + G: a range of zero width has no gap to show and no
  // multiple to state. The commit handler pushes the target back above the
  // start, so this is the state reached while typing.
  it("Coût: a target equal to the start shows dashes and drops the badges", () => {
    show();
    pickLeague("Diamant");
    setField("Niveau de départ", "50");
    setField("Niveau cible", "50");
    for (const testId of [
      "city-cost-wall",
      "city-cost-army",
      "city-cost-gold",
    ]) {
      expect(screen.getByTestId(testId)).toHaveTextContent("—");
      expect(badgeOf(testId)).toBeNull();
    }
    // And every gap cell of the tables reads the same way.
    expect(
      within(screen.getByTestId("city-cost-gold-table")).getAllByText("—")
        .length,
    ).toBeGreaterThan(0);
  });

  // Bloc 113/A.2: Armée before Or, in every sub-tab that shows both.
  it("puts Armée before Or in all four sub-tabs", () => {
    show();
    const labels = () =>
      [...document.querySelectorAll(".tool-tile-label, .tool-breakdown h2")]
        .map((node) => node.textContent ?? "")
        .filter((text) => text.includes("Armée") || text.includes("Or /"));
    pickLeague("Diamant");
    expect(labels()[0]).toContain("Armée");

    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    pickLeague("Diamant");
    expect(labels()[0]).toContain("Armée");

    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    pickLeague("Diamant");
    expect(labels()[0]).toContain("Armée");
    // Including the reskill pair.
    expect(
      [
        ...document.querySelectorAll(".tool-tiles-reskill .tool-tile-label"),
      ].map((node) => node.textContent),
    ).toEqual(["Armée si full Recruteur", "Or si full Prospérité"]);

    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    expect(
      [...document.querySelectorAll(".tool-reward-card h2")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["Armée", "Or"]);
  });

  // Bloc 113/D: the N-city figure sits in the Production column, and the
  // Part column beside it stays empty.
  it("Production: the N-city row holds its figure in the Production column", () => {
    show();
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    pickLeague("Diamant");
    setField("Nombre de villes", "10");
    setField("Niveau moyen des villes", "130");
    const grand = screen
      .getByTestId("city-production-gold-table")
      .querySelector<HTMLElement>(".tool-row-grand")!;
    expect(grand.querySelector("th")).toHaveTextContent(
      "Total 10 villes niveau 130",
    );
    const cells = grand.querySelectorAll("td");
    expect(cells[0]).toHaveClass("tool-value-violet");
    expect(cells[0].textContent).not.toContain("/h");
    expect(cells[1].textContent).toBe("");
    // Bloc 113/D: no wall tile, and no duplicate VP total.
    expect(screen.queryByText("Mur")).toBeNull();
    expect(screen.getAllByText("VP")).toHaveLength(1);
  });

  // Bloc 113/A.4: line icons, never emoji, and never announced.
  it("draws its icons as decorative stroke SVG", () => {
    show();
    pickLeague("Diamant");
    const icons = document.querySelectorAll(".tool-icon");
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon.getAttribute("stroke")).toBe("currentColor");
    }
    expect(document.body.textContent).not.toContain("💰");
    expect(document.body.textContent).not.toContain("⚔️");
  });
});

// ---------------------------------------------------------------------------
// Bloc 117 — the section heading stops repeating the chip beside it.
//
// "Total pour 1 ville" said what "1 ville · Diamant · niveau 100 → 120"
// already said, two centimetres to its right. The heading is now just
// "Total", and the chip is untouched — which is what these check: the short
// title on each of the three sub-tabs, the chip's exact wording still there,
// and the figures under them unmoved.
// ---------------------------------------------------------------------------
describe("Bloc 117: the Villes headings lose what the chip already says", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const show = () =>
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
  const pickLeague = (name: string) =>
    fireEvent.click(
      within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
        name,
      }),
    );
  const setField = (name: string, value: string) =>
    fireEvent.change(screen.getByRole("spinbutton", { name }), {
      target: { value },
    });

  /** The heading of the section a result tile sits in. */
  const headingOf = (testId: string) =>
    screen
      .getByTestId(testId)
      .closest("section")!
      .querySelector(".calculator-heading")!.textContent;

  /** The recall chip of that same section. */
  const chipOf = (testId: string) =>
    screen
      .getByTestId(testId)
      .closest("section")!
      .querySelector(".tool-recall")!.textContent;

  it("Coût: reads 'Total', and the chip still carries the whole detail", () => {
    show();
    pickLeague("Diamant");
    setField("Nombre de villes", "10");
    setField("Niveau de départ", "100");
    setField("Niveau cible", "120");
    expect(headingOf("city-cost-total")).toBe("Total");
    expect(chipOf("city-cost-total")).toBe(
      "10 villes · Diamant · niveau 100 → 120",
    );
    // And the figures are where they were.
    expect(screen.getByTestId("city-cost-total")).toHaveTextContent("1.29T");
    expect(screen.getByTestId("city-cost-vp")).toHaveTextContent("+74.9M");
  });

  it("Niveau max: reads 'Total', chip and figures unchanged", () => {
    show();
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    pickLeague("Diamant");
    setField("Nombre de villes", "5");
    setField("Niveau de départ", "130");
    setField("Or disponible", "7.3");
    fireEvent.change(screen.getByLabelText("Unité de l’or disponible"), {
      target: { value: String(1_000_000_000_000) },
    });
    expect(headingOf("max-level-result")).toBe("Total");
    expect(chipOf("max-level-result")).toBe(
      "5 villes · Diamant · niveau 130 · 7.3T d’or disponible",
    );
    expect(screen.getByTestId("max-level-result")).toHaveTextContent("135");
  });

  it("Production: reads 'Total', chip and figures unchanged", () => {
    show();
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    pickLeague("Diamant");
    setField("Nombre de villes", "10");
    setField("Niveau moyen des villes", "130");
    expect(headingOf("city-production-army")).toBe("Total");
    expect(chipOf("city-production-army")).toBe(
      "10 villes · Diamant · niveau moyen 130",
    );
    expect(screen.getByTestId("city-production-vp")).toHaveTextContent(
      "250.89M",
    );
  });

  // The heading is a fixed string, so it cannot drift with the viewport —
  // asserted rather than assumed, since the chip beside it does change on a
  // phone in the Combat tool.
  it("keeps the same heading at a phone width", () => {
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
      show();
      pickLeague("Diamant");
      expect(headingOf("city-cost-total")).toBe("Total");
    } finally {
      window.matchMedia = wide;
    }
  });
});
