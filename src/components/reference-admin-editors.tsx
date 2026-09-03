"use client";

import { forwardRef, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import {
  EditableReferenceTable,
  type EditableColumn,
  type ReferenceTableHandle,
} from "./editable-reference-table";
import { EditorActionBar } from "./editor-action-bar";
import { equipmentRarityValues } from "../lib/equipment-rarity";
import {
  equipmentSkillLabels,
  equipmentSlotLayout,
  type EquipmentStarIncrements,
} from "../lib/equipment";
import {
  expeditionStatKeys,
  mergeCostRarityKeys,
  type CombatGemSlotsBase,
  type CombatMergeCostBase,
  type CombatReferenceRow,
  type CombatSkydustBase,
  type ExpeditionDismantleBase,
  type ExpeditionMergeCostBase,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "../lib/reference-equipment";

const rarityKeys: Record<string, string> = {
  Commun: "common",
  Rare: "rare",
  Épique: "epic",
  Mythique: "mythic",
  Légendaire: "legendary",
};
const familyKeys: Record<string, string> = {
  Attaque: "attack",
  Défense: "defense",
  Or: "gold",
  "Troupes/Vitesse": "troops-speed",
  Équipement: "equipment",
  Consommables: "consumables",
  Troupes: "troops",
};
const slotKeys: Record<string, string> = {
  Amulette: "amulet",
  Casque: "helmet",
  Bracelet: "bracelet",
  Anneau: "ring",
  Ceinture: "belt",
  Gantelet: "gauntlet",
  Arme: "weapon",
  Bottes: "boots",
  Bouclier: "shield",
  Cape: "cloak",
  "Longue-vue": "spyglass",
  Sacoche: "pouch",
  Boussole: "compass",
  Torche: "torch",
  Pioche: "pickaxe",
};
const skillKeys: Record<string, string> = {
  Attaque: "striker",
  Bravoure: "brave",
  Charognard: "scavenger",
  Défense: "guardian",
  Intrépide: "fearless",
  Prospérité: "prosperous",
  Recruteur: "recruiter",
  Récupération: "cautious",
  Recycleur: "salvager",
  Vitesse: "rusher",
};
const weaponValues = [
  "",
  "Marteau",
  "Arc",
  "Lance",
  "Hache",
  "Sabre",
  "Épée",
  "Hallebarde",
];
const expeditionSlots = [
  "Cape",
  "Longue-vue",
  "Sacoche",
  "Boussole",
  "Torche",
  "Pioche",
];
const expeditionStats = [
  "",
  "Vitalité",
  "Perception",
  "Récupération",
  "Vitesse",
  "Esquive",
  "Chance",
];

function select<Row>(
  key: keyof Row & string,
  label: string,
  options: Array<{ value: string; label: string }>,
): EditableColumn<Row> {
  return { key, label, type: "select", options };
}
function text<Row>(
  key: keyof Row & string,
  label: string,
): EditableColumn<Row> {
  return { key, label };
}
function number<Row>(
  key: keyof Row & string,
  label: string,
  narrow = false,
): EditableColumn<Row> {
  return { key, label, type: "number", min: 0, step: 0.1, narrow };
}

function useOptions() {
  const game = useTranslations("game"),
    common = useTranslations("common");
  const map = (
    values: readonly string[],
    keys: Record<string, string>,
    namespace: string,
  ) =>
    values.map((value) => ({
      value,
      label: value ? game(`${namespace}.${keys[value]}`) : common("choose"),
    }));
  return {
    rarities: map(equipmentRarityValues, rarityKeys, "rarities"),
    combatFamilies: map(
      ["Attaque", "Défense", "Or", "Troupes/Vitesse"],
      familyKeys,
      "families",
    ),
    expeditionFamilies: map(
      ["Or", "Équipement", "Consommables", "Troupes"],
      familyKeys,
      "families",
    ),
    combatSlots: map(equipmentSlotLayout, slotKeys, "slots"),
    expeditionSlots: map(expeditionSlots, slotKeys, "slots"),
    // Bloc 37/G: "none" is distinct from "" (not yet filled in) — an admin
    // picks it to explicitly mark a skill slot as never having one, so the
    // public side shows "—" instead of the "still needs data" placeholder.
    // Stored as an English technical key (AGENTS.md), translated for display.
    skills: [
      { value: "", label: common("choose") },
      { value: "none", label: common("none") },
      ...equipmentSkillLabels.map((value) => ({
        value,
        label: game(`skills.${skillKeys[value]}`),
      })),
    ],
    stats: expeditionStats.map((value) => ({
      value,
      label: value
        ? game(
            `stats.${({ Vitalité: "vitality", Perception: "perception", Récupération: "recovery", Vitesse: "speed", Esquive: "dodge", Chance: "luck" } as Record<string, string>)[value]}`,
          )
        : common("choose"),
    })),
    weapons: weaponValues.map((value) => ({
      value,
      label: value || common("choose"),
    })),
  };
}

// Bloc 35/6.2: Famille, Rareté, Nom du set, Emplacement, then Compétence/Valeur
// ×4. Bloc 35/6.1: Pouciel and gem-slots are no longer per-row columns here —
// see CombatSkydustAdmin/CombatGemSlotsAdmin below.
export const CombatReferenceAdmin = forwardRef<
  ReferenceTableHandle,
  { initialRows: CombatReferenceRow[]; standalone?: boolean }
>(function CombatReferenceAdmin({ initialRows, standalone }, ref) {
  const t = useTranslations("admin.references"),
    equipment = useTranslations("combat-equipment.columns"),
    options = useOptions();
  const columns: EditableColumn<CombatReferenceRow>[] = (
    [
      select("family", t("columns.family"), options.combatFamilies),
      select("rarity", equipment("rarity"), options.rarities),
      text("set_name", t("columns.set-name")),
      select("slot_type", t("columns.slot-type"), options.combatSlots),
      select("slot_name", t("columns.slot-name"), options.weapons),
      ...([1, 2, 3, 4] as const).flatMap((position) => [
        select<CombatReferenceRow>(
          `skill_${position}`,
          equipment("skill", { number: position }),
          options.skills,
        ),
        number<CombatReferenceRow>(
          `value_${position}_pct`,
          t("columns.value", { number: position }),
          true,
        ),
      ]),
    ] as EditableColumn<CombatReferenceRow>[]
  ).map((column) => ({
    ...column,
    inputLabel: (index) =>
      t("row-label", { row: index + 1, field: column.label }),
  }));
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/combat-equipment"
      description={t("combat-description")}
      filters={[
        {
          key: "rarity",
          label: equipment("rarity"),
          options: options.rarities,
        },
        {
          key: "family",
          label: t("columns.family"),
          options: options.combatFamilies,
        },
        {
          key: "slot_type",
          label: t("columns.slot-type"),
          options: options.combatSlots,
        },
        { key: "skill_1", label: t("filters.skill"), options: options.skills },
      ]}
    />
  );
});

function useRarityBaseColumns(step = 1) {
  const game = useTranslations("game");
  const columns: EditableColumn<Record<string, string>>[] =
    mergeCostRarityKeys.map((key) => ({
      key,
      label: game(`rarities.${rarityKeys[key]}`),
      type: "number",
      min: 0,
      step,
      required: true,
    }));
  return columns;
}
// Bloc 75/A: Combat's 3 previously-separate single-metric tables (Pouciel
// merge cost, gem slots, Pouciel-at-destruction) merged into 1 table —
// columns = the 5 rarities (shared with every other rarity-keyed table
// here), 3 fixed-order rows labelled Fusion/Gemmes/Destruction via a
// leading read-only column. Storage is genuinely merged too (see
// getCombatSecondaryBase in reference-equipment-server.ts), not just this
// table's display — one PUT now saves all 3 quantities together.
export const CombatSecondaryAdmin = forwardRef<
  ReferenceTableHandle,
  {
    initial: {
      mergeCost: CombatMergeCostBase;
      gemSlots: CombatGemSlotsBase;
      skydust: CombatSkydustBase;
    };
    standalone?: boolean;
  }
>(function CombatSecondaryAdmin({ initial, standalone }, ref) {
  const t = useTranslations("admin.references");
  const rarityColumns = useRarityBaseColumns();
  const columns: EditableColumn<Record<string, string>>[] = [
    { key: "metric_label", label: t("secondary-row"), readOnly: true },
    ...rarityColumns,
  ];
  const initialRows = [
    {
      metric_label: t("row-merge-cost"),
      ...Object.fromEntries(
        mergeCostRarityKeys.map((key) => [key, String(initial.mergeCost[key])]),
      ),
    },
    {
      metric_label: t("row-gem-slots"),
      ...Object.fromEntries(
        mergeCostRarityKeys.map((key) => [key, String(initial.gemSlots[key])]),
      ),
    },
    {
      metric_label: t("row-destruction"),
      ...Object.fromEntries(
        mergeCostRarityKeys.map((key) => [key, String(initial.skydust[key])]),
      ),
    },
  ];
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      wideInputs
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/combat-equipment-secondary"
      description={t("combat-secondary-description")}
      descriptionAsTitle
    />
  );
});

