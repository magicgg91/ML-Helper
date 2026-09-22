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
import { RankingCalculator } from "./ranking-calculator";

const leagueGroup = () => screen.getByRole("group", { name: /Ligue|League/ });
/** The 3 reward cells of one body row, in column order. */
const rewardCells = (row: number) =>
  [...document.querySelectorAll("tbody tr")[row].querySelectorAll("td")]
    .slice(3)
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
      screen.getAllByText("Montée Légende", { selector: "td" }),
    ).toHaveLength(2);
    // Bloc 108/H: one column per reward type, so the gems value is a cell of
    // its own rather than a fragment of a sentence.
    expect(rewardCells(0)).toEqual(["—", "—", "6"]);
  });
  // Bloc 108/H: what used to be "100 saphirs, 7 speedup, 6 gemmes" in a
  // single cell is now three cells — the reason being that the sentence simply
  // omitted any reward that was absent, so a row without speedups read as
  // though the tool did not track them.
  it("Bloc108/H: gives each reward type its own named column", () => {
    renderCalculator();
    selectLeague("Argent");
    const headers = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Plage",
      "Rang de plage",
      "Ligue cible",
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
      screen.getAllByText("Promotion to Legend", { selector: "td" }),
    ).toHaveLength(2);
    expect(rewardCells(0)).toEqual(["—", "—", "6"]);
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
    const segments = Array.from(
      container.querySelectorAll(".ranking-scale-segment"),
    );
    expect(
      segments.map((segment) => (segment as HTMLElement).style.background),
    ).toEqual([
      "rgba(168, 220, 184, 0.8)",
      "rgba(126, 201, 154, 0.8)",
      "rgba(168, 201, 232, 0.8)",
      "rgba(126, 171, 217, 0.8)",
      "rgba(240, 176, 136, 0.8)",
    ]);
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
    expect(container.querySelector(".ranking-scale-total")).not.toBeNull();
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
    const rows = screen.getAllByRole("row").slice(1); // drop the header row
    const lastRow = rows[rows.length - 1];
    expect(within(lastRow).getByText(/158/)).toBeInTheDocument();
  });

  // Bloc 92/H1: the whole result area — the always-mounted total, the
  // not-ready placeholders and the ranges table — sits inside a
  // permanently-mounted aria-live region so recomputes are announced.
  it("Bloc92/H1: keeps the total, placeholder and ranges table inside an aria-live region", () => {
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
    const table = container.querySelector(".ranking-table")!;
    expect(table).not.toBeNull();
    expect(table.closest('[aria-live="polite"]')).not.toBeNull();
  });
});

/** A ladder with divisions, one of them not switched on yet. */
const withDivisions: RankingLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: "",
    position: 0,
    active: true,
    bands: [],
  },
  {
    id: "silver-2",
    league: "silver",
    division: "2",
    name: "",
    position: 1,
    active: true,
    bands: [],
  },
  {
    id: "silver-1",
    league: "silver",
    division: "1",
    name: "",
    position: 2,
    active: true,
    bands: [],
  },
  {
    id: "gold-2",
    league: "gold",
    division: "2",
    name: "",
    position: 3,
    active: true,
    bands: [],
  },
  {
    id: "gold-1",
    league: "gold",
    division: "1",
    name: "",
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
    name: "",
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

  // Bloc 108/H, end to end on the public side: a reward the row does carry is
  // named and shown, and one it does not carry reads as an explicit dash
  // rather than vanishing from a sentence.
  it("Bloc108/H: shows speedups in their own column, beside sapphires and gems", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(
      screen.getByRole("columnheader", { name: "Speedups" }),
    ).toBeVisible();
    expect(rewardCells(0)).toEqual(["40", "5", "—"]);
  });

  it("names a target by its division, not by its base league", () => {
    renderLadder(withDivisions);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Or 1" }),
    );
    expect(screen.getByText("Maintien Or 1", { selector: "td" })).toBeVisible();
  });
});
