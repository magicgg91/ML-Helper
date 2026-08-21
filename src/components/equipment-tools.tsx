"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  equipmentFamilyTranslationKeys,
  equipmentRarityTranslationKeys,
  equipmentSkillTranslationKeys,
  equipmentSlotTranslationKeys,
} from "../i18n/game-translation-keys";
import {
  allowedSkills,
  computeEquipmentSlot,
  computeStuffBlock,
  computeStuffGlobal,
  createEmptyStuffState,
  equipmentBlocks,
  equipmentOptions,
  equipmentSlotLayout,
  findEquipment,
  gemSlotsByRarity,
  type EquipmentBlock,
  type EquipmentGem,
  type EquipmentSelection,
  type EquipmentSkill,
  type EquipmentSlot,
  type EquipmentSlotState,
  type StuffState,
} from "../lib/equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import { equipmentSkillColors } from "../lib/game-images";
import { RarityBadge } from "./rarity-badge";

const storageKey = "mlhelper_stuff_simulator";
const leagueOptions = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legend",
] as const;

function Summary({
  totals,
  selected,
}: {
  totals: Partial<Record<string, number>>;
  selected?: Partial<Record<string, number>>;
}) {
  const locale = useLocale();
  const t = useTranslations("stuff-simulator");
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
      {entries.map(([skill, value]) => (
        <div className="stuff-total total-box" key={skill}>
          <span className="label">
            {game(
              `skills.${equipmentSkillTranslationKeys[skill as EquipmentSkill]}`,
            )}
          </span>
          <strong className="value emerald">
            +{pct(value)}%{" "}
            {selected?.[skill] ? (
              <small>({pct(selected[skill]!)}%)</small>
            ) : null}
          </strong>
        </div>
      ))}
    </div>
  );
}

