"use client";

import { useTranslations } from "next-intl";
import { EditableReferenceTable, type EditableColumn } from "./editable-reference-table";
import { equipmentRarityValues, derivedEquipmentValues } from "../lib/equipment-rarity";
import { equipmentSkillLabels, equipmentSlotLayout } from "../lib/equipment";
import {
  expeditionStatKeys,
  type CombatReferenceRow,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "../lib/reference-equipment";

const rarityKeys: Record<string, string> = { Commun: "common", Rare: "rare", Épique: "epic", Mythique: "mythic", Légendaire: "legendary" };
const familyKeys: Record<string, string> = { Attaque: "attack", Défense: "defense", Or: "gold", "Troupes/Vitesse": "troops-speed", Équipement: "equipment", Consommables: "consumables", Troupes: "troops" };
const slotKeys: Record<string, string> = { Amulette: "amulet", Casque: "helmet", Bracelet: "bracelet", Anneau: "ring", Ceinture: "belt", Gantelet: "gauntlet", Arme: "weapon", Bottes: "boots", Bouclier: "shield", Cape: "cloak", "Longue-vue": "spyglass", Sacoche: "pouch", Boussole: "compass", Torche: "torch", Pioche: "pickaxe" };
const skillKeys: Record<string, string> = { Attaque: "striker", Bravoure: "brave", Charognard: "scavenger", Défense: "guardian", Intrépide: "fearless", Prospérité: "prosperous", Recruteur: "recruiter", Récupération: "cautious", Recycleur: "salvager", Vitesse: "rusher" };
const weaponValues = ["", "Marteau", "Arc", "Lance", "Hache", "Sabre", "Épée", "Hallebarde"];
const expeditionSlots = ["Cape", "Longue-vue", "Sacoche", "Boussole", "Torche", "Pioche"];
const expeditionStats = ["", "Vitalité", "Perception", "Récupération", "Vitesse", "Esquive", "Chance"];

function select<Row>(key: keyof Row & string, label: string, options: Array<{ value: string; label: string }>): EditableColumn<Row> { return { key, label, type: "select", options }; }
function text<Row>(key: keyof Row & string, label: string): EditableColumn<Row> { return { key, label }; }
function number<Row>(key: keyof Row & string, label: string, readOnly = false): EditableColumn<Row> { return { key, label, type: "number", min: 0, step: 0.1, readOnly }; }

function useOptions() {
  const game = useTranslations("game"), common = useTranslations("common");
  const map = (values: readonly string[], keys: Record<string, string>, namespace: string) => values.map((value) => ({ value, label: value ? game(`${namespace}.${keys[value]}`) : common("choose") }));
  return {
    rarities: map(equipmentRarityValues, rarityKeys, "rarities"),
    combatFamilies: map(["Attaque", "Défense", "Or", "Troupes/Vitesse"], familyKeys, "families"), expeditionFamilies: map(["Or", "Équipement", "Consommables", "Troupes"], familyKeys, "families"),
    combatSlots: map(equipmentSlotLayout, slotKeys, "slots"), expeditionSlots: map(expeditionSlots, slotKeys, "slots"), skills: map(["", ...equipmentSkillLabels], skillKeys, "skills"),
    stats: expeditionStats.map((value) => ({ value, label: value ? game(`stats.${({ Vitalité: "vitality", Perception: "perception", Récupération: "recovery", Vitesse: "speed", Esquive: "dodge", Chance: "luck" } as Record<string, string>)[value]}`) : common("choose") })),
    weapons: weaponValues.map((value) => ({ value, label: value || common("choose") })),
  };
}

export function CombatReferenceAdmin({ initialRows }: { initialRows: CombatReferenceRow[] }) {
  const t = useTranslations("admin.references"), equipment = useTranslations("combat-equipment.columns"), options = useOptions();
  const columns: EditableColumn<CombatReferenceRow>[] = ([
    select("rarity", equipment("rarity"), options.rarities), text("set_name", t("columns.set-name")), select("family", t("columns.family"), options.combatFamilies), number("skydust", equipment("skydust"), true), number("gem_slots", equipment("gems"), true), select("slot_type", t("columns.slot-type"), options.combatSlots), select("slot_name", t("columns.slot-name"), options.weapons),
    ...([1, 2, 3, 4] as const).flatMap((position) => [select<CombatReferenceRow>(`skill_${position}`, equipment("skill", { number: position }), options.skills), number<CombatReferenceRow>(`value_${position}_pct`, t("columns.value", { number: position }))]),
  ] as EditableColumn<CombatReferenceRow>[]).map((column) => ({ ...column, inputLabel: (index) => t("row-label", { row: index + 1, field: column.label }) }));
  return <EditableReferenceTable initialRows={initialRows} columns={columns} endpoint="/api/admin/guides/references/combat-equipment" description={t("combat-description")} filters={[{ key: "rarity", label: equipment("rarity"), options: options.rarities }, { key: "family", label: t("columns.family"), options: options.combatFamilies }, { key: "slot_type", label: t("columns.slot-type"), options: options.combatSlots }, { key: "skill_1", label: t("filters.skill"), options: options.skills }]} onRowsChange={(rows, index, field) => field === "rarity" ? rows.map((row, rowIndex) => rowIndex === index ? { ...row, skydust: String(derivedEquipmentValues(row.rarity).skydust), gem_slots: String(derivedEquipmentValues(row.rarity).gemSlots) } : row) : rows} />;
}

export function ExpeditionReferenceAdmin({ initialRows }: { initialRows: ExpeditionReferenceRow[] }) {
  const t = useTranslations("admin.references"), equipment = useTranslations("expedition-equipment.columns"), options = useOptions();
  const columns: EditableColumn<ExpeditionReferenceRow>[] = ([select("rarity", equipment("rarity"), options.rarities), text("set_name", t("columns.set-name")), select("family", equipment("family"), options.expeditionFamilies), select("slot", equipment("slot"), options.expeditionSlots), number("type_stat_pct", t("columns.type-value")), select("secondary_stat_name", equipment("secondary-stat"), options.stats), number("secondary_stat_pct", t("columns.secondary-value"))] as EditableColumn<ExpeditionReferenceRow>[]).map((column) => ({ ...column, inputLabel: (index) => t("expedition-row-label", { row: index + 1, field: column.label }) }));
  return <EditableReferenceTable initialRows={initialRows} columns={columns} endpoint="/api/admin/guides/references/expedition-equipment" description={t("expedition-description")} filters={[{ key: "rarity", label: equipment("rarity"), options: options.rarities }, { key: "family", label: equipment("family"), options: options.expeditionFamilies }, { key: "slot", label: equipment("slot"), options: options.expeditionSlots }, { key: "secondary_stat_name", label: equipment("secondary-stat"), options: options.stats }]} />;
}

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

export function ExpeditionIncrementsAdmin({
  initial,
}: {
  initial: ExpeditionStarIncrements;
}) {
  const t = useTranslations("admin.references");
  const game = useTranslations("game");
  const columns: EditableColumn<Record<string, string>>[] = expeditionStatKeys.map(
    (key) => ({
      key,
      label: game(expeditionStatLabelKeys[key]),
      type: "number",
      min: 0,
      step: 0.01,
      required: true,
    }),
  );
  const initialRows = [
    Object.fromEntries(
      expeditionStatKeys.map((key) => [key, String(initial[key])]),
    ),
  ];
  return (
    <EditableReferenceTable
      initialRows={initialRows}
      columns={columns}
      endpoint="/api/admin/guides/references/expedition-equipment-increments"
      description={t("expedition-increments-description")}
    />
  );
}
