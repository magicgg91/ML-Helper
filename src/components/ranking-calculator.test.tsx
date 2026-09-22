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
import { defaultRankingLadder, type RankingLadder } from "../lib/ranking";
import { defaultPlayerSettings } from "../lib/player-settings";
import { playerStorageKey } from "./player-settings-panel";
import { mockViewport } from "../test/viewport";
import { RankingCalculator } from "./ranking-calculator";

const leagueGroup = () => screen.getByRole("group", { name: /Ligue|League/ });
/** Bloc 110/C: the interval tiles that replaced the summary table's rows. */
const bandTiles = () => [
  ...document.querySelectorAll<HTMLElement>(".ranking-band-tile"),
];
/** The names one tile gives its facts, in order. */
const factNames = (tile: number) =>
  [...bandTiles()[tile].querySelectorAll("dt")].map((name) => name.textContent);
/** The 3 reward values of one tile, in order — the rank fact comes first. */
const rewardCells = (tile: number) =>
  [...bandTiles()[tile].querySelectorAll(".ranking-band-facts .value")]
    .slice(1)
    .map((cell) => cell.textContent);
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
        <RankingCalculator ladder={defaultRankingLadder} />
      </NextIntlClientProvider>,
    );
  it("converts correlated rank and percentage and renders confirmed rewards", () => {
    renderCalculator();
    selectLeague("Diamant");
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("1 000");
    expect(
      screen.getAllByText("Montée Légende", {
        selector: ".ranking-band-target",
      }),
    ).toHaveLength(2);
    // Bloc 108/H: one column per reward type, so the gems value is a cell of
    // its own rather than a fragment of a sentence. A type this row does not
    // grant leaves its cell empty — the header already says it is tracked.
    expect(rewardCells(0)).toEqual(["", "", "6"]);
  });
  // Bloc 108/H: what used to be "100 saphirs, 7 speedup, 6 gemmes" in a
  // single cell is now three values of their own — the reason being that the
  // sentence simply omitted any reward that was absent, so a row without
  // speedups read as though the tool did not track them.
  // Bloc 110/C: the rule survives the move from table to tiles — the three
  // types are named in EVERY tile now, not once in a header row.
  it("Bloc108/H: gives each reward type its own named slot, in every tile", () => {
    renderCalculator();
    selectLeague("Argent");
    for (const tile of bandTiles().keys())
      expect(factNames(tile), `tile ${tile}`).toEqual([
        "Rang de plage",
        "Saphirs",
        "Speedups",
        "Gemmes",
      ]);
    expect(rewardCells(0)).toEqual(["100", "7", "6"]);
    expect(rewardCells(5)).toEqual(["10", "2", "1"]);
  });
  it("renders the target league and rewards translated in English", () => {
    renderCalculator("en", enMessages);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamond" }),
    );
    expect(
      screen.getAllByText("Promotion to Legend", {
        selector: ".ranking-band-target",
      }),
    ).toHaveLength(2);
    expect(rewardCells(0)).toEqual(["", "", "6"]);
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
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("—");
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

  it("shows the exact-position indicator and alternates labels above/below", () => {
    const { container } = renderCalculator();
    selectLeague("Diamant");
    const line = screen.getByTestId("ranking-scale-player-line");
    expect(line).toHaveAttribute("data-pct", "1%");
    expect(line).toHaveStyle({ left: "99%" });

    const labels = Array.from(
      container.querySelectorAll(".ranking-scale-label"),
    );
    expect(labels.map((label) => label.className)).toEqual([
      "ranking-scale-label ranking-scale-label-above",
      "ranking-scale-label ranking-scale-label-below",
      "ranking-scale-label ranking-scale-label-above",
      "ranking-scale-label ranking-scale-label-below",
      "ranking-scale-label ranking-scale-label-above",
    ]);
  });

  it("colors each segment light-to-dark within its Montée/Maintien/Descente category", () => {
    const { container } = renderCalculator();
    selectLeague("Diamant");
    // Bloc 110/C: the shade travels as --band-color now (the stylesheet
    // derives the segment's 80%-opaque fill from it) — same shades, same
    // order, so the palette itself is unchanged.
    const segments = [
      ...container.querySelectorAll<HTMLElement>(".ranking-scale-segment"),
    ];
    expect(
      segments.map((segment) => segment.style.getPropertyValue("--band-color")),
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

  // Bloc 64/F: the badge is qualified again, this time as "estimé" —
  // reversing Bloc 62/E, which had dropped every qualifier. "total" must
  // not survive anywhere in the label.
  it("Bloc64/F: labels the badge 'Nombre estimé de joueurs', never 'Nombre total de joueurs'", () => {
    renderCalculator();
    selectLeague("Diamant");
    expect(screen.getByText("Nombre estimé de joueurs")).toBeInTheDocument();
    expect(
      screen.queryByText("Nombre total de joueurs"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/déduit/i)).not.toBeInTheDocument();
  });

  // Bloc 62/F: the "Échelle visuelle" title is gone — the zone (and the
  // total-players badge sitting atop it) still renders.
  it("Bloc62/F: renders no 'Échelle visuelle' title, while the scale zone and badge still show", () => {
    const { container } = renderCalculator();
    selectLeague("Diamant");
    expect(screen.queryByText("Échelle visuelle")).not.toBeInTheDocument();
    // Bloc 110/B: the badge is a tile now, but it still sits atop the zone.
    expect(container.querySelectorAll(".ranking-info-tile")).toHaveLength(2);
    expect(container.querySelector(".ranking-scale")).not.toBeNull();
  });

  // Bloc 62/G: confirmed case from the task — Légende, rank 137, 86.71% ->
  // raw total 157.998, the badge must show 158 (Math.ceil), same value as
  // the 100% row in the table below it.
  it("Bloc62/G: the total-players badge ceils the deduced total, matching the 100% row", () => {
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
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("158");
    const tiles = bandTiles();
    expect(
      within(tiles[tiles.length - 1]).getByText(/158/),
    ).toBeInTheDocument();
  });

  // Bloc 92/H1: the whole result area — the always-mounted total, the
  // not-ready placeholders and the interval tiles — sits inside a
  // permanently-mounted aria-live region so recomputes are announced.
  it("Bloc92/H1: keeps the total, placeholder and interval tiles inside an aria-live region", () => {
    const { container } = renderCalculator();
    expect(
      screen.getByTestId("ranking-total").closest('[aria-live="polite"]'),
    ).not.toBeNull();
    // Bloc 92/A11y (Codex PR #116): placeholder dropped its role="status" to
    // avoid nesting inside this live region; find it by class instead.
    expect(
      document.querySelector('[aria-live="polite"] .ranking-placeholder'),
    ).not.toBeNull();
    selectLeague("Diamant");
    const tiles = container.querySelector(".ranking-band-tiles")!;
    expect(tiles).not.toBeNull();
    expect(tiles.closest('[aria-live="polite"]')).not.toBeNull();
  });
});

/** A ladder with divisions, one of them not switched on yet. */
const withDivisions: RankingLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    nameFr: "",
    nameEn: "",
    position: 0,
    active: true,
    bands: [],
  },
  {
    id: "silver-2",
    league: "silver",
    division: "2",
    nameFr: "",
    nameEn: "",
    position: 1,
    active: true,
    bands: [],
  },
  {
    id: "silver-1",
    league: "silver",
    division: "1",
    nameFr: "",
    nameEn: "",
    position: 2,
    active: true,
    bands: [],
  },
  {
    id: "gold-2",
    league: "gold",
    division: "2",
    nameFr: "",
    nameEn: "",
    position: 3,
    active: true,
    bands: [],
  },
  {
    id: "gold-1",
    league: "gold",
    division: "1",
    nameFr: "",
    nameEn: "",
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
    nameFr: "",
    nameEn: "",
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

const renderLadder = (ladder: RankingLadder) =>
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

  // Bloc 108/H, end to end on the public side: every reward type has a named
  // column of its own, so one the row does not grant is visibly absent from a
  // column that exists, rather than missing from a sentence that never
  // mentioned it.
  it("Bloc108/H: shows speedups in their own column, beside sapphires and gems", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(factNames(0)).toContain("Speedups");
    expect(rewardCells(0)).toEqual(["40", "5", ""]);
  });

  it("names a target by its division, not by its base league", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(
      screen.getByText("Maintien Or 1", { selector: ".ranking-band-target" }),
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
    const named: RankingLadder = [
      {
        id: "champion",
        league: null,
        division: "",
        nameFr: "Champion suprême",
        nameEn: "Supreme Champion",
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
        nameFr: "",
        nameEn: "Challenger",
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
  it("P2: never names an inactive target, in the table or on the scale", () => {
    const ladder: RankingLadder = [
      {
        id: "gold",
        league: "gold",
        division: "",
        nameFr: "",
        nameEn: "",
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
        nameFr: "",
        nameEn: "",
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
        selector: ".ranking-band-target",
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
    const moved: RankingLadder = [
      {
        // Same id, now under Platine — the player's stored "gold-1".
        id: "gold-1",
        league: "platinum",
        division: "1",
        nameFr: "",
        nameEn: "",
        position: 0,
        active: true,
        bands: [],
      },
      {
        id: "gold",
        league: "gold",
        division: "",
        nameFr: "",
        nameEn: "",
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
const ladderOf = (count: number): RankingLadder =>
  Array.from({ length: count }, (_, index) => ({
    id: `rung-${index + 1}`,
    league: null,
    division: "",
    nameFr: `Rang ${index + 1}`,
    nameEn: `Rung ${index + 1}`,
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
// Bloc 110, partie 2: the result zone, rebuilt as tiles.
// ---------------------------------------------------------------------------

/** The color of each scale segment, keyed by the range its own label shows. */
const segmentColors = () => {
  const colors = new Map<string, string>();
  for (const segment of document.querySelectorAll<HTMLElement>(
    ".ranking-scale-segment",
  )) {
    const range = segment.parentElement!.querySelector(".ranking-scale-range")!;
    colors.set(
      range.textContent!,
      segment.style.getPropertyValue("--band-color"),
    );
  }
  return colors;
};
/** The same, for the interval tiles. */
const tileColors = () => {
  const colors = new Map<string, string>();
  for (const tile of bandTiles()) {
    const range = tile.querySelector(".ranking-band-range")!;
    colors.set(range.textContent!, tile.style.getPropertyValue("--band-color"));
  }
  return colors;
};

describe("Bloc 110/A: the labels hugging the scale", () => {
  let viewport: ReturnType<typeof mockViewport>;
  afterEach(() => {
    viewport.restore();
    cleanup();
  });
  const show = (narrow: boolean) => {
    viewport = mockViewport(narrow);
    renderLadder(defaultRankingLadder);
    selectLeague("Diamant");
  };

  // Too small to read against the bar, and the last interval's label
  // overlapped its neighbour's.
  it("drops the movement and target league from the bar on a phone", () => {
    show(true);
    expect(document.querySelectorAll(".ranking-scale-target")).toHaveLength(0);
    // The range markers themselves stay: they are what the bar is for.
    expect(
      document.querySelectorAll(".ranking-scale-range").length,
    ).toBeGreaterThan(0);
  });

  // Moved, not dropped — the wording is still on the page, in the tiles.
  it("still says Montée Légende, in the interval tiles", () => {
    show(true);
    expect(
      screen.getAllByText("Montée Légende", {
        selector: ".ranking-band-target",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps them against the bar on desktop", () => {
    show(false);
    expect(
      document.querySelectorAll(".ranking-scale-target").length,
    ).toBeGreaterThan(0);
  });

  it("moves them back when the viewport widens under a mounted scale", () => {
    show(true);
    expect(document.querySelectorAll(".ranking-scale-target")).toHaveLength(0);
    viewport.resize(false);
    expect(
      document.querySelectorAll(".ranking-scale-target").length,
    ).toBeGreaterThan(0);
  });
});

describe("Bloc 110/B: the two figures heading the zone", () => {
  let viewport: ReturnType<typeof mockViewport>;
  afterEach(() => {
    viewport.restore();
    cleanup();
  });

  // "Side by side, mobile included" — so the assertion is that they are
  // siblings of one non-wrapping row, at a width where everything else on
  // this page stacks. The rule that keeps that row from folding is pinned in
  // responsive-styles.test.ts.
  it.each([false, true])(
    "puts both in one row of tiles (narrow=%s)",
    (narrow) => {
      viewport = mockViewport(narrow);
      const { container } = renderLadder(defaultRankingLadder);
      selectLeague("Diamant");
      const row = container.querySelector(".ranking-info-tiles")!;
      expect(row).not.toBeNull();
      const tiles = [...row.querySelectorAll(":scope > .ranking-info-tile")];
      expect(tiles).toHaveLength(2);
      expect(tiles[0]).toContainElement(screen.getByTestId("ranking-total"));
      expect(tiles[1]).toContainElement(
        screen.getByTestId("ranking-league-lock"),
      );
    },
  );

  it("is a real tile, not the inline line it replaced", () => {
    viewport = mockViewport(false);
    const { container } = renderLadder(defaultRankingLadder);
    expect(container.querySelector(".ranking-scale-total")).toBeNull();
    expect(
      screen.getByTestId("ranking-total").closest(".total-box"),
    ).toHaveClass("ranking-info-tile");
  });

  // Before a league is picked there is no League Lock to show; the row must
  // still render the figure it does have.
  it("shows the player-count tile alone until a league is picked", () => {
    // An earlier test in this file persists player settings, and a stored
    // league resolves an entry on its own (Bloc 108/E) — which is exactly the
    // state this one must not be in.
    window.localStorage.clear();
    viewport = mockViewport(true);
    const { container } = renderLadder(defaultRankingLadder);
    expect(
      container.querySelectorAll(".ranking-info-tiles > .ranking-info-tile"),
    ).toHaveLength(1);
    expect(screen.getByTestId("ranking-total")).toBeInTheDocument();
  });
});

describe("Bloc 110/C: one tile per interval, in its segment's color", () => {
  afterEach(cleanup);

  it("replaces the summary table outright", () => {
    const { container } = renderLadder(defaultRankingLadder);
    selectLeague("Diamant");
    expect(container.querySelector(".ranking-table")).toBeNull();
    expect(bandTiles().length).toBeGreaterThanOrEqual(3);
  });

  it("carries the whole row: range, movement, rank range and rewards", () => {
    renderLadder(defaultRankingLadder);
    selectLeague("Argent");
    const tile = bandTiles()[0];
    // The top interval of Argent: the first 1% of the league, promoted to Or.
    expect(tile.querySelector(".ranking-band-range")).toHaveTextContent("1–0%");
    expect(tile.querySelector(".ranking-band-target")).toHaveTextContent(
      "Montée Or",
    );
    expect(factNames(0)).toEqual([
      "Rang de plage",
      "Saphirs",
      "Speedups",
      "Gemmes",
    ]);
    expect(rewardCells(0)).toEqual(["100", "7", "6"]);
  });

  // The point of coloring them at all: the eye goes from a slice of the bar
  // to the tile that describes it. Paired by the range each one shows, which
  // is what a reader would pair them by.
  it("paints every interval the same color as its own segment", () => {
    renderLadder(defaultRankingLadder);
    selectLeague("Diamant");
    const segments = segmentColors();
    const tiles = tileColors();
    expect(tiles.size).toBeGreaterThanOrEqual(3);
    for (const [range, color] of tiles) {
      expect(color, `tile ${range} has a color`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(segments.get(range), `segment ${range}`).toBe(color);
    }
    // And they are genuinely different colors, not one shade repeated.
    expect(new Set(tiles.values()).size).toBeGreaterThanOrEqual(3);
  });

  // calculateRanking drops any band holding no integer rank, so the tiles and
  // the segments are NOT the same list. Pairing them by position would shift
  // every color after the gap — this is the case that proves it does not.
  it("still pairs correctly when a band holds no rank and drops out", () => {
    renderLadder(defaultRankingLadder);
    selectLeague("Diamant");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "100" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton rang actuel" }),
      {
        target: { value: "2" },
      },
    );
    const segments = segmentColors();
    const tiles = tileColors();
    expect(tiles.size).toBeLessThan(segments.size);
    expect(tiles.size).toBeGreaterThan(0);
    // The bar itself is unmoved: still the full palette, light to dark within
    // each movement, over ALL the bands. Shading from the surviving ranges
    // instead would repaint it as the player types a number.
    expect([...segments.values()]).toEqual([
      "#a8dcb8",
      "#7ec99a",
      "#a8c9e8",
      "#7eabd9",
      "#f0b088",
    ]);
    for (const [range, color] of tiles)
      expect(segments.get(range), `segment ${range}`).toBe(color);
  });
});
