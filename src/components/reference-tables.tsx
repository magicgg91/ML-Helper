"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import {
  combatValueAtStar,
  expeditionValueAtStar,
  type CombatReferenceRow,
  type ExpeditionReferenceRow,
} from "../lib/reference-equipment";

function formatPercent(value: number | null, locale: string) {
  return value === null
    ? "—"
    : `${value.toLocaleString(locale, { maximumFractionDigits: 2 })}%`;
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
}) {
  const t = useTranslations("references");
  const game = useTranslations("game");
  return (
    <div className="reference-filters" aria-label={t("filters.label")}>
      <div>
        <span className="filter-label">{t("filters.family")}</span>
        <div className="family-buttons">
          {families.map((item) => (
            <button
              type="button"
              aria-pressed={family === item}
              key={item}
              onClick={() => setFamily(item)}
            >
              {familyLabel(item)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="filter-label">{t("filters.rarity")}</span>
        <div className="family-buttons">
          {rarityOrder.map((item) => (
            <button
              type="button"
              aria-pressed={rarities.has(item)}
              key={item}
              onClick={() => toggleRarity(item)}
            >
              {game(
                `rarities.${equipmentRarityTranslationKeys[item as EquipmentRarity]}`,
              )}
            </button>
          ))}
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

function RarityBadge({ rarity, label }: { rarity: string; label: string }) {
  return (
    <span
      className={`rarity-badge rarity-${rarity
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")}`}
    >
      {label}
    </span>
  );
}

export function CombatReferenceTable({
  rows,
}: {
  rows: readonly CombatReferenceRow[];
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
  const filters = useFilters(["Or", "Troupes/Vitesse", "Défense", "Attaque"]);
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
          families={["Or", "Troupes/Vitesse", "Défense", "Attaque"]}
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
                <th>{t("columns.rarity")}</th>
                <th>{t("columns.set")}</th>
                <th>{t("columns.skydust")}</th>
                <th>{t("columns.gems")}</th>
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
                    <RarityBadge
                      rarity={row.rarity}
                      label={rarityLabel(row.rarity)}
                    />
                  </td>
                  <td>{row.set_name}</td>
                  <td>{row.skydust}</td>
                  <td>{row.gem_slots}</td>
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
    </div>
  );
}

export function ExpeditionReferenceTable({
  rows,
}: {
  rows: readonly ExpeditionReferenceRow[];
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
        <p className="unconfirmed-notice">
          {t("notice", { status: t("unconfirmed-assumption") })}
        </p>
        <Filters families={families} familyLabel={familyLabel} {...filters} />
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
                );
                const secondaryName = row.secondary_stat_name.replace(
                  "_expé",
                  "",
                );
                const secondary = expeditionValueAtStar(
                  secondaryName,
                  row.secondary_stat_pct,
                  filters.star,
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
    </div>
  );
}

export function ReferenceTables({
  combatRows,
  expeditionRows,
  availability = { combat: true, expedition: true },
}: {
  combatRows: readonly CombatReferenceRow[];
  expeditionRows: readonly ExpeditionReferenceRow[];
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
        <ExpeditionReferenceTable rows={expeditionRows} />
      ) : (
        <p className="empty-state">{t("unavailable")}</p>
      )}
    </div>
  );
}