// Bloc 75/C: Combat's per-skill star increments — promoted from a hardcoded
// lookup (equipmentStarIncrement, src/lib/equipment.ts) to genuine admin
// config, mirroring ExpeditionIncrementsAdmin exactly (same grid layout,
// same 1-row-of-N-columns shape, one column per skill instead of per stat).
export const CombatIncrementsAdmin = forwardRef<
  ReferenceTableHandle,
  { initial: EquipmentStarIncrements; standalone?: boolean }
>(function CombatIncrementsAdmin({ initial, standalone }, ref) {
  const t = useTranslations("admin.references");
  const game = useTranslations("game");
  const columns: EditableColumn<Record<string, string>>[] =
    equipmentSkillLabels.map((key) => ({
      key,
      label: game(`skills.${skillKeys[key]}`),
      type: "number",
      min: 0,
      step: 0.01,
      required: true,
      narrow: true,
    }));
  const initialRows = [
    Object.fromEntries(
      equipmentSkillLabels.map((key) => [key, String(initial[key])]),
    ),
  ];
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      wideInputs
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/combat-equipment-increments"
      description={t("combat-increments-description")}
      descriptionAsTitle
      layout="grid"
    />
  );
});

// Bloc 35/5.4: Famille, Rareté, Nom du set, Emplacement, Valeur stat
// primaire, Stat secondaire, Valeur stat secondaire.
export const ExpeditionReferenceAdmin = forwardRef<
  ReferenceTableHandle,
  { initialRows: ExpeditionReferenceRow[]; standalone?: boolean }
