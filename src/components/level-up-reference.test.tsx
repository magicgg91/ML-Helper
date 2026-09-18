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
import { defaultLevelUpParameters } from "../lib/level-up";
import { LevelUpReference } from "./level-up-reference";

const leagueLabels: Record<string, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
  legend: "Légende",
};

afterEach(cleanup);
describe("LevelUpReference", () => {
  it("starts empty and waits for a league", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    // Bloc 61/A: the league <select> is replaced by single-select buttons —
    // none of them is pressed until a league is chosen.
    const group = screen.getByRole("group", { name: "Ligue" });
    for (const button of within(group).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Choisis une ligue");
  });

  // Bloc 68/N: the league buttons opt into the shared mobile 3-column
  // grid (.league-buttons-grid) instead of the default wrap.
  it("Bloc68/N: gives the league buttons the mobile 3-column grid class", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("group", { name: "Ligue" })).toHaveClass(
      "league-buttons-grid",
    );
  });

  it.each(["bronze", "gold", "platinum", "diamond", "legend"])(
    "renders the confirmed %s table",
    (league) => {
      render(
        <NextIntlClientProvider locale="fr" messages={messages}>
          <LevelUpReference parameters={defaultLevelUpParameters} />
        </NextIntlClientProvider>,
      );
      fireEvent.click(
        screen.getByRole("button", { name: leagueLabels[league] }),
      );
      expect(screen.getAllByRole("row")).toHaveLength(62);
      expect(screen.getByText("Coffret à bijoux")).toBeVisible();
    },
  );

  // Bloc 61/A: single-select — clicking a league button presses only that
  // one, never several at once.
  it("presses only the clicked league button (single-select)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    const group = screen.getByRole("group", { name: "Ligue" });
    fireEvent.click(within(group).getByRole("button", { name: "Diamant" }));
    expect(
      within(group).getByRole("button", { name: "Diamant" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(group).getByRole("button", { name: "Légende" }),
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(within(group).getByRole("button", { name: "Légende" }));
    expect(
      within(group).getByRole("button", { name: "Diamant" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(group).getByRole("button", { name: "Légende" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("colors the chest column and keeps empty levels visibly faint", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(screen.getByText("Coffret à bijoux").closest("td")).toHaveClass(
      "level-up-chest",
    );
    // Bloc 107/B: the XP column carries an em dash at level 1 now, so the
    // first dash on the page is no longer a chest cell — this names the
    // reward column itself rather than counting dashes.
    const emptyReward = document.querySelector(
      "tbody tr td:nth-child(4).level-up-chest-empty",
    );
    expect(emptyReward).not.toBeNull();
    expect(emptyReward).toHaveTextContent("—");
  });
  it("warns for Silver without inventing troop values", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Argent" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "non encore confirmée",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("Bloc38/M: wraps each of the 2 side-by-side tables in the same card/border treatment as Templiers/Gemmes", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table).toHaveClass("reference-simple-table");
      expect(
        table.closest(".calculator-card.ranking-table-wrap"),
      ).not.toBeNull();
    }
  });

  // Bloc 53/F: this link used to point at the generic /tools/combat category
  // (landing on whichever tab happened to be firstAvailable, neither of
  // which is Progression) — now it points at the closest matching
  // calculator, XP Gain Rate, precisely.
  it("links to the precise XP Gain Rate calculator, not the generic Combat category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(
      screen.getByRole("link", { name: /Taux de gain d’XP$/ }),
    ).toHaveAttribute("href", "/tools/combat?open=xp");
  });

  // Bloc 107/B: the XP column is labelled by the level it BUYS. A player
  // reading "niveau 101 : 12,4T" pays 9,54T to get there — the values were
  // right all along, the row they sat on was not. Checked on two leagues
  // because the fix has to be league-independent: XP takes no league, and the
  // table renders this one column whichever league is on screen.
  it.each(["Bronze", "Diamant"])(
    "Bloc107/B: %s shows the XP that buys each level, and none at level 1",
    (league) => {
      render(
        <NextIntlClientProvider locale="fr" messages={messages}>
          <LevelUpReference parameters={defaultLevelUpParameters} />
        </NextIntlClientProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: league }));
      const rows = screen.getAllByRole("row");
      const xpOf = (row: HTMLElement) =>
        within(row).getAllByRole("cell")[1].textContent;
      const levelOf = (row: HTMLElement) =>
        within(row).getAllByRole("cell")[0].textContent;

      // Nobody pays to arrive at level 1.
      expect(levelOf(rows[1])).toBe("1");
      expect(xpOf(rows[1])).toBe("—");

      // Level 2 costs the first step, 50 — the value the old labelling put on
      // row 1, and level 6 costs the fifth step, 143, previously on row 5.
      expect(levelOf(rows[2])).toBe("2");
      expect(xpOf(rows[2])).toBe("50");
      expect(levelOf(rows[6])).toBe("6");
      expect(xpOf(rows[6])).toBe("143");
    },
  );

  // Bloc 98/A: the reported bug, end to end on the public side — Argent's
  // coefficient and ratio were saved in the admin, and the reference still
  // told the player the league was unavailable.
  it("Bloc98/A: shows the table for a league an admin has just filled in", () => {
    const parameters = {
      ...defaultLevelUpParameters,
      troops: {
        ...defaultLevelUpParameters.troops,
        silver: { coefficient: 30, ratio: 1.24 },
      },
    };
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={parameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Argent" }));
    expect(screen.getAllByRole("row")).toHaveLength(62);
    expect(screen.queryByRole("status")).toBeNull();
    // And the stored values are what the table is built from: level 2 is
    // coefficient × ratio² = 30 × 1.24² = 46. A league merely let through the
    // display check, with its formula still refused, would show 0 here.
    const levelTwo = within(screen.getAllByRole("row")[2]).getAllByRole("cell");
    expect(levelTwo[0]).toHaveTextContent("2");
    expect(levelTwo[2]).toHaveTextContent("46");
  });

  it("Bloc98/A: names the leagues that really are available, not a fixed list", () => {
    // With the shipped defaults Argent is the only one missing, so the notice
    // must name the other five — and never Argent itself.
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Argent" }));
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "Ligues disponibles : Bronze, Or, Platine, Diamant et Légende.",
    );
    expect(notice).not.toHaveTextContent("Argent");
  });

  it("Bloc98/A: drops a league from that list as soon as its values are cleared", () => {
    // The same sentence, recomputed: clearing Légende must remove it from the
    // notice, which a hard-coded list of names could never do.
    const parameters = {
      ...defaultLevelUpParameters,
      troops: {
        ...defaultLevelUpParameters.troops,
        legend: { coefficient: 0, ratio: 0 },
      },
    };
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={parameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Légende" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ligues disponibles : Bronze, Or, Platine et Diamant.",
    );
  });
});
