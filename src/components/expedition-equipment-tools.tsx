"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  equipmentRarityTranslationKeys,
  expeditionFamilyTranslationKeys,
  expeditionSlotTranslationKeys,
  expeditionStatTranslationKeys,
} from "../i18n/game-translation-keys";
import {
  computeExpeditionTotal,
  createEmptyExpeditionState,
  expeditionOptions,
  expeditionSlotLayout,
  findExpeditionEquipment,
  type ExpeditionSelection,
  type ExpeditionSlot,
  type ExpeditionSlotState,
  type ExpeditionState,
} from "../lib/expedition-equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import { equipmentImagePath } from "../lib/game-images";
import {
  defaultExpeditionStarIncrements,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "../lib/reference-equipment";
import { GameImage } from "./game-image";

const storageKey = "mlhelper_expedition_equipment_simulator";

function statLabel(
  stat: string,
  game: ReturnType<typeof useTranslations>,
): string {
  if (stat in expeditionFamilyTranslationKeys)
    return game(`families.${expeditionFamilyTranslationKeys[stat]}`);
  return game(`stats.${expeditionStatTranslationKeys[stat]}`);
}

function Summary({ totals }: { totals: Partial<Record<string, number>> }) {
  const locale = useLocale();
  const t = useTranslations("expedition-equipment-simulator");
  const game = useTranslations("game");
  const pct = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const entries = Object.entries(totals)
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && entry[1] > 0,
    )
    .sort(([a], [b]) => a.localeCompare(b, locale));
  if (!entries.length)
    return <p className="stuff-empty">{t("empty-summary")}</p>;
  return (
    <div className="stuff-summary-grid">
      {entries.map(([stat, value]) => (
        <div className="stuff-total total-box" key={stat}>
          <span className="label">{statLabel(stat, game)}</span>
          <strong className="value emerald">+{pct(value)}%</strong>
        </div>
      ))}
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
              className="stuff-slot-image"
              fallback={null}
            />
          ) : null}
          <small>{state.star}★</small>
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
  onChange,
}: {
  slot: ExpeditionSlot;
  state: ExpeditionSlotState;
  rows: readonly ExpeditionReferenceRow[];
  onChange: (state: ExpeditionSlotState) => void;
}) {
  const t = useTranslations("expedition-equipment-simulator");
  const game = useTranslations("game");
  const options = expeditionOptions(slot, rows);
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
  const [state, setState] = useState<ExpeditionState>(createEmptyExpeditionState);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<number>();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setState(JSON.parse(saved));
      } catch {}
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(state));
  }, [loaded, state]);
  const totals = computeExpeditionTotal(state, rows, increments);
  function update(index: number, slot: ExpeditionSlotState) {
    setState((current) =>
      current.map((item, i) => (i === index ? slot : item)),
    );
  }
  return (
    <div className="calculator-stack" data-testid="expedition-equipment-simulator">
      <Link
        className="reference-cross-link"
        href="/guides/referentiels/expedition-equipment"
      >
        {t("view-reference")}
      </Link>
      <section className="calculator-card">
        <h3>{t("summary-title")}</h3>
        <Summary totals={totals} />
      </section>
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
                  setActive((current) => (current === index ? undefined : index))
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
                onChange={(slot) => update(active, slot)}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
