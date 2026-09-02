import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import {
  PlayerSettingsPanel,
  playerStorageKey,
  replaceEquipmentSkills,
  safePlayerSettings,
} from "./player-settings-panel";
import { templarRates } from "../lib/gems-templars";

// Bloc 68/F: the league field is a LeagueButtons group now, not a <select>
// — this mirrors the click-based interaction already established in
// league-select.test.tsx / level-up-reference.test.tsx.
function clickLeague(name: string) {
  fireEvent.click(
    within(screen.getByRole("group", { name: "Ligue" })).getByRole("button", {
      name,
    }),
  );
}

describe("PlayerSettingsPanel", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("starts with no league selected", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const group = screen.getByRole("group", { name: "Ligue" });
    for (const button of within(group).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
  });

  // Bloc 68/E: "Ligue non définie" replaces the old generic "— Choisir —"
  // placeholder in the collapsed one-line summary.
  it("Bloc68/E: shows 'Ligue non définie' in the summary until a league is picked, then the real league name", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(document.querySelector(".player-summary-row1")).toHaveTextContent(
      "Ligue non définie",
    );
    clickLeague("Or");
    expect(document.querySelector(".player-summary-row1")).toHaveTextContent(
      "Or",
    );
    expect(
      document.querySelector(".player-summary-row1"),
    ).not.toHaveTextContent("Ligue non définie");
  });

  // Bloc 68/G: the title and the one-line summary share a common wrapper
  // (activating globals.css's own .player-summary-row1 rule, previously
  // defined but unused by any component) so the mobile breakpoint can
  // stack them below the title — the skills-breakdown line stays outside.
  it("Bloc68/G: wraps the title and the one-line summary in .player-summary-row1, distinct from the skills-breakdown line", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const row1 = document.querySelector(".player-summary-row1");
    expect(row1).not.toBeNull();
    expect(row1!.querySelector("#player-settings-title")).not.toBeNull();
    const line2 = screen.getByTestId("player-summary-line2");
    expect(row1!.contains(line2)).toBe(false);
  });

  // Bloc 68/H+I: the primary fields grid keeps League, Level, VP as its
  // first 3 children in that order — the mobile 2-col CSS (globals.css)
  // relies on League being :first-child to span the full row.
  it("Bloc68/H: keeps League as the primary grid's first child, ahead of Level and VP", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const primary = container.querySelector(".settings-grid-primary")!;
    expect(primary.children[0]).toBe(
      screen.getByRole("group", { name: "Ligue" }),
    );
  });

  it("gives the league button group the .league-buttons-grid class, so it forms a 2-row/3-column grid on mobile like Events/Progression's", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("group", { name: "Ligue" })).toHaveClass(
      "league-buttons-grid",
    );
  });

  // Bloc 68/I: every settings-grid section (equipment, points, templars,
  // clan temple) carries the plain "settings-grid" class the shared mobile
  // 2-col rule targets.
  it("Bloc68/I: every skills/points/templars/clan-temple section uses the shared .settings-grid class", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const grids = container.querySelectorAll(".settings-grid");
    // primary + equipment + points + templars + clan temple = 5.
    expect(grids).toHaveLength(5);
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
    clickLeague("Or");
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
    expect(
      screen.queryByRole("group", { name: "Ligue" }),
    ).not.toBeVisible();
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
    clickLeague("Or");
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

    clickLeague("Légende");
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

  it("reflects an external equipment-skills transfer live, without touching points or clan temple", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    clickLeague("Or");
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      { target: { value: "10" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Points Attaque" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Temple Attaque" }),
    );
    // Wait for the panel's own persistence effect to land before the
    // external transfer reads localStorage — otherwise the transfer (based
    // on a not-yet-written snapshot) would appear to wipe these edits.
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"striker":1',
      ),
    );
    replaceEquipmentSkills({
      striker: 12.5,
      brave: 0,
      scavenger: 0,
      guardian: 0,
      fearless: 0,
      prosperous: 0,
      recruiter: 0,
      cautious: 0,
      salvager: 0,
      rusher: 0,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Attaque avec équipement")).toHaveValue(
        12.5,
      ),
    );
    // The transfer only replaced equipmentSkills: the point already spent
    // and the clan-temple contribution entered just before it are intact.
    expect(screen.getByLabelText("Points Attaque")).toHaveValue(1);
    expect(
      screen.getByLabelText("Temple Attaque", { selector: "input" }),
    ).toHaveValue(0.25);
    // The panel keeps working normally afterwards (no feedback loop wedged
    // it into a stale or broken state).
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      { target: { value: "5" } },
    );
    expect(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
    ).toHaveValue(5);
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
