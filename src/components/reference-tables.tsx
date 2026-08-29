"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties } from "react";
import {
  combatSlotNameTranslationKeys,
  equipmentFamilyTranslationKeys,
  equipmentRarityTranslationKeys,
  equipmentSkillTranslationKeys,
  equipmentSlotTranslationKeys,
  expeditionFamilyTranslationKeys,
  expeditionSlotTranslationKeys,
  expeditionStatTranslationKeys,
} from "../i18n/game-translation-keys";
import {
  equipmentSlotLayout,
  rarityOrder,
  type EquipmentFamily,
  type EquipmentRarity,
  type EquipmentSkill,
  type EquipmentSlot,
} from "../lib/equipment";
import { expeditionSlotLayout } from "../lib/expedition-equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import { equipmentImagePath, filterButtonColor } from "../lib/game-images";
import { formatGameNumber } from "../lib/city-calculators";
import {
  combatValueAtStar,
  defaultCombatGemSlotsBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionStarIncrements,
  expeditionValueAtStar,
  mergeCostRarityKeys,
  type CombatGemSlotsBase,
  type CombatReferenceRow,
  type CombatSkydustBase,
  type ExpeditionDismantleBase,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { GameImage } from "./game-image";

// Bloc 39: every equipment item now renders as a tile (base 1★ value, no
// star selector) instead of a table row — 1★ is a fixed constant here, not
// user-selectable state.
const TILE_STAR = 1;

// Bloc 41/A: the family filter/set-block order (Combat and Expedition each
// have their own). Hoisted to module scope, not re-declared per render —
// an inline array literal changes identity every render, which would defeat
// the useMemo below it feeds (or trip react-hooks/exhaustive-deps).
const combatFamilies = ["Attaque", "Défense", "Or", "Troupes/Vitesse"] as const;
const expeditionFamilies = [
  "Or",
  "Équipement",
  "Consommables",
  "Troupes",
] as const;

export function formatPercent(value: number | null, locale: string) {
  return value === null
    ? "—"
    : `${value.toLocaleString(locale, { maximumFractionDigits: 2 })}%`;
}

// Bloc 35/2.2: the destruction-currency value is constant per rarity, so a
// 5-column rarity-indexed table replaces what used to be a redundant column
// on every row of the main table — one row of values, rarity as columns,
// same layout as the admin config table it's sourced from.
function RarityValueTable({
  title,
  rarityColumnLabel,
  base,
  rarityLabel,
}: {
  title: string;
  rarityColumnLabel: string;
  base: Record<string, number>;
  rarityLabel: (value: string) => string;
}) {
  return (
    <section className="calculator-card ranking-table-wrap reference-rarity-table">
      <h2>{title}</h2>
      <table className="ranking-table">
        <thead>
          <tr>
            <th>{rarityColumnLabel}</th>
            {mergeCostRarityKeys.map((key) => (
              <th key={key}>{rarityLabel(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{title}</th>
            {mergeCostRarityKeys.map((key) => (
              <td key={key}>{formatGameNumber(base[key])}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

// Bloc 40/D-E-F: reverses Bloc 39's dim-not-hide design — family and rarity
// both start with everything selected (so every tile shows at load, in its
// normal rarity color, no dim/highlight), both are cumulative multi-select
// (toggling one family or rarity on/off doesn't affect the others), and
// deselecting one now actually removes the matching tiles from the grid
// instead of just dimming them (see the filter in CombatReferenceTable/
// ExpeditionReferenceTable below). The star-level filter is still gone
// entirely: tiles only ever show the base 1★ value.
function Filters({
  families,
  selectedFamilies,
  toggleFamily,
  rarities,
  toggleRarity,
  familyLabel,
}: {
  families: readonly string[];
  selectedFamilies: Set<string>;
  toggleFamily: (value: string) => void;
  rarities: Set<string>;
  toggleRarity: (value: string) => void;
  familyLabel: (value: string) => string;
}) {
  const t = useTranslations("references");
  const game = useTranslations("game");
  return (
    <div className="reference-filters" aria-label={t("filters.label")}>
      <div>
        <span className="filter-label">{t("filters.family")}</span>
        <div className="family-buttons">
          {families.map((item) => {
            const color = filterButtonColor(item);
            return (
              <button
                type="button"
                aria-pressed={selectedFamilies.has(item)}
                key={item}
                style={
                  color
                    ? ({ "--pill-color": color } as CSSProperties)
                    : undefined
                }
                onClick={() => toggleFamily(item)}
              >
                {familyLabel(item)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <span className="filter-label">{t("filters.rarity")}</span>
        <div className="family-buttons">
          {rarityOrder.map((item) => {
            const color = filterButtonColor(item);
            return (
              <button
                type="button"
                aria-pressed={rarities.has(item)}
                key={item}
                style={
                  color
                    ? ({ "--pill-color": color } as CSSProperties)
                    : undefined
                }
                onClick={() => toggleRarity(item)}
              >
                {game(
                  `rarities.${equipmentRarityTranslationKeys[item as EquipmentRarity]}`,
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useToggleSet(initial: readonly string[]) {
  const [values, setValues] = useState(() => new Set(initial));
  const toggle = (value: string) =>
    setValues((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  return [values, toggle] as const;
}

function useFilters(families: readonly string[]) {
  const [selectedFamilies, toggleFamily] = useToggleSet(families);
  const [rarities, toggleRarity] = useToggleSet(rarityOrder);
  return {
    selectedFamilies,
    toggleFamily,
    rarities,
    toggleRarity,
  };
}

function matchesFilters(
  set: { family: string; rarity: string },
  filters: { selectedFamilies: Set<string>; rarities: Set<string> },
) {
  return (
    filters.selectedFamilies.has(set.family) && filters.rarities.has(set.rarity)
  );
}

// Bloc 39: one tile block per equipment set, tiles in the same slot order
// as the Combat/Expedition Equipment Simulators (equipmentSlotLayout /
// expeditionSlotLayout) so the two stay cross-referenceable. Bloc 41/A: set
// blocks are sorted by family (in the same order as the family filter
// buttons) instead of the order their rows first appear in the data file —
// that file doesn't consistently group by family (it varies rarity by
// rarity), so without this sort the grid's family order was effectively
// random. The sort is stable, so within a family sets keep their original
// relative order.
function groupBySet<
  Row extends { rarity: string; family: string; set_name: string },
>(
  rows: readonly Row[],
  slotOf: (row: Row) => string,
  slotLayout: readonly string[],
  familyOrder: readonly string[],
) {
  const bySet = new Map<
    string,
    { rarity: string; family: string; set_name: string; rows: Row[] }
  >();
  for (const row of rows) {
    const key = `${row.rarity}|${row.family}|${row.set_name}`;
    let set = bySet.get(key);
    if (!set) {
      set = {
        rarity: row.rarity,
        family: row.family,
        set_name: row.set_name,
        rows: [],
      };
      bySet.set(key, set);
    }
    set.rows.push(row);
  }
  for (const set of bySet.values())
    set.rows.sort(
      (a, b) => slotLayout.indexOf(slotOf(a)) - slotLayout.indexOf(slotOf(b)),
    );
  return Array.from(bySet.values()).sort(
    (a, b) => familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family),
  );
}

function CombatTile({
  row,
  rarityLabel,
  familyLabel,
  slotLabel,
  slotNameLabel,
  skillLabel,
  familyColor,
  gemSlotsBase,
  locale,
  t,
}: {
  row: CombatReferenceRow;
  rarityLabel: (value: string) => string;
  familyLabel: (value: string) => string;
  slotLabel: (value: string) => string;
  slotNameLabel: (value: string) => string;
  skillLabel: (value: string) => string;
  familyColor: string | undefined;
  gemSlotsBase: CombatGemSlotsBase;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const rarityVar = `var(--rarity-${rarityClassName(row.rarity)})`;
  // Codex review (PR #61): read the gem count from the same admin-editable
  // source as the Gemmes rarity summary below, not the static per-row
  // gem_slots field — the two can drift once an admin edits gemSlotsBase.
  const gemCount = gemSlotsBase[row.rarity as keyof CombatGemSlotsBase] ?? 0;
  return (
    <div
      className="reference-tile"
      style={
        {
          borderColor: rarityVar,
          background: `color-mix(in srgb, ${rarityVar} 14%, var(--surface))`,
        } as CSSProperties
      }
      data-rarity={row.rarity}
      data-slot={row.slot_type}
      aria-label={`${rarityLabel(row.rarity)} — ${familyLabel(row.family)} — ${row.set_name} — ${slotLabel(row.slot_type)}`}
    >
      <div className="reference-tile-head">
        <span
          className="reference-tile-slot"
          style={familyColor ? { color: familyColor } : undefined}
        >
          {slotLabel(row.slot_type)}
          {row.slot_name ? ` (${slotNameLabel(row.slot_name)})` : ""}
        </span>
        {gemCount > 0 ? (
          <span className="reference-tile-gems">
            {t("gem-count", { count: gemCount })}
          </span>
        ) : null}
      </div>
      <div className="reference-tile-body">
        <GameImage
          src={equipmentImagePath(row.family, row.rarity, row.slot_type)}
          alt={row.set_name}
          className="reference-equipment-image"
          fallback={null}
        />
        <div className="reference-tile-skills">
          {([1, 2, 3, 4] as const).map((number) => {
            const skill = row[`skill_${number}`];
            const value = combatValueAtStar(
              skill,
              row[`value_${number}_pct`],
              TILE_STAR,
            );
            return (
              <span
                className="skill-value-row"
                key={number}
                data-skill={number}
              >
                {skill === "none" ? (
                  // Bloc 37/G: explicitly no skill at this slot — distinct
                  // from "still needs data" below.
                  "—"
                ) : skill && skill !== "Inconnu" ? (
                  <>
                    {skillLabel(skill)}
                    <strong className="reference-value">
                      {formatPercent(value, locale)}
                    </strong>
                  </>
                ) : (
                  <span className="unconfirmed">{t("complete-in-admin")}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CombatReferenceTable({
  rows,
  skydustBase = defaultCombatSkydustBase,
  gemSlotsBase = defaultCombatGemSlotsBase,
}: {
  rows: readonly CombatReferenceRow[];
  skydustBase?: CombatSkydustBase;
  gemSlotsBase?: CombatGemSlotsBase;
}) {
  const locale = useLocale();
  const t = useTranslations("combat-equipment");
  const game = useTranslations("game");
  const familyLabel = (value: string) =>
    game(
      `families.${equipmentFamilyTranslationKeys[value as EquipmentFamily]}`,
    );
  const rarityLabel = (value: string) =>
    game(
      `rarities.${equipmentRarityTranslationKeys[value as EquipmentRarity]}`,
    );
  const slotLabel = (value: string) =>
    game(`slots.${equipmentSlotTranslationKeys[value as EquipmentSlot]}`);
  const slotNameLabel = (value: string) =>
    value ? game(`weapon-types.${combatSlotNameTranslationKeys[value]}`) : "";
  const skillLabel = (value: string) =>
    game(`skills.${equipmentSkillTranslationKeys[value as EquipmentSkill]}`);
  const families = combatFamilies;
  const filters = useFilters(families);
  const sets = useMemo(
    () =>
      groupBySet(
        rows,
        (row) => row.slot_type,
        equipmentSlotLayout,
        combatFamilies,
      ),
    [rows],
  );
  const filteredSets = useMemo(
    () => sets.filter((set) => matchesFilters(set, filters)),
    [sets, filters],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <Filters families={families} familyLabel={familyLabel} {...filters} />
      </section>
      {!filteredSets.length ? (
        <p className="empty-state">{t("empty")}</p>
      ) : null}
      {filteredSets.length ? (
        <div className="reference-tile-blocks">
          {filteredSets.map((set) => (
            <section
              className="reference-tile-block"
              key={`${set.rarity}-${set.family}-${set.set_name}`}
              data-family={set.family}
              data-rarity={set.rarity}
            >
              <h3 className="reference-tile-block-title">{set.set_name}</h3>
              <div className="reference-tile-grid">
                {set.rows.map((row) => (
                  <CombatTile
                    key={row.slot_type}
                    row={row}
                    rarityLabel={rarityLabel}
                    familyLabel={familyLabel}
                    slotLabel={slotLabel}
                    slotNameLabel={slotNameLabel}
                    skillLabel={skillLabel}
                    familyColor={filterButtonColor(row.family)}
                    gemSlotsBase={gemSlotsBase}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      <RarityValueTable
        title={t("columns.skydust")}
        rarityColumnLabel={t("columns.rarity")}
        base={skydustBase}
        rarityLabel={rarityLabel}
      />
      <RarityValueTable
        title={t("columns.gems")}
        rarityColumnLabel={t("columns.rarity")}
        base={gemSlotsBase}
        rarityLabel={rarityLabel}
      />
    </div>
  );
}

function ExpeditionTile({
  row,
  rarityLabel,
  slotLabel,
  familyLabel,
  statLabel,
  familyColor,
  increments,
  locale,
  t,
}: {
  row: ExpeditionReferenceRow;
  rarityLabel: (value: string) => string;
  slotLabel: (value: string) => string;
  familyLabel: (value: string) => string;
  statLabel: (value: string) => string;
  familyColor: string | undefined;
  increments: ExpeditionStarIncrements;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const rarityVar = `var(--rarity-${rarityClassName(row.rarity)})`;
  const primary = expeditionValueAtStar(
    row.family,
    row.type_stat_pct,
    TILE_STAR,
    increments,
  );
  const secondaryName = row.secondary_stat_name.replace("_expé", "");
  const secondary = expeditionValueAtStar(
    secondaryName,
    row.secondary_stat_pct,
    TILE_STAR,
    increments,
  );
  const value = (result: ReturnType<typeof expeditionValueAtStar>) => (
    <>
      <strong className="reference-value">
        {formatPercent(result.value, locale)}
      </strong>
      {result.value !== null && !result.confirmed ? (
        <small className="unconfirmed">{t("unconfirmed-label")}</small>
      ) : null}
    </>
  );
  return (
    <div
      className="reference-tile"
      style={
        {
          borderColor: rarityVar,
          background: `color-mix(in srgb, ${rarityVar} 14%, var(--surface))`,
        } as CSSProperties
      }
      data-rarity={row.rarity}
      data-slot={row.slot}
      aria-label={`${rarityLabel(row.rarity)} — ${familyLabel(row.family)} — ${row.set_name} — ${slotLabel(row.slot)}`}
    >
      <div className="reference-tile-head">
        <span
          className="reference-tile-slot"
          style={familyColor ? { color: familyColor } : undefined}
        >
          {slotLabel(row.slot)}
        </span>
      </div>
      <div className="reference-tile-body">
        <GameImage
          src={equipmentImagePath(row.family, row.rarity, row.slot)}
          alt={row.set_name}
          className="reference-equipment-image"
          fallback={null}
        />
        <div className="reference-tile-skills">
          <span className="skill-value-row">
            {familyLabel(row.family)}
            {value(primary)}
          </span>
          <span className="skill-value-row">
            {secondaryName ? (
              <>
                {statLabel(secondaryName)}
                {value(secondary)}
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ExpeditionReferenceTable({
  rows,
  increments = defaultExpeditionStarIncrements,
  dismantleBase = defaultExpeditionDismantleBase,
}: {
  rows: readonly ExpeditionReferenceRow[];
  increments?: ExpeditionStarIncrements;
  dismantleBase?: ExpeditionDismantleBase;
}) {
  const locale = useLocale();
  const t = useTranslations("expedition-equipment");
  const game = useTranslations("game");
  const familyLabel = (value: string) =>
    game(`families.${expeditionFamilyTranslationKeys[value]}`);
  const slotLabel = (value: string) =>
    game(`slots.${expeditionSlotTranslationKeys[value]}`);
  const rarityLabel = (value: string) =>
    game(
      `rarities.${equipmentRarityTranslationKeys[value as EquipmentRarity]}`,
    );
  const statLabel = (value: string) =>
    game(`stats.${expeditionStatTranslationKeys[value]}`);
  const families = expeditionFamilies;
  const filters = useFilters(families);
  const sets = useMemo(
    () =>
      groupBySet(
        rows,
        (row) => row.slot,
        expeditionSlotLayout,
        expeditionFamilies,
      ),
    [rows],
  );
  const filteredSets = useMemo(
    () => sets.filter((set) => matchesFilters(set, filters)),
    [sets, filters],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <Filters families={families} familyLabel={familyLabel} {...filters} />
      </section>
      {!filteredSets.length ? (
        <p className="empty-state">{t("empty")}</p>
      ) : null}
      {filteredSets.length ? (
        <div className="reference-tile-blocks">
          {filteredSets.map((set) => (
            <section
              className="reference-tile-block"
              key={`${set.rarity}-${set.family}-${set.set_name}`}
              data-family={set.family}
              data-rarity={set.rarity}
            >
              <h3 className="reference-tile-block-title">{set.set_name}</h3>
              <div className="reference-tile-grid">
                {set.rows.map((row) => (
                  <ExpeditionTile
                    key={row.slot}
                    row={row}
                    rarityLabel={rarityLabel}
                    slotLabel={slotLabel}
                    familyLabel={familyLabel}
                    statLabel={statLabel}
                    familyColor={filterButtonColor(row.family)}
                    increments={increments}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      <RarityValueTable
        title={t("columns.dismantle-terradust")}
        rarityColumnLabel={t("columns.rarity")}
        base={dismantleBase}
        rarityLabel={rarityLabel}
      />
    </div>
  );
}

export function ReferenceTables({
  combatRows,
  expeditionRows,
  expeditionIncrements,
  availability = { combat: true, expedition: true },
}: {
  combatRows: readonly CombatReferenceRow[];
  expeditionRows: readonly ExpeditionReferenceRow[];
  expeditionIncrements?: ExpeditionStarIncrements;
  availability?: Record<"combat" | "expedition", boolean>;
}) {
  const t = useTranslations("references");
  const [active, setActive] = useState<"combat" | "expedition" | undefined>(
    availability.combat
      ? "combat"
      : availability.expedition
        ? "expedition"
        : undefined,
  );
  return (
    <div>
      <nav
        className="calculator-tabs tabs"
        role="tablist"
        aria-label={t("tabs-label")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "combat"}
          disabled={!availability.combat}
          title={!availability.combat ? t("disabled-tooltip") : undefined}
          onClick={() => setActive("combat")}
        >
          {t("catalog.combat-equipment")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "expedition"}
          disabled={!availability.expedition}
          title={!availability.expedition ? t("disabled-tooltip") : undefined}
          onClick={() => setActive("expedition")}
        >
          {t("catalog.expedition-equipment")}
        </button>
      </nav>
      {active === "combat" ? (
        <CombatReferenceTable rows={combatRows} />
      ) : active === "expedition" ? (
        <ExpeditionReferenceTable
          rows={expeditionRows}
          increments={expeditionIncrements}
        />
      ) : (
        <p className="empty-state">{t("unavailable")}</p>
      )}
    </div>
  );
}
