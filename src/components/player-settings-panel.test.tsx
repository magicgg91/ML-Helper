import {
  act,
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
  playerSettingsChangedEvent,
  playerStorageKey,
  replaceEquipmentSkills,
  safePlayerSettings,
} from "./player-settings-panel";
import { defaultPlayerSettings } from "../lib/player-settings";
import type { LeagueLadder } from "../lib/leagues";
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

  // Bloc 99: the panel used to answer its own save by replacing its state
  // again. safePlayerSettings spread the stored object wholesale, so the
  // version stamp `v` — storage bookkeeping, not a setting — came back out
  // inside the settings, and syncFromStorage's equality guard therefore
  // compared a value carrying `v` against one that never does: never equal,
  // whatever the settings held. Each mount then ran a second write/broadcast
  // cycle whose effect closure held the pre-transfer value, and an external
  // write landing in that window (the Stuff simulator's transfer button) was
  // overwritten by it — the transferred skills silently went back to 0.
  it("Bloc99: hands back the settings alone, without storage bookkeeping", () => {
    const settings = defaultPlayerSettings();
    const stored = JSON.stringify({ ...settings, v: 2 });

    expect(Object.keys(safePlayerSettings(stored))).toEqual(
      Object.keys(settings),
    );
    // The comparison syncFromStorage makes, on settings that did not change:
    // it has to hold, or the panel answers its own write with a new object.
    expect(JSON.stringify(safePlayerSettings(stored))).toBe(
      JSON.stringify(settings),
    );
  });

  it("Bloc99: settles in a single save, instead of answering its own", async () => {
    const broadcasts: unknown[] = [];
    const listener = (event: Event) => broadcasts.push(event);
    window.addEventListener(playerSettingsChangedEvent, listener);
    try {
      render(
        <NextIntlClientProvider locale="fr" messages={messages}>
          <PlayerSettingsPanel />
        </NextIntlClientProvider>,
      );
      await waitFor(() =>
        expect(window.localStorage.getItem(playerStorageKey)).not.toBeNull(),
      );
      // One save, one broadcast. A second one is the redundant cycle whose
      // stale snapshot is what reverted an external transfer.
      expect(broadcasts).toHaveLength(1);
    } finally {
      window.removeEventListener(playerSettingsChangedEvent, listener);
    }
  });

  // Bloc 102: the second overwrite path, and the one Bloc 99 left standing.
  // Bloc 99 stopped the panel from answering its own write by making the
  // comparison come out equal; that only holds while storage and the panel
  // agree. It cannot hold when the panel's own write is LATE: persisting
  // happens in a passive effect, and React runs a passive effect after the
  // commit that scheduled it — including after a newer render has already
  // gone in. The effect then writes, and announces, the snapshot it
  // captured rather than the current one, and answering that announcement
  // adopted the older snapshot: the level the user had just typed went back
  // to its previous value. Reproduced 7 times in 600 runs of the scenario
  // under CPU contention before the fix, 0 in 600 after it — hence this
  // test, which forces the same interleaving outright.
  it("Bloc102: ignores its own broadcast, which can announce a snapshot it has moved past", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const level = () =>
      screen.getByLabelText("Niveau du joueur", { selector: "input" });

    fireEvent.change(level(), { target: { value: "10" } });
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"level":10',
      ),
    );
    const behind = window.localStorage.getItem(playerStorageKey)!;

    // Makes the panel's next write land that older snapshot instead of the
    // fresh one — exactly what a passive effect running a render too late
    // does — so its own broadcast is delivered with storage standing behind
    // its state.
    const realSetItem = Storage.prototype.setItem;
    let late = true;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === playerStorageKey && late) {
        late = false;
        return realSetItem.call(this, key, behind);
      }
      return realSetItem.call(this, key, value);
    };
    try {
      fireEvent.change(level(), { target: { value: "5" } });
      // Re-reading storage on its own broadcast would put the level back
      // to 10 here, discarding the edit that had just been made.
      expect(level()).toHaveValue(5);
    } finally {
      Storage.prototype.setItem = realSetItem;
    }

    // And the panel stays the source of truth afterwards: the next edit
    // catches storage back up rather than leaving it behind for good.
    fireEvent.change(level(), { target: { value: "6" } });
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"level":6',
      ),
    );
    expect(level()).toHaveValue(6);
  });

  // The other half of syncFromStorage's guard, which Bloc 102 left in place
  // and nothing pinned down: `broadcasting` decides whether the event is
  // ours, the content comparison decides whether anything actually changed.
  // Drop the comparison and two mounted copies of the panel answer each
  // other without end — each adopts a new-but-identical object, saves it,
  // announces it, and wakes the other one up again.
  it("Bloc102: an outside announcement that changes nothing leaves the panel alone", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    fireEvent.change(
      screen.getByLabelText("Niveau du joueur", { selector: "input" }),
      { target: { value: "10" } },
    );
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"level":10',
      ),
    );

    const realSetItem = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === playerStorageKey) writes += 1;
      return realSetItem.call(this, key, value);
    };
    try {
      // Someone else announcing the settings the panel already holds.
      await act(async () => {
        window.dispatchEvent(new CustomEvent(playerSettingsChangedEvent));
      });
      expect(writes).toBe(0);
    } finally {
      Storage.prototype.setItem = realSetItem;
    }
  });

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
    // Bloc 69/D: League's own group is now wrapped in a field div (to carry
    // the new "Ligue" title above it) — that wrapper is the first child,
    // and it still contains the league group.
    expect(primary.children[0]).toContainElement(
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

  it("Bloc69/D: shows a visible 'Ligue' title above the league buttons (missing at Bloc68 delivery)", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel />
      </NextIntlClientProvider>,
    );
    const label = container.querySelector(".settings-grid-league-label");
    expect(label).toHaveTextContent("Ligue");
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
    expect(screen.queryByRole("group", { name: "Ligue" })).not.toBeVisible();
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

// Bloc 108/E: a division field of its own, driven by the ranking ladder and
// nothing else. The league buttons above it are untouched by this bloc: they
// still feed Gemmes, Équipement, Templiers and Boutique from the fixed enum.
describe("Bloc 108/E: the division field", () => {
  afterEach(cleanup);

  const ladder: LeagueLadder = [
    {
      id: "bronze",
      league: "bronze",
      division: "",
      name: {},
      position: 0,
      active: true,
      bands: [],
    },
    {
      id: "gold-2",
      league: "gold",
      division: "2",
      name: {},
      position: 1,
      active: true,
      bands: [],
    },
    {
      id: "gold-1",
      league: "gold",
      division: "1",
      name: {},
      position: 2,
      active: true,
      bands: [],
    },
    {
      id: "diamond-1",
      league: "diamond",
      division: "1",
      name: {},
      position: 3,
      active: false,
      bands: [],
    },
  ];

  const open = (props: { ladder?: LeagueLadder } = {}) => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel {...props} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByText("Paramètres du joueur", { exact: true }));
  };

  it("does not exist for a league with no division configured", () => {
    open({ ladder });
    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    expect(screen.queryByLabelText("Division")).toBeNull();
  });

  it("offers that league's active divisions once they exist", () => {
    open({ ladder });
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    const field = screen.getByLabelText("Division");
    expect(
      [...field.querySelectorAll("option")].map((o) => o.textContent),
    ).toEqual(["Non précisée", "Or 2", "Or 1"]);
  });

  it("leaves out a division that is not active yet", () => {
    open({ ladder });
    fireEvent.click(screen.getByRole("button", { name: "Diamant" }));
    expect(screen.queryByLabelText("Division")).toBeNull();
  });

  // The two selectors are independent: picking a division must not touch the
  // league the rest of the site reads, and changing league must not leave a
  // division from the previous one behind.
  it("stores the division without disturbing the league, and clears it on a league change", async () => {
    open({ ladder });
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    fireEvent.change(screen.getByLabelText("Division"), {
      target: { value: "gold-1" },
    });
    // The panel persists on a deferred write (usePersistedState, Bloc 93/E1).
    const stored = () =>
      JSON.parse(String(window.localStorage.getItem(playerStorageKey) ?? "{}"));
    await waitFor(() => expect(stored().division).toBe("gold-1"));
    expect(stored().league).toBe("gold");

    fireEvent.click(screen.getByRole("button", { name: "Bronze" }));
    await waitFor(() => expect(stored().league).toBe("bronze"));
    expect(stored().division).toBe("");
  });

  // Codex review (PR #135): .settings-grid-primary is exactly three columns
  // (5fr 2fr 3fr) for League/Level/VP, and its mobile rule keys off child
  // order — a fourth child there pushed Level into VP's column and wrapped VP
  // onto a row of its own.
  it("P2: stays out of the three-column League/Level/VP row", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PlayerSettingsPanel ladder={ladder} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByText("Paramètres du joueur", { exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    const primary = container.querySelector(".settings-grid-primary")!;
    expect(screen.getByLabelText("Division")).toBeVisible();
    expect(primary.children).toHaveLength(3);
    expect(primary.querySelector(".settings-grid-division-field")).toBeNull();
    // And the order the mobile rule depends on is intact: league first.
    expect(primary.firstElementChild).toHaveClass("settings-grid-league-field");
  });

  it("shows nothing at all when no ladder was passed", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    expect(screen.queryByLabelText("Division")).toBeNull();
  });

  it("reads a stored division back, and ignores one of the wrong type", () => {
    expect(
      safePlayerSettings(
        JSON.stringify({ ...defaultPlayerSettings(), division: "gold-1" }),
      ).division,
    ).toBe("gold-1");
    expect(
      safePlayerSettings(
        JSON.stringify({ ...defaultPlayerSettings(), division: 7 }),
      ).division,
    ).toBe("");
  });
});
