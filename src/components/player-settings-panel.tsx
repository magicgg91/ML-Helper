"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { NumberStepper } from "./number-stepper";
import {
  activeLadder,
  defaultLeagueLadder,
  type LeagueLadder,
  type LeagueRung,
} from "../lib/leagues";
import { leagueRungLabel } from "./league-rung-label";
import { usePersistedState } from "./use-persisted-state";
import { useNarrowViewport } from "./use-narrow-viewport";
import { formatGameNumber, formatSkillPercentValue } from "../lib/format";
import { templarRates } from "../lib/gems-templars";
import {
  PlainNumberField,
  PlayerSettingsMatrix,
  PlayerSettingsMatrixMobile,
  type MatrixCell,
  type MatrixColumn,
  type MatrixRow,
} from "./player-settings-matrix";
import {
  allocateSkillPoints,
  allocatedSkillPoints,
  availableSkillPoints,
  combinedSkillPercent,
  defaultPlayerSettings,
  fitSkillPointsToBudget,
  skillCapForLeague,
  skillKeys,
  skillPercent,
  templarKeys,
  templeBase,
  templePercent,
  templeSkillBreakdown,
  type NumberMap,
  type PlayerSettings,
  type SkillKey,
  type TemplarKey,
} from "../lib/player-settings";

export const playerStorageKey = "mlhelper_player_params";
export const playerSettingsChangedEvent = "mlhelper:player-settings-changed";

// v1 stored the clan-temple field as the full temple total (base + clan
// contribution); v2 stores only the clan contribution and adds the
// confirmed base automatically. Bump this and extend the migration below
// whenever the persisted shape changes again.
const currentSettingsVersion = 2;

function isTemplarKey(key: SkillKey): key is TemplarKey {
  return (templarKeys as readonly string[]).includes(key);
}

export function safePlayerSettings(raw: string): PlayerSettings {
  const fallback = defaultPlayerSettings();
  try {
    // Bloc 99: `v` is separated from the settings here rather than spread
    // along with them. It is storage bookkeeping — PlayerSettings has no such
    // field — and letting it ride into the returned object made every
    // stored-vs-current comparison unequal by construction, whatever the
    // settings held. The panel's syncFromStorage is one such comparison: it
    // answered the panel's own save with a fresh object, and the extra
    // write/broadcast cycle that followed carried a pre-transfer snapshot,
    // which overwrote an external write (the Stuff simulator's transfer)
    // that had landed in between.
    const { v: storedVersion, ...saved } = JSON.parse(
      raw,
    ) as Partial<PlayerSettings> & { v?: number };
    if (!("equipmentSkills" in saved)) return fallback;
    const clanTemple = { ...fallback.clanTemple, ...saved.clanTemple };
    if ((storedVersion ?? 1) < currentSettingsVersion && saved.clanTemple) {
      for (const key of templarKeys) {
        clanTemple[key] = Math.max(0, clanTemple[key] - templeBase[key]);
      }
    }
    return {
      ...fallback,
      ...saved,
      equipmentSkills: {
        ...fallback.equipmentSkills,
        ...saved.equipmentSkills,
      },
      skillPoints: { ...fallback.skillPoints, ...saved.skillPoints },
      templars: { ...fallback.templars, ...saved.templars },
      // Bloc 108/E: an id read back from storage is only ever used to match a
      // ladder entry, but it reaches the DOM as a control's value — coerce it
      // rather than trust whatever JSON.parse produced.
      division: typeof saved.division === "string" ? saved.division : "",
      clanTemple,
    };
  } catch {
    return fallback;
  }
}

// Overwrites only the "Statistiques données par l'équipement" block —
// never skillPoints (Points de compétence) or clanTemple (Bonus de
// temple), which stay independent per cdc section 7.1. Used by the Stuff
// simulator's transfer button so the two features never need to know
// about each other's shape beyond this one map.
export function replaceEquipmentSkills(equipmentSkills: NumberMap<SkillKey>) {
  const saved = window.localStorage.getItem(playerStorageKey);
  const current = saved ? safePlayerSettings(saved) : defaultPlayerSettings();
  const next: PlayerSettings = { ...current, equipmentSkills };
  window.localStorage.setItem(
    playerStorageKey,
    JSON.stringify({ ...next, v: currentSettingsVersion }),
  );
  window.dispatchEvent(
    new CustomEvent(playerSettingsChangedEvent, { detail: next }),
  );
}

