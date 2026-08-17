import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlayerSettingsPanel, playerStorageKey } from "./player-settings-panel";

describe("PlayerSettingsPanel", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("keeps equipment skills independent from planned points", async () => {
    render(<PlayerSettingsPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Attaque avec équipement" }),
    );
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      {
        target: { value: "10" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Points Attaque" }),
    );

    expect(screen.getByLabelText("Attaque avec équipement")).toHaveValue(0.5);
    expect(screen.getByLabelText("Points Attaque")).toHaveValue(1);
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"striker":0.5',
      ),
    );
  });

  it("restores browser-only settings", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        level: 42,
        league: "diamond",
        vp: 12,
        vpUnit: 1000000,
        equipmentSkills: { striker: 7.5 },
      }),
    );

    render(<PlayerSettingsPanel />);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      ).toHaveValue(42),
    );
    expect(screen.getByLabelText("Attaque avec équipement")).toHaveValue(7.5);
    expect(screen.getByLabelText("Unité des VP")).toHaveValue("1000000");
  });

  it("enforces clan temple minimums with a uniform step", () => {
    render(<PlayerSettingsPanel />);
    const attack = screen.getByLabelText("Temple Attaque", {
      selector: "input",
    });
    const speed = screen.getByLabelText("Temple Vitesse", {
      selector: "input",
    });

    expect(attack).toHaveAttribute("step", "1");
    expect(speed).toHaveAttribute("step", "1");
    fireEvent.click(
      screen.getByRole("button", { name: "Diminuer Temple Attaque" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Diminuer Temple Vitesse" }),
    );
    expect(attack).toHaveValue(20);
    expect(speed).toHaveValue(50);
  });
});
