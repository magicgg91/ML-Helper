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
import { mockViewport } from "../test/viewport";
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

function show(league: string) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LevelUpReference parameters={defaultLevelUpParameters} />
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: league }));
}

/** The levels actually printed in the first column of every rendered table. */
const shownLevels = () =>
  [...document.querySelectorAll("tbody tr td:first-child")].map((cell) =>
    Number(cell.textContent),
  );

// Bloc 63/A: a narrow screen gets ONE table of 30 levels per page instead of
// the two side-by-side tables desktop keeps. What changes is how many levels a
// page holds, so the page count changes with it — which is exactly why this
// could not be a stylesheet rule.
describe("Bloc 63/A: Progression paginates one table at a time on a narrow screen", () => {
  let viewport: ReturnType<typeof mockViewport>;
  afterEach(() => viewport.restore());

  it("shows a single 30-level table, and twice as many pages as desktop", () => {
    viewport = mockViewport(true);
    show("Légende");
    expect(screen.getAllByRole("table")).toHaveLength(1);
    // 30 levels plus the table's own header row.
    expect(screen.getAllByRole("row")).toHaveLength(31);
    expect(shownLevels()).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    // 200 levels, 30 to a page.
    expect(screen.getByText("Page 1 sur 7")).toBeVisible();
  });

  it("leaves desktop exactly as it was: two tables, 60 levels, half the pages", () => {
    viewport = mockViewport(false);
    show("Légende");
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(62);
    expect(shownLevels()).toEqual(
      Array.from({ length: 60 }, (_, index) => index + 1),
    );
    expect(screen.getByText("Page 1 sur 4")).toBeVisible();
  });

  it("walks the narrow pages without skipping or repeating a level", () => {
    viewport = mockViewport(true);
    show("Légende");
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(shownLevels()).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 31),
    );
    expect(screen.getByText("Page 2 sur 7")).toBeVisible();
  });

  // Rotating a phone changes the page count under a page the reader already
  // chose. Narrow page 7 is past the end of the 4 desktop pages, and an
  // unclamped index would ask for levels 361-420 — an empty table under a
  // "Page 7 sur 4" counter.
  it("survives a rotation from the last narrow page to the wide layout", () => {
    viewport = mockViewport(true);
    show("Légende");
    for (let click = 0; click < 6; click += 1)
      fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Page 7 sur 7")).toBeVisible();
    expect(shownLevels()).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 181),
    );

    viewport.resize(false);
    expect(screen.getByText("Page 4 sur 4")).toBeVisible();
    expect(shownLevels()).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 181),
    );
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });
});

// Bloc 63/B: the reference runs to 200, the highest level reachable in game.
describe("Bloc 63/B: Progression reaches level 200", () => {
  let viewport: ReturnType<typeof mockViewport>;
  afterEach(() => viewport.restore());

  it.each(["Bronze", "Or", "Platine", "Diamant", "Légende"])(
    "%s shows level 200 on its last page, with a real figure on the documented scale",
    (league) => {
      viewport = mockViewport(false);
      show(league);
      for (let click = 0; click < 3; click += 1)
        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
      expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();

      const last = screen.getAllByRole("row").at(-1)!;
      const cells = within(last).getAllByRole("cell");
      expect(cells[0]).toHaveTextContent("200");
      // 1.245^200 is ~1e19 and 1.3^198 is ~3.7e22 — well inside what a double
      // holds, but far enough out that a mistake shows up as Infinity, NaN or
      // 0 rather than as a wrong digit. Both cells must be a real figure on
      // the documented k/M/G/T/P scale, P being its top (format.test.ts).
      for (const cell of [cells[1], cells[2]])
        expect(cell.textContent).toMatch(/^\d[\d\s]*(\.\d{1,2})?[kMGTP]$/);
    },
  );

  // The formulas themselves are pinned against in-game readings by the Bloc
  // 107 tests, which stop at level 60 — no player reading exists at 200. What
  // is checkable here is that the six curves stay six distinct curves at the
  // new top of the range, the property Bloc 107 had to establish at 60.
  it("keeps the leagues on distinct curves at the new top level", () => {
    const shown = new Set<string>();
    for (const league of ["Bronze", "Or", "Platine", "Diamant", "Légende"]) {
      cleanup();
      viewport = mockViewport(false);
      show(league);
      for (let click = 0; click < 3; click += 1)
        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
      const cells = within(screen.getAllByRole("row").at(-1)!).getAllByRole(
        "cell",
      );
      shown.add(cells[2].textContent!);
    }
    // Or and Platine have formulas of their own; Bronze, Diamant and Légende
    // share one, so five leagues produce three distinct values at level 200.
    expect(shown.size).toBe(3);
  });
});

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
