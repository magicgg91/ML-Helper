"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  bonusBreakdown,
  calculateProduction,
  calculateReward,
  cityStatsAt,
  cityUpgradeCost,
  formatGameNumber,
  maximumReachableLevel,
} from "../lib/city-calculators";
import { templePercent, type PlayerSettings } from "../lib/player-settings";
import {
  defaultCityParameters,
  type CityParameters,
} from "../lib/city-parameters";
import { NumberStepper } from "./number-stepper";
import { LeagueButtons } from "./league-select";
import { TabLabel } from "./tab-label";
import { usePlayerSettings } from "./use-player-settings";
import { useSyncedLeague } from "./use-synced-league";

type Calculator = "cost" | "max-level" | "production" | "rewards";
type AmountUnit = 1 | 1_000 | 1_000_000 | 1_000_000_000 | 1_000_000_000_000;

const number = (value: number) => formatGameNumber(value);

function LeagueRequired() {
  const common = useTranslations("common");
  return (
    <p className="empty-state" role="status">
      {common("select-league")}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  onCommit,
  min = 1,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
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
        onCommit={onCommit}
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
  tone,
}: {
  label: string;
  value: string;
  testId?: string;
  tone?: "emerald";
}) {
  return (
    <div className="calculator-stat total-box">
      <span className="label">{label}</span>
      <strong className={tone ? `value ${tone}` : "value"} data-testid={testId}>
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
  const [league, setLeague] = useSyncedLeague();
  const start = cityStatsAt(startLevel, league || "bronze", parameters);
  const target = cityStatsAt(targetLevel, league || "bronze", parameters);
  const cost = cityUpgradeCost(startLevel, targetLevel, parameters);
  const prosperousTemple = templePercent("prosperous", settings.clanTemple);
  const recruiterTemple = templePercent("recruiter", settings.clanTemple);
  const goldBonus =
    1 + (settings.equipmentSkills.prosperous + prosperousTemple) / 100;
  const armyBonus =
    1 + (settings.equipmentSkills.recruiter + recruiterTemple) / 100;

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields-inline">
          <div className="calculator-field calculator-league-field">
            {t("fields.league")}
            <LeagueButtons
              label={t("fields.league")}
              value={league}
              onChange={setLeague}
              className="league-buttons-grid"
            />
          </div>
          <Field
            label={t("fields.city-count")}
            value={cityCount}
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label={t("fields.start-level")}
            value={startLevel}
            max={199}
            onChange={(v) => setStartLevel(Math.floor(v))}
            // Bloc 34/C: the target-level push-up only happens once the
            // user commits (blur/±buttons), not on every keystroke — doing
            // it live made target visibly jump around while start was still
            // being typed.
            onCommit={(v) => {
              const nextStart = Math.floor(v);
              setStartLevel(nextStart);
              setTargetLevel((current) =>
                current <= nextStart ? nextStart + 1 : current,
              );
            }}
          />
          <Field
            label={t("fields.target-level")}
            value={targetLevel}
            min={2}
            max={200}
            onChange={(v) => setTargetLevel(Math.floor(v))}
            // Bloc 34/C: the "must be > start" floor only applies at
            // commit time — validating on every keystroke made it
            // impossible to type a multi-digit value starting with a digit
            // at or below start's level (e.g. "100" over start level 1).
            onCommit={(v) => {
              const nextTarget = Math.floor(v);
              setTargetLevel(
                nextTarget <= startLevel ? startLevel + 1 : nextTarget,
              );
            }}
          />
        </div>
      </section>
      {!league ? (
        <LeagueRequired />
      ) : (
        // Bloc 33/C: a single "Total" block replaces the previous "Pour 1
        // ville" + aggregate pair — the aggregate one was missing Remparts
        // entirely. Coût/VP/Production are multiplied by cityCount;
        // Remparts (a level, not a quantity) never is; the Base/Équipement/
        // Temple breakdown stays, since it's per-city information the
        // aggregate transition figures below don't otherwise carry.
        <section className="calculator-card">
          <h3>{t("total-cities", { count: cityCount })}</h3>
          <div className="calculator-results">
            <Stat
              label={t("cost-total")}
              value={`${number(cost * cityCount)} ${t("gold-unit")}`}
              testId="city-cost-total"
            />
            <ProductionTransition
              label={t("wall")}
              start={start.wall}
              target={target.wall}
              testId="city-cost-wall"
            />
            <Stat
              label={t("vp-gained")}
              value={number(Math.max(0, target.vp - start.vp) * cityCount)}
              testId="city-cost-vp"
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
          <div className="city-comparison">
            <div>
              <b>{t("start")}</b>
              <Breakdown
                title={t("gold-hour")}
                testId="city-cost-single-gold-start"
                values={bonusBreakdown(
                  start.gold,
                  settings.equipmentSkills.prosperous,
                  prosperousTemple,
                )}
              />
              <Breakdown
                title={t("army-hour")}
                testId="city-cost-single-army-start"
                values={bonusBreakdown(
                  start.army,
                  settings.equipmentSkills.recruiter,
                  recruiterTemple,
                )}
              />
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <b>{t("target")}</b>
              <Breakdown
                title={t("gold-hour")}
                testId="city-cost-single-gold-target"
                values={bonusBreakdown(
                  target.gold,
                  settings.equipmentSkills.prosperous,
                  prosperousTemple,
                )}
              />
              <Breakdown
                title={t("army-hour")}
                testId="city-cost-single-army-target"
                values={bonusBreakdown(
                  target.army,
                  settings.equipmentSkills.recruiter,
                  recruiterTemple,
                )}
              />
            </div>
          </div>
        </section>
      )}
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
  const [league, setLeague] = useSyncedLeague();
  const result = maximumReachableLevel(
    startLevel,
    cityCount,
    budget * unit,
    parameters,
  );
  const start = cityStatsAt(startLevel, league || "bronze", parameters);
  const target = cityStatsAt(result.level, league || "bronze", parameters);
  const prosperousTemple = templePercent("prosperous", settings.clanTemple);
  const recruiterTemple = templePercent("recruiter", settings.clanTemple);
  const goldBonus =
    1 + (settings.equipmentSkills.prosperous + prosperousTemple) / 100;
  const armyBonus =
    1 + (settings.equipmentSkills.recruiter + recruiterTemple) / 100;

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields-inline">
          <div className="calculator-field calculator-league-field">
            {t("fields.league")}
            <LeagueButtons
              label={t("fields.league")}
              value={league}
              onChange={setLeague}
              className="league-buttons-grid"
            />
          </div>
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
      {!league ? (
        <LeagueRequired />
      ) : (
        // Bloc 33/L: same treatment as Coût de Ville (Bloc 33/C) — one
        // "Total" block instead of 2. Remparts (the reached level's wall)
        // isn't multiplied; the Base/Équipement/Temple breakdown at that
        // level stays, since the aggregate transition figures below don't
        // carry that detail.
        <section className="calculator-card">
          <h3>{t("total-cities", { count: cityCount })}</h3>
          <div className="calculator-results">
            <Stat
              label={t("reachable-level")}
              value={String(result.level)}
              testId="max-level-result"
            />
            <Stat
              label={t("remaining-gold")}
              value={number(result.remaining)}
            />
            <Stat
              label={t("wall")}
              value={number(target.wall)}
              testId="city-max-level-wall"
            />
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
          </div>
          <Breakdown
            title={t("gold-hour")}
            testId="city-max-level-single-gold"
            values={bonusBreakdown(
              target.gold,
              settings.equipmentSkills.prosperous,
              prosperousTemple,
            )}
          />
          <Breakdown
            title={t("army-hour")}
            testId="city-max-level-single-army"
            values={bonusBreakdown(
              target.army,
              settings.equipmentSkills.recruiter,
              recruiterTemple,
            )}
          />
        </section>
      )}
    </div>
  );
}