>(function ExpeditionReferenceAdmin({ initialRows, standalone }, ref) {
  const t = useTranslations("admin.references"),
    equipment = useTranslations("expedition-equipment.columns"),
    options = useOptions();
  const columns: EditableColumn<ExpeditionReferenceRow>[] = (
    [
      select("family", equipment("family"), options.expeditionFamilies),
      select("rarity", equipment("rarity"), options.rarities),
      text("set_name", t("columns.set-name")),
      select("slot", equipment("slot"), options.expeditionSlots),
      // Bloc 37/A: these two never exceed 100%, same as Combat's Valeur
      // columns — narrowed too, previously left at the wide default.
      number("type_stat_pct", t("columns.type-value"), true),
      select("secondary_stat_name", equipment("secondary-stat"), options.stats),
      number("secondary_stat_pct", t("columns.secondary-value"), true),
    ] as EditableColumn<ExpeditionReferenceRow>[]
  ).map((column) => ({
    ...column,
    inputLabel: (index) =>
      t("expedition-row-label", { row: index + 1, field: column.label }),
  }));
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/expedition-equipment"
      description={t("expedition-description")}
      descriptionAsTitle
      filters={[
        {
          key: "rarity",
          label: equipment("rarity"),
          options: options.rarities,
        },
        {
          key: "family",
          label: equipment("family"),
          options: options.expeditionFamilies,
        },
        {
          key: "slot",
          label: equipment("slot"),
          options: options.expeditionSlots,
        },
        {
          key: "secondary_stat_name",
          label: equipment("secondary-stat"),
          options: options.stats,
        },
      ]}
    />
  );
});

