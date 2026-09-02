"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { NumberStepper } from "./number-stepper";
import { LeagueButtons } from "./league-select";
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
    const parsed = JSON.parse(raw) as Partial<PlayerSettings> & {
      v?: number;
    };
    if (!("equipmentSkills" in parsed)) return fallback;
    const clanTemple = { ...fallback.clanTemple, ...parsed.clanTemple };
    if ((parsed.v ?? 1) < currentSettingsVersion && parsed.clanTemple) {
      for (const key of templarKeys) {
        clanTemple[key] = Math.max(0, clanTemple[key] - templeBase[key]);
      }
    }
    return {
      ...fallback,
      ...parsed,
      equipmentSkills: {
        ...fallback.equipmentSkills,
        ...parsed.equipmentSkills,
      },
      skillPoints: { ...fallback.skillPoints, ...parsed.skillPoints },
      templars: { ...fallback.templars, ...parsed.templars },
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

export function PlayerSettingsPanel() {
  const locale = useLocale();
  const t = useTranslations("player-settings");
  const game = useTranslations("game");
  const [settings, setSettings] = useState(defaultPlayerSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem(playerStorageKey);
      if (saved) setSettings(safePlayerSettings(saved));
      setLoaded(true);
    });
  }, []);

  // Picks up a write from another source (e.g. the Stuff simulator's
  // transfer button) while this panel is already mounted. Guarded by a
  // content comparison, not just re-parsing on every event: this panel's
  // own persistence effect below also dispatches this same event on every
  // local edit, and replacing state with a new-but-identical object on
  // every keystroke would re-trigger that effect indefinitely.
  useEffect(() => {
    function syncFromStorage() {
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
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(
        playerStorageKey,
        JSON.stringify({ ...settings, v: currentSettingsVersion }),
      );
      window.dispatchEvent(
        new CustomEvent(playerSettingsChangedEvent, { detail: settings }),
      );
    }
  }, [loaded, settings]);

  const available = availableSkillPoints(settings.level, settings.league);
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
                    const format = (value: number) =>
                      value.toLocaleString(locale, {
                        maximumFractionDigits: 2,
                      });
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
            <LeagueButtons
              label={t("league")}
              value={settings.league}
              onChange={setLeague}
            />
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
