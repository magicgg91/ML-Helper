"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  calculateProduction,
  cityStatsAt,
  cityUpgradeCost,
  formatGameNumber,
  maximumReachableLevel,
} from "../lib/city-calculators";
import {
  defaultPlayerSettings,
  type PlayerSettings,
} from "../lib/player-settings";
import {
  playerSettingsChangedEvent,
  playerStorageKey,
  safePlayerSettings,
} from "./player-settings-panel";
import { NumberStepper } from "./number-stepper";

type Calculator = "cost" | "max-level" | "production";

const number = (value: number) => formatGameNumber(value);

function usePlayerSettings(): PlayerSettings {
  const raw = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(playerSettingsChangedEvent, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(playerSettingsChangedEvent, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => window.localStorage.getItem(playerStorageKey) ?? "",
    () => "",
  );
  return useMemo(
    () => (raw ? safePlayerSettings(raw) : defaultPlayerSettings()),
    [raw],
  );
}

function Field({
  label,
  value,
  onChange,
  min = 1,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="calculator-field">
      {label}
      <NumberStepper
        label={label}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="calculator-stat total-box">
      <span className="label">{label}</span>
      <strong className="value" data-testid={testId}>
        {value}
      </strong>
    </div>
  );
}

function ProductionTransition({
  label,
  start,
  target,
}: {
  label: string;
  start: number;
  target: number;
}) {
  return <Stat label={label} value={`${number(start)} → ${number(target)}`} />;
}

function CostCalculator({ settings }: { settings: PlayerSettings }) {
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(2);
  const start = cityStatsAt(startLevel);
  const target = cityStatsAt(targetLevel);
  const cost = cityUpgradeCost(startLevel, targetLevel);
  const goldBonus =
    1 +
    (settings.equipmentSkills.prosperous + settings.clanTemple.prosperous) /
      100;
  const armyBonus =
    1 +
    (settings.equipmentSkills.recruiter + settings.clanTemple.recruiter) / 100;

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <Field
            label="Nombre de villes"
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label="Niveau de départ"
            value={startLevel}
            max={200}
            onChange={(v) => setStartLevel(Math.floor(v))}
          />
          <Field
            label="Niveau cible"
            value={targetLevel}
            max={200}
            onChange={(v) => setTargetLevel(Math.floor(v))}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>Pour 1 ville</h3>
        <div className="city-comparison">
          <div>
            <b>Départ</b>
            <Stat label="Mur" value={number(start.wall)} />
            <Stat label="VP" value={number(start.vp)} />
            <Stat label="Or/h" value={number(start.gold * goldBonus)} />
            <Stat label="Armée/h" value={number(start.army * armyBonus)} />
          </div>
          <span aria-hidden="true">→</span>
          <div>
            <b>Cible</b>
            <Stat label="Mur" value={number(target.wall)} />
            <Stat label="VP" value={number(target.vp)} />
            <Stat label="Or/h" value={number(target.gold * goldBonus)} />
            <Stat label="Armée/h" value={number(target.army * armyBonus)} />
          </div>
        </div>
        <Stat
          label="Coût pour cette ville"
          value={`${number(cost)} or`}
          testId="city-cost-one"
        />
      </section>
      <section className="calculator-card">
        <h3>
          Total pour {cityCount} ville{cityCount > 1 ? "s" : ""}
        </h3>
        <div className="calculator-results">
          <Stat label="Coût total" value={number(cost * cityCount)} />
          <Stat
            label="VP total gagné"
            value={number(Math.max(0, target.vp - start.vp) * cityCount)}
          />
          <ProductionTransition
            label="Or/h avant → après"
            start={start.gold * goldBonus * cityCount}
            target={target.gold * goldBonus * cityCount}
          />
          <ProductionTransition
            label="Armée/h avant → après"
            start={start.army * armyBonus * cityCount}
            target={target.army * armyBonus * cityCount}
          />
        </div>
      </section>
    </div>
  );
}

const budgetUnits = [
  ["×1", 1],
  ["k", 1_000],
  ["M", 1_000_000],
  ["G", 1_000_000_000],
  ["T", 1_000_000_000_000],
] as const;

