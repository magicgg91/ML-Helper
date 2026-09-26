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
import deMessages from "../../messages/de.json";
import { rankCategoryShade } from "../lib/ranking";
import {
  defaultLeagueLadder,
  type LeagueLadder,
  type LeagueRung,
} from "../lib/leagues";
import { defaultPlayerSettings } from "../lib/player-settings";
import { playerStorageKey } from "./player-settings-panel";
import { mockViewport } from "../test/viewport";
import { RankingCalculator } from "./ranking-calculator";

const leagueGroup = () => screen.getByRole("group", { name: /Ligue|League/ });
/** Bloc 112: one tile per range, in place of the summary table's rows. */
const bandTiles = () => [
  ...document.querySelectorAll<HTMLElement>(".ranking-range-tile"),
];
/** The text of one part of a tile. */
const partOf = (tile: number, selector: string) =>
  bandTiles()[tile].querySelector(selector)?.textContent ?? null;
/** The rewards one tile shows, named and valued, in the order they appear. */
const rewardsOf = (tile: number) =>
  [...bandTiles()[tile].querySelectorAll(".ranking-reward-tile")].map(
    (reward) => [
      reward.querySelector(".ranking-reward-label")!.textContent,
      reward.querySelector(".ranking-reward-value")!.textContent,
    ],
  );
const selectLeague = (name: string) =>
  fireEvent.click(within(leagueGroup()).getByRole("button", { name }));

