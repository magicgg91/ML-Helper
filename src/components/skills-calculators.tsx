"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import {
  gemFamilies,
  gemPrice,
  gemValue,
  optimizeGemBudget,
  optimizeGemTarget,
  templarRates,
  templarUpgradeCost,
  type GemFamily,
  type GemLeague,
} from "../lib/gems-templars";
import { defaultTemplarParameters, templarLevelCost, type TemplarParameters } from "../lib/templar-parameters";
import {
  skillKeys,
  templarKeys,
  type SkillKey,
  type TemplarKey,
} from "../lib/player-settings";
import { NumberStepper } from "./number-stepper";
import { StuffComparison, StuffSimulator } from "./equipment-tools";

const gemLeagues: GemLeague[] = [
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legend",
];

type GemRow = {
  id: number;
  skill: SkillKey;
  league: GemLeague;
  slots: number;
  target: number;
};

function gemDistributionLabel(
  stars: Array<{ stars: number; count: number }>,
  format: (count: number, level: number) => string,
  empty: string,
) {
  return (
    stars
      .filter(({ count }) => count > 0)
      .map(({ stars: level, count }) => format(count, level))
      .join(" + ") || empty
  );
}

export function SkillsCalculators({
  templarParameters = defaultTemplarParameters,
  availability = {
    simulator: true,
    comparison: true,
    gems: true,
    templars: true,
  },
}: {
  templarParameters?: TemplarParameters;
  availability?: Record<
    "simulator" | "comparison" | "gems" | "templars",
    boolean
  >;
}) {
  const tools = useTranslations("tools");
  const simulator = useTranslations("stuff-simulator");
  const comparison = useTranslations("stuff-comparison");
  const gems = useTranslations("gems");
  const templars = useTranslations("templars");
  const firstAvailable = (
    ["simulator", "comparison", "gems", "templars"] as const
  ).find((key) => availability[key]);
  const [active, setActive] = useState<
    "simulator" | "comparison" | "gems" | "templars" | undefined
  >(firstAvailable);
  return (
    <div className="city-calculators">
      <nav
        className="calculator-tabs tabs"
        role="tablist"
        aria-label={tools("skills-tabs")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "simulator"}
          disabled={!availability.simulator}
          title={
            !availability.simulator
              ? tools("calculator-unavailable")
              : undefined
          }
          onClick={() => setActive("simulator")}
        >
          {simulator("name")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "comparison"}
          disabled={!availability.comparison}
          title={
            !availability.comparison
              ? tools("calculator-unavailable")
              : undefined
          }
          onClick={() => setActive("comparison")}
        >
          {comparison("name")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "gems"}
          disabled={!availability.gems}
          title={
            !availability.gems ? tools("calculator-unavailable") : undefined
          }
          onClick={() => setActive("gems")}
        >
          {gems("name")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "templars"}
          disabled={!availability.templars}
          title={
            !availability.templars ? tools("calculator-unavailable") : undefined
          }
          onClick={() => setActive("templars")}
        >
          {templars("name")}
        </button>
      </nav>
      {active === "simulator" ? (
        <StuffSimulator />
      ) : active === "comparison" ? (
        <StuffComparison />
      ) : active === "gems" ? (
        <GemsCalculator />
      ) : active === "templars" ? (
        <TemplarsCalculator parameters={templarParameters} />
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}

function GemsCalculator() {
  const t = useTranslations("gems");
  const [mode, setMode] = useState<"optimize" | "budget">("optimize");
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div
          className="calculator-tabs compact mode-switch"
          role="tablist"
          aria-label={t("mode-label")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "optimize"}
            onClick={() => setMode("optimize")}
          >
            {t("modes.optimize")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "budget"}
            onClick={() => setMode("budget")}
          >
            {t("modes.budget")}
          </button>
        </div>
      </section>
      {mode === "optimize" ? <GemOptimization /> : <GemBudget />}
    </div>
  );
}

function GemOptimization() {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const [family, setFamily] = useState<GemFamily>("attack");
  const [totalSlots, setTotalSlots] = useState(27);
  const [nextId, setNextId] = useState(2);
  const [rows, setRows] = useState<GemRow[]>([
    { id: 1, skill: "striker", league: "legend", slots: 0, target: 0 },
  ]);
  const allowed = gemFamilies[family];
  const allocated = rows.reduce((sum, row) => sum + row.slots, 0);
  const update = (id: number, patch: Partial<GemRow>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const setSlots = (id: number, value: number) =>
    setRows((current) => {
      const others = current.reduce(
        (sum, row) => (row.id === id ? sum : sum + row.slots),
        0,
      );
      return current.map((row) =>
        row.id === id
          ? {
              ...row,
              slots: Math.min(
                Math.max(0, Math.floor(value)),
                Math.max(0, totalSlots - others),
              ),
            }
          : row,
      );
    });
  const changeFamily = (value: GemFamily) => {
    setFamily(value);
    setRows([
      {
        id: nextId,
        skill: gemFamilies[value][0],
        league: "legend",
        slots: 0,
        target: 0,
      },
    ]);
    setNextId((id) => id + 1);
  };
  const changeTotal = (value: number) => {
    const total = Math.max(1, Math.min(27, Math.floor(value)));
    setTotalSlots(total);
    setRows((current) => {
      let remaining = total;
      return current.map((row) => {
        const slots = Math.min(row.slots, remaining);
        remaining -= slots;
        return { ...row, slots };
      });
    });
  };
  const results = rows
    .filter((row) => row.slots > 0)
    .map((row) => {
      const result = optimizeGemTarget(
        row.target,
        gemValue(row.skill, row.league),
        row.slots,
      );
      return { ...row, result, cost: result.baseGems * gemPrice[row.league] };
    });
  const totalCost = results.reduce((sum, row) => sum + row.cost, 0);
  return (
    <>
      <section className="calculator-card">
        <h3>{t("optimization.title")}</h3>
        <div className="family-buttons" aria-label={t("family-label")}>
          {(["attack", "defense", "gold", "speed"] as GemFamily[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                aria-pressed={family === key}
                onClick={() => changeFamily(key)}
              >
                {game(`families.${key}`)}
              </button>
            ),
          )}
        </div>
        <label className="calculator-field gem-total-slots">
          {t("fields.available-slots")}
          <NumberStepper
            label={t("fields.available-slots")}
            value={totalSlots}
            min={1}
            max={27}
            onChange={changeTotal}
          />
        </label>
        <div className="gem-rows">
          {rows.map((row, index) => (
            <div className="gem-row" key={row.id}>
              <label>
                {t("fields.skill")}
                <select
                  aria-label={t("fields.skill-row", { row: index + 1 })}
                  value={row.skill}
                  onChange={(event) =>
                    update(row.id, { skill: event.target.value as SkillKey })
                  }
                >
                  {allowed.map((skill) => (
                    <option key={skill} value={skill}>
                      {game(`skills.${skill}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("fields.league")}
                <select
                  aria-label={t("fields.league-row", { row: index + 1 })}
                  value={row.league}
                  onChange={(event) =>
                    update(row.id, { league: event.target.value as GemLeague })
                  }
                >
                  {gemLeagues.map((league) => (
                    <option key={league} value={league}>
                      {game(`leagues.${league}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("fields.allocated-slots")}
                <NumberStepper
                  label={t("fields.slots-row", { row: index + 1 })}
                  value={row.slots}
                  min={0}
                  max={27}
                  onChange={(value) => setSlots(row.id, value)}
                />
              </label>
              <label>
                {t("fields.target-stat")}
                <NumberStepper
                  label={t("fields.target-row", { row: index + 1 })}
                  value={row.target}
                  min={0}
                  step={0.5}
                  onChange={(value) => update(row.id, { target: value })}
                />
              </label>
              <button
                type="button"
                aria-label={t("remove-row", { row: index + 1 })}
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.id !== row.id),
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary-action"
          onClick={() => {
            const used = rows.map((row) => row.skill);
            const skill =
              allowed.find((item) => !used.includes(item)) ?? allowed[0];
            setRows((current) => [
              ...current,
              { id: nextId, skill, league: "legend", slots: 0, target: 0 },
            ]);
            setNextId((id) => id + 1);
          }}
        >
          {t("add-stat")}
        </button>
        <p className="calculator-note">
          {t("allocated-summary")}:{" "}
          <strong data-testid="gem-allocated">{allocated}</strong> /{" "}
          {totalSlots}
        </p>
      </section>
      <section className="calculator-card">
        <h3>{t("result")}</h3>
        {results.length === 0 ? (
          <p className="ranking-placeholder">{t("errors.add-positive-stat")}</p>
        ) : (
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>{t("columns.skill")}</th>
                  <th>{t("columns.league")}</th>
                  <th>{t("columns.slots")}</th>
                  <th>{t("columns.distribution")}</th>
                  <th>{t("columns.stat")}</th>
                  <th>{t("columns.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id}>
                    <td>{game(`skills.${row.skill}`)}</td>
                    <td>{game(`leagues.${row.league}`)}</td>
                    <td>{row.slots}</td>
                    <td>
                      {gemDistributionLabel(
                        row.result.stars,
                        (count, level) => t("gem-count", { count, level }),
                        t("no-gems"),
                      )}
                    </td>
                    <td>{row.result.actualStat}%</td>
                    <td>{formatGameNumber(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="result-highlight">
          <span>{t("total-cost")}</span>
          <strong>
            {formatGameNumber(totalCost)} {t("sapphires")}
          </strong>
        </div>
      </section>
    </>
  );
}

function GemBudget() {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const [skill, setSkill] = useState<SkillKey>("fearless");
  const [league, setLeague] = useState<GemLeague>("legend");
  const [slots, setSlots] = useState(27);
  const [budget, setBudget] = useState(0);
  const result = optimizeGemBudget(
    budget,
    gemPrice[league],
    gemValue(skill, league),
    slots,
  );
  return (
    <>
      <section className="calculator-card">
        <div className="calculator-fields">
          <label className="calculator-field">
            {t("fields.skill")}
            <select
              value={skill}
              onChange={(event) => setSkill(event.target.value as SkillKey)}
            >
              {skillKeys.map((key) => (
                <option key={key} value={key}>
                  {game(`skills.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="calculator-field">
            {t("fields.league")}
            <select
              value={league}
              onChange={(event) => setLeague(event.target.value as GemLeague)}
            >
              {gemLeagues.map((key) => (
                <option key={key} value={key}>
                  {game(`leagues.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="calculator-field">
            {t("fields.available-slots")}
            <NumberStepper
              label={t("fields.budget-slots")}
              value={slots}
              min={1}
              max={27}
              onChange={(value) => setSlots(Math.floor(value))}
            />
          </label>
          <label className="calculator-field">
            {t("fields.available-budget")}
            <NumberStepper
              label={t("fields.available-budget")}
              value={budget}
              min={0}
              onChange={(value) => setBudget(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="budget-result-main">
          <span>{t("optimal-distribution")}</span>
          <strong data-testid="gem-budget-distribution">
            {gemDistributionLabel(
              result.stars,
              (count, level) => t("gem-count", { count, level }),
              t("no-gems"),
            )}
          </strong>
        </div>
        <div className="calculator-results">
          <Result label={t("base-gems")} value={String(result.baseGems)} />
          <Result
            label={t("used-slots")}
            value={`${result.slotsUsed} / ${slots}`}
          />
          <Result label={t("obtained-stat")} value={`${result.actualStat}%`} />
          <Result
            label={t("actual-cost")}
            value={`${formatGameNumber(result.cost)} ${t("sapphires")}`}
          />
          <Result
            label={t("remaining-budget")}
            value={`${formatGameNumber(result.remaining)} ${t("sapphires")}`}
          />
        </div>
      </section>
    </>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="calculator-stat total-box">
      <span className="label">{label}</span>
      <strong className="value">{value}</strong>
    </div>
  );
}

type TemplarState = Record<TemplarKey, { start: number; target: number }>;
function TemplarsCalculator({ parameters }: { parameters: TemplarParameters }) {
  const t = useTranslations("templars");
  const game = useTranslations("game");
  const [selected, setSelected] = useState<TemplarKey>("striker");
  const [levels, setLevels] = useState<TemplarState>(
    () =>
      Object.fromEntries(
        templarKeys.map((key) => [key, { start: 0, target: 1 }]),
      ) as TemplarState,
  );
  const current = levels[selected];
  const rate = templarRates[selected];
  const cost = templarUpgradeCost(current.start, current.target, parameters);
  const gain = (current.target - current.start) * rate;
  const update = (field: "start" | "target", value: number) =>
    setLevels((state) => ({
      ...state,
      [selected]: {
        ...state[selected],
        [field]: Math.max(0, Math.min(20, Math.floor(value))),
      },
    }));
  const costs = useMemo(() => Array.from({ length: 20 }, (_, index) => templarLevelCost(index + 1, parameters)), [parameters]);
  const cumulative = useMemo(() => costs.map((_, index) => costs.slice(0, index + 1).reduce((sum, item) => sum + item, 0)), [costs]);
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="family-buttons">
          {templarKeys.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={selected === key}
              onClick={() => setSelected(key)}
            >
              {game(`templars.${key}`)}
            </button>
          ))}
        </div>
        <div className="calculator-fields">
          <label className="calculator-field">
            {t("fields.start-level")}
            <NumberStepper
              label={t("fields.start-level")}
              value={current.start}
              min={0}
              max={20}
              onChange={(value) => update("start", value)}
            />
          </label>
          <label className="calculator-field">
            {t("fields.target-level")}
            <NumberStepper
              label={t("fields.target-level")}
              value={current.target}
              min={0}
              max={20}
              onChange={(value) => update("target", value)}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="result-highlight">
          <span>
            {t("total-cost", { templar: game(`templars.${selected}`) })}
          </span>
          <strong data-testid="templar-cost">
            {formatGameNumber(cost)} {t("skydust")}
          </strong>
        </div>
        <div className="calculator-results">
          <Result label={t("bonus-per-templar")} value={`${rate}%`} />
          <Result
            label={t("total-bonus-level", { level: current.target })}
            value={`${current.target * rate}%`}
          />
          <Result
            label={t("gain-transition")}
            value={`${gain >= 0 ? "+" : ""}${gain}%`}
          />
        </div>
      </section>
      <section className="calculator-card">
        <h3>{t("cost-table")}</h3>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("columns.level")}</th>
                <th>{t("columns.level-cost")}</th>
                <th>{t("columns.cumulative-cost")}</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((item, index) => (
                <tr key={index + 1}>
                  <td>{index + 1}</td>
                  <td>{formatGameNumber(item)}</td>
                  <td>{formatGameNumber(cumulative[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
