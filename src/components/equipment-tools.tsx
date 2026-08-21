"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  allowedSkills,
  computeEquipmentSlot,
  computeStuffBlock,
  computeStuffGlobal,
  createEmptyStuffState,
  equipmentBlockDefinitions,
  equipmentBlocks,
  equipmentLabel,
  equipmentOptions,
  equipmentSlotLayout,
  findEquipment,
  gemSlotsByRarity,
  type EquipmentBlock,
  type EquipmentGem,
  type EquipmentSelection,
  type EquipmentSlot,
  type EquipmentSlotState,
  type StuffState,
} from "../lib/equipment";

const storageKey = "mlhelper_stuff_simulator";
const leagueOptions = [
  ["bronze", "Bronze"],
  ["silver", "Argent"],
  ["gold", "Or"],
  ["platinum", "Platine"],
  ["diamond", "Diamant"],
  ["legend", "Légende"],
] as const;

function pct(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function Summary({
  totals,
  selected,
}: {
  totals: Partial<Record<string, number>>;
  selected?: Partial<Record<string, number>>;
}) {
  const entries = Object.entries(totals)
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && entry[1] > 0,
    )
    .sort(([a], [b]) => a.localeCompare(b, "fr"));
  if (!entries.length)
    return <p className="stuff-empty">Aucun équipement configuré</p>;
  return (
    <div className="stuff-summary-grid">
      {entries.map(([skill, value]) => (
        <div className="stuff-total total-box" key={skill}>
          <span className="label">{skill}</span>
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
  onChange,
}: {
  block: EquipmentBlock;
  gems: EquipmentGem[];
  onChange: (gems: EquipmentGem[]) => void;
}) {
  const skills = allowedSkills(block);
  return (
    <div className="stuff-gems">
      {gems.map((gem, index) => (
        <div className="stuff-gem-row" key={index}>
          <label>
            Compétence gemme {index + 1}
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
              <option value="none">Aucune</option>
              {skills.map((skill) => (
                <option key={skill}>{skill}</option>
              ))}
            </select>
          </label>
          <label>
            Étoiles gemme {index + 1}
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
            Ligue gemme {index + 1}
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
              {leagueOptions.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}

function selectionValue(selection: EquipmentSelection | null) {
  return selection ? `${selection.rarity}|${selection.setName}` : "";
}

function SlotEditor({
  block,
  slot,
  state,
  onChange,
}: {
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  onChange: (state: EquipmentSlotState) => void;
}) {
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
        league: "legend" as const,
      })),
    });
  }
  return (
    <div className="stuff-editor">
      <label>
        Équipement ({slot})
        <select
          aria-label={`Équipement ${equipmentBlockDefinitions[block].label} ${slot}`}
          value={selectionValue(state.equipment)}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">Aucun</option>
          {options.map((item) => (
            <option
              key={`${item.rarity}-${item.set_name}`}
              value={`${item.rarity}|${item.set_name}`}
            >
              {equipmentLabel(item)}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <>
          <label>
            Niveau d’étoile
            <select
              aria-label={`Étoiles équipement ${equipmentBlockDefinitions[block].label} ${slot}`}
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
              <h4>Gemmes ({state.gems.length})</h4>
              <GemEditor
                block={block}
                gems={state.gems}
                onChange={(gems) => onChange({ ...state, gems })}
              />
            </>
          ) : (
            <p className="stuff-empty">
              Aucun emplacement de gemme à cette rareté
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function StuffSimulator() {
  const t = useTranslations("References");
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
        {t("viewFull")}
      </Link>
      <section className="calculator-card">
        <h3>Récapitulatif — toutes familles confondues</h3>
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
            <h3>{equipmentBlockDefinitions[block].label}</h3>
            <div className="stuff-block-columns">
              <div className="stuff-slot-grid">
                {equipmentSlotLayout.map((slot, index) => (
                  <button
                    type="button"
                    aria-pressed={activeIndex === index}
                    className={activeIndex === index ? "selected" : ""}
                    key={slot}
                    onClick={() =>
                      setActive((current) => ({
                        ...current,
                        [block]: current[block] === index ? undefined : index,
                      }))
                    }
                  >
                    <span>{slot}</span>
                    {state[block][index].equipment ? (
                      <small>
                        {state[block][index].equipment!.rarity} ·{" "}
                        {state[block][index].star}★
                      </small>
                    ) : (
                      <small>Vide</small>
                    )}
                  </button>
                ))}
              </div>
              <div>
                {activeIndex === undefined ? (
                  <p className="stuff-empty">
                    Clique sur un emplacement pour le configurer.
                  </p>
                ) : (
                  <SlotEditor
                    block={block}
                    slot={equipmentSlotLayout[activeIndex]}
                    state={state[block][activeIndex]}
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
      () => ({ skill: "none", star: 1, league: "legend" }),
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
  return (
    <div className="compare-side">
      <h3>Équipement {name}</h3>
      <SlotEditor block={block} slot={slot} state={state} onChange={onChange} />
    </div>
  );
}

export function StuffComparison() {
  const t = useTranslations("References");
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
        {t("viewFull")}
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
              {equipmentBlockDefinitions[key].label}
            </button>
          ))}
        </div>
        <label className="calculator-field">
          Emplacement
          <select
            value={slot}
            onChange={(event) =>
              changeContext(block, event.target.value as EquipmentSlot)
            }
          >
            {equipmentSlotLayout.map((item) => (
              <option key={item}>{item}</option>
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
        <h3>Comparaison par compétence</h3>
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Compétence</th>
                <th>Équipement A</th>
                <th>Équipement B</th>
                <th>Différence</th>
              </tr>
            </thead>
            <tbody>
              {allowedSkills(block).map((skill) => {
                const va = totalsA[skill] ?? 0,
                  vb = totalsB[skill] ?? 0,
                  diff = vb - va;
                return (
                  <tr key={skill}>
                    <td>{skill}</td>
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
