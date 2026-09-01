"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import type { CityParameters } from "../lib/city-parameters";
import {
  defaultDemoPercentages,
  defaultXpTiers,
  demoAttackTroops,
  xpOpponentRanges,
  type XpMode,
  type XpTier,
} from "../lib/combat-calculators";
import type { League } from "../lib/player-settings";
import { LeagueSelect } from "./league-select";
import { NumberStepper } from "./number-stepper";
import { TabLabel } from "./tab-label";
import { useSyncedLeague } from "./use-synced-league";

const units = [
  ["×1", 1],
  ["k", 1e3],
  ["M", 1e6],
  ["G", 1e9],
  ["T", 1e12],
] as const;

function rangeLabel(minimum: number, maximum: number | null) {
  if (maximum === null) return `≥ ${formatGameNumber(minimum)}`;
  if (minimum === 0) return `< ${formatGameNumber(maximum)}`;
  return `${formatGameNumber(minimum)} – ${formatGameNumber(maximum)}`;
}

function XpGainRate({ tiers }: { tiers: XpTier[] }) {
  const t = useTranslations("xp-gain-rate");
  const [mode, setMode] = useState<XpMode>("attacker");
  const [vp, setVp] = useState(0);
  const [unit, setUnit] = useState(1e6);
  const ranges = xpOpponentRanges(vp * unit, mode, tiers);
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div
          className="mode-switch"
          role="tablist"
          aria-label={t("mode-label")}
        >
          {(["attacker", "target"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => setMode(item)}
            >
              {t(`modes.${item}`)}
            </button>
          ))}
        </div>
        <label className="calculator-field">
          {t("fields.my-vp")}
          <div className="unit-input">
            <NumberStepper
              label={t("fields.my-vp")}
              value={vp}
              min={0}
              onChange={setVp}
            />
            <select
              aria-label={t("fields.unit")}
              value={unit}
              onChange={(event) => setUnit(Number(event.target.value))}
            >
              {units.map(([label, value]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </label>
      </section>
      <section className="calculator-card">
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("columns.rate")}</th>
                <th>{t("columns.opponent-vp")}</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((range) => (
                <tr key={range.rate}>
                  <td className="value">{range.rate}%</td>
                  <td data-testid={`xp-range-${range.rate}`}>
                    {rangeLabel(range.minimum, range.maximum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DemoAttackTroops({
  cityParameters,
  percentages,
}: {
  cityParameters: CityParameters;
  percentages: Record<League, number>;
}) {
  const t = useTranslations("demo-attack-troops");
  const [cityLevel, setCityLevel] = useState(1);
  const [league, setLeague] = useSyncedLeague();
  const result = league
    ? demoAttackTroops(cityLevel, league, cityParameters, percentages)
    : null;
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields">
          <LeagueSelect
            label={t("fields.league")}
            value={league}
            onChange={setLeague}
          />
          <label className="calculator-field">
            {t("fields.city-level")}
            <NumberStepper
              label={t("fields.city-level")}
              value={cityLevel}
              min={1}
              max={200}
              onChange={(value) => setCityLevel(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      {result ? (
        <section className="calculator-card result-grid">
          <div className="total-box">
            <span className="label">{t("wall")}</span>
            <strong className="value" data-testid="demo-wall">
              {formatGameNumber(result.wall)}
            </strong>
          </div>
          <div className="total-box">
            <span className="label">
              {t("maximum", { percentage: result.percentage })}
            </span>
            <strong className="value emerald" data-testid="demo-troops">
              {formatGameNumber(result.troops)}
            </strong>
          </div>
        </section>
      ) : (
        <p className="empty-state" role="status">
          {t("select-league")}
        </p>
      )}
    </div>
  );
}

export function CombatCalculators({
  cityParameters,
  xpTiers = defaultXpTiers,
  demoPercentages = defaultDemoPercentages,
  availability = { xp: true, demo: true },
  // Bloc 53/F: the Level Up reference's cross-link passes ?open=xp so it
  // lands directly on the XP Gain Rate calculator (the closest match for
  // its troop-leveling data) instead of always defaulting to whichever tab
  // is firstAvailable.
  initialTool,
}: {
  cityParameters: CityParameters;
  xpTiers?: XpTier[];
  demoPercentages?: Record<League, number>;
  availability?: { xp: boolean; demo: boolean };
  initialTool?: "xp" | "demo";
}) {
  const tools = useTranslations("tools"),
    xp = useTranslations("xp-gain-rate"),
    demo = useTranslations("demo-attack-troops");
  const first = availability.xp ? "xp" : availability.demo ? "demo" : undefined;
  const [active, setActive] = useState<"xp" | "demo" | undefined>(
    initialTool && availability[initialTool] ? initialTool : first,
  );
  return (
    <div className="city-calculators">
      <nav
        className="calculator-tabs tabs"
        role="tablist"
        aria-label={tools("combat-tabs")}
      >
        {/* Bloc 32/C: not-yet-implemented placeholders, ordered ahead of the
            2 working tools — permanently disabled, no Calculator DB row. */}
        <button
          type="button"
          role="tab"
          aria-selected={false}
          disabled
          title={tools("comingSoon")}
        >
          <TabLabel
            label={tools("combat-simulator")}
            badge={tools("comingSoon")}
          />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          disabled
          title={tools("comingSoon")}
        >
          <TabLabel label={tools("enemy-troops")} badge={tools("comingSoon")} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "xp"}
          disabled={!availability.xp}
          title={!availability.xp ? tools("calculator-unavailable") : undefined}
          onClick={() => setActive("xp")}
        >
          <TabLabel
            label={xp("name")}
            badge={
              !availability.xp ? tools("calculator-unavailable") : undefined
            }
          />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "demo"}
          disabled={!availability.demo}
          title={
            !availability.demo ? tools("calculator-unavailable") : undefined
          }
          onClick={() => setActive("demo")}
        >
          <TabLabel
            label={demo("name")}
            badge={
              !availability.demo ? tools("calculator-unavailable") : undefined
            }
          />
        </button>
      </nav>
      {active === "xp" ? (
        <XpGainRate tiers={xpTiers} />
      ) : active === "demo" ? (
        <DemoAttackTroops
          cityParameters={cityParameters}
          percentages={demoPercentages}
        />
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
