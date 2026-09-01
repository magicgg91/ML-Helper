"use client";

import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import { filterButtonColor } from "../lib/game-images";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import {
  gemFamilies,
  gemValue,
  optimizeGemBudget,
  optimizeGemTarget,
  templarRates,
  templarUpgradeCost,
  type GemFamily,
} from "../lib/gems-templars";
import {
  defaultGemParameters,
  gemLeagues,
  type GemLeague,
  type GemParameters,
} from "../lib/gem-parameters";
import {
  defaultTemplarParameters,
  type TemplarParameters,
} from "../lib/templar-parameters";
import { skillKeys, templarKeys, type SkillKey } from "../lib/player-settings";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
  ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { defaultExpeditionStarIncrements } from "../lib/reference-equipment";
import { NumberStepper } from "./number-stepper";
import { StuffSimulator } from "./equipment-tools";
import { ExpeditionEquipmentSimulator } from "./expedition-equipment-tools";
import { TabLabel } from "./tab-label";

type GemRow = {
  id: number;
  skill: SkillKey;
  league: GemLeague | "";
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
  combatRows,
  expeditionRows,
  expeditionIncrements = defaultExpeditionStarIncrements,
  gemParameters = defaultGemParameters,
  availability = {
    simulator: true,
    gems: true,
    templars: true,
    expedition: true,
  },
  // Bloc 53/F: a reference's cross-link to this category (Gems, Templars)
  // now passes ?open=<tab> so it lands directly on the precise calculator
  // instead of always defaulting to whichever tab is firstAvailable.
  initialTool,
}: {
  templarParameters?: TemplarParameters;
  combatRows: readonly CombatReferenceRow[];
  expeditionRows: readonly ExpeditionReferenceRow[];
  expeditionIncrements?: ExpeditionStarIncrements;
  gemParameters?: GemParameters;
  availability?: Record<
    "simulator" | "gems" | "templars" | "expedition",
    boolean
  >;
  initialTool?: "simulator" | "gems" | "templars" | "expedition";
}) {
  const tools = useTranslations("tools");
  const simulator = useTranslations("stuff-simulator");
  const gems = useTranslations("gems");
  const templars = useTranslations("templars");
  const expedition = useTranslations("expedition-equipment-simulator");
  // Order (Bloc 31/C): Combat Equipment, Expedition Equipment, Gems, Templars.
  const firstAvailable = (
    ["simulator", "expedition", "gems", "templars"] as const
  ).find((key) => availability[key]);
  const [active, setActive] = useState<
    "simulator" | "gems" | "templars" | "expedition" | undefined
  >(initialTool && availability[initialTool] ? initialTool : firstAvailable);
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
          <TabLabel
            label={simulator("name")}
            badge={
              !availability.simulator
                ? tools("calculator-unavailable")
                : undefined
            }
          />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "expedition"}
          disabled={!availability.expedition}
          title={
            !availability.expedition
              ? tools("calculator-unavailable")
              : undefined
          }
          onClick={() => setActive("expedition")}
        >
          <TabLabel
            label={expedition("name")}
            badge={
              !availability.expedition
                ? tools("calculator-unavailable")
                : undefined
            }
          />
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
          <TabLabel
            label={gems("name")}
            badge={
              !availability.gems ? tools("calculator-unavailable") : undefined
            }
          />
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
          <TabLabel
            label={templars("name")}
            badge={
              !availability.templars
                ? tools("calculator-unavailable")
                : undefined
            }
          />
        </button>
      </nav>
      {active === "simulator" ? (
        <StuffSimulator combatRows={combatRows} gemParameters={gemParameters} />
      ) : active === "expedition" ? (
        <ExpeditionEquipmentSimulator
          rows={expeditionRows}
          increments={expeditionIncrements}
        />
      ) : active === "gems" ? (
        <GemsCalculator parameters={gemParameters} />
      ) : active === "templars" ? (
        <TemplarsCalculator parameters={templarParameters} />
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}

function GemsCalculator({ parameters }: { parameters: GemParameters }) {
  const t = useTranslations("gems");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const [mode, setMode] = useState<"optimize" | "budget">("optimize");
  const reference = referenceCatalog.find((item) => item.slug === "gems")!;
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
      {mode === "optimize" ? (
        <GemOptimization parameters={parameters} />
      ) : (
        <GemBudget parameters={parameters} />
      )}
      {/* Bloc 55/A: after the tool's own content, not before it. */}
      <CrossReferenceLink
        href={referenceHref("gems")}
        title={references(`catalog.${reference.slug}`)}
        image={reference.image}
        fallbackImage={reference.fallbackImage}
        label={crossReference("toReference")}
      />
    </div>
  );
}