function MaxLevelCalculator({ settings }: { settings: PlayerSettings }) {
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [budget, setBudget] = useState(0);
  const [unit, setUnit] = useState(1_000);
  const result = maximumReachableLevel(startLevel, cityCount, budget * unit);
  const start = cityStatsAt(startLevel);
  const target = cityStatsAt(result.level);
  const goldBonus =
    1 +
    (settings.equipmentSkills.prosperous + settings.clanTemple.prosperous) /
      100;
  const armyBonus =
    1 +
    (settings.equipmentSkills.recruiter + settings.clanTemple.recruiter) / 100;

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <Field
            label="Nombre de villes"
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label="Niveau de départ"
            value={startLevel}
            max={200}
            onChange={(v) => setStartLevel(Math.floor(v))}
          />
          <label className="calculator-field">
            Or disponible
            <div className="unit-input">
              <NumberStepper
                label="Or disponible"
                value={budget}
                min={0}
                step={0.1}
                onChange={setBudget}
              />
              <select
                aria-label="Unité de l’or disponible"
                value={unit}
                onChange={(event) => setUnit(Number(event.target.value))}
              >
                {budgetUnits.map(([label, value]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </section>
      <section className="calculator-card calculator-results">
        <Stat
          label="Niveau cible atteignable"
          value={String(result.level)}
          testId="max-level-result"
        />
        <Stat label="Or restant" value={number(result.remaining)} />
        <Stat
          label="VP total gagné"
          value={number((target.vp - start.vp) * cityCount)}
        />
        <ProductionTransition
          label="Or/h avant → après"
          start={start.gold * cityCount * goldBonus}
          target={target.gold * cityCount * goldBonus}
        />
        <ProductionTransition
          label="Armée/h avant → après"
          start={start.army * cityCount * armyBonus}
          target={target.army * cityCount * armyBonus}
        />
      </section>
    </div>
  );
}

function Breakdown({
  title,
  values,
}: {
  title: string;
  values: { total: number; base: number; stuff: number; temple: number };
}) {
  return (
    <div className="production-block">
      <h3>
        {title}
        <strong>{number(values.total)}/h</strong>
      </h3>
      <div className="production-breakdown">
        <Stat label="Base" value={`${number(values.base)}/h`} />
        <Stat label="Stuff" value={`${number(values.stuff)}/h`} />
        <Stat label="Temple" value={`${number(values.temple)}/h`} />
      </div>
    </div>
  );
}

function ProductionCalculator({ settings }: { settings: PlayerSettings }) {
  const [cityCount, setCityCount] = useState(1);
  const [cityLevel, setCityLevel] = useState(1);
  const [goldHours, setGoldHours] = useState(0);
  const [troopsHours, setTroopsHours] = useState(0);
  const result = useMemo(
    () =>
      calculateProduction({
        cityCount,
        cityLevel,
        playerLevel: settings.level,
        league: settings.league,
        prosperousEquipment: settings.equipmentSkills.prosperous,
        recruiterEquipment: settings.equipmentSkills.recruiter,
        prosperousTemple: settings.clanTemple.prosperous,
        recruiterTemple: settings.clanTemple.recruiter,
        goldRewardHours: goldHours,
        troopsRewardHours: troopsHours,
      }),
    [cityCount, cityLevel, goldHours, settings, troopsHours],
  );

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <Field
            label="Nombre de villes"
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label="Niveau moyen des villes"
            value={cityLevel}
            max={200}
            onChange={(v) => setCityLevel(Math.floor(v))}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>Par ville — base</h3>
        <div className="calculator-results">
          <Stat label="VP" value={number(result.perCity.vp)} />
          <Stat label="Mur" value={number(result.perCity.wall)} />
          <Stat label="Or/h" value={`${number(result.perCity.gold)}/h`} />
          <Stat label="Armée/h" value={`${number(result.perCity.army)}/h`} />
        </div>
      </section>
      <section className="calculator-card">
        <Breakdown title="💰 Or — Production totale" values={result.gold} />
        <Breakdown
          title="⚔️ Troupes — Production totale"
          values={result.troops}
        />
        <Stat label="VP total" value={number(result.vpTotal)} />
      </section>
      <section className="calculator-card">
        <h3>Si reskill full-prod</h3>
        <p className="calculator-note">
          Simulation avec les {result.fullProduction.points} points disponibles
          investis intégralement, calculée sur la production de base.
        </p>
        <div className="calculator-results">
          <Stat
            label="Or si full Prospérité"
            value={`${number(result.fullProduction.gold)}/h`}
            testId="full-production-gold"
          />
          <Stat
            label="Troupes si full Recruteur"
            value={`${number(result.fullProduction.troops)}/h`}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>Récompenses</h3>
        <div className="calculator-fields">
          <Field
            label="Heures Or reçues"
            value={goldHours}
            min={0}
            step={0.5}
            onChange={setGoldHours}
          />
          <Field
            label="Heures Troupes reçues"
            value={troopsHours}
            min={0}
            step={0.5}
            onChange={setTroopsHours}
          />
        </div>
        <div className="calculator-results">
          <Stat label="Bonus Or obtenu" value={number(result.rewards.gold)} />
          <Stat
            label="Bonus Troupes obtenu"
            value={number(result.rewards.troops)}
          />
        </div>
      </section>
    </div>
  );
}

export function CityCalculators({
  availability = { cost: true, "max-level": true, production: true },
}: {
  availability?: Record<Calculator, boolean>;
}) {
  const firstAvailable = (
    ["cost", "max-level", "production"] as Calculator[]
  ).find((key) => availability[key]);
  const [active, setActive] = useState<Calculator | undefined>(firstAvailable);
  const settings = usePlayerSettings();
  return (
    <div className="city-calculators">
      <nav
        className="calculator-tabs tabs"
        role="tablist"
        aria-label="Calculateurs Villes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "cost"}
          disabled={!availability.cost}
          title={
            !availability.cost
              ? "Désactivé — inaccessible actuellement"
              : undefined
          }
          onClick={() => setActive("cost")}
        >
          Coût de Ville
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "max-level"}
          disabled={!availability["max-level"]}
          title={
            !availability["max-level"]
              ? "Désactivé — inaccessible actuellement"
              : undefined
          }
          onClick={() => setActive("max-level")}
        >
          Niveau Max Atteignable
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "production"}
          disabled={!availability.production}
          title={
            !availability.production
              ? "Désactivé — inaccessible actuellement"
              : undefined
          }
          onClick={() => setActive("production")}
        >
          Production
        </button>
      </nav>
      {active === "cost" && <CostCalculator settings={settings} />}
      {active === "max-level" && <MaxLevelCalculator settings={settings} />}
      {active === "production" && <ProductionCalculator settings={settings} />}
      {!active && (
        <p className="empty-state">
          Ces calculateurs sont temporairement indisponibles.
        </p>
      )}
    </div>
  );
}
