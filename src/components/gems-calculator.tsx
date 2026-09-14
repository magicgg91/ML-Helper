"use client";

// Bloc 93/M8: the Gemmes calculator, moved out of skills-calculators.tsx
// (915 lines) as the opportunistic split the audit called for — the
// boundary the file already had, not a new decomposition. Behaviour and
// markup are unchanged; only the file boundary moved.

import { ResultTile } from "./result-tile";
import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { formatGameNumber, formatSkillPercentValue } from "../lib/format";
import { filterButtonColor } from "../lib/game-images";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import {
  gemFamilies,
  gemValue,
  optimizeGemBudget,
  optimizeGemTarget,
  type GemFamily,
} from "../lib/gems-templars";
import {
  gemLeagues,
  type GemLeague,
  type GemParameters,
} from "../lib/gem-parameters";
import { skillKeys, type SkillKey } from "../lib/player-settings";
import { NumberStepper } from "./number-stepper";
import { TabList, TabPanel } from "./tabs";

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

export function GemsCalculator({ parameters }: { parameters: GemParameters }) {
  const t = useTranslations("gems");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const [mode, setMode] = useState<"optimize" | "budget">("optimize");
  const reference = referenceCatalog.find((item) => item.slug === "gems")!;
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        {/* Bloc 93/M1: hand-written, this switch had neither the roving
            tabIndex nor the arrow-key handler its Combat counterpart carried —
            two omissions the shared TabList makes impossible. */}
        <TabList
          as="div"
          className="calculator-tabs compact mode-switch"
          idPrefix="gems-mode"
          label={t("mode-label")}
          active={mode}
          onSelect={setMode}
          tabs={(["optimize", "budget"] as const).map((item) => ({
            key: item,
            label: t(`modes.${item}`),
          }))}
        />
      </section>
      {/* Bloc 92/M2: both modes feed the same .calculator-stack layout, so the
          tabpanel wrapper reuses that class to keep the inner cards' 1rem grid
          gap (a plain div would collapse it). */}
      <TabPanel idPrefix="gems-mode" tabKey={mode} className="calculator-stack">
        {mode === "optimize" ? (
          <GemOptimization parameters={parameters} />
        ) : (
          <GemBudget parameters={parameters} />
        )}
      </TabPanel>
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
    setRows([{ id: nextId, skill: "", league: "", slots: 0, target: 0 }]);
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
        {/* Bloc 92/H1: a permanently-mounted live region so both the
            placeholder->table transition and later recomputes are announced. */}
        <div aria-live="polite">
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
                        {formatSkillPercentValue(row.result.actualStat, locale)}
                        %
                      </td>
                      <td>{formatGameNumber(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
      {/* Bloc 92/H1: permanently-mounted live region wrapping the whole
          placeholder-vs-result conditional so recomputes are announced. */}
      <div aria-live="polite">
        {!result ? (
          // Bloc 92/A11y (Codex PR #116): no role="status" — the wrapping
          // aria-live region above announces this placeholder (avoid nesting).
          <p className="empty-state">
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
              <ResultTile
                label={t("base-gems")}
                value={String(result.baseGems)}
              />
              <ResultTile
                label={t("used-slots")}
                value={`${result.slotsUsed} / ${slots}`}
              />
              <ResultTile
                label={t("obtained-stat")}
                value={`${formatSkillPercentValue(result.actualStat, locale)}%`}
                tone="emerald"
              />
              <ResultTile
                label={t("actual-cost")}
                value={`${formatGameNumber(result.cost)} ${t("sapphires")}`}
              />
              <ResultTile
                label={t("remaining-budget")}
                value={`${formatGameNumber(result.remaining)} ${t("sapphires")}`}
              />
            </div>
          </section>
        )}
      </div>
    </>
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