function GemOptimization({ parameters }: { parameters: GemParameters }) {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const common = useTranslations("common");
  const [family, setFamily] = useState<GemFamily>("attack");
  const [totalSlots, setTotalSlots] = useState(27);
  const [nextId, setNextId] = useState(2);
  const [rows, setRows] = useState<GemRow[]>([
    { id: 1, skill: "striker", league: "", slots: 0, target: 0 },
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
        league: "",
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
    .filter(
      (row): row is GemRow & { league: GemLeague } =>
        row.slots > 0 && Boolean(row.league),
    )
    .map((row) => {
      const result = optimizeGemTarget(
        row.target,
        gemValue(row.skill, row.league, parameters),
        row.slots,
      );
      return {
        ...row,
        result,
        cost: result.baseGems * parameters.gemPrice[row.league],
      };
    });
  const totalCost = results.reduce((sum, row) => sum + row.cost, 0);
  const hasMissingLeague = rows.some((row) => row.slots > 0 && !row.league);
  return (
    <>
      <section className="calculator-card">
        <h3>{t("optimization.title")}</h3>
        <div className="family-buttons" aria-label={t("family-label")}>
          {(["attack", "defense", "gold", "speed"] as GemFamily[]).map(
            (key) => {
              const color = filterButtonColor(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={family === key}
                  style={
                    color
                      ? ({ "--pill-color": color } as CSSProperties)
                      : undefined
                  }
                  onClick={() => changeFamily(key)}
                >
                  {game(`families.${key}`)}
                </button>
              );
            },
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
                    update(row.id, {
                      league: event.target.value as GemLeague | "",
                    })
                  }
                >
                  <option value="">{common("choose")}</option>
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
              { id: nextId, skill, league: "", slots: 0, target: 0 },
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
          <p className="ranking-placeholder">
            {hasMissingLeague
              ? t("errors.select-league")
              : t("errors.add-positive-stat")}
          </p>
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

function GemBudget({ parameters }: { parameters: GemParameters }) {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const common = useTranslations("common");
  const [skill, setSkill] = useState<SkillKey>("fearless");
  const [league, setLeague] = useState<GemLeague | "">("");
  const [slots, setSlots] = useState(27);
  const [budget, setBudget] = useState(0);
  const result = league
    ? optimizeGemBudget(
        budget,
        parameters.gemPrice[league],
        gemValue(skill, league, parameters),
        slots,
      )
    : null;
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
              onChange={(event) =>
                setLeague(event.target.value as GemLeague | "")
              }
            >
              <option value="">{common("choose")}</option>
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
      {!result ? (
        <p className="empty-state" role="status">
          {t("errors.select-league")}
        </p>
      ) : (
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
            <Result
              label={t("obtained-stat")}
              value={`${result.actualStat}%`}
              tone="emerald"
            />
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
      )}
    </>
  );
}

function Result({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="calculator-stat total-box">
      <span className="label">{label}</span>
      <strong className={tone ? `value ${tone}` : "value"}>{value}</strong>
    </div>
  );
}

function TemplarsCalculator({ parameters }: { parameters: TemplarParameters }) {
  const t = useTranslations("templars");
  const game = useTranslations("game");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const [start, setStart] = useState(0);
  const [target, setTarget] = useState(1);
  const cost = templarUpgradeCost(start, target, parameters);
  const reference = referenceCatalog.find((item) => item.slug === "templars")!;
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <label className="calculator-field">
            {t("fields.start-level")}
            <NumberStepper
              label={t("fields.start-level")}
              value={start}
              min={0}
              max={20}
              onChange={(value) => setStart(Math.floor(value))}
            />
          </label>
          <label className="calculator-field">
            {t("fields.target-level")}
            <NumberStepper
              label={t("fields.target-level")}
              value={target}
              min={0}
              max={20}
              onChange={(value) => setTarget(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="result-highlight">
          <span>{t("total-cost")}</span>
          <strong data-testid="templar-cost">
            {formatGameNumber(cost)} {t("skydust")}
          </strong>
        </div>
      </section>
      <section className="calculator-card">
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("columns.skill")}</th>
                <th>{t("bonus-per-templar")}</th>
                <th>{t("total-bonus-level", { level: target })}</th>
                <th>{t("gain-transition")}</th>
              </tr>
            </thead>
            <tbody>
              {templarKeys.map((key) => {
                const rate = templarRates[key];
                const gain = (target - start) * rate;
                return (
                  <tr key={key}>
                    <td>{game(`templars.${key}`)}</td>
                    <td>{t("rate-value", { rate })}</td>
                    <td>{`${target * rate}%`}</td>
                    <td>{`${gain >= 0 ? "+" : ""}${gain}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {/* Bloc 55/A: after the tool's own content, not before it. */}
      <CrossReferenceLink
        href={referenceHref("templars")}
        title={references(`catalog.${reference.slug}`)}
        image={reference.image}
        fallbackImage={reference.fallbackImage}
        label={crossReference("toReference")}
      />
    </div>
  );
}
