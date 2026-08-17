"use client";

import { useEffect, useMemo, useState } from "react";
import { NumberStepper } from "./number-stepper";
import {
  allocateSkillPoints,
  allocatedSkillPoints,
  availableSkillPoints,
  clanTempleMinimums,
  defaultPlayerSettings,
  fitSkillPointsToBudget,
  leagues,
  skillKeys,
  skillPercent,
  templarKeys,
  type League,
  type PlayerSettings,
  type SkillKey,
  type TemplarKey,
} from "../lib/player-settings";

export const playerStorageKey = "mlhelper_player_params";
export const playerSettingsChangedEvent = "mlhelper:player-settings-changed";

const skillLabels: Record<SkillKey, string> = {
  striker: "Attaque",
  brave: "Bravoure",
  scavenger: "Charognard",
  guardian: "Défense",
  fearless: "Intrépide",
  prosperous: "Prospérité",
  recruiter: "Recruteur",
  cautious: "Récupération",
  salvager: "Recycleur",
  rusher: "Vitesse",
};

const templarLabels: Record<TemplarKey, string> = {
  striker: "Attaque",
  guardian: "Défense",
  prosperous: "Or",
  recruiter: "Recruteur",
  rusher: "Vitesse",
};

const leagueLabels: Record<League, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
  legend: "Légende",
};

export function safePlayerSettings(raw: string): PlayerSettings {
  const fallback = defaultPlayerSettings();
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    if (!("equipmentSkills" in parsed)) return fallback;
    return {
      ...fallback,
      ...parsed,
      equipmentSkills: {
        ...fallback.equipmentSkills,
        ...parsed.equipmentSkills,
      },
      skillPoints: { ...fallback.skillPoints, ...parsed.skillPoints },
      templars: { ...fallback.templars, ...parsed.templars },
      clanTemple: { ...fallback.clanTemple, ...parsed.clanTemple },
    };
  } catch {
    return fallback;
  }
}

export function PlayerSettingsPanel() {
  const [settings, setSettings] = useState(defaultPlayerSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem(playerStorageKey);
      if (saved) setSettings(safePlayerSettings(saved));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(playerStorageKey, JSON.stringify(settings));
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
      `${leagueLabels[settings.league]} · Niveau ${settings.level} · ${Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 }).format(vp)} VP · ${templarTotal} templier${templarTotal > 1 ? "s" : ""}`,
    [settings.league, settings.level, templarTotal, vp],
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

  const setLeague = (league: League) =>
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
          <span id="player-settings-title">Paramètres du joueur</span>
          <small>{summary}</small>
        </summary>
        <div className="player-settings-body">
          <div className="settings-grid settings-grid-primary">
            <label>
              Ligue
              <select
                value={settings.league}
                onChange={(event) => setLeague(event.target.value as League)}
              >
                {leagues.map((league) => (
                  <option key={league} value={league}>
                    {leagueLabels[league]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Niveau du joueur
              <NumberStepper
                label="Niveau du joueur"
                value={settings.level}
                min={1}
                onChange={setLevel}
              />
            </label>
            <label>
              VP du joueur
              <div className="unit-input">
                <NumberStepper
                  label="VP du joueur"
                  value={settings.vp}
                  min={0}
                  step={0.1}
                  onChange={(value) =>
                    setSettings((current) => ({ ...current, vp: value }))
                  }
                />
                <select
                  aria-label="Unité des VP"
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

          <SettingsSection title="Compétences avec équipement">
            <p className="settings-help">
              Valeurs réellement utilisées par les futurs simulateurs. Elles
              restent indépendantes de la distribution des points.
            </p>
            <div className="settings-grid">
              {skillKeys.map((key) => (
                <label key={key}>
                  {skillLabels[key]} %
                  <NumberStepper
                    label={`${skillLabels[key]} avec équipement`}
                    value={settings.equipmentSkills[key]}
                    min={0}
                    max={key === "brave" || key === "fearless" ? 90 : undefined}
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

          <SettingsSection title="Distribution des points">
            <p className="settings-help">
              Outil de planification uniquement : il ne modifie jamais les
              compétences avec équipement.
            </p>
            <div className="points-summary">
              <span>
                Disponibles : <strong>{available}</strong>
              </span>
              <span>
                Alloués : <strong>{allocated}</strong>
              </span>
              <span>
                Restants : <strong>{available - allocated}</strong>
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
                Réinitialiser
              </button>
            </div>
            <div className="settings-grid">
              {skillKeys.map((key) => (
                <label key={key}>
                  <span>
                    {skillLabels[key]}{" "}
                    <output>
                      {skillPercent(key, settings.skillPoints, settings.league)}
                      %
                    </output>
                  </span>
                  <NumberStepper
                    label={`Points ${skillLabels[key]}`}
                    value={settings.skillPoints[key]}
                    min={0}
                    onChange={(value) => setSkillPoints(key, value)}
                  />
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title="Templiers personnels">
            <div className="settings-grid">
              {templarKeys.map((key) => (
                <label key={key}>
                  Templiers {templarLabels[key]}
                  <NumberStepper
                    label={`Templiers ${templarLabels[key]}`}
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

          <SettingsSection title="Bonus de Temple du Clan">
            <p className="settings-help">
              Bonus total actif du clan, saisi directement. Le stepper utilise
              un pas uniforme et ne dérive pas du taux des Templiers personnels.
            </p>
            <div className="settings-grid">
              {templarKeys.map((key) => (
                <label key={key}>
                  Temple {templarLabels[key]} %
                  <NumberStepper
                    label={`Temple ${templarLabels[key]}`}
                    value={settings.clanTemple[key]}
                    min={clanTempleMinimums[key]}
                    step={1}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current,
                        clanTemple: { ...current.clanTemple, [key]: value },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </SettingsSection>
        </div>
      </details>
    </aside>
  );
}

function SettingsSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <details className="settings-section">
      <summary>{title}</summary>
      <div className="settings-section-body">{children}</div>
    </details>
  );
}