/**
 * Bloc 123 : l'échelon sur lequel se trouve le joueur, déduit de ce qui est
 * stocké — et rien de plus.
 *
 * Le stockage n'a pas changé : une ligue de base (`league`, que lisent Gemmes,
 * Progression, Événements, Villes et Équipement) et l'identifiant d'un échelon
 * (`division`, que lit le Classement). Le sélecteur écrit les deux d'un coup,
 * mais une sauvegarde d'avant ce bloc peut ne porter que la ligue.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. l'identifiant stocké nomme un échelon actif de la ligue stockée — on le
 *    prend ;
 * 2. sinon, si la ligue n'a qu'un seul échelon actif, il n'y a pas d'autre
 *    réponse possible — on le prend (c'est la règle que le Classement applique
 *    déjà de son côté) ;
 * 3. sinon, la ligue est scindée en divisions et rien ne dit laquelle : **aucun
 *    échelon n'est sélectionné**. Le joueur choisit. Deviner reviendrait à
 *    inventer une donnée de jeu, ce qu'AGENTS.md interdit, et à fausser le
 *    Classement en silence.
 */
export function selectedRungOf(
  rungs: LeagueLadder,
  settings: Pick<PlayerSettings, "league" | "division">,
): LeagueRung | undefined {
  const stored = rungs.find(
    (rung) => rung.id === settings.division && rung.league === settings.league,
  );
  if (stored) return stored;
  if (!settings.league) return undefined;
  const ofLeague = rungs.filter((rung) => rung.league === settings.league);
  return ofLeague.length === 1 ? ofLeague[0] : undefined;
}