describe("RankingCalculator", () => {
  afterEach(cleanup);
  const renderCalculator = (
    locale: "fr" | "en" = "fr",
    messages: typeof frMessages | typeof enMessages = frMessages,
  ) =>
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RankingCalculator ladder={defaultLeagueLadder} />
      </NextIntlClientProvider>,
    );
  it("converts correlated rank and percentage and renders confirmed rewards", () => {
    renderCalculator();
    selectLeague("Diamant");
    // Bloc 112: the movement verb and the league it leads to are two pieces
    // now, sized and colored differently, instead of one sentence.
    expect(
      screen.getAllByText("Montée", { selector: ".ranking-range-verb" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Légende", { selector: ".ranking-range-league" }),
    ).toHaveLength(2);
    expect(rewardsOf(0)).toEqual([["Gemmes", "6"]]);
  });
  // Bloc 112 reverses Bloc 108/H on purpose, and this pins why that is safe.
  // 108/H existed because a SENTENCE that silently dropped an absent reward
  // read as though the tool did not track it. A named mini-tile cannot read
  // that way, so only what a range grants is drawn — and Diamant, which pays
  // gems alone, no longer carries two empty slots.
  it("Bloc112: names every reward it shows, and shows only what it grants", () => {
    renderCalculator();
    selectLeague("Argent");
    expect(rewardsOf(0)).toEqual([
      ["Saphirs", "100"],
      ["Speedups", "7"],
      ["Gemmes", "6"],
    ]);
    expect(rewardsOf(5)).toEqual([
      ["Saphirs", "10"],
      ["Speedups", "2"],
      ["Gemmes", "1"],
    ]);
    // Never an empty value, in any tile of any league.
    for (const league of ["Argent", "Or", "Platine", "Diamant", "Légende"]) {
      cleanup();
      renderCalculator();
      selectLeague(league);
      for (const tile of bandTiles().keys())
        for (const [name, value] of rewardsOf(tile)) {
          expect(name, `${league} tile ${tile}`).toBeTruthy();
          expect(value, `${league} tile ${tile} (${name})`).not.toBe("");
        }
    }
  });
  it("renders the target league and rewards translated in English", () => {
    renderCalculator("en", enMessages);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamond" }),
    );
    expect(
      screen.getAllByText("Promotion", { selector: ".ranking-range-verb" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Legend", { selector: ".ranking-range-league" }),
    ).toHaveLength(2);
    expect(rewardsOf(0)).toEqual([["Gems", "6"]]);
  });
  it("shows the editable placeholder for an unknown league", () => {
    renderCalculator();
    selectLeague("Bronze");
    expect(
      screen.getByText(/à définir dans l’administration/),
    ).toBeInTheDocument();
  });
  it("handles a zero percentage without dividing by zero", () => {
    renderCalculator();
    selectLeague("Diamant");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "0" } },
    );
    // Bloc 112: there is no deduced-total figure to show a dash in any more,
    // so the honest signal is the prompt and no tiles at all.
    expect(screen.getByText(/pourcentage supérieur à 0/)).toBeInTheDocument();
    expect(bandTiles()).toHaveLength(0);
  });

  it("waits for a league instead of calculating with a default", () => {
    renderCalculator();
    for (const button of within(leagueGroup()).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Choisis une ligue/)).toBeInTheDocument();
  });

  // Bloc 61/B: single-select league buttons — clicking one presses only
  // that one.
  it("Bloc61/B: presses only the clicked league button (single-select)", () => {
    renderCalculator();
    selectLeague("Diamant");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Bronze" }),
    ).toHaveAttribute("aria-pressed", "false");
    selectLeague("Bronze");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Bronze" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  // Bloc 61/B: league buttons, the % field and the rank field must all sit
  // in the same single-line row (no wrapping between the button group and
  // the numeric fields) — asserted by checking they share one non-wrapping
  // flex container.
  it("Bloc61/B: keeps league buttons, percentage and rank on a single row", () => {
    const { container } = renderCalculator();
    const row = container.querySelector(".ranking-fields");
    expect(row).not.toBeNull();
    expect(row).toHaveClass("ranking-fields");
    expect(row?.querySelector(".family-buttons")).not.toBeNull();
    const numberFields = row?.querySelectorAll(".ranking-number-field");
    expect(numberFields).toHaveLength(2);
  });

  // Bloc 69/G: mobile-only redesign, desktop unaffected — the league group
  // gets the same .league-buttons-grid class as Events/Progression's, so it
  // forms a 2-row/3-column grid there instead of desktop's single row.
  it("Bloc69/G: gives the league button group the .league-buttons-grid class for the mobile 2x3 grid", () => {
    renderCalculator();
    expect(leagueGroup()).toHaveClass("league-buttons-grid");
  });

  // Bloc 112: the single 100%->0% scale is gone — every tile carries its own
  // bar — so the player's exact position is marked inside the one range that
  // contains it, and nowhere else.
  it("marks the player's position in its own range, and only there", () => {
    const { container } = renderCalculator();
    selectLeague("Diamant");
    expect(container.querySelector(".ranking-scale")).toBeNull();
    const markers = screen.getAllByTestId("ranking-player-marker");
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveStyle({ left: "1%" });
    // The default 1% sits in Diamant's top range, which is the first tile.
    expect(bandTiles()[0]).toContainElement(markers[0]);
    expect(partOf(0, ".ranking-player-bubble")).toBe("Vous · 1\u00a0%");
  });

  it("colors each tile light-to-dark within its Montée/Maintien/Descente category", () => {
    renderCalculator();
    selectLeague("Diamant");
    // The band shade travels as --band-color, as it has since Bloc 110/C —
    // same shades, same order, so the palette itself is unchanged.
    expect(
      bandTiles().map((tile) => tile.style.getPropertyValue("--band-color")),
    ).toEqual(["#a8dcb8", "#7ec99a", "#a8c9e8", "#7eabd9", "#f0b088"]);
  });

  // Bloc 64/G: settles Bloc 62/D's open choice on option (b) — the 2
  // numeric fields carry their label inline, immediately before their own
  // control. Asserted structurally: each label is the field's first child,
  // sharing a single-line row with the control.
  // Bloc 71/B reversed this for the league field specifically (see the
  // dedicated test below) — only 2 fields (percentage/rank) use this
  // inline pattern now, not 3.
  it("Bloc64/G: puts each numeric field's label inline right before its control", () => {
    const { container } = renderCalculator();
    const fields = Array.from(
      container.querySelectorAll(".ranking-inline-field"),
    );
    expect(fields).toHaveLength(2);
    expect(fields.map((field) => field.firstElementChild?.textContent)).toEqual(
      ["Ton pourcentage actuel", "Ton rang actuel"],
    );
    for (const field of fields) {
      // The label is a sibling of the control, not a line above it.
      expect(field.firstElementChild).toHaveClass("ranking-field-label");
      expect(field.children.length).toBe(2);
    }
  });

  // Bloc 71/B: the league field rejoins the Villes/Demo Attack desktop
  // pattern (Blocs 69/70) — a title above the buttons (not inline before
  // them, unlike the 2 numeric fields above), no longer carrying
  // .ranking-inline-field.
  it("Bloc71/B: puts the league field's title above the buttons, not inline before them", () => {
    const { container } = renderCalculator();
    const leagueField = container.querySelector(".ranking-league-field");
    expect(leagueField).not.toBeNull();
    expect(leagueField).not.toHaveClass("ranking-inline-field");
    expect(leagueField?.firstElementChild?.textContent).toBe(
      "Ligue / Division",
    );
    expect(leagueField?.firstElementChild).toHaveClass("ranking-field-label");
  });

  // Bloc 112 removes the estimated-players figure outright — the last range
  // already ends on that number, so the tile restated it. The wording the
  // Blocs 62/E and 64/F argued over must not survive anywhere on the page.
  it("Bloc112: shows no estimated-players figure any more", () => {
    renderCalculator();
    selectLeague("Diamant");
    for (const wording of [
      "Nombre estimé de joueurs",
      "Nombre total de joueurs",
    ])
      expect(screen.queryByText(wording)).not.toBeInTheDocument();
    expect(screen.queryByTestId("ranking-total")).toBeNull();
    expect(screen.queryByText(/déduit/i)).not.toBeInTheDocument();
  });

  // Bloc 112: and the 100%->0% scale with it, title included — each tile
  // carries its own bar instead.
  it("Bloc112: shows no global scale, only per-tile bars", () => {
    const { container } = renderCalculator();
    selectLeague("Diamant");
    expect(screen.queryByText("Échelle visuelle")).not.toBeInTheDocument();
    expect(container.querySelector(".ranking-scale")).toBeNull();
    expect(container.querySelectorAll(".ranking-range-bar")).toHaveLength(
      bandTiles().length,
    );
  });

  // Bloc 62/G: confirmed case from the task — Légende, rank 137, 86.71% ->
  // raw total 157.998, which ceils to 158 (flooring would undercount by a
  // player). Bloc 112 removed the badge that used to show it, on the grounds
  // that the last range already ends there — so this now asserts that it
  // really does, which is what makes the removal safe.
  it("Bloc62/G: the last range ends on the ceiled deduced total", () => {
    renderCalculator();
    selectLeague("Légende");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "86.71" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton rang actuel" }),
      { target: { value: "137" } },
    );
    const tiles = bandTiles();
    expect(partOf(tiles.length - 1, ".ranking-range-ranks-value")).toMatch(
      /158$/,
    );
  });

  // Bloc 92/H1: the whole result area — the header, the not-ready
  // placeholders and the range tiles — sits inside a permanently-mounted
  // aria-live region so recomputes are announced.
  it("Bloc92/H1: keeps the header, placeholder and range tiles inside an aria-live region", () => {
    const { container } = renderCalculator();
    // Bloc 92/A11y (Codex PR #116): placeholder dropped its role="status" to
    // avoid nesting inside this live region; find it by class instead.
    expect(
      document.querySelector('[aria-live="polite"] .ranking-placeholder'),
    ).not.toBeNull();
    selectLeague("Diamant");
    for (const selector of [".ranking-ranges-header", ".ranking-range-tiles"])
      expect(
        container.querySelector(selector)!.closest('[aria-live="polite"]'),
        selector,
      ).not.toBeNull();
  });
});

