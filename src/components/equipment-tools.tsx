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
  equipmentSkillLabels,
  equipmentSlotLayout,
  findEquipment,
  gemSlotsByRarity,
  skillKeyByLabel,
  type EquipmentBlock,
  type EquipmentGem,
  type EquipmentSelection,
  type EquipmentSkill,
  type EquipmentSlot,
  type EquipmentSlotState,
  type StuffState,
} from "../lib/equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import {
  equipmentImagePath,
  equipmentSkillColors,
  gemImagePath,
} from "../lib/game-images";
import {
  defaultGemParameters,
  type GemParameters,
} from "../lib/gem-parameters";
import {
  emptySkills,
  skillCapForLeague,
  type League,
  type LeagueSelection,
} from "../lib/player-settings";
import { replaceEquipmentSkills } from "./player-settings-panel";
import { usePlayerSettings } from "./use-player-settings";
import type { CombatReferenceRow } from "../lib/reference-equipment";
import { GameImage } from "./game-image";

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
  league,
  onTransfer,
}: {
  totals: Partial<Record<string, number>>;
  selected?: Partial<Record<string, number>>;
  league?: LeagueSelection;
  onTransfer?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const [transferred, setTransferred] = useState(false);
  const pct = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const entries = Object.entries(totals)
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && entry[1] > 0,
    )
    .sort(([a], [b]) => a.localeCompare(b, locale));
  const transferSection = onTransfer ? (
    <div className="stuff-transfer">
      <button
        type="button"
        className="secondary-action"
        onClick={() => {
          onTransfer();
          setTransferred(true);
        }}
      >
        {t("transfer")}
      </button>
      {transferred ? (
        <span role="status" className="form-success">
          {t("transferred")}
        </span>
      ) : null}
    </div>
  ) : null;
  if (!entries.length)
    return (
      <div>
        <p className="stuff-empty">{t("empty-summary")}</p>
        {transferSection}
      </div>
    );
  return (
    <div>
      <div className="stuff-summary-grid">
        {entries.map(([skill, value]) => {
          // league !== undefined (not a truthiness check): "" is a valid,
          // meaningful LeagueSelection meaning "no league chosen yet", and
          // several caps (Récupération's flat 50%) apply regardless of
          // league — only an omitted prop (per-block Summary calls) should
          // skip cap handling entirely.
          const cap =
            league !== undefined
              ? skillCapForLeague(skillKeyByLabel[skill as EquipmentSkill], league)
              : undefined;
          const displayValue = cap === undefined ? value : Math.min(value, cap);
          return (
            <div className="stuff-total total-box" key={skill}>
              <span className="label">
                {game(
                  `skills.${equipmentSkillTranslationKeys[skill as EquipmentSkill]}`,
                )}
              </span>
              <strong className="value emerald">
                +{pct(displayValue)}%{" "}
                {cap !== undefined && value > cap ? (
                  <small>({pct(value)}%)</small>
                ) : selected?.[skill] ? (
                  <small>({pct(selected[skill]!)}%)</small>
                ) : null}
              </strong>
            </div>
          );
        })}
      </div>
      {transferSection}
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
  combatRows,
}: {
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  active: boolean;
  onClick: () => void;
  combatRows: readonly CombatReferenceRow[];
}) {
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const rarity = state.equipment?.rarity;
  const item = findEquipment(slot, state.equipment ?? null, combatRows);
  const activeGems = state.gems.filter(
    (gem): gem is EquipmentGem & { skill: EquipmentSkill; league: League } =>
      gem.skill !== "none" && Boolean(gem.league),
  );
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
      <span>{game(`slots.${equipmentSlotTranslationKeys[slot]}`)}</span>
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
          {activeGems.length ? (
            <div className="gem-badges">
              {activeGems.map((gem, index) => {
                const title = `${game(`skills.${equipmentSkillTranslationKeys[gem.skill]}`)} ${game(`leagues.${gem.league}`)} ${gem.star}★`;
                return (
                  <GameImage
                    key={index}
                    src={gemImagePath(gem.skill, gem.league)}
                    alt={title}
                    className="gem-badge-image"
                    fallback={
                      <span
                        className="gem-badge"
                        style={{ background: equipmentSkillColors[gem.skill] }}
                        title={title}
                      >
                        {gem.star}★{game(`leagues-short.${gem.league}`)}
                      </span>
                    }
                  />
                );
              })}
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
  combatRows,
}: {
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  namespace: "stuff-simulator" | "stuff-comparison";
  onChange: (state: EquipmentSlotState) => void;
  combatRows: readonly CombatReferenceRow[];
}) {
  const t = useTranslations(namespace);
  const game = useTranslations("game");
  const options = equipmentOptions(block, slot, combatRows);
  const selected = findEquipment(slot, state.equipment, combatRows);
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

export function StuffSimulator({
  combatRows,
  gemParameters = defaultGemParameters,
}: {
  combatRows: readonly CombatReferenceRow[];
  gemParameters?: GemParameters;
}) {
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const playerSettings = usePlayerSettings();
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
  const global = useMemo(
    () => computeStuffGlobal(state, combatRows, gemParameters),
    [state, combatRows, gemParameters],
  );
  function transferToPlayerSettings() {
    const equipmentSkills = emptySkills();
    for (const skill of equipmentSkillLabels) {
      const key = skillKeyByLabel[skill];
      const raw = global[skill] ?? 0;
      const cap = skillCapForLeague(key, playerSettings.league);
      equipmentSkills[key] = cap === undefined ? raw : Math.min(raw, cap);
    }
    replaceEquipmentSkills(equipmentSkills);
  }
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
        <Summary
          totals={global}
          league={playerSettings.league}
          onTransfer={transferToPlayerSettings}
        />
      </section>
      {equipmentBlocks.map((block) => {
        const activeIndex = active[block];
        const totals = computeStuffBlock(
          block,
          state[block],
          combatRows,
          gemParameters,
        );
        const selected =
          activeIndex === undefined
            ? undefined
            : computeEquipmentSlot(
                block,
                equipmentSlotLayout[activeIndex],
                state[block][activeIndex],
                combatRows,
                gemParameters,
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
                    combatRows={combatRows}
                  />
                ))}
              </div>
              <div
                className={
                  activeIndex === undefined
                    ? "stuff-editor-panel"
                    : "stuff-editor-panel stuff-editor-panel-active"
                }
              >
                {activeIndex === undefined ? (
                  <p className="stuff-empty">{t("select-slot")}</p>
                ) : (
                  <SlotEditor
                    block={block}
                    slot={equipmentSlotLayout[activeIndex]}
                    state={state[block][activeIndex]}
                    namespace="stuff-simulator"
                    onChange={(slot) => update(block, activeIndex, slot)}
                    combatRows={combatRows}
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
function defaultSide(
  block: EquipmentBlock,
  slot: EquipmentSlot,
  combatRows: readonly CombatReferenceRow[],
): CompareSide {
  const item = equipmentOptions(block, slot, combatRows)[0];
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
  combatRows,
}: {
  name: string;
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: CompareSide;
  onChange: (side: CompareSide) => void;
  combatRows: readonly CombatReferenceRow[];
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
        combatRows={combatRows}
      />
    </div>
  );
}

export function StuffComparison({
  combatRows,
  gemParameters = defaultGemParameters,
}: {
  combatRows: readonly CombatReferenceRow[];
  gemParameters?: GemParameters;
}) {
  const locale = useLocale();
  const t = useTranslations("stuff-comparison");
  const game = useTranslations("game");
  const pct = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const [block, setBlock] = useState<EquipmentBlock>("attack");
  const [slot, setSlot] = useState<EquipmentSlot>("Amulette");
  const [a, setA] = useState<CompareSide>(() =>
    defaultSide("attack", "Amulette", combatRows),
  );
  const [b, setB] = useState<CompareSide>(() =>
    defaultSide("attack", "Amulette", combatRows),
  );
  function changeContext(nextBlock: EquipmentBlock, nextSlot: EquipmentSlot) {
    setBlock(nextBlock);
    setSlot(nextSlot);
    setA(defaultSide(nextBlock, nextSlot, combatRows));
    setB(defaultSide(nextBlock, nextSlot, combatRows));
  }
  const totalsA = computeEquipmentSlot(
    block,
    slot,
    a,
    combatRows,
    gemParameters,
  );
  const totalsB = computeEquipmentSlot(
    block,
    slot,
    b,
    combatRows,
    gemParameters,
  );
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
          combatRows={combatRows}
        />
        <CompareSideEditor
          name="B"
          block={block}
          slot={slot}
          state={b}
          onChange={setB}
          combatRows={combatRows}
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
