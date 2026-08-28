import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultLevelUpParameters } from "../lib/level-up";
import { LevelUpReference } from "./level-up-reference";

afterEach(cleanup);
describe("LevelUpReference", () => {
  it("starts empty and waits for a league", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Ligue" })).toHaveValue("");
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
      fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
        target: { value: league },
      });
      expect(screen.getAllByRole("row")).toHaveLength(62);
      expect(screen.getByText("Coffret à bijoux")).toBeVisible();
    },
  );

  it("colors the chest column and keeps empty levels visibly faint", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <LevelUpReference parameters={defaultLevelUpParameters} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
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
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "silver" },
    });
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
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table).toHaveClass("reference-simple-table");
      expect(table.closest(".calculator-card.ranking-table-wrap")).not.toBeNull();
    }
  });
});