function GemEditor({
  block,
  gems,
  namespace,
  onChange,
}: {
  block: EquipmentBlock;
  gems: EquipmentGem[];
  namespace: "stuff-simulator" | "stuff-comparison";
  onChange: (gems: EquipmentGem[]) => void;
}) {
  const t = useTranslations(namespace);
  const game = useTranslations("game");
  const common = useTranslations("common");
  const skills = allowedSkills(block);
  return (
    <div className="stuff-gems">
      {gems.map((gem, index) => (
        <div className="stuff-gem-row" key={index}>
          <label>
            {t("gem.skill", { index: index + 1 })}
            <select
              value={gem.skill}
              onChange={(event) =>
                onChange(
                  gems.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          skill: event.target.value as EquipmentGem["skill"],
                        }
                      : item,
                  ),
                )
              }
            >
              <option value="none">{t("none")}</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {game(`skills.${equipmentSkillTranslationKeys[skill]}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("gem.stars", { index: index + 1 })}
            <select
              value={gem.star}
              onChange={(event) =>
                onChange(
                  gems.map((item, i) =>
                    i === index
                      ? { ...item, star: Number(event.target.value) }
                      : item,
                  ),
                )
              }
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((star) => (
                <option key={star} value={star}>
                  {star}★
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("gem.league", { index: index + 1 })}
            <select
              value={gem.league}
              onChange={(event) =>
                onChange(
                  gems.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          league: event.target.value as EquipmentGem["league"],
                        }
                      : item,
                  ),
                )
              }
            >
              <option value="">{common("choose")}</option>
              {leagueOptions.map((value) => (
                <option value={value} key={value}>
                  {game(`leagues.${value}`)}
                </option>
              ))}
            </select>
          </label>
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
}: {
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const rarity = state.equipment?.rarity;
  const activeGems = state.gems.filter(
    (gem): gem is EquipmentGem & { skill: EquipmentSkill } =>
      gem.skill !== "none" && Boolean(gem.league),
  );
  const rarityVar = rarity ? `var(--rarity-${rarityClassName(rarity)})` : undefined;
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
      <span>{game(`slots.${equipmentSlotTranslationKeys[slot]}`)}</span>
      {rarity ? (
        <>
          <RarityBadge
            rarity={rarity}
            label={game(`rarities.${equipmentRarityTranslationKeys[rarity]}`)}
          />
          <small>{state.star}★</small>
          {activeGems.length ? (
            <div className="gem-badges">
              {activeGems.map((gem, index) => (
                <span
                  className="gem-badge"
                  key={index}
                  style={{ background: equipmentSkillColors[gem.skill] }}
                  title={`${game(`skills.${equipmentSkillTranslationKeys[gem.skill]}`)} ${game(`leagues.${gem.league}`)} ${gem.star}★`}
                >
                  {gem.star}★{game(`leagues-short.${gem.league}`)}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <small>{t("empty-slot")}</small>
      )}
    </button>
  );
}

function selectionValue(selection: EquipmentSelection | null) {
  return selection ? `${selection.rarity}|${selection.setName}` : "";
}

function SlotEditor({
  block,
  slot,
  state,
  namespace,
  onChange,
}: {
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  namespace: "stuff-simulator" | "stuff-comparison";
  onChange: (state: EquipmentSlotState) => void;
}) {
  const t = useTranslations(namespace);
  const game = useTranslations("game");
  const options = equipmentOptions(block, slot);
  const selected = findEquipment(slot, state.equipment);
  function choose(value: string) {
    if (!value) return onChange({ equipment: null, star: 1, gems: [] });
    const [rarity, setName] = value.split("|") as [
      EquipmentSelection["rarity"],
      string,
    ];
    const count = gemSlotsByRarity[rarity];
    onChange({
      equipment: { rarity, setName },
      star: 1,
      gems: Array.from({ length: count }, () => ({
        skill: "none",
        star: 1,
        league: "" as const,
      })),
    });
  }
  return (
    <div className="stuff-editor">
      <label>
        {t("equipment-label", {
          slot: game(`slots.${equipmentSlotTranslationKeys[slot]}`),
        })}
        <select
          aria-label={t("equipment-aria", {
            block: game(`families.${block}`),
            slot: game(`slots.${equipmentSlotTranslationKeys[slot]}`),
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
                  `rarities.${equipmentRarityTranslationKeys[item.rarity as EquipmentSelection["rarity"]]}`,
                ),
                name: item.set_name,
                family: game(
                  `families.${equipmentFamilyTranslationKeys[item.family as keyof typeof equipmentFamilyTranslationKeys]}`,
                ),
              })}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <>
          <label>
            {t("star-level")}
            <select
              aria-label={t("equipment-stars-aria", {
                block: game(`families.${block}`),
                slot: game(`slots.${equipmentSlotTranslationKeys[slot]}`),
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
          {state.gems.length ? (
            <>
              <h4>{t("gems-count", { count: state.gems.length })}</h4>
              <GemEditor
                block={block}
                gems={state.gems}
                namespace={namespace}
                onChange={(gems) => onChange({ ...state, gems })}
              />
            </>
          ) : (
            <p className="stuff-empty">{t("no-gem-slot")}</p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function StuffSimulator() {
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const [state, setState] = useState<StuffState>(createEmptyStuffState);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<Partial<Record<EquipmentBlock, number>>>(
    {},
  );
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
  const global = useMemo(() => computeStuffGlobal(state), [state]);
  function update(
    block: EquipmentBlock,
    index: number,
    slot: EquipmentSlotState,
  ) {
    setState((current) => ({
      ...current,
      [block]: current[block].map((item, i) => (i === index ? slot : item)),
    }));
  }
  return (
    <div className="calculator-stack" data-testid="stuff-simulator">
      <Link
        className="reference-cross-link"
        href="/guides/referentiels/combat-equipment"
      >
        {t("view-reference")}
      </Link>
      <section className="calculator-card">
        <h3>{t("global-summary")}</h3>
        <Summary totals={global} />
      </section>
      {equipmentBlocks.map((block) => {
        const activeIndex = active[block];
        const totals = computeStuffBlock(block, state[block]);
        const selected =
          activeIndex === undefined
            ? undefined
            : computeEquipmentSlot(
                block,
                equipmentSlotLayout[activeIndex],
                state[block][activeIndex],
              );
        return (
          <section className="calculator-card stuff-block" key={block}>
            <h3>{game(`families.${block}`)}</h3>
            <div className="stuff-block-columns">
              <div className="stuff-slot-grid">
                {equipmentSlotLayout.map((slot, index) => (
                  <SlotCell
                    key={slot}
                    slot={slot}
                    state={state[block][index]}
                    active={activeIndex === index}
                    onClick={() =>
                      setActive((current) => ({
                        ...current,
                        [block]: current[block] === index ? undefined : index,
                      }))
                    }
                  />
                ))}
              </div>
              <div>
                {activeIndex === undefined ? (
                  <p className="stuff-empty">{t("select-slot")}</p>
                ) : (
                  <SlotEditor
                    block={block}
                    slot={equipmentSlotLayout[activeIndex]}
                    state={state[block][activeIndex]}
                    namespace="stuff-simulator"
                    onChange={(slot) => update(block, activeIndex, slot)}
                  />
                )}
              </div>
              <Summary totals={totals} selected={selected} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

type CompareSide = EquipmentSlotState;
function defaultSide(block: EquipmentBlock, slot: EquipmentSlot): CompareSide {
  const item = equipmentOptions(block, slot)[0];
  if (!item) return { equipment: null, star: 1, gems: [] };
  return {
    equipment: {
      rarity: item.rarity as EquipmentSelection["rarity"],
      setName: item.set_name,
    },
    star: 1,
    gems: Array.from(
      { length: gemSlotsByRarity[item.rarity as EquipmentSelection["rarity"]] },
      () => ({ skill: "none", star: 1, league: "" }),
    ),
  };
}

function CompareSideEditor({
  name,
  block,
  slot,
  state,
  onChange,
}: {
  name: string;
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: CompareSide;
  onChange: (side: CompareSide) => void;
}) {
  const t = useTranslations("stuff-comparison");
  return (
    <div className="compare-side">
      <h3>{t("side-title", { side: name })}</h3>
      <SlotEditor
        block={block}
        slot={slot}
        state={state}
        namespace="stuff-comparison"
        onChange={onChange}
      />
    </div>
  );
}

export function StuffComparison() {
  const locale = useLocale();
  const t = useTranslations("stuff-comparison");
  const game = useTranslations("game");
  const pct = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const [block, setBlock] = useState<EquipmentBlock>("attack");
  const [slot, setSlot] = useState<EquipmentSlot>("Amulette");
  const [a, setA] = useState<CompareSide>(() =>
    defaultSide("attack", "Amulette"),
  );
  const [b, setB] = useState<CompareSide>(() =>
    defaultSide("attack", "Amulette"),
  );
  function changeContext(nextBlock: EquipmentBlock, nextSlot: EquipmentSlot) {
    setBlock(nextBlock);
    setSlot(nextSlot);
    setA(defaultSide(nextBlock, nextSlot));
    setB(defaultSide(nextBlock, nextSlot));
  }
  const totalsA = computeEquipmentSlot(block, slot, a);
  const totalsB = computeEquipmentSlot(block, slot, b);
  return (
    <div className="calculator-stack" data-testid="stuff-comparison">
      <Link
        className="reference-cross-link"
        href="/guides/referentiels/combat-equipment"
      >
        {t("view-reference")}
      </Link>
      <section className="calculator-card">
        <div className="family-buttons">
          {equipmentBlocks.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={block === key}
              onClick={() => changeContext(key, slot)}
            >
              {game(`families.${key}`)}
            </button>
          ))}
        </div>
        <label className="calculator-field">
          {t("slot")}
          <select
            value={slot}
            onChange={(event) =>
              changeContext(block, event.target.value as EquipmentSlot)
            }
          >
            {equipmentSlotLayout.map((item) => (
              <option key={item} value={item}>
                {game(`slots.${equipmentSlotTranslationKeys[item]}`)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="calculator-card compare-equipment-grid">
        <CompareSideEditor
          name="A"
          block={block}
          slot={slot}
          state={a}
          onChange={setA}
        />
        <CompareSideEditor
          name="B"
          block={block}
          slot={slot}
          state={b}
          onChange={setB}
        />
      </section>
      <section className="calculator-card">
        <h3>{t("comparison-title")}</h3>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("columns.skill")}</th>
                <th>{t("columns.side-a")}</th>
                <th>{t("columns.side-b")}</th>
                <th>{t("columns.difference")}</th>
              </tr>
            </thead>
            <tbody>
              {allowedSkills(block).map((skill) => {
                const va = totalsA[skill] ?? 0,
                  vb = totalsB[skill] ?? 0,
                  diff = vb - va;
                return (
                  <tr key={skill}>
                    <td>
                      {game(`skills.${equipmentSkillTranslationKeys[skill]}`)}
                    </td>
                    <td>{pct(va)}%</td>
                    <td>{pct(vb)}%</td>
                    <td
                      className={
                        diff > 0
                          ? "diff-positive"
                          : diff < 0
                            ? "diff-negative"
                            : ""
                      }
                    >
                      {diff > 0 ? "+" : ""}
                      {pct(diff)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