const expeditionStatLabelKeys: Record<
  (typeof expeditionStatKeys)[number],
  string
> = {
  Or: "families.gold",
  Troupes: "families.troops",
  Équipement: "families.equipment",
  Consommables: "families.consumables",
  Vitalité: "stats.vitality",
  Perception: "stats.perception",
  Récupération: "stats.recovery",
  Vitesse: "stats.speed",
  Esquive: "stats.dodge",
  Chance: "stats.luck",
};

// Bloc 35/5.1, 5.3, 5.5: grid layout (CSS), narrow % columns, dedicated title.
export const ExpeditionIncrementsAdmin = forwardRef<
  ReferenceTableHandle,
  { initial: ExpeditionStarIncrements; standalone?: boolean }
>(function ExpeditionIncrementsAdmin({ initial, standalone }, ref) {
  const t = useTranslations("admin.references");
  const game = useTranslations("game");
  const columns: EditableColumn<Record<string, string>>[] =
    expeditionStatKeys.map((key) => ({
      key,
      label: game(expeditionStatLabelKeys[key]),
      type: "number",
      min: 0,
      step: 0.01,
      required: true,
      narrow: true,
    }));
  const initialRows = [
    Object.fromEntries(
      expeditionStatKeys.map((key) => [key, String(initial[key])]),
    ),
  ];
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      wideInputs
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/expedition-equipment-increments"
      description={t("expedition-increments-description")}
      descriptionAsTitle
      layout="grid"
    />
  );
});

// Bloc 75/B: Expedition's 2 previously-separate single-metric tables
// (Terradust merge cost, Terradust-at-dismantle) merged into 1 table, same
// pattern as CombatSecondaryAdmin above — 2 fixed-order rows labelled
// Fusion/Destruction via a leading read-only column. Storage genuinely
// merged too (getExpeditionSecondaryBase).
export const ExpeditionSecondaryAdmin = forwardRef<
  ReferenceTableHandle,
  {
    initial: {
      mergeCost: ExpeditionMergeCostBase;
      dismantle: ExpeditionDismantleBase;
    };
    standalone?: boolean;
  }
>(function ExpeditionSecondaryAdmin({ initial, standalone }, ref) {
  const t = useTranslations("admin.references");
  const rarityColumns = useRarityBaseColumns();
  const columns: EditableColumn<Record<string, string>>[] = [
    { key: "metric_label", label: t("secondary-row"), readOnly: true },
    ...rarityColumns,
  ];
  const initialRows = [
    {
      metric_label: t("row-merge-cost"),
      ...Object.fromEntries(
        mergeCostRarityKeys.map((key) => [key, String(initial.mergeCost[key])]),
      ),
    },
    {
      metric_label: t("row-destruction"),
      ...Object.fromEntries(
        mergeCostRarityKeys.map((key) => [key, String(initial.dismantle[key])]),
      ),
    },
  ];
  return (
    <EditableReferenceTable
      ref={ref}
      standalone={standalone}
      wideInputs
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/expedition-equipment-secondary"
      description={t("expedition-secondary-description")}
      descriptionAsTitle
    />
  );
});

