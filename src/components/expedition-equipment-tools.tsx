"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties } from "react";
import { CrossReferenceLink } from "./cross-reference-link";
import { StarRating } from "./star-rating";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import {
  equipmentRarityTranslationKeys,
  expeditionFamilyTranslationKeys,
  expeditionSlotTranslationKeys,
  expeditionStatTranslationKeys,
} from "../i18n/game-translation-keys";
import {
  computeExpeditionSlot,
  computeExpeditionTotal,
  createEmptyExpeditionConfigs,
  expeditionFilterOrder,
  expeditionOptions,
  expeditionSlotLayout,
  findExpeditionEquipment,
  type ExpeditionConfigs,
  type ExpeditionFilter,
  type ExpeditionSelection,
  type ExpeditionSlot,
  type ExpeditionSlotState,
} from "../lib/expedition-equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import { equipmentImagePath, filterButtonColor } from "../lib/game-images";
import {
  defaultExpeditionStarIncrements,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { GameImage } from "./game-image";

const storageKey = "mlhelper_expedition_equipment_simulator";

// Bloc 31/E.2: fixed summary order, distinct from expeditionStatKeys' own
// admin/reference order — display-only, doesn't affect stored data.
const summaryStatOrder = [
  "Équipement",
  "Consommables",
  "Or",
  "Troupes",
  "Esquive",
  "Chance",
  "Perception",
  "Récupération",
  "Vitesse",
  "Vitalité",
] as const;

function isValidExpeditionState(
  value: unknown,
): value is ExpeditionSlotState[] {
  if (!Array.isArray(value) || value.length !== expeditionSlotLayout.length)
    return false;
  return value.every((slot: unknown) => {
    if (typeof slot !== "object" || slot === null) return false;
    const { equipment, star } = slot as Partial<ExpeditionSlotState>;
    if (typeof star !== "number") return false;
    if (equipment === null) return true;
    return (
      typeof equipment === "object" &&
      equipment !== null &&
      typeof (equipment as Partial<ExpeditionSelection>).rarity === "string" &&
      typeof (equipment as Partial<ExpeditionSelection>).setName === "string"
    );
  });
}

// Bloc 31/E.1: each filter keeps its own independent, separately persisted
// loadout — a malformed or stale-shape saved value must not crash the
// simulator, and one filter's bad data shouldn't discard the other 4.
function isValidExpeditionConfigs(value: unknown): value is ExpeditionConfigs {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return expeditionFilterOrder.every((filter) =>
    isValidExpeditionState(source[filter]),
  );
}

function statLabel(
  stat: string,
  game: ReturnType<typeof useTranslations>,
): string {
  if (stat in expeditionFamilyTranslationKeys)
    return game(`families.${expeditionFamilyTranslationKeys[stat]}`);
  return game(`stats.${expeditionStatTranslationKeys[stat]}`);
}

const filterTranslationKeys: Record<ExpeditionFilter, string> = {
  custom: "custom",
  Or: "gold",
  Équipement: "equipment",
  Consommables: "consumables",
  Troupes: "troops",
};

function FilterButtons({
  filter,
  onChange,
}: {
  filter: ExpeditionFilter;
  onChange: (filter: ExpeditionFilter) => void;
}) {
  const t = useTranslations("expedition-equipment-simulator");
  return (
    <div
      className="family-buttons expedition-sim-family-buttons"
      aria-label={t("filters.label")}
    >
      {expeditionFilterOrder.map((key) => {
        const color = filterButtonColor(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            style={
              color ? ({ "--pill-color": color } as CSSProperties) : undefined
            }
            onClick={() => onChange(key)}
          >
            {t(`filters.${filterTranslationKeys[key]}`)}
          </button>
        );
      })}
    </div>
  );
}

function Summary({
  totals,
  selected,
}: {
  totals: Partial<Record<string, number>>;
  selected?: Partial<Record<string, number>>;
}) {
  const locale = useLocale();
  const game = useTranslations("game");
  const pct = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  // Bloc 31/E.3: always show all 10 stats, including when every one of
  // them is still at 0% (a fresh loadout, or an unused filter) — unlike
  // Combat's summary, which hides zero-contribution skills entirely. Kept
  // specific to Expedition; do not port this to Combat.
  return (
    <div className="expedition-summary-grid">
      {summaryStatOrder.map((stat) => {
        const value = totals[stat] ?? 0;
        const contribution = selected?.[stat];
        return (
          <div className="stuff-total total-box" key={stat}>
            <span className="label">{statLabel(stat, game)}</span>
            <strong className="value emerald">
              +{pct(value)}%{" "}
              {contribution ? <small>({pct(contribution)}%)</small> : null}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function SlotCell({
  slot,
  state,
  active,
  onClick,
  rows,
}: {
  slot: ExpeditionSlot;
  state: ExpeditionSlotState;
  active: boolean;
  onClick: () => void;
  rows: readonly ExpeditionReferenceRow[];
}) {
  const t = useTranslations("expedition-equipment-simulator");
  const game = useTranslations("game");
  const rarity = state.equipment?.rarity;
  const item = findExpeditionEquipment(slot, state.equipment ?? null, rows);
  const rarityVar = rarity
    ? `var(--rarity-${rarityClassName(rarity)})`
    : undefined;
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? "selected" : ""}
      style={
        rarityVar
          ? {
              borderColor: rarityVar,
              borderWidth: "2px",
              background: `color-mix(in srgb, ${rarityVar} 14%, var(--bg))`,
            }
          : undefined
      }
      onClick={onClick}
    >
      <span>{game(`slots.${expeditionSlotTranslationKeys[slot]}`)}</span>
      {rarity ? (
        <>
          {item ? (
            <GameImage
              src={equipmentImagePath(item.family, rarity, slot)}
              alt={item.set_name}
              className="stuff-slot-image stuff-slot-image-expedition"
              fallback={null}
            />
          ) : null}
          {/* Bloc 78/B: adopts Combat's real star-icon rendering (Bloc 73/D)
              instead of "N★" text — same StarRating component, no gems
              here since Expedition equipment never carries any (Bloc 75). */}
          <StarRating level={state.star} />
        </>
      ) : (
        <small>{t("empty-slot")}</small>
      )}
    </button>
  );
}

function selectionValue(selection: ExpeditionSelection | null) {
  return selection ? `${selection.rarity}|${selection.setName}` : "";
}

function SlotEditor({
  slot,
  state,
  rows,
  filter,
  onChange,
}: {
  slot: ExpeditionSlot;
  state: ExpeditionSlotState;
  rows: readonly ExpeditionReferenceRow[];
  filter: ExpeditionFilter;
  onChange: (state: ExpeditionSlotState) => void;
}) {
  const t = useTranslations("expedition-equipment-simulator");
  const game = useTranslations("game");
  const options = expeditionOptions(
    slot,
    rows,
    filter === "custom" ? undefined : filter,
  );
  const selected = findExpeditionEquipment(slot, state.equipment, rows);
  function choose(value: string) {
    if (!value) return onChange({ equipment: null, star: 1 });
    const [rarity, setName] = value.split("|");
    onChange({ equipment: { rarity, setName }, star: 1 });
  }
  return (
    <div className="stuff-editor">
      <label>
        {t("equipment-label", {
          slot: game(`slots.${expeditionSlotTranslationKeys[slot]}`),
        })}
        <select
          aria-label={t("equipment-aria", {
            slot: game(`slots.${expeditionSlotTranslationKeys[slot]}`),
          })}
          value={selectionValue(state.equipment)}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">{t("none")}</option>
          {options.map((item) => (
            <option
              key={`${item.rarity}-${item.set_name}`}
              value={`${item.rarity}|${item.set_name}`}
            >
              {t("equipment-option", {
                rarity: game(
                  `rarities.${equipmentRarityTranslationKeys[item.rarity as keyof typeof equipmentRarityTranslationKeys]}`,
                ),
                name: item.set_name,
                family: game(
                  `families.${expeditionFamilyTranslationKeys[item.family]}`,
                ),
              })}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <label>
          {t("star-level")}
          <select
            aria-label={t("equipment-stars-aria", {
              slot: game(`slots.${expeditionSlotTranslationKeys[slot]}`),
            })}
            value={state.star}
            onChange={(event) =>
              onChange({ ...state, star: Number(event.target.value) })
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((star) => (
              <option key={star} value={star}>
                {star}★
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function ExpeditionEquipmentSimulator({
  rows,
  increments = defaultExpeditionStarIncrements,
}: {
  rows: readonly ExpeditionReferenceRow[];
  increments?: ExpeditionStarIncrements;
}) {
  const t = useTranslations("expedition-equipment-simulator");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const expeditionEquipmentReference = referenceCatalog.find(
    (item) => item.slug === "expedition-equipment",
  )!;
  const [filter, setFilter] = useState<ExpeditionFilter>("custom");
  const [configs, setConfigs] = useState<ExpeditionConfigs>(
    createEmptyExpeditionConfigs,
  );
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<number>();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          // Malformed or stale-shape data (an incompatible earlier version,
          // manual tampering) must not crash the simulator: fall back to
          // the default empty configs instead of trusting an unvalidated value.
          if (isValidExpeditionConfigs(parsed)) setConfigs(parsed);
        }
      } catch {}
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(configs));
  }, [loaded, configs]);
  const state = configs[filter];
  const totals = computeExpeditionTotal(state, rows, increments);
  const selected =
    active === undefined
      ? undefined
      : computeExpeditionSlot(
          expeditionSlotLayout[active],
          state[active],
          rows,
          increments,
        );
  function update(index: number, slot: ExpeditionSlotState) {
    setConfigs((current) => ({
      ...current,
      [filter]: current[filter].map((item, i) => (i === index ? slot : item)),
    }));
  }
  function changeFilter(next: ExpeditionFilter) {
    setFilter(next);
    setActive(undefined);
  }
  return (
    <div
      className="calculator-stack"
      data-testid="expedition-equipment-simulator"
    >
      <section className="calculator-card">
        <h3>{t("summary-title")}</h3>
        <Summary totals={totals} selected={selected} />
      </section>
      {/* Bloc 32/E.1: repositioned under the global summary, matching
          Combat's family-button row (Bloc 32/D.6). */}
      <FilterButtons filter={filter} onChange={changeFilter} />
      <section className="calculator-card stuff-block">
        <div className="expedition-slot-columns">
          <div className="stuff-slot-grid">
            {expeditionSlotLayout.map((slot, index) => (
              <SlotCell
                key={slot}
                slot={slot}
                state={state[index]}
                active={active === index}
                onClick={() =>
                  setActive((current) =>
                    current === index ? undefined : index,
                  )
                }
                rows={rows}
              />
            ))}
          </div>
          <div
            className={
              active === undefined
                ? "stuff-editor-panel"
                : "stuff-editor-panel stuff-editor-panel-active"
            }
          >
            {active === undefined ? (
              <p className="stuff-empty">{t("select-slot")}</p>
            ) : (
              <SlotEditor
                slot={expeditionSlotLayout[active]}
                state={state[active]}
                rows={rows}
                filter={filter}
                onChange={(slot) => update(active, slot)}
              />
            )}
          </div>
        </div>
      </section>
      {/* Bloc 55/A: after the tool's own content, not before it. */}
      <CrossReferenceLink
        href={referenceHref("expedition-equipment")}
        title={references("catalog.expedition-equipment")}
        image={expeditionEquipmentReference.image}
        fallbackImage={expeditionEquipmentReference.fallbackImage}
        label={crossReference("toReference")}
      />
    </div>
  );
}