export function PlayerSettingsPanel({
  // Bloc 108/E: the ranking ladder, which since Bloc 123 also feeds the
  // league picker. Left empty by a caller that has no ladder to hand, and the
  // panel then falls back to the module's own default — the six base leagues,
  // which is what the picker offered before divisions existed.
  ladder = [],
}: {
  ladder?: LeagueLadder;
} = {}) {
  const locale = useLocale();
  const t = useTranslations("player-settings");
  const game = useTranslations("game");
  const narrow = useNarrowViewport();
  // Bloc 123 : l'état d'ouverture, tenu ici pour que le bouton de repli porte
  // un `aria-expanded` explicite (Bloc 92, WCAG 4.1.2) — `<details>` le donne
  // implicitement, mais rien ne le vérifiait.
  const [open, setOpen] = useState(false);
  // Bloc 102: true only while this panel's own persistence broadcast is
  // being delivered. `dispatchEvent` is synchronous, so every listener —
  // syncFromStorage below included — runs inside that window.
  const broadcasting = useRef(false);
  // Bloc 93/F3: shares the load/loaded/save triplet with both simulators.
  // `safePlayerSettings` migrates rather than rejects (it always returns a
  // value), so this `parse` never yields undefined — the version stamp lives
  // in `serialize`, and the cross-source broadcast in `onPersist`.
  const [settings, setSettings] = usePersistedState(playerStorageKey, {
    initial: defaultPlayerSettings,
    parse: safePlayerSettings,
    serialize: (value) =>
      JSON.stringify({ ...value, v: currentSettingsVersion }),
    onPersist: (value) => {
      broadcasting.current = true;
      try {
        window.dispatchEvent(
          new CustomEvent(playerSettingsChangedEvent, { detail: value }),
        );
      } finally {
        broadcasting.current = false;
      }
    },
    // This panel has always read storage on a microtask, unlike the two
    // simulators. It matters here: a macrotask lets the Stuff simulator's
    // transfer (and the user's own edits) land first, and the deferred read
    // then overwrites them.
    schedule: queueMicrotask,
  });

  // Picks up a write from another source (e.g. the Stuff simulator's
  // transfer button) while this panel is already mounted. Two guards, and
  // they answer different questions: `broadcasting` says whether the event
  // is this panel's own (below), and the content comparison says whether
  // the stored settings actually differ — replacing state with a
  // new-but-identical object would re-trigger the persistence effect
  // indefinitely.
  useEffect(() => {
    function syncFromStorage() {
      // Bloc 102: never answer our own write. Persisting happens in a
      // passive effect, which React runs after the commit that scheduled
      // it — and, when a newer update arrives first, after that newer
      // render too. The effect then writes and announces the snapshot it
      // captured, which the panel has already moved past. Re-reading
      // storage on that announcement adopts the older snapshot and
      // silently undoes the newer edit (the level the user just typed went
      // back to its previous value). Only writes from another source are
      // ours to adopt.
      if (broadcasting.current) return;
      const saved = window.localStorage.getItem(playerStorageKey);
      if (!saved) return;
      const next = safePlayerSettings(saved);
      setSettings((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    }
    window.addEventListener(playerSettingsChangedEvent, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(playerSettingsChangedEvent, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [setSettings]);

  // Bloc 123 : les échelons proposés viennent du module central — ceux qu'une
  // administration a publiés, dans l'ordre qu'elle leur a donné. Leur nombre
  // n'est écrit nulle part ici : six aujourd'hui, dix après l'éclatement des
  // divisions, et le jour où il change cet écran suit sans rien à modifier.
  const rungs = useMemo(
    () => activeLadder(ladder.length ? ladder : defaultLeagueLadder),
    [ladder],
  );
  const selectedRung = selectedRungOf(rungs, settings);

  const available = availableSkillPoints(settings.level, settings.league);
  const allocated = allocatedSkillPoints(settings.skillPoints);
  const templarTotal = templarKeys.reduce(
    (total, key) => total + settings.templars[key],
    0,
  );
  const vp = settings.vp * settings.vpUnit;
  // Bloc 123 : le formateur du site, et non `Intl` en notation compacte —
  // celle-ci rendait « 11 Md » en français là où tout le reste du site écrit
  // « 11G » (AGENTS.md, échelle k/M/G/T…).
  const summary = t("summary", {
    level: settings.level,
    vp: formatGameNumber(vp),
    templarTotal,
  });

  const setLevel = (level: number) =>
    setSettings((current) => ({
      ...current,
      level: Math.max(1, Math.floor(level)),
      skillPoints: fitSkillPointsToBudget(
        current.skillPoints,
        Math.max(1, Math.floor(level)),
        current.league,
      ),
    }));

  /**
   * Bloc 123 : choisir un échelon écrit les deux champs d'un coup — la ligue
   * de base pour les outils qui ne connaissent pas les divisions, et
   * l'identifiant pour le Classement. C'est ce qui fait qu'aucun autre outil
   * n'a eu à changer.
   */
  const selectRung = (rung: LeagueRung) =>
    setSettings((current) => {
      const league = rung.league ?? "";
      return {
        ...current,
        league,
        division: rung.id,
        skillPoints: fitSkillPointsToBudget(
          current.skillPoints,
          current.level,
          league,
        ),
      };
    });

  const setSkillPoints = (key: SkillKey, value: number) =>
    setSettings((current) => ({
      ...current,
      skillPoints: allocateSkillPoints(
        current.skillPoints,
        key,
        value,
        current.level,
        current.league,
      ),
    }));

  const format = (value: number) => formatSkillPercentValue(value, locale);
  const breakdownOf = (key: SkillKey) =>
    isTemplarKey(key) ? templeSkillBreakdown(key, settings) : null;
  const totalOf = (key: SkillKey) =>
    breakdownOf(key)?.total ?? combinedSkillPercent(key, settings);

  const columns: MatrixColumn[] = skillKeys.map((key) => ({
    key,
    label: game(`skills.${key}`),
    short: game(`skills-short.${key}`),
    total: format(totalOf(key)),
  }));

  const rows: MatrixRow[] = [
    {
      key: "equipment",
      title: t("equipment-skills.title"),
      cells: skillKeys.map((key) => ({
        value: settings.equipmentSkills[key],
        min: 0,
        max: skillCapForLeague(key, settings.league),
        step: 0.5,
        label: t("equipment-skills.field", { skill: game(`skills.${key}`) }),
        onChange: (value: number) =>
          setSettings((current) => ({
            ...current,
            equipmentSkills: { ...current.equipmentSkills, [key]: value },
          })),
      })),
    },
    {
      key: "points",
      title: t("skill-points.title"),
      note: (
        <span className="player-matrix-row-note">
          <span className="player-points-budget">
            <span aria-hidden="true">
              {t("skill-points.budget", { allocated, available })}
            </span>
            {/* « 0 / 210 » ne dit rien à qui l'entend plutôt que de le voir. */}
            <span className="sr-only">
              {t("skill-points.budget-label", { allocated, available })}
            </span>
          </span>
          <button
            className="player-points-reset"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                skillPoints: defaultPlayerSettings().skillPoints,
              }))
            }
            type="button"
          >
            {t("skill-points.reset")}
          </button>
        </span>
      ),
      cells: skillKeys.map((key) => ({
        value: settings.skillPoints[key],
        min: 0,
        step: 1,
        label: t("skill-points.field", { skill: game(`skills.${key}`) }),
        onChange: (value: number) => setSkillPoints(key, value),
        percent: format(
          skillPercent(key, settings.skillPoints, settings.league),
        ),
      })),
    },
    {
      key: "temple",
      title: t("clan-temple.title"),
      note: (
        <span className="player-matrix-row-note">{t("clan-temple.help")}</span>
      ),
      cells: skillKeys.map((key) =>
        isTemplarKey(key)
          ? ({
              value: settings.clanTemple[key],
              min: 0,
              step: templarRates[key],
              label: t("clan-temple.field", {
                templar: game(`templars.${key}`),
              }),
              onChange: (value: number) =>
                setSettings((current) => ({
                  ...current,
                  clanTemple: { ...current.clanTemple, [key]: value },
                })),
              percent: format(templePercent(key, settings.clanTemple)),
            } satisfies MatrixCell)
          : null,
      ),
    },
  ];

  return (
    <aside className="player-settings" aria-labelledby="player-settings-title">
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary aria-expanded={open}>
          <div className="player-summary-row1">
            <span id="player-settings-title">{t("title")}</span>
            <span className="player-summary-meta">
              <span className="player-league-pill">
                {selectedRung
                  ? leagueRungLabel(selectedRung, game, locale)
                  : t("league-undefined")}
              </span>
              <small>{summary}</small>
            </span>
          </div>
          {/* Bloc 123 : le résumé des dix statistiques en étiquettes, cinq par
              rangée. Masqué une fois le panneau ouvert — la ligne Total du
              tableau dit la même chose, à la même place. */}
          <span
            className="player-stat-chips"
            data-testid="player-summary-chips"
          >
            {skillKeys.map((key) => {
              const breakdown = breakdownOf(key);
              return (
                <span className="player-stat-chip" data-skill={key} key={key}>
                  <span className="player-chip-name">
                    {game(`skills-short.${key}`)}
                  </span>
                  <span className="player-chip-total component-total">
                    {format(totalOf(key))}%
                  </span>
                  {breakdown && (
                    <span className="player-chip-breakdown">
                      <span className="component-equipment">
                        {format(breakdown.equipment)}
                      </span>
                      {" + "}
                      <span className="component-points">
                        {format(breakdown.points)}
                      </span>
                      {" + "}
                      <span className="component-temple">
                        {format(breakdown.temple)}
                      </span>
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        </summary>
        <div className="player-settings-body">
          <div className="player-general">
            <div className="player-rung-field">
              <span className="player-field-label">{t("rung")}</span>
              {/* Bloc 123 : un seul sélecteur pour la ligue ET la division,
                  alimenté par `leagues.ts` — la même source que le Classement
                  et que Configuration. Le `<select>` de division qui vivait
                  ici en double a disparu avec lui. */}
              <div
                aria-label={t("rung")}
                className="family-buttons player-rung-buttons"
                role="group"
              >
                {rungs.map((rung) => (
                  <button
                    aria-pressed={selectedRung?.id === rung.id}
                    key={rung.id}
                    onClick={() => selectRung(rung)}
                    type="button"
                  >
                    {leagueRungLabel(rung, game, locale)}
                  </button>
                ))}
              </div>
            </div>
            <label className="player-level-field">
              {t("player-level")}
              <NumberStepper
                label={t("player-level")}
                min={1}
                onChange={setLevel}
                value={settings.level}
              />
            </label>
            <label className="player-vp-field">
              {t("player-vp")}
              <div className="unit-input">
                <NumberStepper
                  label={t("player-vp")}
                  min={0}
                  onChange={(value) =>
                    setSettings((current) => ({ ...current, vp: value }))
                  }
                  step={0.1}
                  value={settings.vp}
                />
                <select
                  aria-label={t("vp-unit")}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      vpUnit: Number(
                        event.target.value,
                      ) as PlayerSettings["vpUnit"],
                    }))
                  }
                  value={settings.vpUnit}
                >
                  <option value={1}>×1</option>
                  <option value={1_000}>k</option>
                  <option value={1_000_000}>M</option>
                  <option value={1_000_000_000}>G</option>
                  <option value={1_000_000_000_000}>T</option>
                </select>
              </div>
            </label>
          </div>

          <div className="player-templars">
            <div className="player-templars-head">
              <span className="player-field-label">{t("templars.title")}</span>
              <small>{t("templars.not-counted")}</small>
            </div>
            <div className="player-templars-fields">
              {templarKeys.map((key) => {
                const cell = {
                  value: settings.templars[key],
                  min: 0,
                  max: 20,
                  step: 1,
                  label: t("templars.field", {
                    templar: game(`templars.${key}`),
                  }),
                  onChange: (value: number) =>
                    setSettings((current) => ({
                      ...current,
                      templars: {
                        ...current.templars,
                        [key]: Math.floor(value),
                      },
                    })),
                };
                return (
                  <label key={key}>
                    {/* Le nom entier sur desktop, l'abréviation sur mobile :
                        cinq colonnes dans 390 px ne laissent pas la place
                        d'écrire « Recruteur ». */}
                    <span className="player-templar-long">
                      {game(`templars.${key}`)}
                    </span>
                    <span aria-hidden="true" className="player-templar-short">
                      {game(`templars-short.${key}`)}
                    </span>
                    {/* Et, pour la même raison de largeur, le champ perd ses
                        boutons − / + sur mobile, comme ceux de la matrice. */}
                    {narrow ? (
                      <PlainNumberField cell={cell} />
                    ) : (
                      <NumberStepper
                        label={cell.label}
                        max={cell.max}
                        min={cell.min}
                        onChange={cell.onChange}
                        value={cell.value}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {narrow ? (
            <>
              {/* Le budget de points et sa remise à zéro quittent l'en-tête de
                  ligne, qui n'existe plus une fois la matrice transposée. */}
              <div className="player-points-bar">
                <span className="player-points-budget">
                  <span aria-hidden="true">
                    {t("skill-points.budget", { allocated, available })}
                  </span>
                  <span className="sr-only">
                    {t("skill-points.budget-label", { allocated, available })}
                  </span>
                </span>
                <button
                  className="player-points-reset"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      skillPoints: defaultPlayerSettings().skillPoints,
                    }))
                  }
                  type="button"
                >
                  {t("skill-points.reset")}
                </button>
              </div>
              <PlayerSettingsMatrixMobile
                caption={t("matrix.caption")}
                columns={columns}
                rows={rows}
              />
              <p className="player-matrix-help">{t("clan-temple.help")}</p>
            </>
          ) : (
            <PlayerSettingsMatrix
              caption={t("matrix.caption")}
              columns={columns}
              rows={rows}
              totalLabel={t("matrix.total")}
            />
          )}
        </div>
      </details>
    </aside>
  );
}
