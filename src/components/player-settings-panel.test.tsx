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
import {
  PlayerSettingsPanel,
  playerStorageKey,
  safePlayerSettings,
} from "./player-settings-panel";
import { templarRates } from "../lib/gems-templars";

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

  it("migrates a pre-v2 clan-temple total into a clan-only contribution", () => {
    // Saved by a previous release, where clanTemple held the full temple
    // total (base + clan contribution): 50% for Vitesse was the base
    // alone, with no clan contribution entered.
    const migrated = safePlayerSettings(
      JSON.stringify({
        level: 1,
        league: "",
        vp: 0,
        vpUnit: 1,
        equipmentSkills: {},
        clanTemple: { rusher: 50 },
      }),
    );
    expect(migrated.clanTemple.rusher).toBe(0);
  });

  it("does not re-subtract the temple base from an already-migrated (v2) save", () => {
    const settings = safePlayerSettings(
      JSON.stringify({
        level: 1,
        league: "",
        vp: 0,
        vpUnit: 1,
        equipmentSkills: {},
        clanTemple: { rusher: 260 },
        v: 2,
      }),
    );
    expect(settings.clanTemple.rusher).toBe(260);
  });

  it("shows the migrated clan-temple total for a returning player", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        level: 1,
        league: "",
        vp: 0,
        vpUnit: 1,
        equipmentSkills: {},
        clanTemple: { rusher: 50 },
      }),
    );
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("player-summary-line2")).toHaveTextContent(
        "Vit 50% (0% + 0% + 50%)",
      ),
    );
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
    // Attaque and Vitesse are temple skills: even with no input yet, their
    // total already includes the confirmed temple base (20% / 50%).
    expect(line2).toHaveTextContent("Atq 20%");
    expect(line2).toHaveTextContent("Vit 50%");
  });

  it("shows the equipment/points/temple breakdown for a temple skill in the collapsed summary", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const line2 = screen.getByTestId("player-summary-line2");
    expect(line2).toHaveTextContent("Atq 20% (0% + 0% + 20%)");
    // Bravoure is not a temple skill: just the total, no breakdown.
    expect(line2).not.toHaveTextContent("Bra 0% (");
    expect(line2.querySelectorAll(".player-summary-skill-group")).toHaveLength(
      2,
    );
    expect(
      line2.querySelectorAll(".player-summary-skill-group")[0]?.children,
    ).toHaveLength(5);
    expect(
      line2.querySelectorAll(".player-summary-skill-group")[1]?.children,
    ).toHaveLength(5);
    expect(line2.querySelector(".sk-value")).toHaveClass("component-total");
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
    // 0.5 (equipment) + 2 (1 point × bonus 2) + 20 (temple base, no clan
    // contribution entered) = 22.5.
    await waitFor(() => expect(line2).toHaveTextContent("Atq 22,5%"));
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

  it("caps the collapsed summary's Bravoure/Intrépide total at 75% in Légende", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        level: 1,
        league: "legend",
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
        "Int 75%",
      ),
    );
  });

  it("caps the collapsed summary's Récupération total at 50% even if equipment plus points exceed it", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        level: 1,
        league: "gold",
        vp: 0,
        vpUnit: 1,
        equipmentSkills: { cautious: 45 },
        skillPoints: { cautious: 10 },
      }),
    );
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("player-summary-line2")).toHaveTextContent(
        "Rup 50%",
      ),
    );
  });

  it("caps the 'equipment stats' input for Récupération at 50%, and for Intrépide/Bravoure at 90% (75% in Légende)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByLabelText("Récupération avec équipement"),
    ).toHaveAttribute("max", "50");
    expect(screen.getByLabelText("Intrépide avec équipement")).toHaveAttribute(
      "max",
      "90",
    );
    expect(screen.getByLabelText("Bravoure avec équipement")).toHaveAttribute(
      "max",
      "90",
    );
    expect(
      screen.getByLabelText("Attaque avec équipement"),
    ).not.toHaveAttribute("max");

    fireEvent.change(screen.getByRole("combobox", { name: "Ligue" }), {
      target: { value: "legend" },
    });
    expect(screen.getByLabelText("Intrépide avec équipement")).toHaveAttribute(
      "max",
      "75",
    );
    expect(screen.getByLabelText("Bravoure avec équipement")).toHaveAttribute(
      "max",
      "75",
    );
    expect(
      screen.getByLabelText("Récupération avec équipement"),
    ).toHaveAttribute("max", "50");
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

  it("starts the clan Temple contribution at 0 and adds the confirmed base to the displayed total", () => {
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

    expect(attack).toHaveValue(0);
    expect(speed).toHaveValue(0);
    expect(attack).toHaveAttribute("step", String(templarRates.striker));
    expect(speed).toHaveAttribute("step", String(templarRates.rusher));

    expect(
      screen.getByLabelText("Temple Défense", { selector: "input" }),
    ).toHaveAttribute("step", String(templarRates.guardian));
    expect(
      screen.getByLabelText("Temple Or", { selector: "input" }),
    ).toHaveAttribute("step", String(templarRates.prosperous));
    expect(
      screen.getByLabelText("Temple Recruteur", { selector: "input" }),
    ).toHaveAttribute("step", String(templarRates.recruiter));

    // A player entering only the clan's Templar contribution never goes
    // below 0, even before any confirmed contribution is known.
    fireEvent.click(
      screen.getByRole("button", { name: "Diminuer Temple Attaque" }),
    );
    expect(attack).toHaveValue(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Temple Vitesse" }),
    );
    expect(speed).toHaveValue(1);
    // Vitesse's confirmed temple base is 50%, so entering 1% of clan
    // contribution shows a 51% total right next to the field.
    expect(screen.getByTestId("clan-temple-total-rusher")).toHaveTextContent(
      "51%",
    );
  });
});
