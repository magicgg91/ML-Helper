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
import { defaultRankingConfig } from "../lib/ranking";
import { RankingCalculator } from "./ranking-calculator";

const leagueGroup = () => screen.getByRole("group", { name: /Ligue|League/ });
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
        <RankingCalculator config={defaultRankingConfig} />
      </NextIntlClientProvider>,
    );
  it("converts correlated rank and percentage and renders confirmed rewards", () => {
    renderCalculator();
    selectLeague("Diamant");
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("1 000");
    expect(
      screen.getAllByText("Montée Légende", { selector: "td" }),
    ).toHaveLength(2);
    expect(
      screen.getByText("6 gemmes", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("joins multiple typed rewards into one localized list", () => {
    renderCalculator();
    selectLeague("Argent");
    expect(
      screen.getByText("100 saphirs, 7 speedup, 6 gemmes", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("renders the target league and rewards translated in English", () => {
    renderCalculator("en", enMessages);
    fireEvent.click(
      within(leagueGroup()).getByRole("button", { name: "Diamond" }),
    );
    expect(
      screen.getAllByText("Promotion to Legend", { selector: "td" }),
    ).toHaveLength(2);
    expect(screen.getByText("6 gems", { selector: "td" })).toBeInTheDocument();
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
    expect(leagueField?.firstElementChild?.textContent).toBe("Ligue");
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