/** A ladder with divisions, one of them not switched on yet. */
const withDivisions: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [],
  },
  {
    id: "silver-2",
    league: "silver",
    division: "2",
    name: {},
    position: 1,
    active: true,
    bands: [],
  },
  {
    id: "silver-1",
    league: "silver",
    division: "1",
    name: {},
    position: 2,
    active: true,
    bands: [],
  },
  {
    id: "gold-2",
    league: "gold",
    division: "2",
    name: {},
    position: 3,
    active: true,
    bands: [],
  },
  {
    id: "gold-1",
    league: "gold",
    division: "1",
    name: {},
    position: 4,
    active: true,
    bands: [
      {
        threshold: 100,
        movement: "stay",
        target: "gold-1",
        rewards: [
          { type: "sapphires", quantity: 40 },
          { type: "speedups", quantity: 5 },
        ],
      },
    ],
  },
  {
    // Fully configured, deliberately left off until the split happens in game.
    id: "platinum-2",
    league: "platinum",
    division: "2",
    name: {},
    position: 5,
    active: false,
    bands: [
      {
        threshold: 100,
        movement: "stay",
        target: "platinum-2",
        rewards: [{ type: "gems", quantity: 3 }],
      },
    ],
  },
];

const renderLadder = (ladder: LeagueLadder) =>
  render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <RankingCalculator ladder={ladder} />
    </NextIntlClientProvider>,
  );

describe("Bloc 108/C+G: what the public page shows of the ladder", () => {
  afterEach(cleanup);

  it("offers every active entry, in ladder order, however many there are", () => {
    renderLadder(withDivisions);
    expect(
      within(leagueGroup())
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Bronze", "Argent 2", "Argent 1", "Or 2", "Or 1"]);
  });

  // Bloc 108/G: the point of the flag — the player prepares Platine 2 now and
  // switches it on when the game splits, with nothing left to create that day.
  it("hides an inactive entry even when its data is complete", () => {
    renderLadder(withDivisions);
    expect(
      within(leagueGroup()).queryByRole("button", { name: "Platine 2" }),
    ).toBeNull();
  });

  it("shows it as soon as it is switched on, and nothing else changes", () => {
    const activated = withDivisions.map((entry) =>
      entry.id === "platinum-2" ? { ...entry, active: true } : entry,
    );
    renderLadder(activated);
    expect(
      within(leagueGroup()).getByRole("button", { name: "Platine 2" }),
    ).toBeVisible();
    // And switching it back off removes it again — both directions.
    cleanup();
    renderLadder(withDivisions);
    expect(
      within(leagueGroup()).queryByRole("button", { name: "Platine 2" }),
    ).toBeNull();
  });

  // Bloc 108/C: completeness of the data is NOT a visibility lever. An active
  // entry with no thresholds yet says so, the way the Progression reference
  // does for a league whose formula is not confirmed.
  it("keeps an active but empty entry visible, with a 'no data yet' state", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Argent 1" }),
    );
    expect(
      screen.getByText(/à définir dans l’administration pour Argent 1/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // Bloc 108/D: the new public information.
  it("shows the League Lock two rungs below, and says so when there is none", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(screen.getByTestId("ranking-league-lock")).toHaveTextContent(
      "Argent 1",
    );
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Bronze" }),
    );
    expect(screen.getByTestId("ranking-league-lock")).toHaveTextContent(
      /pas assez de paliers/i,
    );
  });

  // Bloc 111: the near-floor cases, on the public page. Bronze is the floor,
  // so a rung one or two above it cannot be locked two rungs down — the walk
  // shortens instead of the tool answering "none".
  it.each([
    // Even one rung back would be Bronze, so Argent 2 is its own lock.
    ["Argent 2", "Argent 2"],
    // Two rungs back would be Bronze, so the walk stops at Argent 2.
    ["Argent 1", "Argent 2"],
  ])("Bloc111: shows %s locked at %s", (from, expected) => {
    renderLadder(withDivisions);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: from }));
    expect(screen.getByTestId("ranking-league-lock")).toHaveTextContent(
      expected,
    );
  });

  // Bloc 108/H, end to end on the public side: every reward the range grants
  // is named where it is shown, rather than folded into a sentence that never
  // mentioned the absent ones.
  it("Bloc108/H: names speedups beside sapphires on a range that grants both", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    // Bloc 112: speedups are named on their own mini-tile, and the gems this
    // range does not grant simply have no tile — see the Bloc112 test above
    // for why that no longer reads as "not tracked".
    expect(rewardsOf(0)).toEqual([
      ["Saphirs", "40"],
      ["Speedups", "5"],
    ]);
  });

  it("names a target by its division, not by its base league", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(
      screen.getByText("Or 1", { selector: ".ranking-range-league" }),
    ).toBeVisible();
  });
});

