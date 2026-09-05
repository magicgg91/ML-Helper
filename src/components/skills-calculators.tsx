"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import { formatSkillPercentValue } from "../lib/skill-percent";
import { filterButtonColor, skillColor } from "../lib/game-images";
import { CrossReferenceLink } from "./cross-reference-link";
import { GameImage } from "./game-image";
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
import { defaultTemplarPresentationCatalog } from "../lib/templars-presentation";
import {
  skillKeys,
  templarKeys,
  type SkillKey,
  type TemplarKey,
} from "../lib/player-settings";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
  ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { defaultExpeditionStarIncrements } from "../lib/reference-equipment";
import {
  equipmentStarIncrement,
  type EquipmentStarIncrements,
} from "../lib/equipment";
import { NumberStepper } from "./number-stepper";
import { StuffSimulator } from "./equipment-tools";
import { ExpeditionEquipmentSimulator } from "./expedition-equipment-tools";
import { TabLabel } from "./tab-label";

type GemRow = {
  id: number;
  // Bloc 82/D: no skill pre-selected — "" is the deliberate "not chosen
  // yet" state, same principle as league already had.
  skill: SkillKey | "";
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
  combatIncrements = equipmentStarIncrement,
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
  combatIncrements?: EquipmentStarIncrements;
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
        <StuffSimulator
          combatRows={combatRows}
          gemParameters={gemParameters}
          increments={combatIncrements}
        />
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
  const locale = useLocale();
  const [family, setFamily] = useState<GemFamily>("attack");
  const [totalSlots, setTotalSlots] = useState(27);
  const [nextId, setNextId] = useState(2);
  const [rows, setRows] = useState<GemRow[]>([
    { id: 1, skill: "", league: "", slots: 0, target: 0 },
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
      { id: nextId, skill: "", league: "", slots: 0, target: 0 },
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
      (row): row is GemRow & { skill: SkillKey; league: GemLeague } =>
        row.slots > 0 && Boolean(row.skill) && Boolean(row.league),
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
  // Bloc 82/D: skill is now just as mandatory as league — checked first
  // since a row can be missing either or both.
  const hasMissingSkill = rows.some((row) => row.slots > 0 && !row.skill);
  const hasMissingLeague = rows.some((row) => row.slots > 0 && !row.league);
  return (
    <>
      <section className="calculator-card">
        <h2 className="calculator-heading">{t("optimization.title")}</h2>
        <div
          className="family-buttons gem-optimize-family-buttons"
          aria-label={t("family-label")}
        >
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
                    update(row.id, {
                      skill: event.target.value as SkillKey | "",
                    })
                  }
                >
                  <option value="">{common("choose")}</option>
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
            setRows((current) => [
              ...current,
              { id: nextId, skill: "", league: "", slots: 0, target: 0 },
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
        <h2 className="calculator-heading">{t("result")}</h2>
        {hasMissingSkill || hasMissingLeague ? (
          // Bloc 82/D review (Codex PR #99): a populated row (slots > 0)
          // missing its skill or league must block the whole result, not
          // just get silently excluded from `results` while its own slots
          // still count toward "Emplacements alloués" below — otherwise
          // the total looks like it covers more than what's actually
          // shown in the table.
          <p className="ranking-placeholder">
            {hasMissingSkill
              ? t("errors.select-skill")
              : t("errors.select-league")}
          </p>
        ) : results.length === 0 ? (
          <p className="ranking-placeholder">
            {t("errors.add-positive-stat")}
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
                    <td>
                      {formatSkillPercentValue(row.result.actualStat, locale)}%
                    </td>
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
  const locale = useLocale();
  // Bloc 82/D: no skill pre-selected, same "not chosen yet" principle as
  // league already had.
  const [skill, setSkill] = useState<SkillKey | "">("");
  const [league, setLeague] = useState<GemLeague | "">("");
  const [slots, setSlots] = useState(27);
  const [budget, setBudget] = useState(0);
  const result =
    skill && league
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
              onChange={(event) =>
                setSkill(event.target.value as SkillKey | "")
              }
            >
              <option value="">{common("choose")}</option>
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
          {!skill ? t("errors.select-skill") : t("errors.select-league")}
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
              value={`${formatSkillPercentValue(result.actualStat, locale)}%`}
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
  testId,
}: {
  label: string;
  value: string;
  tone?: "emerald";
  testId?: string;
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

// Bloc 68/C: one Templar result tile, same markup/classes as the
// Templiers referentiel's own presentation tile (templars-reference.tsx)
// — reused verbatim (.templars-tile-grid/-tile/-image/-body/-title/-stat)
// so the calculator's results read identically to the reference, per the
// task spec. Image + border color come from the compiled-in defaults
// (defaultTemplarPresentationCatalog, skillColor) rather than the live
// admin-edited catalog: threading that through SkillsCalculators and the
// /tools/[slug] page as a new server prop is out of scope for this Bloc,
// and every other image/color used in this file is already a static
// constant the same way.
function TemplarResultTile({
  templarKey,
  start,
  target,
}: {
  templarKey: TemplarKey;
  start: number;
  target: number;
}) {
  const t = useTranslations("templars");
  const game = useTranslations("game");
  const rate = templarRates[templarKey];
  const gain = (target - start) * rate;
  const row = defaultTemplarPresentationCatalog[templarKey];
  const color = skillColor(templarKey);
  const name = game(`templars.${templarKey}`);
  return (
    <article
      className="templars-tile"
      data-testid={`templars-calculator-tile-${templarKey}`}
      style={
        {
          borderColor: color,
          background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
        } as CSSProperties
      }
    >
      <GameImage
        src={row.image}
        alt={name}
        className="templars-tile-image"
        width={1000}
        height={1353}
        fallback={null}
      />
      <div className="templars-tile-body">
        <h2 className="templars-tile-title">
          {t("presentation.tile-title", { name })}
        </h2>
        <p className="templars-tile-stat">
          {t("bonus-per-templar")} : {t("rate-value", { rate })}
        </p>
        <p className="templars-tile-stat">
          {t("total-bonus")} : {`${target * rate}%`}
        </p>
        <p className="templars-tile-stat">
          {t("gain")} : {`${gain >= 0 ? "+" : ""}${gain}%`}
        </p>
      </div>
    </article>
  );
}

function TemplarsCalculator({ parameters }: { parameters: TemplarParameters }) {
  const t = useTranslations("templars");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const [start, setStart] = useState(0);
  const [target, setTarget] = useState(1);
  const cost = templarUpgradeCost(start, target, parameters);
  const reference = referenceCatalog.find((item) => item.slug === "templars")!;
  return (
    <div className="calculator-stack">
      {/* Bloc 68/C: fields + cost total merged into one 3-equal-column
          card on desktop (dedicated .templars-cost-fields, not the shared
          .calculator-fields used by Gems/City/DemoAttackTroops), stacking
          to 1 column on mobile via the same class's own media query. */}
      <section className="calculator-card">
        <div className="templars-cost-fields">
          <label className="calculator-field">
            {t("fields.start-level")}
            <NumberStepper
              label={t("fields.start-level")}
              value={start}
              min={0}
              // Bloc69/C review fix: capped one below target's own max=20
              // (mirroring the City tool's start=199/target=200 headroom) so
              // "start+1" committed below can never exceed target's max and
              // silently push it to 21.
              max={19}
              onChange={(value) => setStart(Math.floor(value))}
              // Bloc 69/C: same "must be > start" floor as the City tool
              // (Bloc 34/C) — only enforced at commit time (blur, +/-
              // buttons), not on every keystroke.
              onCommit={(v) => {
                const nextStart = Math.floor(v);
                setStart(nextStart);
                setTarget((current) =>
                  current <= nextStart ? nextStart + 1 : current,
                );
              }}
            />
          </label>
          <label className="calculator-field">
            {t("fields.target-level")}
            <NumberStepper
              label={t("fields.target-level")}
              value={target}
              min={1}
              max={20}
              onChange={(value) => setTarget(Math.floor(value))}
              onCommit={(v) => {
                const nextTarget = Math.floor(v);
                setTarget(nextTarget <= start ? start + 1 : nextTarget);
              }}
            />
          </label>
          <Result
            label={t("total-cost")}
            value={`${formatGameNumber(cost)} ${t("skydust")}`}
            testId="templar-cost"
          />
        </div>
      </section>
      {/* Bloc 68/C: results as tiles (same visual pattern as the
          referentiel's presentation tiles), replacing the old table. */}
      <section className="calculator-card">
        <div className="templars-tile-grid">
          {templarKeys.map((key) => (
            <TemplarResultTile
              key={key}
              templarKey={key}
              start={start}
              target={target}
            />
          ))}
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
