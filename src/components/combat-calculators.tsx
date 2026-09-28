"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatGameNumber } from "../lib/format";
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
import { TabList, TabPanel } from "./tabs";
import { AmountUnitField, Field, type AmountUnit } from "./tool-fields";
import { SummarySection, SummaryTile } from "./tool-tiles";
import { ShieldIcon, SwordIcon, SwordsIcon, WallIcon } from "./tool-icons";
import { useNarrowViewport } from "./use-narrow-viewport";
import { useSyncedLeague } from "./use-synced-league";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";

/**
 * The tier's rate, spaced the way the reader's own language spaces a percent
 * — "50 %" in French, "50%" in English — rather than by a hard-coded space.
 */
function ratePercent(rate: number, locale: string) {
  return (rate / 100).toLocaleString(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
}

function rangeLabel(minimum: number, maximum: number | null) {
  if (maximum === null) return `≥ ${formatGameNumber(minimum)}`;
  if (minimum === 0) return `< ${formatGameNumber(maximum)}`;
  return `${formatGameNumber(minimum)} – ${formatGameNumber(maximum)}`;
}

/**
 * Bloc 114/B: which of the five red steps each tier wears, by position.
 *
 * Keyed by index, not by rate: the five tiers are admin-editable
 * (formula_params), so two of them could carry the same rate and a lookup by
 * rate would then paint one of the pair with the other's color — the bug
 * Bloc 112 fixed on the ranking bands. Position is what the scale means.
 *
 * The two columns are not the same ramp, and deliberately so. Attacking, the
 * step tracks the XP I stand to gain: more XP, deeper red. Being attacked, it
 * tracks how far above me the opponent is — a foe at 250% of my VP (the 0%
 * tier) is the dangerous one, so the deepest step sits at the top of that
 * column and the rest of it, where the opponent is at or below my own weight,
 * shares the middle step.
 */
const xpTileSteps: Record<XpMode, readonly string[]> = {
  attacker: ["s0", "s50", "s100", "s150", "s200"],
  target: ["s200", "s150", "s100", "s100", "s100"],
};

function XpModeColumn({
  mode,
  icon,
  title,
  tiers,
  vp,
}: {
  mode: XpMode;
  icon: React.ReactNode;
  title: string;
  tiers: XpTier[];
  vp: number;
}) {
  const t = useTranslations("xp-gain-rate");
  const locale = useLocale();
  const headingId = `xp-column-${mode}`;
  const ranges = xpOpponentRanges(vp, mode, tiers);
  return (
    <section className="calculator-card xp-column">
      <h2 className="calculator-heading xp-column-title" id={headingId}>
        {icon}
        {title}
      </h2>
      <ul className="xp-tiles" aria-labelledby={headingId}>
        {ranges.map((range, index) => (
          <li
            key={index}
            className={`xp-tile xp-tile-${xpTileSteps[mode][index]}`}
          >
            <p className="xp-tile-rate">
              <span className="xp-tile-figure">
                {ratePercent(range.rate, locale)}
                <small>{t("of-xp")}</small>
              </span>
              <small className="xp-tile-who">{t(`xp-for.${mode}`)}</small>
            </p>
            <p className="xp-tile-range">
              <small className="xp-tile-caption">{t("opponent-vp")}</small>
              <span
                className="xp-tile-value"
                data-testid={`xp-range-${mode}-${index}`}
              >
                {rangeLabel(range.minimum, range.maximum)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Bloc 114/B: both roles at once.
 *
 * The attacker/target switch is gone. It hid exactly the half of the answer a
 * reader needs to compare — what I gain by attacking someone, against what
 * they gain by attacking me — behind a click, and the two columns fit side by
 * side at the same VP.
 */
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
  const [vp, setVp] = useState(0);
  const [unit, setUnit] = useState<AmountUnit>(1_000_000);
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <div className="calculator-fields-inline">
          <AmountUnitField
            label={t("fields.my-vp")}
            unitLabel={t("fields.unit")}
            amount={vp}
            unit={unit}
            onAmountChange={setVp}
            onUnitChange={setUnit}
            className="city-level-target xp-vp-field"
          />
        </div>
      </section>
      {/* Bloc 92/H1: the ranges recompute silently as the VP changes, so a
          permanently-mounted live region announces them. */}
      <div className="xp-columns" aria-live="polite">
        <XpModeColumn
          mode="attacker"
          icon={<SwordIcon />}
          title={t("modes.attacker")}
          tiers={tiers}
          vp={vp * unit}
        />
        <XpModeColumn
          mode="target"
          icon={<ShieldIcon />}
          title={t("modes.target")}
          tiers={tiers}
          vp={vp * unit}
        />
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
  const game = useTranslations("game");
  // The chip drops the city level on a phone, where the section's own
  // heading right above it already states the level.
  const narrow = useNarrowViewport();
  const [cityLevel, setCityLevel] = useState(1);
  const [league, setLeague] = useSyncedLeague();
  const result = league
    ? demoAttackTroops(cityLevel, league, cityParameters, percentages)
    : null;
  return (
    <div className="calculator-stack">
      {/* Bloc 114/C: one parameters card. The target-city level used to sit
          inside the result tile (Bloc 88/C), which put an input among the
          figures it drives; it belongs beside the league it is read with. */}
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
            label={t("fields.city-level")}
            value={cityLevel}
            min={1}
            max={200}
            className="city-level-target demo-attack-level-field"
            onChange={(value) => setCityLevel(Math.floor(value))}
          />
        </div>
      </section>
      {/* Bloc 92/H1: permanently-mounted live region, so both the
          placeholder->result transition and later recomputes are announced. */}
      <div aria-live="polite">
        {result && league ? (
          <SummarySection
            title={t("result")}
            recall={
              narrow
                ? t("recall-short", { league: game(`leagues.${league}`) })
                : t("recall", {
                    league: game(`leagues.${league}`),
                    level: cityLevel,
                  })
            }
          >
            <SummaryTile
              icon={<WallIcon />}
              label={t("wall")}
              value={formatGameNumber(result.wall)}
              row
              wide
              testId="demo-wall"
            />
            <SummaryTile
              icon={<SwordsIcon />}
              label={t("maximum")}
              value={formatGameNumber(result.troops)}
              highlight
              row
              wide
              testId="demo-troops"
            />
          </SummarySection>
        ) : (
          // Bloc 92/A11y (Codex PR #116): no role="status" — the live region
          // around it already announces this placeholder.
          <p className="empty-state">{t("select-league")}</p>
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
      <TabList<"xp" | "demo">
        idPrefix="combat-tools"
        label={tools("combat-tabs")}
        active={active}
        onSelect={setActive}
        tabs={[
          // Bloc 32/C: not-yet-implemented placeholders, ordered ahead of the
          // 2 working tools — permanently disabled, no Calculator DB row and
          // so no panel to point at. Bloc 114/A.1: a "Bientôt" pill rather
          // than the asterisked sentence a switched-off tool wears — this is
          // a promise, not a warning, and the sentence stays as the tooltip.
          {
            key: "combat-simulator" as const,
            label: tools("combat-simulator"),
            available: false,
            unavailableLabel: tools("comingSoonShort"),
            unavailableTitle: tools("comingSoon"),
            badgeStyle: "pill" as const,
            hasPanel: false,
          },
          {
            key: "enemy-troops" as const,
            label: tools("enemy-troops"),
            available: false,
            unavailableLabel: tools("comingSoonShort"),
            unavailableTitle: tools("comingSoon"),
            badgeStyle: "pill" as const,
            hasPanel: false,
          },
          {
            key: "xp" as const,
            label: xp("name"),
            available: availability.xp,
            unavailableLabel: tools("calculator-unavailable"),
          },
          {
            key: "demo" as const,
            label: demo("name"),
            available: availability.demo,
            unavailableLabel: tools("calculator-unavailable"),
          },
        ]}
      />
      {active === "xp" ? (
        <TabPanel idPrefix="combat-tools" tabKey="xp">
          <XpGainRate
            tiers={xpTiers}
            levelUpReferenceActive={levelUpReferenceActive}
          />
        </TabPanel>
      ) : active === "demo" ? (
        <TabPanel idPrefix="combat-tools" tabKey="demo">
          <DemoAttackTroops
            cityParameters={cityParameters}
            percentages={demoPercentages}
          />
        </TabPanel>
      ) : (
        <p className="empty-state">{tools("calculators-unavailable")}</p>
      )}
    </div>
  );
}
