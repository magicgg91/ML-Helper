import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getAllByText("—")[0].closest("td")).toHaveClass(
      "level-up-chest-empty",
    );
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
});
