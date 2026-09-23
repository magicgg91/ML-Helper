"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { formatGameNumber } from "../lib/format";
import {
  bonusBreakdown,
  calculateProduction,
  calculateReward,
  cityStatsAt,
  cityUpgradeCost,
  maximumReachableLevel,
} from "../lib/city-calculators";
import { templePercent, type PlayerSettings } from "../lib/player-settings";
import {
  defaultCityParameters,
  type CityParameters,
} from "../lib/city-parameters";
import { AmountUnitField, Field, type AmountUnit } from "./tool-fields";
import { LeagueButtons } from "./league-select";
import { TabList, TabPanel } from "./tabs";
import {
  ChestIcon,
  CoinsIcon,
  PurseIcon,
  StairsUpIcon,
  SwordsIcon,
  TrophyIcon,
} from "./tool-icons";
import {
  BreakdownTable,
  DistributionBar,
  SummarySection,
  SummaryTile,
  multiplierLabel,
  type ToolCell,
  type ToolRow,
} from "./tool-tiles";
import { useNarrowViewport } from "./use-narrow-viewport";
import { usePlayerSettings } from "./use-player-settings";
import { useSyncedLeague } from "./use-synced-league";

type Calculator = "cost" | "max-level" | "production" | "rewards";

const number = (value: number) => formatGameNumber(value);

function LeagueRequired() {
  const common = useTranslations("common");
  // Bloc 92/A11y (Codex PR #116): no role="status" here — every use of this
  // placeholder sits inside a permanently-mounted aria-live="polite" region
  // that already announces it; a nested live region can double-announce.
  return <p className="empty-state">{common("select-league")}</p>;
}

/**
 * Bloc 113/A.8: a gap between two figures — green and signed when there is
 * one, an em dash when there is not. The dash is what a level range of zero
 * width and a source that produces nothing both look like.
 */
function gapCell(start: number, target: number, none: string): ToolCell {
  const difference = target - start;
  if (difference <= 0) return { text: none, tone: "muted" };
  return { text: `+${number(difference)}`, tone: "green" };
}

