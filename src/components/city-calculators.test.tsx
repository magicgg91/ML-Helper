import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultPlayerSettings } from "../lib/player-settings";
import { CityCalculators } from "./city-calculators";
import {
  playerSettingsChangedEvent,
  playerStorageKey,
} from "./player-settings-panel";

describe("CityCalculators", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("calculates city cost and maximum level", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    expect(screen.getByTestId("city-cost-one")).toHaveTextContent("10 or");
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Nombre de villes" }),
      {
        target: { value: "2" },
      },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Or disponible" }),
      { target: { value: "0.044" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de l’or disponible"), {
      target: { value: "1000" },
    });
    expect(screen.getByTestId("max-level-result")).toHaveTextContent("3");
  });

  it("keeps the target level strictly above the starting level from either input", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    const start = screen.getByRole("spinbutton", {
      name: "Niveau de départ",
    });
    const target = screen.getByRole("spinbutton", { name: "Niveau cible" });

    fireEvent.change(start, { target: { value: "12" } });
    expect(start).toHaveValue(12);
    expect(target).toHaveValue(13);

    fireEvent.change(target, { target: { value: "8" } });
    expect(start).toHaveValue(12);
    expect(target).toHaveValue(13);
  });

  it("starts each City tool without a league and places its selector first", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    for (const tab of [
      "Coût de Ville",
      "Niveau Max Atteignable",
      "Production",
    ]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      const fields = screen.getByRole("combobox", { name: "Ligue" });
      expect(fields).toHaveValue("");
      expect(
        fields.closest(".calculator-fields")?.querySelector("select"),
      ).toBe(fields);
      expect(screen.getByRole("status")).toHaveTextContent("Choisis une ligue");
    }
  });

  it("reads production bonuses from persisted player settings", () => {
    const settings = defaultPlayerSettings();
    settings.level = 11;
    settings.league = "legend";
    settings.equipmentSkills.prosperous = 10;
    window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    expect(screen.getByText("280/h")).toBeInTheDocument();
    expect(screen.getByTestId("full-production-gold")).toHaveTextContent(
      "320/h",
    );
    expect(screen.getByTestId("full-production-gold")).toHaveClass(
      "value",
      "emerald",
    );
  });

  it("no longer shows Récompenses in the Production tab (extracted to its own tab)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    expect(screen.queryByText("Bonus Or obtenu")).toBeNull();
    expect(screen.queryByText("Bonus Troupes obtenu")).toBeNull();
    expect(screen.queryByText("Heures Or reçues")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    ).toBeInTheDocument();
  });

  it("computes the Or block bonus from a base production and hours received, applying the unit selector", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Production d’or de base" }),
      { target: { value: "2" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de production d’or"), {
      target: { value: "1000" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures Or reçues" }),
      { target: { value: "5" } },
    );
    const goldBonus = screen
      .getByText("Bonus Or obtenu")
      .closest(".calculator-stat")!
      .querySelector("strong")!;
    expect(goldBonus).toHaveTextContent("10k");
    expect(goldBonus).toHaveClass("value", "emerald");
  });

  it("computes the Troupes block bonus independently from the Or block", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Production d’or de base" }),
      { target: { value: "100" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures Or reçues" }),
      { target: { value: "10" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Production de troupes de base",
      }),
      { target: { value: "4" } },
    );
    fireEvent.change(screen.getByLabelText("Unité de production de troupes"), {
      target: { value: "1000000" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Heures Troupes reçues" }),
      { target: { value: "2" } },
    );

    const goldBonus = screen
      .getByText("Bonus Or obtenu")
      .closest(".calculator-stat")!
      .querySelector("strong")!;
    const troopsBonus = screen
      .getByText("Bonus Troupes obtenu")
      .closest(".calculator-stat")!
      .querySelector("strong")!;
    expect(goldBonus).toHaveTextContent("1k");
    expect(troopsBonus).toHaveTextContent("8M");
  });

  it("renders the Or and Troupes blocks as two separate cards, not a mixed form", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Récompenses de Production" }),
    );
    const goldCard = screen
      .getByText("Or", { selector: "h3" })
      .closest<HTMLElement>(".calculator-card")!;
    const troopsCard = screen
      .getByText("Troupes", { selector: "h3" })
      .closest<HTMLElement>(".calculator-card")!;
    expect(goldCard).not.toBe(troopsCard);
    expect(
      within(goldCard).getByRole("spinbutton", {
        name: "Production d’or de base",
      }),
    ).toBeInTheDocument();
    expect(
      within(troopsCard).getByRole("spinbutton", {
        name: "Production de troupes de base",
      }),
    ).toBeInTheDocument();
  });

  it("reacts immediately when player settings change", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    const settings = defaultPlayerSettings();
    settings.level = 6;
    settings.league = "legend";
    window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    act(() => {
      window.dispatchEvent(
        new CustomEvent(playerSettingsChangedEvent, { detail: settings }),
      );
    });
    expect(screen.getByTestId("full-production-gold")).toHaveTextContent(
      "260/h",
    );
  });

  it.each([
    ["bronze", "130", "52", "100/h", "40/h"],
    ["silver", "163", "59", "125/h", "45/h"],
    ["gold", "228", "72", "175/h", "55/h"],
    ["platinum", "228", "72", "175/h", "55/h"],
    ["diamond", "260", "78", "200/h", "60/h"],
    ["legend", "260", "78", "200/h", "60/h"],
  ] as const)(
    "shows the %s multipliers in all three City tools",
    (league, boostedGold, boostedArmy, baseGold, baseArmy) => {
      const settings = defaultPlayerSettings();
      settings.league = league;
      window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
      render(
        <NextIntlClientProvider locale="fr" messages={messages}>
          <CityCalculators />
        </NextIntlClientProvider>,
      );

      expect(screen.getByTestId("city-cost-gold")).toHaveTextContent(
        new RegExp(`^${boostedGold} →`),
      );
      expect(screen.getByTestId("city-cost-army")).toHaveTextContent(
        new RegExp(`^${boostedArmy} →`),
      );

      fireEvent.click(
        screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
      );
      expect(screen.getByTestId("city-max-level-gold")).toHaveTextContent(
        `${boostedGold} → ${boostedGold}`,
      );
      expect(screen.getByTestId("city-max-level-army")).toHaveTextContent(
        `${boostedArmy} → ${boostedArmy}`,
      );

      fireEvent.click(screen.getByRole("tab", { name: "Production" }));
      expect(screen.getByTestId("city-production-gold")).toHaveTextContent(
        baseGold,
      );
      expect(screen.getByTestId("city-production-army")).toHaveTextContent(
        baseArmy,
      );
    },
  );

  it("shows the base city-only value first with a separate Stuff/Temple breakdown and the total in evidence", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    // La base de temple pour Prospérité (30%, cdc section 7.1) s'applique
    // automatiquement même sans contribution de clan saisie (voir templeBase).
    const breakdown = screen.getByTestId("city-cost-single-gold-start");
    expect(breakdown).toHaveTextContent("Base200/h");
    expect(breakdown).toHaveTextContent("Stuff0/h");
    expect(breakdown).toHaveTextContent("Temple60/h");
    expect(breakdown).toHaveTextContent("Or/h260/h");
  });

  it("splits gold/army bonuses between equipment and clan temple in the results", () => {
    const settings = defaultPlayerSettings();
    settings.league = "legend";
    settings.equipmentSkills.prosperous = 10;
    // Contribution des Templiers du clan uniquement (20%) ; la base de
    // temple pour Prospérité (30%, cdc section 7.1) s'ajoute automatiquement
    // pour un bonus de temple total de 50%.
    settings.clanTemple.prosperous = 20;
    // v: 2 marks this as already-current-format data (clan contribution
    // only), so safePlayerSettings doesn't treat it as a pre-migration
    // full-total save and subtract the base back out.
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({ ...settings, v: 2 }),
    );
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CityCalculators />
      </NextIntlClientProvider>,
    );
    const start = screen.getByTestId("city-cost-single-gold-start");
    expect(start).toHaveTextContent("Base200/h");
    expect(start).toHaveTextContent("Stuff20/h");
    expect(start).toHaveTextContent("Temple100/h");
    expect(start).toHaveTextContent("Or/h320/h");

    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
    const single = screen.getByTestId("city-max-level-single-gold");
    expect(single).toHaveTextContent("Base200/h");
    expect(single).toHaveTextContent("Stuff20/h");
    expect(single).toHaveTextContent("Temple100/h");
    expect(single).toHaveTextContent("Or/h320/h");
  });
});
