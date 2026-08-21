"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  calculateProduction,
  cityStatsAt,
  cityUpgradeCost,
  formatGameNumber,
  maximumReachableLevel,
} from "../lib/city-calculators";
import { type PlayerSettings } from "../lib/player-settings";
import {
  defaultCityParameters,
  type CityParameters,
} from "../lib/city-parameters";
import { NumberStepper } from "./number-stepper";
import { usePlayerSettings } from "./use-player-settings";

type Calculator = "cost" | "max-level" | "production";

const number = (value: number) => formatGameNumber(value);

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
  testId,
}: {
  label: string;
  start: number;
  target: number;
  testId?: string;
}) {
  return (
    <Stat
      label={label}
      value={`${number(start)} → ${number(target)}`}
      testId={testId}
    />
  );
}

function CostCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-cost");
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(2);
  const start = cityStatsAt(startLevel, settings.league, parameters);
  const target = cityStatsAt(targetLevel, settings.league, parameters);
  const cost = cityUpgradeCost(startLevel, targetLevel, parameters);
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
            label={t("fields.city-count")}
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label={t("fields.start-level")}
            value={startLevel}
            max={200}
            onChange={(v) => setStartLevel(Math.floor(v))}
          />
          <Field
            label={t("fields.target-level")}
            value={targetLevel}
            max={200}
            onChange={(v) => setTargetLevel(Math.floor(v))}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>{t("single-city")}</h3>
        <div className="city-comparison">
          <div>
            <b>{t("start")}</b>
            <Stat label={t("wall")} value={number(start.wall)} />
            <Stat label={t("vp")} value={number(start.vp)} />
            <Stat
              label={t("gold-hour")}
              value={number(start.gold * goldBonus)}
            />
            <Stat
              label={t("army-hour")}
              value={number(start.army * armyBonus)}
            />
          </div>
          <span aria-hidden="true">→</span>
          <div>
            <b>{t("target")}</b>
            <Stat label={t("wall")} value={number(target.wall)} />
            <Stat label={t("vp")} value={number(target.vp)} />
            <Stat
              label={t("gold-hour")}
              value={number(target.gold * goldBonus)}
            />
            <Stat
              label={t("army-hour")}
              value={number(target.army * armyBonus)}
            />
          </div>
        </div>
        <Stat
          label={t("cost-one")}
          value={`${number(cost)} ${t("gold-unit")}`}
          testId="city-cost-one"
        />
      </section>
      <section className="calculator-card">
        <h3>{t("total-cities", { count: cityCount })}</h3>
        <div className="calculator-results">
          <Stat label={t("cost-total")} value={number(cost * cityCount)} />
          <Stat
            label={t("vp-gained")}
            value={number(Math.max(0, target.vp - start.vp) * cityCount)}
          />
          <ProductionTransition
            label={t("gold-transition")}
            start={start.gold * goldBonus * cityCount}
            target={target.gold * goldBonus * cityCount}
            testId="city-cost-gold"
          />
          <ProductionTransition
            label={t("army-transition")}
            start={start.army * armyBonus * cityCount}
            target={target.army * armyBonus * cityCount}
            testId="city-cost-army"
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

function MaxLevelCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-max-level");
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [budget, setBudget] = useState(0);
  const [unit, setUnit] = useState(1_000);
  const result = maximumReachableLevel(
    startLevel,
    cityCount,
    budget * unit,
    parameters,
  );
  const start = cityStatsAt(startLevel, settings.league, parameters);
  const target = cityStatsAt(result.level, settings.league, parameters);
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
            label={t("fields.city-count")}
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label={t("fields.start-level")}
            value={startLevel}
            max={200}
            onChange={(v) => setStartLevel(Math.floor(v))}
          />
          <label className="calculator-field">
            {t("fields.available-gold")}
            <div className="unit-input">
              <NumberStepper
                label={t("fields.available-gold")}
                value={budget}
                min={0}
                step={0.1}
                onChange={setBudget}
              />
              <select
                aria-label={t("fields.gold-unit")}
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
          label={t("reachable-level")}
          value={String(result.level)}
          testId="max-level-result"
        />
        <Stat label={t("remaining-gold")} value={number(result.remaining)} />
        <Stat
          label={t("vp-gained")}
          value={number((target.vp - start.vp) * cityCount)}
        />
        <ProductionTransition
          label={t("gold-transition")}
          start={start.gold * cityCount * goldBonus}
          target={target.gold * cityCount * goldBonus}
          testId="city-max-level-gold"
        />
        <ProductionTransition
          label={t("army-transition")}
          start={start.army * cityCount * armyBonus}
          target={target.army * cityCount * armyBonus}
          testId="city-max-level-army"
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
  const t = useTranslations("city-production");
  return (
    <div className="production-block">
      <h3>
        {title}
        <strong>{number(values.total)}/h</strong>
      </h3>
      <div className="production-breakdown">
        <Stat label={t("base")} value={`${number(values.base)}/h`} />
        <Stat label={t("equipment")} value={`${number(values.stuff)}/h`} />
        <Stat label={t("temple")} value={`${number(values.temple)}/h`} />
      </div>
    </div>
  );
}

function ProductionCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-production");
  const [cityCount, setCityCount] = useState(1);
  const [cityLevel, setCityLevel] = useState(1);
  const [goldHours, setGoldHours] = useState(0);
  const [troopsHours, setTroopsHours] = useState(0);
  const result = useMemo(
    () =>
      calculateProduction(
        {
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
        },
        parameters,
      ),
    [cityCount, cityLevel, goldHours, parameters, settings, troopsHours],
  );

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <Field
            label={t("fields.city-count")}
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label={t("fields.average-level")}
            value={cityLevel}
            max={200}
            onChange={(v) => setCityLevel(Math.floor(v))}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>{t("per-city-base")}</h3>
        <div className="calculator-results">
          <Stat label={t("vp")} value={number(result.perCity.vp)} />
          <Stat label={t("wall")} value={number(result.perCity.wall)} />
          <Stat
            label={t("gold-hour")}
            value={`${number(result.perCity.gold)}/h`}
            testId="city-production-gold"
          />
          <Stat
            label={t("army-hour")}
            value={`${number(result.perCity.army)}/h`}
            testId="city-production-army"
          />
        </div>
      </section>
      <section className="calculator-card">
        <Breakdown title={t("gold-total")} values={result.gold} />
        <Breakdown title={t("troops-total")} values={result.troops} />
        <Stat label={t("vp-total")} value={number(result.vpTotal)} />
      </section>
      <section className="calculator-card">
        <h3>{t("full-production.title")}</h3>
        <p className="calculator-note">
          {t("full-production.note", { points: result.fullProduction.points })}
        </p>
        <div className="calculator-results">
          <Stat
            label={t("full-production.gold")}
            value={`${number(result.fullProduction.gold)}/h`}
            testId="full-production-gold"
          />
          <Stat
            label={t("full-production.troops")}
            value={`${number(result.fullProduction.troops)}/h`}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>{t("rewards.title")}</h3>
        <div className="calculator-fields">
          <Field
            label={t("rewards.gold-hours")}
            value={goldHours}
            min={0}
            step={0.5}
            onChange={setGoldHours}
          />
          <Field
            label={t("rewards.troops-hours")}
            value={troopsHours}
            min={0}
            step={0.5}
            onChange={setTroopsHours}
          />
        </div>
        <div className="calculator-results">
          <Stat
            label={t("rewards.gold-bonus")}
            value={number(result.rewards.gold)}
          />
          <Stat
            label={t("rewards.troops-bonus")}
            value={number(result.rewards.troops)}
          />
        </div>
      </section>
    </div>
  );
}

export function CityCalculators({
  availability = { cost: true, "max-level": true, production: true },
  parameters = defaultCityParameters,
}: {
  availability?: Record<Calculator, boolean>;
  parameters?: CityParameters;
}) {
  const tools = useTranslations("tools");
  const cost = useTranslations("city-cost");
  const maxLevel = useTranslations("city-max-level");
  const production = useTranslations("city-production");
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
        aria-label={tools("city-tabs")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "cost"}
          disabled={!availability.cost}
          title={
            !availability.cost ? tools("calculator-unavailable") : undefined
          }
          onClick={() => setActive("cost")}
        >
          {cost("name")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "max-level"}
          disabled={!availability["max-level"]}
          title={
            !availability["max-level"]
              ? tools("calculator-unavailable")
              : undefined
          }
          onClick={() => setActive("max-level")}
        >
          {maxLevel("name")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "production"}
          disabled={!availability.production}
          title={
            !availability.production
              ? tools("calculator-unavailable")
              : undefined
          }
          onClick={() => setActive("production")}
        >
          {production("name")}
        </button>
      </nav>
      {active === "cost" && (
        <CostCalculator settings={settings} parameters={parameters} />
      )}
      {active === "max-level" && (
        <MaxLevelCalculator settings={settings} parameters={parameters} />
      )}
      {active === "production" && (
        <ProductionCalculator settings={settings} parameters={parameters} />
      )}
      {!active && (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
