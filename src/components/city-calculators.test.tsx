import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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
    expect(screen.getByTestId("city-cost-one")).toHaveTextContent("10 or");
    fireEvent.click(
      screen.getByRole("tab", { name: "Niveau Max Atteignable" }),
    );
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

  it("reads production bonuses from persisted player settings", () => {
    const settings = defaultPlayerSettings();
    settings.level = 11;
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
});
