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
import { defaultLeagueLadder, type LeagueLadder } from "../lib/leagues";
import { templarRates } from "../lib/gems-templars";
import { mockViewport } from "../test/viewport";

function panel(ladder?: LeagueLadder) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <PlayerSettingsPanel ladder={ladder} />
    </NextIntlClientProvider>,
  );
}

/** Bloc 123 : un seul sélecteur pour la ligue et la division. */
const rungGroup = () =>
  screen.getByRole("group", { name: "Ligue ou division" });

function clickRung(name: string) {
  fireEvent.click(within(rungGroup()).getByRole("button", { name }));
}

/** L'étiquette d'une compétence dans le résumé replié. */
const chip = (skill: string) =>
  document.querySelector(`.player-stat-chip[data-skill="${skill}"]`);

/** Le « = X% » d'une case de la matrice, ligne et colonne nommées. */
const percentOf = (row: string, skill: string) =>
  document.querySelector(`[data-percent="${row}-${skill}"]`);

const level = () =>
  screen.getByLabelText("Niveau du joueur", { selector: "input" });

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
      panel();
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
  // Persisting happens in a passive effect, which React runs after the commit
  // that scheduled it — including after a newer render has already gone in.
  // The effect then writes, and announces, the snapshot it captured rather
  // than the current one, and answering that announcement adopted the older
  // snapshot: the level the user had just typed went back to its previous
  // value.
  it("Bloc102: ignores its own broadcast, which can announce a snapshot it has moved past", async () => {
    panel();

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

  // The other half of syncFromStorage's guard: `broadcasting` decides whether
  // the event is ours, the content comparison decides whether anything
  // actually changed. Drop the comparison and two mounted copies of the panel
  // answer each other without end.
  it("Bloc102: an outside announcement that changes nothing leaves the panel alone", async () => {
    panel();
    fireEvent.change(level(), { target: { value: "10" } });
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

  it("starts with no rung selected", () => {
    panel();
    for (const button of within(rungGroup()).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
  });

  // Bloc 68/E, Bloc 123 : « Ligue non définie » vit maintenant dans la
  // pastille de l'en-tête, qui prend le nom de l'échelon dès qu'il y en a un.
  it("shows 'Ligue non définie' in the header pill until a rung is picked", () => {
    panel();
    const pill = document.querySelector(".player-league-pill");
    expect(pill).toHaveTextContent("Ligue non définie");
    clickRung("Or");
    expect(pill).toHaveTextContent("Or");
    expect(pill).not.toHaveTextContent("Ligue non définie");
  });

  it("keeps equipment skills independent from planned points", async () => {
    panel();

    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Attaque avec équipement" }),
    );
    fireEvent.change(level(), { target: { value: "10" } });
    clickRung("Or");
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

    panel();

    await waitFor(() => expect(level()).toHaveValue(42));
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
    panel();
    await waitFor(() => expect(chip("rusher")).toHaveTextContent("50%"));
  });

  it("keeps the collapsed chips visible while the panel stays collapsed", () => {
    panel();
    expect(rungGroup()).not.toBeVisible();
    const chips = screen.getByTestId("player-summary-chips");
    expect(chips).toBeVisible();
    // Attaque and Vitesse are temple skills: even with no input yet, their
    // total already includes the confirmed temple base (20% / 50%).
    expect(chip("striker")).toHaveTextContent("Atq");
    expect(chip("striker")).toHaveTextContent("20%");
    expect(chip("rusher")).toHaveTextContent("50%");
  });

  // Bloc 123 §1 : dix étiquettes, cinq par rangée — la grille est dans la
  // feuille de style, le nombre et l'ordre viennent d'ici.
  it("lays the ten skills out in the cahier des charges' order", () => {
    panel();
    const chips = [
      ...screen
        .getByTestId("player-summary-chips")
        .querySelectorAll(".player-stat-chip"),
    ];
    expect(chips.map((item) => item.getAttribute("data-skill"))).toEqual([
      "striker",
      "brave",
      "scavenger",
      "guardian",
      "fearless",
      "prosperous",
      "recruiter",
      "cautious",
      "salvager",
      "rusher",
    ]);
  });

  it("breaks a temple skill down, and leaves the others with their total alone", () => {
    panel();
    // Équipement + points + temple, dans les couleurs des trois sources.
    const breakdown = chip("striker")?.querySelector(".player-chip-breakdown");
    expect(breakdown).toHaveTextContent("0 + 0 + 20");
    expect(breakdown?.querySelector(".component-equipment")).not.toBeNull();
    expect(breakdown?.querySelector(".component-points")).not.toBeNull();
    expect(breakdown?.querySelector(".component-temple")).not.toBeNull();
    // Bravoure n'est pas une compétence de temple : le total, et rien d'autre.
    expect(chip("brave")?.querySelector(".player-chip-breakdown")).toBeNull();
    expect(chip("striker")?.querySelector(".player-chip-total")).toHaveClass(
      "component-total",
    );
  });

  it("updates the collapsed chip's total after editing equipment and points", async () => {
    panel();
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Attaque avec équipement" }),
    );
    clickRung("Or");
    fireEvent.change(level(), { target: { value: "10" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Points Attaque" }),
    );
    // 0.5 (equipment) + 2 (1 point × bonus 2) + 20 (temple base, no clan
    // contribution entered) = 22.5.
    await waitFor(() => expect(chip("striker")).toHaveTextContent("22,5%"));
  });

  it("caps Bravoure/Intrépide at 90% even if equipment plus points exceed it", async () => {
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
    panel();
    await waitFor(() => expect(chip("fearless")).toHaveTextContent("90%"));
  });

  it("caps Bravoure/Intrépide at 75% in Légende", async () => {
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
    panel();
    await waitFor(() => expect(chip("fearless")).toHaveTextContent("75%"));
  });

  it("caps Récupération at 50% even if equipment plus points exceed it", async () => {
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
    panel();
    await waitFor(() => expect(chip("cautious")).toHaveTextContent("50%"));
  });

  it("caps the equipment field for Récupération at 50%, and Intrépide/Bravoure at 90% (75% in Légende)", () => {
    panel();
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

    clickRung("Légende");
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

  it("reflects an external equipment-skills transfer live, without touching points or clan temple", async () => {
    panel();
    clickRung("Or");
    fireEvent.change(level(), { target: { value: "10" } });
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
    fireEvent.change(level(), { target: { value: "5" } });
    expect(level()).toHaveValue(5);
  });

  it("starts the clan Temple contribution at 0 and adds the confirmed base to the displayed total", () => {
    panel();
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
    // contribution shows a 51% total right under the field.
    expect(percentOf("temple", "rusher")).toHaveTextContent("51%");
  });
});

/**
 * Bloc 123 §3 — le sélecteur ligue/division, et la seule source qu'il lit.
 *
 * Avant ce bloc il y en avait deux : six boutons de ligue tirés d'une liste
 * figée, et un `<select>` de division alimenté par l'échelle. Le joueur
 * pouvait donc décrire un état que l'échelle ne connaît pas. Désormais un seul
 * groupe, qui écrit les deux champs stockés d'un coup — la ligue de base que
 * lisent Gemmes, Progression, Événements, Villes et Équipement, et
 * l'identifiant d'échelon que lit le Classement.
 */
describe("Bloc 123: the rung picker", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const split: LeagueLadder = [
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
      id: "silver-2",
      league: "silver",
      division: "2",
      name: {},
      position: 1,
      active: true,
      bands: [],
    },
    {
      id: "silver-1",
      league: "silver",
      division: "1",
      name: {},
      position: 2,
      active: true,
      bands: [],
    },
    {
      id: "gold-2",
      league: "gold",
      division: "2",
      name: {},
      position: 3,
      active: false,
      bands: [],
    },
  ];

  it("offers the ladder's active rungs, in its order, and nothing else", () => {
    panel(split);
    expect(
      within(rungGroup())
        .getAllByRole("button")
        .map((button) => button.textContent),
      // L'échelon inactif n'existe pas pour le joueur (Bloc 108/G).
    ).toEqual(["Bronze", "Argent 2", "Argent 1"]);
  });

  // Le nombre d'entrées n'est écrit nulle part dans l'écran : six tant que les
  // ligues ne sont pas scindées, dix après, sans rien à modifier ici.
  it("falls back to the module's own default when no ladder is passed", () => {
    panel();
    expect(within(rungGroup()).getAllByRole("button")).toHaveLength(
      defaultLeagueLadder.length,
    );
  });

  it("writes both the base league and the rung id when a rung is picked", async () => {
    panel(split);
    clickRung("Argent 1");
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem(playerStorageKey) ?? "{}",
      );
      // La ligue de base pour tous les autres outils, l'identifiant pour le
      // Classement. C'est ce qui fait qu'aucun d'eux n'a eu à changer.
      expect(stored.league).toBe("silver");
      expect(stored.division).toBe("silver-1");
    });
  });

  it("reads back the rung a returning player had picked", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "silver",
        division: "silver-1",
        v: 2,
      }),
    );
    panel(split);
    await waitFor(() =>
      expect(
        within(rungGroup()).getByRole("button", { name: "Argent 1" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("resolves a save that predates divisions when the league has a single rung", async () => {
    // Une sauvegarde d'avant ce bloc : une ligue, pas de division. Bronze n'a
    // qu'un échelon, donc il n'y a pas d'autre réponse possible.
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "bronze",
        division: "",
        v: 2,
      }),
    );
    panel(split);
    await waitFor(() =>
      expect(
        within(rungGroup()).getByRole("button", { name: "Bronze" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("selects nothing when the stored league is split and the save does not say which division", async () => {
    // Le cas ambigu, et le seul : la ligue est scindée en deux, rien ne dit
    // laquelle. Deviner inventerait une donnée de jeu et fausserait le
    // Classement en silence — le joueur choisit, et la ligue stockée reste
    // valable pour les outils qui n'ont que faire des divisions.
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "silver",
        division: "",
        v: 2,
      }),
    );
    panel(split);
    await waitFor(() => expect(level()).toHaveValue(1));
    for (const button of within(rungGroup()).getAllByRole("button"))
      expect(button).toHaveAttribute("aria-pressed", "false");
    expect(
      JSON.parse(window.localStorage.getItem(playerStorageKey) ?? "{}").league,
    ).toBe("silver");
  });

  it("ignores a stored rung that has moved to another league since", async () => {
    // Une administration peut déplacer un échelon sous une autre ligue de base
    // sans changer son identifiant : l'accord des deux champs est ce qui rend
    // la sélection légitime.
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "bronze",
        division: "silver-1",
        v: 2,
      }),
    );
    panel(split);
    await waitFor(() =>
      expect(
        within(rungGroup()).getByRole("button", { name: "Bronze" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(
      within(rungGroup()).getByRole("button", { name: "Argent 1" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  /**
   * Revue Codex : un échelon « libre » — publié sans ligue de base, avec un nom
   * à lui — est proposé par le sélecteur, et `selectRung` enregistre alors une
   * ligue vide. La comparaison de relecture opposait `null` à `""` : le bouton
   * se dé-sélectionnait dans la foulée du clic.
   */
  it("keeps a free-named rung selected after it is picked", async () => {
    const withFree: LeagueLadder = [
      ...split,
      {
        id: "studio-cup",
        league: null,
        division: "",
        name: { fr: "Coupe du studio" },
        position: 4,
        active: true,
        bands: [],
      },
    ];
    panel(withFree);
    clickRung("Coupe du studio");
    await waitFor(() =>
      expect(
        within(rungGroup()).getByRole("button", { name: "Coupe du studio" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(document.querySelector(".player-league-pill")).toHaveTextContent(
      "Coupe du studio",
    );
  });

  it("carries no separate division control any more", () => {
    panel(split);
    // Le `<select>` du Bloc 108/E a fusionné dans le groupe ci-dessus ; il
    // laissait le joueur décrire une ligue et une division qui se
    // contredisent.
    expect(screen.queryByLabelText("Division")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Division" })).toBeNull();
  });
});

/** Bloc 123 §2.3 — la matrice : les mêmes chiffres, dans un tableau. */
describe("Bloc 123: the matrix", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("puts one column per skill and one row per source, plus the total", () => {
    panel();
    const table = document.querySelector(".player-matrix")!;
    expect(
      [...table.querySelectorAll('thead th[scope="col"]')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual([
      "Attaque",
      "Bravoure",
      "Charognard",
      "Défense",
      "Intrépide",
      "Prospérité",
      "Recruteur",
      "Récupération",
      "Recycleur",
      "Vitesse",
    ]);
    expect(
      [...table.querySelectorAll('tbody th[scope="row"]')].map((cell) =>
        cell.textContent?.slice(0, 11),
      ),
    ).toEqual(["Équipement", "Points0 / 0", "Temple (cla", "Total"]);
  });

  it("says the same total as the collapsed chip, for every skill", () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        league: "gold",
        equipmentSkills: {
          ...defaultPlayerSettings().equipmentSkills,
          striker: 12.5,
        },
        v: 2,
      }),
    );
    panel();
    const totals = [
      ...document.querySelectorAll(".player-matrix-row-total td output"),
    ].map((cell) => cell.textContent);
    const chips = [...document.querySelectorAll(".player-chip-total")].map(
      (cell) => cell.textContent,
    );
    expect(totals).toEqual(chips);
    // Et les templiers n'y entrent pas : la ligne Total ne bouge pas quand on
    // en ajoute un.
    fireEvent.click(
      screen.getByRole("button", { name: "Augmenter Templiers Attaque" }),
    );
    expect(
      [...document.querySelectorAll(".player-matrix-row-total td output")].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(totals);
  });

  it("leaves the temple row empty on the five skills a temple does not touch", () => {
    panel();
    const temple = document.querySelector(".player-matrix-row-temple")!;
    const cells = [...temple.querySelectorAll("td")];
    const filled = cells.filter(
      (cell) => cell.querySelector("input") !== null,
    ).length;
    expect(filled).toBe(5);
    expect(temple.querySelectorAll(".player-matrix-empty")).toHaveLength(5);
  });

  it("shows the points budget and resets the distribution", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        level: 31,
        league: "gold",
        skillPoints: { ...defaultPlayerSettings().skillPoints, striker: 3 },
        v: 2,
      }),
    );
    panel();
    // La sauvegarde est lue sur une micro-tâche : le budget part de « 0 / 0 ».
    const budget = document.querySelector(".player-points-budget")!;
    await waitFor(() => expect(budget).toHaveTextContent("3 / 30"));
    // « 3 / 30 » ne dit rien à qui l'entend : la phrase entière est là pour lui.
    expect(budget.querySelector(".sr-only")).toHaveTextContent(
      "3 points alloués sur 30 disponibles",
    );
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByLabelText("Points Attaque")).toHaveValue(0);
  });
});

/** Bloc 123 — le résumé replié, et le correctif d'unité des VP. */
describe("Bloc 123: the collapsed summary", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("writes the VP on the site's own scale, never with a locale suffix", async () => {
    window.localStorage.setItem(
      playerStorageKey,
      JSON.stringify({
        ...defaultPlayerSettings(),
        vp: 11,
        vpUnit: 1_000_000_000,
        v: 2,
      }),
    );
    panel();
    const meta = document.querySelector(".player-summary-meta")!;
    await waitFor(() => expect(meta).toHaveTextContent("11G VP"));
    // « Md » est ce que rendait `Intl` en notation compacte française, là où
    // tout le reste du site écrit « G » (AGENTS.md, échelle k/M/G/T).
    expect(meta).not.toHaveTextContent("Md");
  });

  it("offers the téra the scale names but the field did not have", () => {
    panel();
    expect(
      [...screen.getByLabelText("Unité des VP").querySelectorAll("option")].map(
        (option) => option.textContent,
      ),
    ).toEqual(["×1", "k", "M", "G", "T"]);
  });

  it("names the collapse control's state, for a reader that cannot see the arrow", () => {
    panel();
    expect(document.querySelector("summary")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

/**
 * Bloc 123 §4 — le mobile transpose la matrice plutôt que de la faire défiler.
 *
 * Même modèle de données, mêmes gestionnaires : seul le rendu change. C'est ce
 * que ces cas tiennent — une saisie faite dans la présentation mobile arrive
 * au même endroit que sur desktop.
 */
describe("Bloc 123: the narrow layout", () => {
  let viewport: ReturnType<typeof mockViewport>;
  beforeEach(() => {
    window.localStorage.clear();
    viewport = mockViewport(true);
  });
  afterEach(() => {
    viewport.restore();
    cleanup();
  });

  it("transposes the matrix: one row per skill, three columns of fields", () => {
    panel();
    expect(document.querySelector(".player-matrix")).toBeNull();
    const table = document.querySelector(".player-matrix-mobile")!;
    expect(
      [...table.querySelectorAll('thead th[scope="col"]')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["Équipement", "Points", "Temple (clan)"]);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(10);
  });

  /**
   * Revue Codex : la colonne d'en-têtes fait 92 px — la largeur de la maquette
   * — et le nom entier d'une compétence n'y tient pas dans toutes les langues
   * (« Bergungsexperte » : 99 px, mesuré au navigateur). L'abréviation est
   * affichée, le nom entier reste le nom accessible de la ligne.
   */
  it("shows the abbreviation, and keeps the full name for a screen reader", () => {
    panel();
    const header = document.querySelector(
      '.player-matrix-mobile tbody th[scope="row"]',
    )!;
    expect(
      header.querySelector(".player-matrix-mobile-name"),
    ).toHaveTextContent("Atq");
    expect(header.querySelector(".player-matrix-mobile-name")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(header.querySelector(".sr-only")).toHaveTextContent("Attaque");
  });

  it("drops the − / + buttons, which do not fit, and keeps a numeric keypad", () => {
    panel();
    expect(
      screen.queryByRole("button", { name: "Augmenter Points Attaque" }),
    ).toBeNull();
    const field = screen.getByLabelText("Points Attaque");
    expect(field).toHaveAttribute("inputmode", "numeric");
    // Un pas fractionnaire demande un séparateur décimal, que le clavier
    // « numeric » d'iOS n'offre pas.
    expect(screen.getByLabelText("Attaque avec équipement")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
  });

  it("feeds the same handlers as the wide layout", async () => {
    panel();
    clickRung("Or");
    fireEvent.change(level(), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Points Attaque"), {
      target: { value: "2" },
    });
    // 2 points × bonus 2 = 4 %, plus la base de temple de 20 %.
    await waitFor(() =>
      expect(percentOf("points", "striker")).toHaveTextContent("4%"),
    );
    expect(chip("striker")).toHaveTextContent("24%");
  });

  /**
   * Revue Codex : sans les boutons, plus rien ne bornait la saisie — `min` et
   * `max` ne contraignent pas ce qu'on tape, et la valeur partait telle quelle
   * en base. Un temple négatif ou cinquante templiers traversaient ensuite tous
   * les calculateurs. Et la coercition à chaque frappe mangeait le séparateur
   * décimal : « 12, » redevenait « 12 », donc 12,5 était intapable.
   */
  it("clamps what is typed, and lets a decimal be typed at all", async () => {
    panel();
    const temple = screen.getByLabelText("Temple Or");
    fireEvent.change(temple, { target: { value: "-10" } });
    fireEvent.blur(temple);
    expect(temple).toHaveValue(0);

    const templars = screen.getByLabelText("Templiers Attaque");
    fireEvent.change(templars, { target: { value: "50" } });
    fireEvent.blur(templars);
    expect(templars).toHaveValue(20);

    // Le brouillon de saisie — celui qui laisse taper « 12, » avant le 5 — est
    // celui du stepper, éprouvé dans `number-stepper.test.tsx` (Bloc 34/C) :
    // jsdom refuse « 12. » dans un champ numérique, donc c'est là qu'il se
    // teste, pas ici. Ce qui compte ici, c'est que la valeur décimale arrive
    // entière jusqu'au stockage.
    const equipment = screen.getByLabelText("Attaque avec équipement");
    fireEvent.change(equipment, { target: { value: "12.5" } });
    fireEvent.blur(equipment);
    expect(equipment).toHaveValue(12.5);
    await waitFor(() =>
      expect(window.localStorage.getItem(playerStorageKey)).toContain(
        '"striker":12.5',
      ),
    );
  });

  it("puts the points budget above the table, where the row header used to be", () => {
    panel();
    const bar = document.querySelector(".player-points-bar");
    expect(bar).not.toBeNull();
    // Au-dessus du tableau, et non dans un en-tête de ligne qui n'existe plus.
    expect(
      bar!.compareDocumentPosition(
        document.querySelector(".player-matrix-mobile")!,
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(bar as HTMLElement).getByRole("button", { name: "Réinitialiser" }),
    ).not.toBeNull();
  });
});