// Codex review (PR #135). Each of these pins one finding.
describe("Bloc 108, revue Codex", () => {
  afterEach(cleanup);

  // P1: a free name is admin-managed text that reaches every reader, so it is
  // stored per locale and falls back to English — never shown as typed in one
  // language to all five.
  it("P1: reads a free name in the reader's language, falling back to English", () => {
    const named: LeagueLadder = [
      {
        id: "champion",
        league: null,
        division: "",
        name: { fr: "Champion suprême", en: "Supreme Champion" },
        position: 0,
        active: true,
        bands: [],
      },
      {
        // Only English filled in: every locale gets the English one, which is
        // this project's fallback rule, rather than an empty label.
        id: "challenger",
        league: null,
        division: "",
        name: { en: "Challenger" },
        position: 1,
        active: true,
        bands: [],
      },
    ];
    renderLadder(named);
    expect(
      within(leagueGroup())
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Champion suprême", "Challenger"]);

    cleanup();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <RankingCalculator ladder={named} />
      </NextIntlClientProvider>,
    );
    expect(
      within(leagueGroup())
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Supreme Champion", "Challenger"]);
  });

  // P2: a band may point at a rung prepared but not switched on. Naming it
  // would put a future division on the public page — what the flag prevents.
  it("P2: never names an inactive target, in any tile", () => {
    const ladder: LeagueLadder = [
      {
        id: "gold",
        league: "gold",
        division: "",
        name: {},
        position: 0,
        active: true,
        bands: [
          {
            threshold: 100,
            movement: "promotion",
            target: "platinum-2",
            rewards: [{ type: "gems", quantity: 1 }],
          },
        ],
      },
      {
        id: "platinum-2",
        league: "platinum",
        division: "2",
        name: {},
        position: 1,
        active: false,
        bands: [],
      },
    ];
    const { container } = renderLadder(ladder);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
    expect(screen.queryByText(/Platine 2/)).toBeNull();
    expect(
      screen.getByText("À définir dans l’administration", {
        selector: ".ranking-range-league",
      }),
    ).toBeVisible();
    expect(container.innerHTML).not.toContain("Platine 2");
  });

  // P2: an admin can move an entry to another base league while its id — what
  // the player has persisted — stays the same. The stored division must still
  // belong to the league the player is in, or the calculator would quietly
  // show another league's bands.
  it("P2: ignores a stored division whose entry has moved to another league", () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "gold",
        division: "gold-1",
        equipmentSkills: {},
      }),
    );
    const moved: LeagueLadder = [
      {
        // Same id, now under Platine — the player's stored "gold-1".
        id: "gold-1",
        league: "platinum",
        division: "1",
        name: {},
        position: 0,
        active: true,
        bands: [],
      },
      {
        id: "gold",
        league: "gold",
        division: "",
        name: {},
        position: 1,
        active: true,
        bands: [],
      },
    ];
    renderLadder(moved);
    // Gold is the player's league and has a single rung, so that one resolves
    // — never the moved entry, whatever its id says.
    expect(
      within(leagueGroup()).getByRole("button", { name: /^Or$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Platine 1" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

/** A ladder of `count` active rungs, named so each button is distinguishable. */
const ladderOf = (count: number): LeagueLadder =>
  Array.from({ length: count }, (_, index) => ({
    id: `rung-${index + 1}`,
    league: null,
    division: "",
    name: { fr: `Rang ${index + 1}`, en: `Rung ${index + 1}` },
    position: index,
    active: true,
    bands: [],
  }));

/** The buttons of each rendered row, as counts. */
const rowSizes = () => {
  const rows = [...document.querySelectorAll(".league-button-row")];
  return rows.length
    ? rows.map((row) => row.querySelectorAll("button").length)
    : [within(leagueGroup()).getAllByRole("button").length];
};

// Bloc 109: the picker's button count became variable at Bloc 108, so its
// layout is a formula over that count rather than the single row it shipped
// with. These check what actually reaches the DOM.
describe("Bloc 109: the league picker's rows on screen", () => {
  let viewport: ReturnType<typeof mockViewport>;
  afterEach(() => {
    viewport.restore();
    cleanup();
  });

  const show = (count: number, narrow: boolean) => {
    viewport = mockViewport(narrow);
    return renderLadder(ladderOf(count));
  };

  it.each([
    [7, [4, 3]],
    [8, [4, 4]],
    [9, [5, 4]],
    [10, [5, 5]],
  ])("desktop lays %i buttons out as %j", (count, expected) => {
    show(count, false);
    expect(rowSizes()).toEqual(expected);
  });

  // Bloc 110/1, replacing Bloc 109's three-per-row mobile rule: two fixed
  // columns, at any count — six included, which desktop still leaves on one
  // row.
  it.each([
    [6, [2, 2, 2]],
    [7, [2, 2, 2, 1]],
    [8, [2, 2, 2, 2]],
    [10, [2, 2, 2, 2, 2]],
  ])("mobile lays %i buttons out as %j", (count, expected) => {
    show(count, true);
    expect(rowSizes()).toEqual(expected);
  });

  it("never puts a third button on a mobile row, whatever the count", () => {
    for (let count = 3; count <= 12; count += 1) {
      cleanup();
      viewport.restore();
      show(count, true);
      expect(Math.max(...rowSizes()), `${count} buttons`).toBeLessThanOrEqual(
        2,
      );
    }
  });

  it("keeps every button, once, whatever the split", () => {
    show(10, true);
    const labels = within(leagueGroup())
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(
      Array.from({ length: 10 }, (_, index) => `Rang ${index + 1}`),
    );
  });

  // The buttons still work as one group: the split is presentation, and the
  // selection must not care which row a rung landed on.
  it("still selects a rung from any row", () => {
    show(10, true);
    const last = within(leagueGroup()).getByRole("button", { name: "Rang 10" });
    fireEvent.click(last);
    expect(last).toHaveAttribute("aria-pressed", "true");
    expect(
      within(leagueGroup()).getByRole("button", { name: "Rang 1" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  // On DESKTOP at six or fewer the markup is what it has always been — no row
  // wrappers at all, so the layout CSS that has always drawn it still does.
  // Bloc 110/1 narrowed this to desktop: a phone splits at every count now.
  it("leaves six or fewer exactly as they were on desktop", () => {
    show(6, false);
    expect(document.querySelectorAll(".league-button-row")).toHaveLength(0);
    expect(leagueGroup()).not.toHaveClass("league-buttons-rows");
    expect(leagueGroup()).toHaveClass("family-buttons", "league-buttons-grid");
    expect(within(leagueGroup()).getAllByRole("button")).toHaveLength(6);
  });

  // Bloc 71/B + 73/C: the picker's half of the row is set on the field, not
  // on the button group, so splitting the buttons cannot move it. Asserted on
  // the class that carries the 50% (.ranking-league-field, globals.css) and
  // pinned to the rule itself in responsive-styles.test.ts.
  it.each([6, 7, 10])(
    "keeps the field's own 50%% class at %i buttons",
    (count) => {
      const { container } = show(count, false);
      const field = container.querySelector(".ranking-league-field");
      expect(field).not.toBeNull();
      expect(field!.querySelector(".family-buttons")).not.toBeNull();
    },
  );

  // A rotation re-splits: the row shape is a function of the width, and the
  // width can change under a mounted picker.
  it("re-splits when the viewport crosses the breakpoint", () => {
    show(10, false);
    expect(rowSizes()).toEqual([5, 5]);
    viewport.resize(true);
    expect(rowSizes()).toEqual([2, 2, 2, 2, 2]);
    viewport.resize(false);
    expect(rowSizes()).toEqual([5, 5]);
  });

  // Bloc 110/1: six is where the two layouts now differ — the count the tool
  // ships with, so this is the case a reader will actually see.
  it("splits six on a phone while desktop keeps its single row", () => {
    show(6, true);
    expect(rowSizes()).toEqual([2, 2, 2]);
    viewport.resize(false);
    expect(document.querySelectorAll(".league-button-row")).toHaveLength(0);
    expect(within(leagueGroup()).getAllByRole("button")).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Bloc 112: the "Plages de classement" section, rebuilt.
//
// Everything it shows was already computed before this bloc — the ranges, the
// ranks, the rewards, the player's percentage — so these check the layout and
// the reading, never a number the calculator did not already produce.
// ---------------------------------------------------------------------------

/** A tile's own part, by class, for each tile in order. */
const partsOf = (selector: string) =>
  bandTiles().map((tile) => tile.querySelector(selector)?.textContent ?? null);

describe("Bloc 112: what a range tile reads", () => {
  afterEach(cleanup);
  const show = (league = "Diamant") => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: league }),
    );
  };

  // Best range first, worst last — the order the tool has always had.
  it("keeps the best range at the top and the worst at the bottom", () => {
    show();
    const percentiles = partsOf(".ranking-range-percentile");
    expect(percentiles[0]).toBe("Top 1\u00a0%");
    expect(percentiles[percentiles.length - 1]).toBe("60 → 100\u00a0%");
  });

  // The first range has no lower bound to name, so it reads as a "top N%".
  it("writes the percentile as a top for the first range and a span after", () => {
    show();
    expect(partsOf(".ranking-range-percentile")).toEqual([
      "Top 1\u00a0%",
      "1 → 6\u00a0%",
      "6 → 25\u00a0%",
      "25 → 60\u00a0%",
      "60 → 100\u00a0%",
    ]);
  });

  // Ranks read low to high. They used to print end-to-start, which read as a
  // countdown.
  it("writes the ranks in ascending order", () => {
    show();
    const ranks = partsOf(".ranking-range-ranks-value");
    expect(ranks[0]).toBe("1 – 10");
    for (const rank of ranks) {
      const [from, to] = rank!
        .split("–")
        .map((part) => Number(part.replace(/\D/g, "")));
      expect(from, rank!).toBeLessThanOrEqual(to);
    }
  });

  it("splits the movement from the league it leads to", () => {
    show();
    expect(partsOf(".ranking-range-verb")).toEqual([
      "Montée",
      "Montée",
      "Maintien",
      "Maintien",
      "Descente",
    ]);
    expect(partsOf(".ranking-range-league")).toEqual([
      "Légende",
      "Légende",
      "Diamant",
      "Diamant",
      "Platine",
    ]);
  });

  // The whole point of removing the estimated-players tile: that number is
  // the last range's upper bound, so the tile only restated it.
  it("ends the last range on the number the removed tile used to show", () => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    );
    const ranks = partsOf(".ranking-range-ranks-value");
    // The separator is whatever the locale uses, so it is not pinned here.
    expect(ranks[ranks.length - 1]).toMatch(/1[\s\u00a0\u202f]000$/);
  });
});

describe("Bloc 112: the player's own position", () => {
  afterEach(cleanup);
  /**
   * The rank is moved with the percentage so the deduced population stays at
   * ~1000 players: a small enough population drops ranges that hold no whole
   * rank, and these tests are about which range the player lands in, not
   * about that.
   */
  const showAt = (percentage: string) => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: percentage } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton rang actuel" }),
      { target: { value: String(Math.round(Number(percentage) * 10)) } },
    );
  };
  /** The tile carrying the marker, named by the range it shows. */
  const markedRange = () => {
    const tile = bandTiles().find((item) =>
      item.querySelector(".ranking-range-bar-player"),
    );
    return (
      tile?.querySelector(".ranking-range-percentile")?.textContent ?? null
    );
  };

  // Diamant's ranges are 0-1, 1-6, 6-25, 25-60, 60-100.
  it.each([
    ["0.5", "Top 1\u00a0%"],
    ["3", "1 → 6\u00a0%"],
    ["10", "6 → 25\u00a0%"],
    ["30", "25 → 60\u00a0%"],
    ["95", "60 → 100\u00a0%"],
  ])("marks %s%% in the %s range and nowhere else", (percentage, range) => {
    showAt(percentage);
    expect(screen.getAllByTestId("ranking-player-marker")).toHaveLength(1);
    expect(markedRange()).toBe(range);
  });

  // A percentage landing exactly on a threshold belongs to the better of the
  // two ranges that share it, never to both.
  it("puts a percentage sitting on a bound in the better range", () => {
    showAt("6");
    expect(markedRange()).toBe("1 → 6\u00a0%");
    expect(screen.getAllByTestId("ranking-player-marker")).toHaveLength(1);
  });

  it("puts the marker at the percentage itself", () => {
    showAt("8.59");
    expect(screen.getByTestId("ranking-player-marker")).toHaveStyle({
      left: "8.59%",
    });
  });

  // The marker is decorative; the same position is written out beside it.
  it("writes the position out as text, in the same tile", () => {
    showAt("8.59");
    const tile = bandTiles().find((item) =>
      item.querySelector(".ranking-range-bar-player"),
    )!;
    expect(tile).toBeDefined();
    // Compared on the raw text: toHaveTextContent normalises whitespace, and
    // the no-break space before the % is part of the French wording.
    expect(tile.querySelector(".ranking-player-bubble")!.textContent).toBe(
      "Vous · 8,59\u00a0%",
    );
    expect(tile.querySelector(".ranking-range-bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // One bubble, never two: the desktop and mobile positions are the same
  // element moved, not a second copy hidden by CSS, so a screen reader reads
  // the player's position once.
  it.each([false, true])("renders exactly one bubble (narrow=%s)", (narrow) => {
    const viewport = mockViewport(narrow);
    showAt("8.59");
    expect(document.querySelectorAll(".ranking-player-bubble")).toHaveLength(1);
    viewport.restore();
  });
});

describe("Bloc 112: the League Lock chip in the header", () => {
  afterEach(cleanup);

  it("sits in the section header, beside the heading", () => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
    const header = document.querySelector(".ranking-ranges-header")!;
    expect(header.querySelector("h2")).toHaveTextContent(
      "Plages de classement",
    );
    expect(header).toContainElement(screen.getByTestId("ranking-league-lock"));
    expect(
      header.querySelector(".ranking-chip-lock .ranking-header-chip-label"),
    ).toHaveTextContent("Ligue verrou");
    // No tile left where the pair used to be.
    expect(document.querySelector(".ranking-info-tiles")).toBeNull();
  });

  // Bloc 108/D has shown the lock for an active entry with no thresholds yet
  // since it shipped; moving it into the ranges header must not lose that.
  it("still shows for an entry that has no ranges yet", () => {
    // Three rungs, the top one deliberately without a single threshold.
    const empty: LeagueLadder = ["bronze", "silver", "gold"].map(
      (league, index) => ({
        id: league,
        league: league as LeagueRung["league"],
        division: "",
        name: {},
        position: index,
        active: true,
        bands: [],
      }),
    );
    renderLadder(empty);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
    expect(
      screen.getByText(/à définir dans l’administration pour Or/i),
    ).toBeInTheDocument();
    // Argent, not Bronze: Bronze is the floor of this three-rung ladder, and
    // Bloc 111 shortens the walk rather than landing on it.
    expect(screen.getByTestId("ranking-league-lock")).toHaveTextContent(
      "Argent",
    );
  });

  it("shows no header at all until a league is picked", () => {
    // An earlier test in this file persists player settings, and a stored
    // league resolves an entry on its own (Bloc 108/E).
    window.localStorage.clear();
    renderLadder(defaultLeagueLadder);
    expect(document.querySelector(".ranking-ranges-header")).toBeNull();
    expect(screen.queryByTestId("ranking-league-lock")).toBeNull();
  });
});

// Codex review (PR #139), P2. The estimated-players figure was removed on
// the grounds that the last range ends on it — true only of a range reaching
// 100%: calculateRanking ceils there and floors everywhere else. A ladder can
// stop short of 100 (isSavableLeagueLadder only checks 0 < t <= 100), and a
// small enough population can drop the 100% range from one that has it. In
// both cases the figure was nowhere on the page.
describe("Bloc 112, revue Codex : le total quand aucune plage ne le porte", () => {
  afterEach(cleanup);

  /** A one-rung ladder whose single range stops at `top` percent. */
  const stoppingAt = (top: number): LeagueLadder => [
    {
      id: "gold",
      league: "gold",
      division: "",
      name: {},
      position: 0,
      active: true,
      bands: [
        { threshold: top, movement: "stay", target: "gold", rewards: [] },
      ],
    },
  ];
  const show = (ladder: LeagueLadder) => {
    renderLadder(ladder);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
  };

  it("shows the figure when the ladder stops short of 100%", () => {
    show(stoppingAt(80));
    // 10th at 1% deduces 1000 players; the only range ends at 80% of them.
    expect(partOf(0, ".ranking-range-ranks-value")).toMatch(/800$/);
    expect(screen.getByTestId("ranking-total").textContent).toMatch(
      /1[\s\u00a0\u202f]000$/,
    );
  });

  it("keeps it hidden when a range does end on the total", () => {
    show(stoppingAt(100));
    expect(partOf(0, ".ranking-range-ranks-value")).toMatch(
      /1[\s\u00a0\u202f]000$/,
    );
    expect(screen.queryByTestId("ranking-total")).toBeNull();
  });

  it("shows it for an entry whose thresholds are not filled in yet", () => {
    show([{ ...stoppingAt(100)[0], bands: [] }]);
    expect(bandTiles()).toHaveLength(0);
    expect(screen.getByTestId("ranking-total")).toBeInTheDocument();
  });

  // The other way the figure could go missing would be the 100% range being
  // dropped for want of players — it cannot be, and ranking.test.ts pins that
  // as a property. So a ladder stopping short is the whole of this case.
  it("stays hidden while there is nothing to deduce", () => {
    show(stoppingAt(80));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "0" } },
    );
    expect(screen.queryByTestId("ranking-total")).toBeNull();
  });
});

describe("Bloc 112: the colors of a range tile", () => {
  afterEach(cleanup);

  // The shade is still the one Bloc 110/C computes — per range, from its
  // movement AND its position inside that movement's group. Nothing here is
  // a hard-coded per-league value.
  it("gives two ranges of the same result distinct shades", () => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    );
    const shades = bandTiles().map((tile) =>
      tile.style.getPropertyValue("--band-color"),
    );
    expect(new Set(shades).size).toBe(shades.length);
    // The two Montée ranges are different shades of the same green family.
    expect(shades[0]).not.toBe(shades[1]);
  });

  // Two leagues with different range counts, as the brief asks: the shading
  // follows the group's size rather than a fixed list.
  it.each([
    ["Argent", 6],
    ["Diamant", 5],
  ])("shades %s's %i ranges distinctly", (league, count) => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: league }),
    );
    const shades = bandTiles().map((tile) =>
      tile.style.getPropertyValue("--band-color"),
    );
    expect(shades).toHaveLength(count);
    expect(new Set(shades).size).toBe(count);
    for (const shade of shades) expect(shade).toMatch(/^#[0-9a-f]{6}$/i);
  });

  // The strong color, on the other hand, is the RESULT's and is fixed: the
  // class is what carries it, so two Maintien ranges wear the same blue
  // whatever their own shade.
  it("marks each tile with its result, for the fixed strong color", () => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    );
    expect(
      bandTiles().map((tile) =>
        [...tile.classList].find(
          (name) =>
            name.startsWith("ranking-range-p") ||
            name.startsWith("ranking-range-s") ||
            name.startsWith("ranking-range-r"),
        ),
      ),
    ).toEqual([
      "ranking-range-promotion",
      "ranking-range-promotion",
      "ranking-range-stay",
      "ranking-range-stay",
      "ranking-range-relegation",
    ]);
  });

  // A range whose movement an admin has not set yet is drawn as a Maintien —
  // the same neutral default rankBandShades gives it.
  it("falls back to the Maintien result when no movement is set", () => {
    const unset: LeagueLadder = [
      {
        id: "bronze",
        league: "bronze",
        division: "",
        name: {},
        position: 0,
        active: true,
        bands: [{ threshold: 100, movement: null, target: null, rewards: [] }],
      },
    ];
    renderLadder(unset);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Bronze" }),
    );
    expect(bandTiles()[0]).toHaveClass("ranking-range-stay");
    expect(partOf(0, ".ranking-range-verb")).toBeNull();
    expect(partOf(0, ".ranking-range-league")).toBe(
      "À définir dans l’administration",
    );
  });
});

