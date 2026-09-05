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
import { LeagueButtons } from "./league-select";
import { NumberStepper } from "./number-stepper";
import { TabLabel } from "./tab-label";
import { handleTablistKeydown } from "./use-tablist-keyboard";
import { useSyncedLeague } from "./use-synced-league";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";

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

function XpGainRate({
  tiers,
  levelUpReferenceActive,
}: {
  tiers: XpTier[];
  levelUpReferenceActive: boolean;
}) {
  const t = useTranslations("xp-gain-rate");
  const references = useTranslations("references");
  const crossReference = useTranslations("crossReference");
  const levelUpReference = referenceCatalog.find(
    (item) => item.slug === "level-up",
  )!;
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
          onKeyDown={handleTablistKeydown}
        >
          {(["attacker", "target"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              id={`combat-mode-tab-${item}`}
              aria-controls={`combat-mode-panel-${item}`}
              aria-selected={mode === item}
              tabIndex={mode === item ? 0 : -1}
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
      {/* Bloc 92/M2 + H1: the mode switch above is a role="tablist"; both
          modes feed this one table, so the tabpanel's id/labelledby follow the
          active mode (only the active panel is rendered, mirroring
          reference-tables.tsx). It doubles as the H1 live region so the
          recomputed opponent-VP ranges are announced. */}
      <div
        role="tabpanel"
        id={`combat-mode-panel-${mode}`}
        aria-labelledby={`combat-mode-tab-${mode}`}
        tabIndex={0}
        aria-live="polite"
      >
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
      {/* Bloc 67: the missing tool->reference direction, added the same
          way Combat/Expedition Equipment/Gemmes/Templiers already have it —
          the reference already links here (?open=xp), but nothing linked
          back until now. Bloc 68 review: Progression's own active flag is
          independent from this xp-gain-rate tool's (Bloc 33/G) — hidden
          when an admin disables the reference on its own, same as the
          catalog/search paths already do, so the link never sends visitors
          to a page that only shows the "unavailable" message. */}
      {levelUpReferenceActive && (
        <CrossReferenceLink
          href={referenceHref("level-up")}
          title={references("catalog.level-up")}
          image={levelUpReference.image}
          fallbackImage={levelUpReference.fallbackImage}
          label={crossReference("toReference")}
        />
      )}
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
      {/* Bloc 88/A: the league block stays full-width; only its buttons take
          50% of it (league-buttons-half, desktop) — mobile keeps the 2x3
          grid (league-buttons-grid). Auto-selection from Player Settings is
          unchanged (useSyncedLeague). */}
      <section className="calculator-card">
        <div className="calculator-field demo-attack-league-field">
          {t("fields.league")}
          <LeagueButtons
            label={t("fields.league")}
            value={league}
            onChange={setLeague}
            className="league-buttons-grid league-buttons-half"
          />
        </div>
      </section>
      {/* Bloc 88/B-E → Bloc 89: a grey Boutique-style tile below (not beside)
          the league block, holding the still-editable target-city-level field
          (Bloc 88/C) next to the wall + maximum-troops results (Bloc 88/D),
          the percentage removed (Bloc 88/E). Bloc 89: the tile is half-width
          on desktop (A) with its three parts in equal thirds (D), and each
          result value moves into its own nested, slightly-lighter mini-tile
          with centered content (B-C). */}
      {/* Bloc 92/H1: aria-live sits on the tile itself, not a new wrapper — on
          desktop the tile is a 3-column grid whose result mini-tiles are lifted
          in via display:contents, so wrapping the wall/troops conditional in a
          div would break the equal-thirds layout. The tile is permanently
          mounted, so the placeholder->result transition and recomputes are both
          announced. */}
      <div className="demo-attack-tile" aria-live="polite">
        <label className="calculator-field demo-attack-tile-level">
          {t("fields.city-level")}
          <NumberStepper
            label={t("fields.city-level")}
            value={cityLevel}
            min={1}
            max={200}
            onChange={(value) => setCityLevel(Math.floor(value))}
          />
        </label>
        {result ? (
          <div className="demo-attack-tile-results">
            <div className="total-box demo-attack-inner-tile">
              <span className="label">{t("wall")}</span>
              <strong className="value" data-testid="demo-wall">
                {formatGameNumber(result.wall)}
              </strong>
            </div>
            <div className="total-box demo-attack-inner-tile">
              <span className="label">{t("maximum")}</span>
              <strong className="value emerald" data-testid="demo-troops">
                {formatGameNumber(result.troops)}
              </strong>
            </div>
          </div>
        ) : (
          <p className="empty-state demo-attack-tile-empty" role="status">
            {t("select-league")}
          </p>
        )}
      </div>
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
  // Bloc 68 review: the Progression reference's own independent active
  // flag (Bloc 33/G) — distinct from `availability.xp`, which is the
  // xp-gain-rate tool's own flag.
  levelUpReferenceActive = true,
}: {
  cityParameters: CityParameters;
  xpTiers?: XpTier[];
  demoPercentages?: Record<League, number>;
  availability?: { xp: boolean; demo: boolean };
  initialTool?: "xp" | "demo";
  levelUpReferenceActive?: boolean;
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
        onKeyDown={handleTablistKeydown}
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
          id="combat-tools-tab-xp"
          aria-controls="combat-tools-panel-xp"
          aria-selected={active === "xp"}
          tabIndex={active === "xp" ? 0 : -1}
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
          id="combat-tools-tab-demo"
          aria-controls="combat-tools-panel-demo"
          aria-selected={active === "demo"}
          tabIndex={active === "demo" ? 0 : -1}
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
        <div
          role="tabpanel"
          id="combat-tools-panel-xp"
          aria-labelledby="combat-tools-tab-xp"
          tabIndex={0}
        >
          <XpGainRate
            tiers={xpTiers}
            levelUpReferenceActive={levelUpReferenceActive}
          />
        </div>
      ) : active === "demo" ? (
        <div
          role="tabpanel"
          id="combat-tools-panel-demo"
          aria-labelledby="combat-tools-tab-demo"
          tabIndex={0}
        >
          <DemoAttackTroops
            cityParameters={cityParameters}
            percentages={demoPercentages}
          />
        </div>
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
