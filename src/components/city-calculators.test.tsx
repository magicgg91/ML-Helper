import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
    render(<CityCalculators />);
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

  it("reads production bonuses from persisted player settings", () => {
    const settings = defaultPlayerSettings();
    settings.level = 11;
    settings.equipmentSkills.prosperous = 10;
    window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
    render(<CityCalculators />);
    fireEvent.click(screen.getByRole("tab", { name: "Production" }));
    expect(screen.getByText("280/h")).toBeInTheDocument();
    expect(screen.getByTestId("full-production-gold")).toHaveTextContent(
      "320/h",
    );
  });

  it("reacts immediately when player settings change", () => {
    render(<CityCalculators />);
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
});
