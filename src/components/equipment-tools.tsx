"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CrossReferenceLink } from "./cross-reference-link";
import { formatSkillPercentValue } from "../lib/skill-percent";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import {
  equipmentFamilyTranslationKeys,
  equipmentRarityTranslationKeys,
  equipmentSkillTranslationKeys,
  equipmentSlotTranslationKeys,
} from "../i18n/game-translation-keys";
import {
  allowedSkills,
  computeEquipmentSlot,
  computeStuffGlobal,
  createEmptyStuffState,
  equipmentBlocks,
  equipmentOptions,
  equipmentSkillLabels,
  equipmentSlotLayout,
  equipmentStarIncrement,
  findEquipment,
  gemSlotsByRarity,
  skillKeyByLabel,
  type EquipmentBlock,
  type EquipmentGem,
  type EquipmentSelection,
  type EquipmentSkill,
  type EquipmentSlot,
  type EquipmentSlotState,
  type EquipmentStarIncrements,
  type StuffState,
} from "../lib/equipment";
import { rarityClassName } from "../lib/equipment-rarity";
import {
  emptyCombatSlotIconPath,
  equipmentImagePath,
  equipmentSkillColors,
  filterButtonColor,
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
import { StarRating } from "./star-rating";
import { usePersistedState } from "./use-persisted-state";

const storageKey = "mlhelper_stuff_simulator";

// Bloc 93/E1: the shape guard Expédition has had since Bloc 31/E.1 and Combat
// lacked. `state[family][index].equipment/.star/.gems` is indexed straight by
// the renderer, so a saved value from an earlier shape (Blocs 32/73/85 each
// changed it) reached the DOM and crashed the simulator — a white screen with
// no way out but clearing site data, since the bad value was reloaded on every
// visit. JSON.parse's try/catch only ever caught syntactically invalid JSON.
function isValidSlotState(value: unknown): value is EquipmentSlotState {
  if (typeof value !== "object" || value === null) return false;
  const { equipment, star, gems } = value as Partial<EquipmentSlotState>;
  if (typeof star !== "number") return false;
  if (!Array.isArray(gems)) return false;
  if (equipment === null) return true;
  return (
    typeof equipment === "object" &&
    equipment !== null &&
    typeof (equipment as Partial<EquipmentSelection>).rarity === "string" &&
    typeof (equipment as Partial<EquipmentSelection>).setName === "string"
  );
}

function isValidStuffState(value: unknown): value is StuffState {
  if (typeof value !== "object" || value === null) return false;
  const source = value as Record<string, unknown>;
  return equipmentBlocks.every((block) => {
    const slots = source[block];
    return (
      Array.isArray(slots) &&
      slots.length === equipmentSlotLayout.length &&
      slots.every(isValidSlotState)
    );
  });
}

function parseStuffState(raw: string): StuffState | undefined {
  const parsed: unknown = JSON.parse(raw);
  return isValidStuffState(parsed) ? parsed : undefined;
}
// Bloc 33/K: confirmation clears itself well under the 5s cap.
const TRANSFER_CONFIRMATION_TIMEOUT_MS = 3000;
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
}: {
  totals: Partial<Record<string, number>>;
  selected?: Partial<Record<string, number>>;
  league?: LeagueSelection;
}) {
  const locale = useLocale();
  const game = useTranslations("game");
  // Bloc 87/A: skill percentages round to 1 decimal (standard rounding).
  const pct = (value: number) => formatSkillPercentValue(value, locale);
  // Bloc 32/D.5: always show all 10 skills, sorted by their *displayed*
  // label, defaulting a skill with no configured contribution to 0%
  // instead of hiding it. Sorting the internal (French) skill keys instead
  // of the localized label would sort correctly in French only — in
  // English it would leave "Attaque"/"Attack" etc. ordered by the French
  // word, not the English one actually on screen.
  const entries = equipmentSkillLabels
    .map((skill): [EquipmentSkill, string, number] => [
      skill,
      game(`skills.${equipmentSkillTranslationKeys[skill]}`),
      totals[skill] ?? 0,
    ])
    .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, locale));
  return (
    // Bloc 92/A11y (H1): the global totals recompute live as equipment/gems
    // change; a polite live region announces the updated values to screen
    // readers (it was silent). Not atomic — only the changed skills speak.
    <div className="stuff-summary-grid" aria-live="polite">
      {entries.map(([skill, label, value]) => {
        // league !== undefined (not a truthiness check): "" is a valid,
        // meaningful LeagueSelection meaning "no league chosen yet", and
        // several caps (Récupération's flat 50%) apply regardless of league.
        const cap =
          league !== undefined
            ? skillCapForLeague(skillKeyByLabel[skill], league)
            : undefined;
        const displayValue = cap === undefined ? value : Math.min(value, cap);
        return (
          <div className="stuff-total total-box" key={skill}>
            <span className="label">{label}</span>
            <strong className="value emerald">
              +{pct(displayValue)}%{" "}
              {selected?.[skill] ? (
                // Bloc 32/D.5 requires the selected slot's own contribution
                // whenever a slot is selected, taking priority over the
                // cap-overflow real value below (they coincide whenever
                // that slot is the sole contributor, which covers every
                // existing cap scenario in this simulator).
                <small>({pct(selected[skill]!)}%)</small>
              ) : cap !== undefined && value > cap ? (
                <small>({pct(value)}%)</small>
              ) : null}
            </strong>
          </div>
        );
      })}
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
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const common = useTranslations("common");
  const skills = allowedSkills(block);
  return (
    <div className="stuff-gems">
      {gems.map((gem, index) => (
        <div className="stuff-gem-row" key={index}>
          <span className="stuff-gem-row-label">
            {t("gem.row", { index: index + 1 })}
          </span>
          <select
            aria-label={t("gem.skill", { index: index + 1 })}
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
          <select
            aria-label={t("gem.stars", { index: index + 1 })}
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
          <select
            aria-label={t("gem.league", { index: index + 1 })}
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
      // Bloc 92/A11y (L6): the slot button reveals the shared editor panel
      // elsewhere in the DOM — expose that relationship and its open state.
      aria-expanded={active}
      aria-controls="stuff-slot-editor"
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
        // Bloc 73/D: image + its star level on the left, the (up to 3)
        // gems stacked in a column to the right — replaces Bloc 32/D.1's
        // single-column stack (image, star, then a row of gem badges).
        <div className="stuff-slot-layout">
          <div className="stuff-slot-left">
            {item ? (
              <GameImage
                src={equipmentImagePath(item.family, rarity, slot)}
                alt={item.set_name}
                className="stuff-slot-image stuff-slot-image-combat"
                fallback={null}
              />
            ) : null}
            <StarRating level={state.star} />
          </div>
          {activeGems.length ? (
            <div className="stuff-slot-gems">
              {activeGems.map((gem, index) => {
                const title = `${game(`skills.${equipmentSkillTranslationKeys[gem.skill]}`)} ${game(`leagues.${gem.league}`)} ${gem.star}★`;
                return (
                  <div className="stuff-slot-gem" key={index}>
                    <GameImage
                      src={gemImagePath(skillKeyByLabel[gem.skill], gem.league)}
                      alt={title}
                      className="gem-badge-image"
                      width={256}
                      height={256}
                      fallback={
                        <span
                          className="gem-badge"
                          style={{
                            background: equipmentSkillColors[gem.skill],
                          }}
                          title={title}
                        >
                          {game(`leagues-short.${gem.league}`)}
                        </span>
                      }
                    />
                    <StarRating level={gem.star} size={8} />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        // Bloc 85/A: an icon representing the slot's own equipment type,
        // faded, in place of the plain "Vide" text — falls back to that
        // text if the icon file is ever missing (GameImage's onError path).
        <GameImage
          src={emptyCombatSlotIconPath(slot)}
          alt={t("empty-slot")}
          className="stuff-slot-image stuff-slot-image-combat stuff-slot-image-empty"
          fallback={<small>{t("empty-slot")}</small>}
        />
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
  onChange,
  combatRows,
}: {
  block: EquipmentBlock;
  slot: EquipmentSlot;
  state: EquipmentSlotState;
  onChange: (state: EquipmentSlotState) => void;
  combatRows: readonly CombatReferenceRow[];
}) {
  const t = useTranslations("stuff-simulator");
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
            <GemEditor
              block={block}
              gems={state.gems}
              onChange={(gems) => onChange({ ...state, gems })}
            />
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
  increments = equipmentStarIncrement,
}: {
  combatRows: readonly CombatReferenceRow[];
  gemParameters?: GemParameters;
  increments?: EquipmentStarIncrements;
}) {
  const t = useTranslations("stuff-simulator");
  const game = useTranslations("game");
  const crossReference = useTranslations("crossReference");
  const references = useTranslations("references");
  const playerSettings = usePlayerSettings();
  const [state, setState] = usePersistedState<StuffState>(storageKey, {
    initial: createEmptyStuffState,
    parse: parseStuffState,
  });
  const [active, setActive] = useState<Partial<Record<EquipmentBlock, number>>>(
    {},
  );
  // Bloc 32/D.2-D.3: which family is currently displayed — UI-only, kept
  // fully separate from `state` (all 4 families' equipment configs stay
  // equipped and computed in parallel at all times, regardless of which one
  // is on screen) and from `active` (each family already tracks its own
  // selected slot independently).
  const [activeFamily, setActiveFamily] = useState<EquipmentBlock>(
    equipmentBlocks[0],
  );
  const [transferred, setTransferred] = useState(false);
  const combatEquipmentReference = referenceCatalog.find(
    (item) => item.slug === "combat-equipment",
  )!;
  const global = useMemo(
    () => computeStuffGlobal(state, combatRows, gemParameters, increments),
    [state, combatRows, gemParameters, increments],
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
  // Bloc 33/K: the confirmation clears itself instead of staying forever —
  // well under the 5s cap. Bloc 33/H reuses the same flag to also
  // highlight the transfer button for as long as the message is shown.
  useEffect(() => {
    if (!transferred) return;
    const timer = window.setTimeout(
      () => setTransferred(false),
      TRANSFER_CONFIRMATION_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [transferred]);
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
  const activeIndex = active[activeFamily];
  const selected =
    activeIndex === undefined
      ? undefined
      : computeEquipmentSlot(
          activeFamily,
          equipmentSlotLayout[activeIndex],
          state[activeFamily][activeIndex],
          combatRows,
          gemParameters,
          increments,
        );
  return (
    <div className="calculator-stack" data-testid="stuff-simulator">
      <section className="calculator-card">
        <h2 className="calculator-heading">{t("global-summary")}</h2>
        <Summary
          totals={global}
          selected={selected}
          league={playerSettings.league}
        />
      </section>
      <div
        className="family-buttons stuff-family-buttons"
        role="group"
        aria-label={t("family-filter-label")}
      >
        {equipmentBlocks.map((block) => {
          const color = filterButtonColor(block);
          return (
            <button
              key={block}
              type="button"
              aria-pressed={activeFamily === block}
              style={
                color ? ({ "--pill-color": color } as CSSProperties) : undefined
              }
              onClick={() => setActiveFamily(block)}
            >
              {game(`families.${block}`)}
            </button>
          );
        })}
        {/* Bloc 32/D.7 + Bloc 33/H: joins the family row (same size as the
            family buttons) instead of the summary title row, but right-
            aligned, in a distinct violet accent, and briefly highlighted
            on click. */}
        <button
          type="button"
          className={
            transferred
              ? "transfer-action transfer-action-active"
              : "transfer-action"
          }
          onClick={() => {
            transferToPlayerSettings();
            setTransferred(true);
          }}
        >
          {t("transfer")}
        </button>
      </div>
      {transferred ? (
        <span role="status" className="form-success">
          {t("transferred")}
        </span>
      ) : null}
      <section className="calculator-card stuff-block">
        <div className="stuff-block-columns">
          <div className="stuff-slot-grid">
            {equipmentSlotLayout.map((slot, index) => (
              <SlotCell
                key={slot}
                slot={slot}
                state={state[activeFamily][index]}
                active={activeIndex === index}
                onClick={() =>
                  setActive((current) => ({
                    ...current,
                    [activeFamily]:
                      current[activeFamily] === index ? undefined : index,
                  }))
                }
                combatRows={combatRows}
              />
            ))}
          </div>
          <div
            id="stuff-slot-editor"
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
                block={activeFamily}
                slot={equipmentSlotLayout[activeIndex]}
                state={state[activeFamily][activeIndex]}
                onChange={(slot) => update(activeFamily, activeIndex, slot)}
                combatRows={combatRows}
              />
            )}
          </div>
        </div>
      </section>
      {/* Bloc 55/A: after the tool's own content, not before it. */}
      <CrossReferenceLink
        href={referenceHref("combat-equipment")}
        title={references("catalog.combat-equipment")}
        image={combatEquipmentReference.image}
        fallbackImage={combatEquipmentReference.fallbackImage}
        label={crossReference("toReference")}
      />
    </div>
  );
}