describe("Bloc 112: the position bar", () => {
  afterEach(cleanup);
  const segments = () =>
    bandTiles().map((tile) => {
      const segment = tile.querySelector<HTMLElement>(
        ".ranking-range-bar-segment",
      )!;
      return [segment.style.left, segment.style.width];
    });

  // Left edge is 0% (best), right edge 100% (worst): a range covers its own
  // slice of that axis.
  it("places each segment on its own slice of the ladder", () => {
    renderLadder(defaultLeagueLadder);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamant" }),
    );
    expect(segments()).toEqual([
      ["0%", "1%"],
      ["1%", "5%"],
      ["6%", "19%"],
      ["25%", "35%"],
      ["60%", "40%"],
    ]);
  });
});

// Codex review (PR #137), P2. An admin can save two bands on the same
// threshold: the Add action seeds every new row at 100, and
// isSavableLeagueLadder only checks the range, never uniqueness. Keying the
// shades by threshold let the later band overwrite the earlier one's color —
// so the interval actually drawn on the bar could wear another movement
// category's shade.
describe("Bloc 110, revue Codex : deux bandes sur le même seuil", () => {
  afterEach(cleanup);

  const duplicated: LeagueLadder = [
    {
      id: "gold",
      league: "gold",
      division: "",
      name: {},
      position: 0,
      active: true,
      bands: [
        // The interval a reader sees: the whole bar, a promotion.
        { threshold: 100, movement: "promotion", target: null, rewards: [] },
        // The zero-width one an admin left behind by adding a row and not
        // changing its seeded 100 — a relegation, another palette entirely.
        { threshold: 100, movement: "relegation", target: null, rewards: [] },
      ],
    },
  ];

  // Bloc 112 removed the scale this was first measured on; the tile carries
  // the same --band-color, and the second band — zero width, no whole rank —
  // is dropped from the ranges, so what is left is the one a reader sees.
  it("gives the drawn band its own shade, not the later namesake's", () => {
    renderLadder(duplicated);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
    expect(bandTiles()).toHaveLength(1);
    expect(bandTiles()[0].style.getPropertyValue("--band-color")).toBe(
      rankCategoryShade("promotion", 0),
    );
  });

  it("paints the tile with its own band's shade, not a namesake's", () => {
    renderLadder(duplicated);
    fireEvent.click(within(leagueGroup()).getByRole("button", { name: "Or" }));
    const tiles = bandTiles().map((tile) =>
      tile.style.getPropertyValue("--band-color"),
    );
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles[0]).toBe(rankCategoryShade("promotion", 0));
  });
});