// Bloc 37/E: a single EditorActionBar at the top of the page, with one
// button that saves every table on this screen in one action — replaces
// the old layout, where every table (main + Pouciel + Gemmes, or
// increments + merge-cost + dismantle + main) rendered its own back link
// and its own save button repeated down the page.
// `refGroups` saves are sequenced group by group (refs within a group save
// in parallel) — needed because Combat's main table PUT reads the
// currently-persisted Pouciel/gem-slots bases and stamps them into every
// row, so those two base tables must finish saving before the main table's
// request is sent, or it can stamp stale values (Codex review, PR #59).
function useCombinedSave(
  refGroups: Array<Array<RefObject<ReferenceTableHandle | null>>>,
) {
  const t = useTranslations("admin.references");
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const refs = refGroups.flat();
  async function saveAll() {
    const valid = refs.every((r) => r.current?.validate() ?? true);
    if (!valid) {
      setStatus(t("validation"));
      setSuccess(false);
      return;
    }
    setStatus(t("saving"));
    setSuccess(false);
    let allOk = true;
    for (const group of refGroups) {
      const results = await Promise.all(
        group.map((r) => r.current?.save() ?? Promise.resolve(true)),
      );
      if (!results.every(Boolean)) allOk = false;
    }
    if (allOk) {
      setStatus(t("saved"));
      setSuccess(true);
    } else {
      setStatus(t("save-all-error"));
      setSuccess(false);
    }
  }
  return { status, success, saveAll, saveAllLabel: t("save-all") };
}

export function CombatReferenceScreen({
  initialRows,
  secondaryInitial,
  incrementsInitial,
}: {
  initialRows: CombatReferenceRow[];
  secondaryInitial: {
    mergeCost: CombatMergeCostBase;
    gemSlots: CombatGemSlotsBase;
    skydust: CombatSkydustBase;
  };
  incrementsInitial: EquipmentStarIncrements;
}) {
  const mainRef = useRef<ReferenceTableHandle>(null);
  const secondaryRef = useRef<ReferenceTableHandle>(null);
  const incrementsRef = useRef<ReferenceTableHandle>(null);
  const { status, saveAll, saveAllLabel } = useCombinedSave([
    [secondaryRef, incrementsRef],
    [mainRef],
  ]);
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/referentiels" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={saveAll}
        >
          {saveAllLabel}
        </button>
      </EditorActionBar>
      {/* Bloc 41/D: Pouciel/gem-slots moved ahead of the 180-row main table
          — short, single-row config tables that were easy to miss scrolled
          past all that. Bloc 75/A: now 1 merged table (Fusion/Gemmes/
          Destruction). Bloc 75/C: per-skill star increments join them. */}
      <CombatSecondaryAdmin
        ref={secondaryRef}
        initial={secondaryInitial}
        standalone={false}
      />
      <CombatIncrementsAdmin
        ref={incrementsRef}
        initial={incrementsInitial}
        standalone={false}
      />
      <CombatReferenceAdmin
        ref={mainRef}
        initialRows={initialRows}
        standalone={false}
      />
    </div>
  );
}

export function ExpeditionReferenceScreen({
  initialRows,
  incrementsInitial,
  secondaryInitial,
}: {
  initialRows: ExpeditionReferenceRow[];
  incrementsInitial: ExpeditionStarIncrements;
  secondaryInitial: {
    mergeCost: ExpeditionMergeCostBase;
    dismantle: ExpeditionDismantleBase;
  };
}) {
  const incrementsRef = useRef<ReferenceTableHandle>(null);
  const secondaryRef = useRef<ReferenceTableHandle>(null);
  const mainRef = useRef<ReferenceTableHandle>(null);
  const { status, saveAll, saveAllLabel } = useCombinedSave([
    [incrementsRef, secondaryRef, mainRef],
  ]);
  return (
    <div className="calculator-stack">
      <EditorActionBar backHref="/admin/referentiels" message={status}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={saveAll}
        >
          {saveAllLabel}
        </button>
      </EditorActionBar>
      <ExpeditionIncrementsAdmin
        ref={incrementsRef}
        initial={incrementsInitial}
        standalone={false}
      />
      {/* Bloc 75/B: merge-cost + dismantle now 1 merged table (Fusion/
          Destruction). */}
      <ExpeditionSecondaryAdmin
        ref={secondaryRef}
        initial={secondaryInitial}
        standalone={false}
      />
      <ExpeditionReferenceAdmin
        ref={mainRef}
        initialRows={initialRows}
        standalone={false}
      />
    </div>
  );
}
