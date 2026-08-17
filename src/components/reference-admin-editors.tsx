"use client";

import {
  EditableReferenceTable,
  type EditableColumn,
} from "./editable-reference-table";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
} from "../lib/reference-equipment";

const text = <Row extends Record<string, string>>(
  key: keyof Row & string,
  label: string,
  inputLabel?: (index: number) => string,
): EditableColumn<Row> => ({ key, label, inputLabel });

const number = <Row extends Record<string, string>>(
  key: keyof Row & string,
  label: string,
  inputLabel?: (index: number) => string,
  step = 1,
): EditableColumn<Row> => ({
  key,
  label,
  inputLabel,
  type: "number",
  min: 0,
  step,
});

const combatColumns: EditableColumn<CombatReferenceRow>[] = [
  text("rarity", "Rareté", (i) => `Ligne ${i + 1} rareté`),
  text("set_name", "Nom du set", (i) => `Ligne ${i + 1} set`),
  text("family", "Famille", (i) => `Ligne ${i + 1} famille`),
  number("skydust", "Pouciel", (i) => `Ligne ${i + 1} pouciel`),
  number("gem_slots", "Gemmes", (i) => `Ligne ${i + 1} gemmes`),
  text(
    "slot_type",
    "Type d’emplacement",
    (i) => `Ligne ${i + 1} type emplacement`,
  ),
  text(
    "slot_name",
    "Nom d’emplacement",
    (i) => `Ligne ${i + 1} nom emplacement`,
  ),
  ...([1, 2, 3, 4] as const).flatMap((position) => [
    text(
      `skill_${position}`,
      `Compétence ${position}`,
      (i) => `Ligne ${i + 1} compétence ${position}`,
    ),
    number(
      `value_${position}_pct`,
      `Valeur ${position} (%)`,
      (i) => `Ligne ${i + 1} valeur ${position}`,
      0.1,
    ),
  ]),
];

const expeditionColumns: EditableColumn<ExpeditionReferenceRow>[] = [
  text("rarity", "Rareté", (i) => `Expédition ligne ${i + 1} rareté`),
  text("set_name", "Nom du set", (i) => `Expédition ligne ${i + 1} set`),
  text("family", "Famille", (i) => `Expédition ligne ${i + 1} famille`),
  text("slot", "Emplacement", (i) => `Expédition ligne ${i + 1} emplacement`),
  number(
    "type_stat_pct",
    "Valeur type (%)",
    (i) => `Expédition ligne ${i + 1} valeur type`,
    0.1,
  ),
  text(
    "secondary_stat_name",
    "Stat secondaire",
    (i) => `Expédition ligne ${i + 1} stat secondaire`,
  ),
  number(
    "secondary_stat_pct",
    "Valeur secondaire (%)",
    (i) => `Expédition ligne ${i + 1} valeur secondaire`,
    0.1,
  ),
];

export function CombatReferenceAdmin({
  initialRows,
}: {
  initialRows: CombatReferenceRow[];
}) {
  return (
    <EditableReferenceTable
      initialRows={initialRows}
      columns={combatColumns}
      endpoint="/api/admin/references/combat"
      description="Les 180 lignes et chaque valeur sont éditables individuellement. Ne renseigne une valeur inconnue qu’après confirmation en jeu."
    />
  );
}

export function ExpeditionReferenceAdmin({
  initialRows,
}: {
  initialRows: ExpeditionReferenceRow[];
}) {
  return (
    <EditableReferenceTable
      initialRows={initialRows}
      columns={expeditionColumns}
      endpoint="/api/admin/references/expedition"
      description="Les 120 lignes Expédition sont intégralement éditables. Les règles de confirmation restent affichées côté public."
    />
  );
}

type TemplarRow = Record<string, string> & { level: string; cost: string };
const templarColumns: EditableColumn<TemplarRow>[] = [
  {
    key: "level",
    label: "Niveau atteint",
    type: "number",
    readOnly: true,
    inputLabel: (i) => `Niveau Templier ${i + 1}`,
  },
  {
    key: "cost",
    label: "Coût du niveau",
    type: "number",
    min: 0,
    required: true,
    inputLabel: (i) => `Coût Templier niveau ${i + 1}`,
  },
];

export function TemplarReferenceAdmin({
  initialCosts,
}: {
  initialCosts: number[];
}) {
  const rows = initialCosts.map((cost, index) => ({
    level: String(index + 1),
    cost: String(cost),
  }));
  return (
    <EditableReferenceTable
      initialRows={rows}
      columns={templarColumns}
      endpoint="/api/admin/references/templars"
      description="Tous les coûts de niveau de la table exacte sont éditables individuellement."
      serialize={(current) =>
        current.map((row) => ({
          level: Number(row.level),
          cost: Number(row.cost),
        }))
      }
    />
  );
}