function Breakdown({
  title,
  values,
  testId,
}: {
  title: string;
  values: { total: number; base: number; stuff: number; temple: number };
  testId?: string;
}) {
  const t = useTranslations("city-production");
  return (
    <div className="production-block" data-testid={testId}>
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
  const [league, setLeague] = useSyncedLeague();
  const result = useMemo(
    () =>
      calculateProduction(
        {
          cityCount,
          cityLevel,
          playerLevel: settings.level,
          league: league || "bronze",
          prosperousEquipment: settings.equipmentSkills.prosperous,
          recruiterEquipment: settings.equipmentSkills.recruiter,
          prosperousTemple: templePercent("prosperous", settings.clanTemple),
          recruiterTemple: templePercent("recruiter", settings.clanTemple),
        },
        parameters,
      ),
    [cityCount, cityLevel, league, parameters, settings],
  );

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields-inline">
          <div className="calculator-field calculator-league-field">
            {t("fields.league")}
            <LeagueButtons
              label={t("fields.league")}
              value={league}
              onChange={setLeague}
              className="league-buttons-grid"
            />
          </div>
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
      {!league ? (
        <LeagueRequired />
      ) : (
        <>
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
              {t("full-production.note", {
                points: result.fullProduction.points,
              })}
            </p>
            <div className="calculator-results">
              <Stat
                label={t("full-production.gold")}
                value={`${number(result.fullProduction.gold)}/h`}
                testId="full-production-gold"
                tone="emerald"
              />
              <Stat
                label={t("full-production.troops")}
                value={`${number(result.fullProduction.troops)}/h`}
                tone="emerald"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AmountUnitField({
  label,
  unitLabel,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
}: {
  label: string;
  unitLabel: string;
  amount: number;
  unit: AmountUnit;
  onAmountChange: (value: number) => void;
  onUnitChange: (value: AmountUnit) => void;
}) {
  return (
    <label className="calculator-field">
      {label}
      <div className="unit-input">
        <NumberStepper
          label={label}
          value={amount}
          min={0}
          step={0.1}
          onChange={onAmountChange}
        />
        <select
          aria-label={unitLabel}
          value={unit}
          onChange={(event) =>
            onUnitChange(Number(event.target.value) as AmountUnit)
          }
        >
          <option value={1}>×1</option>
          <option value={1_000}>k</option>
          <option value={1_000_000}>M</option>
          <option value={1_000_000_000}>G</option>
          <option value={1_000_000_000_000}>T</option>
        </select>
      </div>
    </label>
  );
}

function ResourceRewardBlock({
  title,
  baseLabel,
  baseUnitLabel,
  hoursLabel,
  bonusLabel,
}: {
  title: string;
  baseLabel: string;
  baseUnitLabel: string;
  hoursLabel: string;
  bonusLabel: string;
}) {
  const [amount, setAmount] = useState(0);
  const [unit, setUnit] = useState<AmountUnit>(1);
  const [hours, setHours] = useState(0);
  const base = amount * unit;
  const bonus = calculateReward(base, hours);

  return (
    <section className="calculator-card">
      <h3>{title}</h3>
      <div className="calculator-fields">
        <AmountUnitField
          label={baseLabel}
          unitLabel={baseUnitLabel}
          amount={amount}
          unit={unit}
          onAmountChange={setAmount}
          onUnitChange={setUnit}
        />
        <Field
          label={hoursLabel}
          value={hours}
          min={0}
          step={0.5}
          onChange={setHours}
        />
      </div>
      <div className="calculator-results">
        <Stat label={bonusLabel} value={number(bonus)} tone="emerald" />
      </div>
    </section>
  );
}

function RewardsCalculator() {
  const t = useTranslations("city-rewards");
  return (
    <div className="calculator-stack">
      <ResourceRewardBlock
        title={t("gold.title")}
        baseLabel={t("gold.base")}
        baseUnitLabel={t("gold.base-unit")}
        hoursLabel={t("gold.hours")}
        bonusLabel={t("gold.bonus")}
      />
      <ResourceRewardBlock
        title={t("troops.title")}
        baseLabel={t("troops.base")}
        baseUnitLabel={t("troops.base-unit")}
        hoursLabel={t("troops.hours")}
        bonusLabel={t("troops.bonus")}
      />
    </div>
  );
}

export function CityCalculators({
  availability = {
    cost: true,
    "max-level": true,
    production: true,
    rewards: true,
  },
  parameters = defaultCityParameters,
}: {
  availability?: Record<Calculator, boolean>;
  parameters?: CityParameters;
}) {
  const tools = useTranslations("tools");
  const cost = useTranslations("city-cost");
  const maxLevel = useTranslations("city-max-level");
  const production = useTranslations("city-production");
  const rewards = useTranslations("city-rewards");
  const firstAvailable = (
    ["cost", "max-level", "production", "rewards"] as Calculator[]
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
          <TabLabel
            label={cost("name")}
            badge={
              !availability.cost ? tools("calculator-unavailable") : undefined
            }
          />
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
          <TabLabel
            label={maxLevel("name")}
            badge={
              !availability["max-level"]
                ? tools("calculator-unavailable")
                : undefined
            }
          />
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
          <TabLabel
            label={production("name")}
            badge={
              !availability.production
                ? tools("calculator-unavailable")
                : undefined
            }
          />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "rewards"}
          disabled={!availability.rewards}
          title={
            !availability.rewards ? tools("calculator-unavailable") : undefined
          }
          onClick={() => setActive("rewards")}
        >
          <TabLabel
            label={rewards("name")}
            badge={
              !availability.rewards
                ? tools("calculator-unavailable")
                : undefined
            }
          />
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
      {active === "rewards" && <RewardsCalculator />}
      {!active && (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
