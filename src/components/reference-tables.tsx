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
  rarityOrder,
  type EquipmentFamily,
  type EquipmentRarity,
  type EquipmentSkill,
  type EquipmentSlot,
} from "../lib/equipment";
import { equipmentImagePath, filterButtonColor } from "../lib/game-images";
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
import { RarityBadge } from "./rarity-badge";

function formatPercent(value: number | null, locale: string) {
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
              <td key={key}>{base[key]}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function Filters({
  families,
  family,
  setFamily,
  rarities,
  toggleRarity,
  search,
  setSearch,
  star,
  setStar,
  familyLabel,
  wideFamilyColumn = false,
}: {
  families: readonly string[];
  family: string;
  setFamily: (value: string) => void;
  rarities: Set<string>;
  toggleRarity: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  star: number;
  setStar: (value: number) => void;
  familyLabel: (value: string) => string;
  // Bloc 35/4.1: Expedition's family labels ("Équipement", "Consommables", …)
  // run wider than Combat's, so its filter row needs a bit more of the grid
  // — taken from the rarity column, which has room to spare — to stay on
  // one line instead of falling back to horizontal scroll.
  wideFamilyColumn?: boolean;
}) {
  const t = useTranslations("references");
  const game = useTranslations("game");
  return (
    <div
      className={
        wideFamilyColumn
          ? "reference-filters reference-filters-wide-family"
          : "reference-filters"
      }
      aria-label={t("filters.label")}
    >
      <div>
        <span className="filter-label">{t("filters.family")}</span>
        <div className="family-buttons">
          {families.map((item) => {
            const color = filterButtonColor(item);
            return (
              <button
                type="button"
                aria-pressed={family === item}
                key={item}
                style={
                  color
                    ? ({ "--pill-color": color } as CSSProperties)
                    : undefined
                }
                onClick={() => setFamily(item)}
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
      <label>
        {t("filters.search")}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("filters.search-placeholder")}
        />
      </label>
      <label>
        {t("filters.star-level")}
        <select
          value={star}
          onChange={(event) => setStar(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <option value={item} key={item}>
              {item}★
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function useFilters(families: readonly string[]) {
  const [family, setFamily] = useState(families[0]);
  const [rarities, setRarities] = useState(() => new Set<string>(rarityOrder));
  const [search, setSearch] = useState("");
  const [star, setStar] = useState(1);
  const toggleRarity = (value: string) =>
    setRarities((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  return {
    family,
    setFamily,
    rarities,
    toggleRarity,
    search,
    setSearch,
    star,
    setStar,
  };
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
  const filters = useFilters(["Attaque", "Défense", "Or", "Troupes/Vitesse"]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          filters.rarities.has(row.rarity) &&
          row.family === filters.family &&
          `${row.set_name} ${slotLabel(row.slot_type)} ${slotNameLabel(row.slot_name)}`
            .toLocaleLowerCase(locale)
            .includes(filters.search.toLocaleLowerCase(locale)),
      ),
    // Translation functions change with the active locale, which is already a
    // dependency and intentionally refreshes the searchable labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters.rarities, filters.family, filters.search, locale],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <Filters
          families={["Attaque", "Défense", "Or", "Troupes/Vitesse"]}
          familyLabel={familyLabel}
          {...filters}
        />
      </section>
      <p className="reference-count">
        {t("row-count", { count: filtered.length, star: filters.star })}
      </p>
      {!filtered.length ? <p className="empty-state">{t("empty")}</p> : null}
      {filtered.length ? (
        <section className="calculator-card ranking-table-wrap">
          <table className="ranking-table reference-table">
            <thead>
              <tr>
                <th>{t("columns.image")}</th>
                <th>{t("columns.rarity")}</th>
                <th>{t("columns.set")}</th>
                <th>{t("columns.slot")}</th>
                {[1, 2, 3, 4].map((i) => (
                  <th key={i}>{t("columns.skill", { number: i })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={`${row.rarity}-${row.set_name}-${row.slot_type}-${index}`}
                >
                  <td>
                    <GameImage
                      src={equipmentImagePath(
                        row.family,
                        row.rarity,
                        row.slot_type,
                      )}
                      alt={row.set_name}
                      className="reference-equipment-image"
                      fallback={null}
                    />
                  </td>
                  <td>
                    <RarityBadge
                      rarity={row.rarity}
                      label={rarityLabel(row.rarity)}
                    />
                  </td>
                  <td>{row.set_name}</td>
                  <td>
                    {slotLabel(row.slot_type)}
                    {row.slot_name ? ` (${slotNameLabel(row.slot_name)})` : ""}
                  </td>
                  {([1, 2, 3, 4] as const).map((number) => {
                    const skill = row[`skill_${number}`];
                    const value = combatValueAtStar(
                      skill,
                      row[`value_${number}_pct`],
                      filters.star,
                    );
                    return (
                      <td key={number}>
                        {skill && skill !== "Inconnu" ? (
                          <>
                            {skillLabel(skill)}
                            <strong className="reference-value">
                              {formatPercent(value, locale)}
                            </strong>
                          </>
                        ) : (
                          <span className="unconfirmed">
                            {t("complete-in-admin")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
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
  const families = ["Or", "Équipement", "Consommables", "Troupes"] as const;
  const filters = useFilters(families);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          filters.rarities.has(row.rarity) &&
          row.family === filters.family &&
          `${row.set_name} ${slotLabel(row.slot)}`
            .toLocaleLowerCase(locale)
            .includes(filters.search.toLocaleLowerCase(locale)),
      ),
    // Translation functions change with the active locale, which is already a
    // dependency and intentionally refreshes the searchable labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filters.rarities, filters.family, filters.search, locale],
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <Filters
          families={families}
          familyLabel={familyLabel}
          wideFamilyColumn
          {...filters}
        />
      </section>
      <p className="reference-count">
        {t("row-count", { count: filtered.length, star: filters.star })}
      </p>
      {!filtered.length ? <p className="empty-state">{t("empty")}</p> : null}
      {filtered.length ? (
        <section className="calculator-card ranking-table-wrap">
          <table className="ranking-table reference-table">
            <thead>
              <tr>
                <th>{t("columns.image")}</th>
                <th>{t("columns.rarity")}</th>
                <th>{t("columns.set")}</th>
                <th>{t("columns.family")}</th>
                <th>{t("columns.slot")}</th>
                <th>{t("columns.type-stat")}</th>
                <th>{t("columns.secondary-stat")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const primary = expeditionValueAtStar(
                  row.family,
                  row.type_stat_pct,
                  filters.star,
                  increments,
                );
                const secondaryName = row.secondary_stat_name.replace(
                  "_expé",
                  "",
                );
                const secondary = expeditionValueAtStar(
                  secondaryName,
                  row.secondary_stat_pct,
                  filters.star,
                  increments,
                );
                const value = (
                  result: ReturnType<typeof expeditionValueAtStar>,
                ) => (
                  <>
                    <strong className="reference-value">
                      {formatPercent(result.value, locale)}
                    </strong>
                    {result.value !== null && !result.confirmed ? (
                      <small className="unconfirmed">
                        {t("unconfirmed-label")}
                      </small>
                    ) : null}
                  </>
                );
                return (
                  <tr
                    key={`${row.rarity}-${row.set_name}-${row.slot}-${index}`}
                  >
                    <td>
                      <GameImage
                        src={equipmentImagePath(
                          row.family,
                          row.rarity,
                          row.slot,
                        )}
                        alt={row.set_name}
                        className="reference-equipment-image"
                        fallback={null}
                      />
                    </td>
                    <td>
                      <RarityBadge
                        rarity={row.rarity}
                        label={rarityLabel(row.rarity)}
                      />
                    </td>
                    <td>{row.set_name}</td>
                    <td>{familyLabel(row.family)}</td>
                    <td>{slotLabel(row.slot)}</td>
                    <td>
                      {familyLabel(row.family)}
                      {value(primary)}
                    </td>
                    <td>
                      {secondaryName ? (
                        <>
                          {statLabel(secondaryName)}
                          {value(secondary)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
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