/**
 * Bloc 135 §2 : le nom libre sur le site public, dans une langue au-delà de
 * FR et EN.
 *
 * C'est ce que la paire `nameFr`/`nameEn` ne pouvait pas faire : un lecteur
 * allemand voyait le nom anglais, quoi que l'administration ait écrit pour
 * lui. Vérifié ici sur le paquet de traductions réel, pas sur un double —
 * la page allemande existe, et c'est elle qui doit rendre l'allemand.
 */
describe("Bloc 135 §2 — le nom libre, au-delà de FR et EN", () => {
  afterEach(cleanup);

  const named: LeagueLadder = [
    {
      id: "meisterliga",
      league: null,
      division: "",
      name: {
        fr: "Ligue des maîtres",
        en: "Masters League",
        de: "Meisterliga",
      },
      position: 0,
      active: true,
      bands: [],
    },
    {
      // Rien en allemand : le repli du site s'applique — l'anglais, puis le
      // français, jamais un libellé vide.
      id: "challenger",
      league: null,
      division: "",
      name: { fr: "Prétendant", en: "Challenger" },
      position: 1,
      active: true,
      bands: [],
    },
  ];

  const namesIn = (locale: string, messages: typeof deMessages) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RankingCalculator ladder={named} />
      </NextIntlClientProvider>,
    );
    return within(screen.getByRole("group", { name: /Liga|Ligue|League/ }))
      .getAllByRole("button")
      .map((button) => button.textContent);
  };

  it("rend l'allemand à un lecteur allemand", () => {
    expect(namesIn("de", deMessages)).toEqual(["Meisterliga", "Challenger"]);
  });

  it("garde le français et l'anglais tels qu'ils étaient", () => {
    expect(namesIn("fr", frMessages as unknown as typeof deMessages)).toEqual([
      "Ligue des maîtres",
      "Prétendant",
    ]);
    cleanup();
    expect(namesIn("en", enMessages as unknown as typeof deMessages)).toEqual([
      "Masters League",
      "Challenger",
    ]);
  });
});
