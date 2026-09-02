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
      "Combat Bientôt disponible",
      "Troupes ennemies Bientôt disponible",
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

  it("shows the 'coming soon' text permanently, not only on hover (Bloc 33/N)", () => {
    view();
    const combat = screen.getByRole("tab", { name: /^Combat/ });
    expect(combat.querySelector(".tab-coming-soon")).toHaveTextContent(
      "Bientôt disponible",
    );
  });

  // Bloc 67: the reciprocal direction — this tool now links back to its
  // paired reference too (previously missing entirely), using the
  // renamed "Progression" label from the same single source of truth
  // (references.catalog.level-up) that drives the page/nav/tiles.
  it("Bloc67: shows a cross-link to the Progression reference from the XP Gain Rate tool", () => {
    view();
    const link = screen.getByRole("link", { name: /Progression$/ });
    expect(link).toHaveAttribute("href", "/referentiels/level-up");
  });

  // Bloc 53/F: the Progression reference's cross-link now passes ?open=xp,
  // forwarded here as initialTool — must select that tab directly instead
  // of always defaulting to whichever tab is firstAvailable.
  it("Bloc53/F: initialTool selects the given tab directly", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CombatCalculators
          cityParameters={defaultCityParameters}
          initialTool="demo"
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("tab", { name: "Troupes en attaque démo" }),
    ).toHaveAttribute("aria-selected", "true");
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
