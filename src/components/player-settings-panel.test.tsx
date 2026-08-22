import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { PlayerSettingsPanel, playerStorageKey } from "./player-settings-panel";

describe("PlayerSettingsPanel", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("starts with no league selected", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Ligue" })).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "— Choisir —" }),
    ).toBeInTheDocument();
  });

  it("keeps equipment skills independent from planned points", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Attaque avec équipement" }),
    );
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      {
        target: { value: "10" },
      },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "gold" },
    });
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

    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      ).toHaveValue(42),
    );
    expect(screen.getByLabelText("Attaque avec équipement")).toHaveValue(7.5);
    expect(screen.getByLabelText("Unité des VP")).toHaveValue("1000000");
  });

  it("keeps the two-line summary visible while the panel stays collapsed", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("combobox", { name: "Ligue" })).not.toBeVisible();
    const line2 = screen.getByTestId("player-summary-line2");
    expect(line2).toBeVisible();
    expect(line2).toHaveTextContent("Atq 0%");
    expect(line2).toHaveTextContent("Vit 0%");
  });

  it("updates the collapsed summary's per-skill total after editing equipment and points", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Attaque avec équipement" }),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "gold" },
    });
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      { target: { value: "10" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Points Attaque" }),
    );
    const line2 = screen.getByTestId("player-summary-line2");
    await waitFor(() => expect(line2).toHaveTextContent("Atq 2,5%"));
  });

  it("caps the collapsed summary's Bravoure/Intrépide total at 90% even if equipment plus points exceed it", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        level: 1,
        league: "diamond",
        vp: 0,
        vpUnit: 1,
        equipmentSkills: { fearless: 80 },
        skillPoints: { fearless: 30 },
      }),
    );
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("player-summary-line2")).toHaveTextContent(
        "Int 90%",
      ),
    );
  });

  it("highlights available points and the per-skill hint in gold, like the prototype", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(
      container.querySelector(".points-summary strong.stat-highlight"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".settings-grid output.stat-highlight"),
    ).toHaveLength(10);
  });

  it("enforces clan temple minimums with a uniform step", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
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
