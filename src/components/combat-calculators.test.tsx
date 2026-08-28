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
import { defaultCityParameters } from "../lib/city-parameters";
import { CombatCalculators } from "./combat-calculators";

afterEach(cleanup);
const view = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <CombatCalculators cityParameters={defaultCityParameters} />
    </NextIntlClientProvider>,
  );

describe("CombatCalculators", () => {
  it("shows five XP tiers in both modes", () => {
    view();
    expect(screen.getAllByTestId(/xp-range-/)).toHaveLength(5);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Ma VP" }), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Je suis la cible" }));
    expect(screen.getAllByTestId(/xp-range-/)).toHaveLength(5);
    expect(screen.getByTestId("xp-range-200")).toHaveTextContent("< 500k");
  });

  it("shows the 2 not-yet-implemented Combat placeholders, disabled, ahead of the 2 working tools, in the fixed order (Bloc 32/C)", () => {
    view();
    const tabs = within(
      screen.getByRole("tablist", { name: "Outils Combat" }),
    ).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Combat",
      "Troupes ennemies",
      "Taux de gain d’XP",
      "Troupes en attaque démo",
    ]);
    const [combat, enemyTroops] = tabs;
    expect(combat).toBeDisabled();
    expect(combat).toHaveAttribute("title", "Bientôt disponible");
    expect(enemyTroops).toBeDisabled();
    expect(enemyTroops).toHaveAttribute("title", "Bientôt disponible");
    fireEvent.click(combat);
    expect(combat).toHaveAttribute("aria-selected", "false");
  });

  it("calculates demo troops from the shared wall parameters", () => {
    view();
    fireEvent.click(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    );
    expect(
      screen.getByRole("combobox", { name: "Ligue de l’attaquant" }),
    ).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Choisis une ligue");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Ligue de l’attaquant" }),
      { target: { value: "bronze" } },
    );
    expect(screen.getByTestId("demo-wall")).toHaveTextContent("70");
    expect(screen.getByTestId("demo-wall")).not.toHaveClass("emerald");
    expect(screen.getByTestId("demo-troops")).toHaveTextContent("70");
    expect(screen.getByTestId("demo-troops")).toHaveClass("emerald");
  });
});
