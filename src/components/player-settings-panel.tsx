"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { NumberStepper } from "./number-stepper";
import { LeagueButtons } from "./league-select";
import { divisionsForLeague, type LeagueLadder } from "../lib/leagues";
import { leagueRungLabel } from "./league-rung-label";
import { usePersistedState } from "./use-persisted-state";
import { formatSkillPercentValue } from "../lib/format";
import { templarRates } from "../lib/gems-templars";
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
  type LeagueSelection,
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
      // ladder entry, but it reaches the DOM as a <select> value — coerce it
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

export function PlayerSettingsPanel({
  // Bloc 108/E: the ranking ladder, for the division field below. Optional
  // and empty by default, which reads as "no division configured" — the exact
  // state every tool page was in before this bloc, and the honest answer when
  // the ladder was not passed.
  ladder = [],
}: {
  ladder?: LeagueLadder;
} = {}) {
  const locale = useLocale();
  const t = useTranslations("player-settings");
  const game = useTranslations("game");
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

  const available = availableSkillPoints(settings.level, settings.league);
  // Bloc 108/E: the active divisions of the league the player is in. Empty
  // when that league has none — the field below then does not render at all.
  const divisions = divisionsForLeague(ladder, settings.league);
  const allocated = allocatedSkillPoints(settings.skillPoints);
  const templarTotal = templarKeys.reduce(
    (total, key) => total + settings.templars[key],
    0,
  );
  const vp = settings.vp * settings.vpUnit;
  const summary = useMemo(
    () =>
      t("summary", {
        league: settings.league
          ? game(`leagues.${settings.league}`)
          : t("league-undefined"),
        level: settings.level,
        vp: Intl.NumberFormat(locale, {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(vp),
        templarTotal,
      }),
    [game, locale, settings.league, settings.level, t, templarTotal, vp],
  );

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

  const setLeague = (league: LeagueSelection) =>
    setSettings((current) => ({
      ...current,
      league,
      // A division belongs to one league; keeping it after a league change
      // would leave the ranking tool pointing at a rung the player has left.
      division: "",
      skillPoints: fitSkillPointsToBudget(
        current.skillPoints,
        current.level,
        league,
      ),
    }));

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

  return (
    <aside className="player-settings" aria-labelledby="player-settings-title">
      <details>
        <summary>
          {/* Bloc 68/G: wraps the title + one-line summary so the mobile
              breakpoint can stack them (globals.css's own
              .player-summary-row1 rule, previously unused by any
              component) — the skills-breakdown line below is unaffected,
              it already sits on its own line either way. */}
          <div className="player-summary-row1">
            <span id="player-settings-title">{t("title")}</span>
            <small>{summary}</small>
          </div>
          <small
            className="player-summary-line2"
            data-testid="player-summary-line2"
          >
            {[skillKeys.slice(0, 5), skillKeys.slice(5)].map(
              (skillGroup, groupIndex) => (
                <span className="player-summary-skill-group" key={groupIndex}>
                  {skillGroup.map((key, index) => {
                    // Bloc 87/A: the transferred player summary shows skill
                    // percentages too — round them to 1 decimal like every
                    // other skill-% display, so Transfer can't reintroduce a
                    // 2-decimal value (Codex review on PR #104).
                    const format = (value: number) =>
                      formatSkillPercentValue(value, locale);
                    const breakdown = isTemplarKey(key)
                      ? templeSkillBreakdown(key, settings)
                      : null;
                    const total = breakdown
                      ? breakdown.total
                      : combinedSkillPercent(key, settings);
                    return (
                      <span key={key}>
                        {index > 0 ? " · " : ""}
                        <span className="sk-name">
                          {game(`skills-short.${key}`)}
                        </span>{" "}
                        <span className="sk-value component-total">
                          {format(total)}%
                          {breakdown && (
                            <span className="sk-breakdown">
                              {" ("}
                              <span className="component-equipment">
                                {format(breakdown.equipment)}%
                              </span>
                              {" + "}
                              <span className="component-points">
                                {format(breakdown.points)}%
                              </span>
                              {" + "}
                              <span className="component-temple">
                                {format(breakdown.temple)}%
                              </span>
                              {")"}
                            </span>
                          )}
                        </span>
                      </span>
                    );
                  })}
                </span>
              ),
            )}
          </small>
        </summary>
        <div className="player-settings-body">
          <div className="settings-grid settings-grid-primary">
            {/* Bloc 69/D: a visible "Ligue" title above the buttons — the
                league picker was the only field in this grid without one
                (Level/VP both already show their label above their own
                control). */}
            <div className="settings-grid-league-field">
              <span className="settings-grid-league-label">{t("league")}</span>
              <LeagueButtons
                label={t("league")}
                value={settings.league}
                onChange={setLeague}
                className="league-buttons-grid"
              />
            </div>
            <label>
              {t("player-level")}
              <NumberStepper
                label={t("player-level")}
                value={settings.level}
                min={1}
                onChange={setLevel}
              />
            </label>
            <label>
              {t("player-vp")}
              <div className="unit-input">
                <NumberStepper
                  label={t("player-vp")}
                  value={settings.vp}
                  min={0}
                  step={0.1}
                  onChange={(value) =>
                    setSettings((current) => ({ ...current, vp: value }))
                  }
                />
                <select
                  aria-label={t("vp-unit")}
                  value={settings.vpUnit}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      vpUnit: Number(
                        event.target.value,
                      ) as PlayerSettings["vpUnit"],
                    }))
                  }
                >
                  <option value={1}>×1</option>
                  <option value={1_000}>k</option>
                  <option value={1_000_000}>M</option>
                  <option value={1_000_000_000}>G</option>
                </select>
              </div>
            </label>
          </div>
          {/* Bloc 108/E: only appears once an admin has configured divisions
            for this league — the studio splits Argent to Diamant from
            07/10/2026, and until an entry exists there is nothing to
            choose. Separate from the league buttons above on purpose: this
            one feeds the ranking tool alone.

            In a row of its own rather than inside .settings-grid-primary
            (Codex review, PR #135): that grid is exactly three columns
            (5fr 2fr 3fr) for League/Level/VP, and its mobile rule keys off
            child order, so a fourth child there would have pushed Level
            into VP's column and wrapped VP onto another row. */}
          {divisions.length ? (
            <label className="settings-grid-division-field">
              {t("division")}
              <select
                aria-label={t("division")}
                value={settings.division}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    division: event.target.value,
                  }))
                }
              >
                <option value="">{t("division-none")}</option>
                {divisions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {leagueRungLabel(entry, game, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <SettingsSection
            title={t("equipment-skills.title")}
            className="settings-section-equipment"
          >
            <div className="settings-grid">
              {skillKeys.map((key) => (
                <label key={key}>
                  {game(`skills.${key}`)} %
                  <NumberStepper
                    label={t("equipment-skills.field", {
                      skill: game(`skills.${key}`),
                    })}
                    value={settings.equipmentSkills[key]}
                    min={0}
                    max={skillCapForLeague(key, settings.league)}
                    step={0.5}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        equipmentSkills: {
                          ...current.equipmentSkills,
                          [key]: value,
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("skill-points.title")}
            className="settings-section-points"
          >
            <div className="points-summary">
              <span>
                {t("skill-points.available")}:{" "}
                <strong className="stat-highlight">{available}</strong>
              </span>
              <span>
                {t("skill-points.allocated")}: <strong>{allocated}</strong>
              </span>
              <span>
                {t("skill-points.remaining")}:{" "}
                <strong>{available - allocated}</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    skillPoints: defaultPlayerSettings().skillPoints,
                  }))
                }
              >
                {t("skill-points.reset")}
              </button>
            </div>
            <div className="settings-grid">
              {skillKeys.map((key) => (
                <label key={key}>
                  <span>
                    {game(`skills.${key}`)}{" "}
                    <output className="stat-highlight">
                      {skillPercent(key, settings.skillPoints, settings.league)}
                      %
                    </output>
                  </span>
                  <NumberStepper
                    label={t("skill-points.field", {
                      skill: game(`skills.${key}`),
                    })}
                    value={settings.skillPoints[key]}
                    min={0}
                    onChange={(value) => setSkillPoints(key, value)}
                  />
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title={t("templars.title")}>
            <div className="settings-grid">
              {templarKeys.map((key) => (
                <label key={key}>
                  {t("templars.field", {
                    templar: game(`templars.${key}`),
                  })}
                  <NumberStepper
                    label={t("templars.field", {
                      templar: game(`templars.${key}`),
                    })}
                    value={settings.templars[key]}
                    min={0}
                    max={20}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        templars: {
                          ...current.templars,
                          [key]: Math.floor(value),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("clan-temple.title")}
            className="settings-section-temple"
          >
            <p className="settings-help">{t("clan-temple.help")}</p>
            <div className="settings-grid">
              {templarKeys.map((key) => {
                return (
                  <label key={key}>
                    <span>
                      {t("clan-temple.field", {
                        templar: game(`templars.${key}`),
                      })}{" "}
                      <output
                        className="component-temple"
                        data-testid={`clan-temple-total-${key}`}
                      >
                        {templePercent(key, settings.clanTemple).toLocaleString(
                          locale,
                          { maximumFractionDigits: 2 },
                        )}
                        %
                      </output>
                    </span>
                    <NumberStepper
                      label={t("clan-temple.field", {
                        templar: game(`templars.${key}`),
                      })}
                      value={settings.clanTemple[key]}
                      min={0}
                      step={templarRates[key]}
                      onChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          clanTemple: { ...current.clanTemple, [key]: value },
                        }))
                      }
                    />
                  </label>
                );
              })}
            </div>
          </SettingsSection>
        </div>
      </details>
    </aside>
  );
}

function SettingsSection({
  title,
  className,
  children,
}: Readonly<{
  title: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <details
      className={
        className ? `settings-section ${className}` : "settings-section"
      }
    >
      <summary>{title}</summary>
      <div className="settings-section-body">{children}</div>
    </details>
  );
}