/** The share a source holds, as the reader's own percent format. */
function percentOf(value: number, total: number, locale: string) {
  return (total > 0 ? value / total : 0).toLocaleString(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
}

/**
 * Bloc 113/A.6: the badge is dropped when there is nothing to compare —
 * a start of 0 has no multiple, and a range of zero width would only ever
 * read "×1".
 */
function growthBadge(start: number, target: number, locale: string) {
  if (target <= start) return null;
  return multiplierLabel(start, target, locale);
}

/** Bloc 113/A.8: a row whose figures are all zero is greyed out. */
function sourceRow(
  key: string,
  label: string,
  cells: ToolCell[],
  empty: boolean,
): ToolRow {
  return {
    key,
    label,
    cells: empty ? cells.map((cell) => ({ ...cell, tone: "muted" })) : cells,
  };
}

/**
 * Bloc 113/B: what a stretch of levels costs, and what it buys.
 *
 * The figures are the ones this tool has always computed — the redesign only
 * stops printing each of them twice. Where Bloc 33/C carried a Départ column
 * beside a Cible column, one table now holds both plus the gap between them.
 */
function CostCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-cost");
  const game = useTranslations("game");
  const locale = useLocale();
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(2);
  const [league, setLeague] = useSyncedLeague();
  const start = cityStatsAt(startLevel, league || "bronze", parameters);
  const target = cityStatsAt(targetLevel, league || "bronze", parameters);
  const cost = cityUpgradeCost(startLevel, targetLevel, parameters);
  const prosperousTemple = templePercent("prosperous", settings.clanTemple);
  const recruiterTemple = templePercent("recruiter", settings.clanTemple);
  const goldStart = bonusBreakdown(
    start.gold,
    settings.equipmentSkills.prosperous,
    prosperousTemple,
  );
  const goldTarget = bonusBreakdown(
    target.gold,
    settings.equipmentSkills.prosperous,
    prosperousTemple,
  );
  const armyStart = bonusBreakdown(
    start.army,
    settings.equipmentSkills.recruiter,
    recruiterTemple,
  );
  const armyTarget = bonusBreakdown(
    target.army,
    settings.equipmentSkills.recruiter,
    recruiterTemple,
  );

  /** One resource's table: three sources, a per-city total, an N-city total. */
  const table = (
    title: string,
    startValues: ReturnType<typeof bonusBreakdown>,
    targetValues: ReturnType<typeof bonusBreakdown>,
    testId: string,
  ) => {
    const none = t("none");
    const line = (
      key: string,
      label: string,
      from: number,
      to: number,
    ): ToolRow =>
      sourceRow(
        key,
        label,
        [
          { text: number(from) },
          { text: number(to), tone: "violet" },
          gapCell(from, to, none),
        ],
        from === 0 && to === 0,
      );
    return (
      <BreakdownTable
        title={title}
        note={t("per-city")}
        testId={testId}
        headers={[
          t("columns.source"),
          t("columns.level", { level: startLevel }),
          t("columns.level", { level: targetLevel }),
          t("columns.gap"),
        ]}
        rows={[
          line("base", t("base"), startValues.base, targetValues.base),
          line("temple", t("temple"), startValues.temple, targetValues.temple),
          line("stuff", t("equipment"), startValues.stuff, targetValues.stuff),
        ]}
        totalRow={{
          key: "per-city",
          label: t("total-per-city"),
          cells: [
            { text: number(startValues.total) },
            { text: number(targetValues.total), tone: "violet" },
            gapCell(startValues.total, targetValues.total, none),
          ],
        }}
        grandRow={{
          key: "all",
          label: t("total-all", { count: cityCount }),
          cells: [
            { text: number(startValues.total * cityCount) },
            { text: number(targetValues.total * cityCount), tone: "violet" },
            gapCell(
              startValues.total * cityCount,
              targetValues.total * cityCount,
              none,
            ),
          ],
        }}
      >
        <DistributionBar
          showPercent
          formatPercent={(fraction) =>
            fraction.toLocaleString(locale, {
              style: "percent",
              maximumFractionDigits: 0,
            })
          }
          shares={[
            { key: "base", label: t("base"), value: targetValues.base },
            { key: "temple", label: t("temple"), value: targetValues.temple },
            { key: "stuff", label: t("equipment"), value: targetValues.stuff },
          ]}
        />
      </BreakdownTable>
    );
  };

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
          <div className="city-level-range">
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
            <span className="city-level-arrow" aria-hidden="true">
              →
            </span>
            <Field
              label={t("fields.target-level")}
              value={targetLevel}
              min={2}
              max={200}
              className="city-level-target"
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
        </div>
      </section>
      {/* Bloc 92/H1: permanently-mounted live region so the computed totals
          are announced on the placeholder->result transition and on later
          recomputes. */}
      <div aria-live="polite" className="calculator-stack">
        {!league ? (
          <LeagueRequired />
        ) : (
          <>
            <SummarySection
              title={t("total-cities", { count: cityCount })}
              recall={t("recall", {
                count: cityCount,
                league: game(`leagues.${league}`),
                start: startLevel,
                target: targetLevel,
              })}
            >
              <SummaryTile
                icon={<CoinsIcon />}
                label={t("cost-total")}
                value={number(cost * cityCount)}
                unit={t("gold-unit")}
                testId="city-cost-total"
                wide
              />
              {/* Bloc 113/A: the wall is a level, never multiplied by the
                  city count — the same rule Bloc 33/C set. */}
              <SummaryTile
                icon={<CoinsIcon />}
                label={t("wall")}
                value={gapCell(start.wall, target.wall, t("none")).text}
                tone={target.wall > start.wall ? "green" : "muted"}
                badge={growthBadge(start.wall, target.wall, locale)}
                testId="city-cost-wall"
              />
              {/* Bloc 113/A.8: VP gained is a gain like any other — signed
                  and green, an em dash when the range is empty. */}
              <SummaryTile
                icon={<TrophyIcon />}
                label={t("vp-gained")}
                value={
                  gapCell(0, (target.vp - start.vp) * cityCount, t("none")).text
                }
                tone={target.vp > start.vp ? "green" : "muted"}
                testId="city-cost-vp"
              />
              <SummaryTile
                icon={<SwordsIcon />}
                label={t("army-hour")}
                value={
                  gapCell(
                    armyStart.total * cityCount,
                    armyTarget.total * cityCount,
                    t("none"),
                  ).text
                }
                tone={armyTarget.total > armyStart.total ? "green" : "muted"}
                badge={growthBadge(armyStart.total, armyTarget.total, locale)}
                testId="city-cost-army"
              />
              <SummaryTile
                icon={<CoinsIcon />}
                label={t("gold-hour")}
                value={
                  gapCell(
                    goldStart.total * cityCount,
                    goldTarget.total * cityCount,
                    t("none"),
                  ).text
                }
                tone={goldTarget.total > goldStart.total ? "green" : "muted"}
                badge={growthBadge(goldStart.total, goldTarget.total, locale)}
                testId="city-cost-gold"
              />
            </SummarySection>
            <div className="tool-breakdowns">
              {table(
                t("army-hour"),
                armyStart,
                armyTarget,
                "city-cost-army-table",
              )}
              {table(
                t("gold-hour"),
                goldStart,
                goldTarget,
                "city-cost-gold-table",
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Bloc 113/C: how far a purse goes.
 *
 * Five tiles and nothing under them. The Base/Temple/Stuff breakdowns this
 * carried are gone: they described the reached level's production, which is
 * what the Production sub-tab is for, and the wall tile with them — a wall
 * total over several cities is not a quantity that means anything.
 */
function MaxLevelCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-max-level");
  const game = useTranslations("game");
  const locale = useLocale();
  const [cityCount, setCityCount] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [budget, setBudget] = useState(0);
  const [unit, setUnit] = useState<AmountUnit>(1_000);
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
  const goldStart = start.gold * goldBonus * cityCount;
  const goldTarget = target.gold * goldBonus * cityCount;
  const armyStart = start.army * armyBonus * cityCount;
  const armyTarget = target.army * armyBonus * cityCount;
  const levelsGained = Math.max(0, result.level - startLevel);

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields-inline city-maxlevel-fields">
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
            className="city-maxlevel-narrow-field"
            onChange={(v) => setCityCount(Math.floor(v))}
          />
          <Field
            label={t("fields.start-level")}
            value={startLevel}
            max={200}
            className="city-maxlevel-narrow-field"
            onChange={(v) => setStartLevel(Math.floor(v))}
          />
          <AmountUnitField
            label={t("fields.available-gold")}
            unitLabel={t("fields.gold-unit")}
            amount={budget}
            unit={unit}
            onAmountChange={setBudget}
            onUnitChange={setUnit}
            className="city-maxlevel-gold-field city-level-target"
          />
        </div>
      </section>
      {/* Bloc 92/H1: permanently-mounted live region so the reachable-level
          result is announced on the placeholder->result transition and on
          later recomputes. */}
      <div aria-live="polite">
        {!league ? (
          <LeagueRequired />
        ) : (
          <SummarySection
            title={t("total-cities", { count: cityCount })}
            recall={t("recall", {
              count: cityCount,
              league: game(`leagues.${league}`),
              level: startLevel,
              gold: number(budget * unit),
            })}
          >
            <SummaryTile
              icon={<StairsUpIcon />}
              label={t("reachable-level")}
              value={String(result.level)}
              highlight
              wide
              badge={
                levelsGained > 0
                  ? t("levels-gained", { count: levelsGained })
                  : null
              }
              testId="max-level-result"
            />
            <SummaryTile
              icon={<PurseIcon />}
              label={t("remaining-gold")}
              value={number(result.remaining)}
              unit={t("gold-unit")}
              testId="city-max-level-remaining"
            />
            <SummaryTile
              icon={<TrophyIcon />}
              label={t("vp-gained")}
              value={
                gapCell(0, (target.vp - start.vp) * cityCount, t("none")).text
              }
              tone={target.vp > start.vp ? "green" : "muted"}
              testId="city-max-level-vp"
            />
            <SummaryTile
              icon={<SwordsIcon />}
              label={t("army-hour")}
              value={gapCell(armyStart, armyTarget, t("none")).text}
              tone={armyTarget > armyStart ? "green" : "muted"}
              badge={growthBadge(armyStart, armyTarget, locale)}
              testId="city-max-level-army"
            />
            <SummaryTile
              icon={<CoinsIcon />}
              label={t("gold-hour")}
              value={gapCell(goldStart, goldTarget, t("none")).text}
              tone={goldTarget > goldStart ? "green" : "muted"}
              badge={growthBadge(goldStart, goldTarget, locale)}
              testId="city-max-level-gold"
            />
          </SummarySection>
        )}
      </div>
    </div>
  );
}

/**
 * Bloc 113/D: what N cities produce at a given level.
 *
 * The "Par ville — base" block this used to open with is gone: its figures
 * are the Base rows of the two tables, and printing them twice was the
 * redundancy this bloc is about.
 */
function ProductionCalculator({
  settings,
  parameters,
}: {
  settings: PlayerSettings;
  parameters: CityParameters;
}) {
  const t = useTranslations("city-production");
  const game = useTranslations("game");
  const locale = useLocale();
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
  // The same breakdown calculateProduction returns, per city rather than for
  // the whole set — bonusBreakdown is linear, so the N-city totals below are
  // exactly result.gold.total and result.troops.total.
  const goldPerCity = bonusBreakdown(
    result.perCity.gold,
    settings.equipmentSkills.prosperous,
    templePercent("prosperous", settings.clanTemple),
  );
  const armyPerCity = bonusBreakdown(
    result.perCity.army,
    settings.equipmentSkills.recruiter,
    templePercent("recruiter", settings.clanTemple),
  );

  const table = (
    title: string,
    values: ReturnType<typeof bonusBreakdown>,
    total: number,
    testId: string,
  ) => {
    const none = t("none");
    const line = (key: string, label: string, value: number): ToolRow =>
      sourceRow(
        key,
        label,
        [
          { text: number(value) },
          value > 0
            ? { text: percentOf(value, values.total, locale) }
            : { text: none, tone: "muted" },
        ],
        value === 0,
      );
    return (
      <BreakdownTable
        title={title}
        note={t("per-city")}
        testId={testId}
        headers={[
          t("columns.source"),
          t("columns.production"),
          t("columns.share"),
        ]}
        rows={[
          line("base", t("base"), values.base),
          line("temple", t("temple"), values.temple),
          line("stuff", t("equipment"), values.stuff),
        ]}
        totalRow={{
          key: "per-city",
          label: t("total-per-city"),
          cells: [{ text: number(values.total) }, { text: "" }],
        }}
        grandRow={{
          key: "all",
          label: t("total-all-level", { count: cityCount, level: cityLevel }),
          // Bloc 113/D: the N-city figure sits in the Production column,
          // under the others, and the Part column stays empty.
          cells: [{ text: number(total), tone: "violet" }, { text: "" }],
        }}
      >
        <DistributionBar
          showPercent={false}
          shares={[
            { key: "base", label: t("base"), value: values.base },
            { key: "temple", label: t("temple"), value: values.temple },
            { key: "stuff", label: t("equipment"), value: values.stuff },
          ]}
        />
      </BreakdownTable>
    );
  };

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
            className="city-level-target"
            onChange={(v) => setCityLevel(Math.floor(v))}
          />
        </div>
      </section>
      {/* Bloc 92/H1: live region wrapping the placeholder-vs-result
          conditional. The results branch is several stacked cards, so the
          wrapper reuses .calculator-stack to keep their 1rem grid gap. */}
      <div aria-live="polite" className="calculator-stack">
        {!league ? (
          <LeagueRequired />
        ) : (
          <>
            <SummarySection
              title={t("total-cities", { count: cityCount })}
              recall={t("recall", {
                count: cityCount,
                league: game(`leagues.${league}`),
                level: cityLevel,
              })}
            >
              <SummaryTile
                icon={<SwordsIcon />}
                label={t("army-hour")}
                value={`${number(result.troops.total)}/h`}
                testId="city-production-army"
              />
              <SummaryTile
                icon={<CoinsIcon />}
                label={t("gold-hour")}
                value={`${number(result.gold.total)}/h`}
                testId="city-production-gold"
              />
              <SummaryTile
                icon={<TrophyIcon />}
                label={t("vp")}
                value={number(result.vpTotal)}
                wide
                testId="city-production-vp"
              />
            </SummarySection>
            <div className="tool-breakdowns">
              {table(
                t("army-hour"),
                armyPerCity,
                result.troops.total,
                "city-production-army-table",
              )}
              {table(
                t("gold-hour"),
                goldPerCity,
                result.gold.total,
                "city-production-gold-table",
              )}
            </div>
            <section className="calculator-card tool-summary">
              <div className="tool-summary-header">
                <h2 className="calculator-heading">
                  {t("full-production.title")}
                </h2>
                <p className="tool-recall">
                  {t("full-production.note", {
                    points: result.fullProduction.points,
                  })}
                </p>
              </div>
              <div className="tool-tiles tool-tiles-reskill">
                <SummaryTile
                  icon={<SwordsIcon />}
                  label={t("full-production.army")}
                  value={`${number(result.fullProduction.troops)}/h`}
                  tone="green"
                  testId="full-production-army"
                />
                <SummaryTile
                  icon={<CoinsIcon />}
                  label={t("full-production.gold")}
                  value={`${number(result.fullProduction.gold)}/h`}
                  tone="green"
                  testId="full-production-gold"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Bloc 113/E: one resource's reward card. No summary tiles above these —
 * each card is self-contained, its own two fields and its own result.
 */
function ResourceRewardBlock({
  icon,
  title,
  baseLabel,
  baseUnitLabel,
  hoursLabel,
  hoursAccessibleLabel,
  bonusLabel,
  testId,
}: {
  icon: ReactNode;
  title: string;
  baseLabel: string;
  baseUnitLabel: string;
  hoursLabel: string;
  hoursAccessibleLabel: string;
  bonusLabel: string;
  testId: string;
}) {
  const [amount, setAmount] = useState(0);
  const [unit, setUnit] = useState<AmountUnit>(1);
  const [hours, setHours] = useState(0);
  const base = amount * unit;
  const bonus = calculateReward(base, hours);

  return (
    <section className="calculator-card tool-reward-card">
      <h2 className="calculator-heading tool-reward-title">
        {icon}
        {title}
      </h2>
      <div className="calculator-fields tool-reward-fields">
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
          accessibleLabel={hoursAccessibleLabel}
          value={hours}
          min={0}
          step={0.5}
          onChange={setHours}
        />
      </div>
      {/* Bloc 92/H1: the bonus recomputes silently as the base/hours change —
          a live region announces the updated value. */}
      <div aria-live="polite">
        <div className="tool-tiles">
          <SummaryTile
            icon={<ChestIcon />}
            label={bonusLabel}
            value={number(bonus)}
            tone="green"
            highlight={false}
            wide
            testId={testId}
          />
        </div>
      </div>
    </section>
  );
}

function RewardsCalculator() {
  const t = useTranslations("city-rewards");
  // Bloc 113/E: the label loses its resource on a phone, where the card's own
  // heading already says which one it is and the full wording would wrap.
  const narrow = useNarrowViewport();
  const bonusLabel = (key: "army" | "gold") =>
    narrow ? t("bonus-short") : t(`${key}.bonus`);
  return (
    <div className="calculator-stack tool-reward-cards">
      <ResourceRewardBlock
        icon={<SwordsIcon />}
        title={t("army.title")}
        baseLabel={t("army.base")}
        baseUnitLabel={t("army.base-unit")}
        hoursLabel={t("army.hours")}
        hoursAccessibleLabel={`${t("army.hours")} — ${t("army.title")}`}
        bonusLabel={bonusLabel("army")}
        testId="city-rewards-army"
      />
      <ResourceRewardBlock
        icon={<CoinsIcon />}
        title={t("gold.title")}
        baseLabel={t("gold.base")}
        baseUnitLabel={t("gold.base-unit")}
        hoursLabel={t("gold.hours")}
        hoursAccessibleLabel={`${t("gold.hours")} — ${t("gold.title")}`}
        bonusLabel={bonusLabel("gold")}
        testId="city-rewards-gold"
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
      <TabList
        idPrefix="city-tools"
        label={tools("city-tabs")}
        active={active}
        onSelect={setActive}
        tabs={[
          { key: "cost" as const, label: cost("name") },
          { key: "max-level" as const, label: maxLevel("name") },
          { key: "production" as const, label: production("name") },
          { key: "rewards" as const, label: rewards("name") },
        ].map((tab) => ({
          ...tab,
          available: availability[tab.key],
          unavailableLabel: tools("calculator-unavailable"),
        }))}
      />
      {active === "cost" && (
        <TabPanel idPrefix="city-tools" tabKey="cost">
          <CostCalculator settings={settings} parameters={parameters} />
        </TabPanel>
      )}
      {active === "max-level" && (
        <TabPanel idPrefix="city-tools" tabKey="max-level">
          <MaxLevelCalculator settings={settings} parameters={parameters} />
        </TabPanel>
      )}
      {active === "production" && (
        <TabPanel idPrefix="city-tools" tabKey="production">
          <ProductionCalculator settings={settings} parameters={parameters} />
        </TabPanel>
      )}
      {active === "rewards" && (
        <TabPanel idPrefix="city-tools" tabKey="rewards">
          <RewardsCalculator />
        </TabPanel>
      )}
      {!active && (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
