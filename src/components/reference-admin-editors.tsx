"use client";

import {
  EditableReferenceTable,
  type EditableColumn,
} from "./editable-reference-table";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
} from "../lib/reference-equipment";
import { useTranslations } from "next-intl";

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

export function CombatReferenceAdmin({
  initialRows,
}: {
  initialRows: CombatReferenceRow[];
}) {
  const t = useTranslations("admin.references");
  const equipment = useTranslations("combat-equipment.columns");
  const row = (i: number, field: string) => t("row-label", { row: i + 1, field });
  const combatColumns: EditableColumn<CombatReferenceRow>[] = [
    text("rarity", equipment("rarity"), (i) => row(i, equipment("rarity"))),
    text("set_name", t("columns.set-name"), (i) => row(i, t("columns.set-name"))),
    text("family", t("columns.family"), (i) => row(i, t("columns.family"))),
    number("skydust", equipment("skydust"), (i) => row(i, equipment("skydust"))),
    number("gem_slots", equipment("gems"), (i) => row(i, equipment("gems"))),
    text("slot_type", t("columns.slot-type"), (i) => row(i, t("columns.slot-type"))),
    text("slot_name", t("columns.slot-name"), (i) => row(i, t("columns.slot-name"))),
    ...([1, 2, 3, 4] as const).flatMap((position) => [
      text(`skill_${position}`, equipment("skill", { number: position }), (i) => row(i, equipment("skill", { number: position }))),
      number(`value_${position}_pct`, t("columns.value", { number: position }), (i) => row(i, t("columns.value", { number: position })), 0.1),
    ]),
  ];
  return (
    <EditableReferenceTable
      initialRows={initialRows}
      columns={combatColumns}
      endpoint="/api/admin/references/combat"
      description={t("combat-description")}
    />
  );
}

export function ExpeditionReferenceAdmin({
  initialRows,
}: {
  initialRows: ExpeditionReferenceRow[];
}) {
  const t = useTranslations("admin.references");
  const equipment = useTranslations("expedition-equipment.columns");
  const row = (i: number, field: string) => t("expedition-row-label", { row: i + 1, field });
  const expeditionColumns: EditableColumn<ExpeditionReferenceRow>[] = [
    text("rarity", equipment("rarity"), (i) => row(i, equipment("rarity"))),
    text("set_name", t("columns.set-name"), (i) => row(i, t("columns.set-name"))),
    text("family", equipment("family"), (i) => row(i, equipment("family"))),
    text("slot", equipment("slot"), (i) => row(i, equipment("slot"))),
    number("type_stat_pct", t("columns.type-value"), (i) => row(i, t("columns.type-value")), 0.1),
    text("secondary_stat_name", equipment("secondary-stat"), (i) => row(i, equipment("secondary-stat"))),
    number("secondary_stat_pct", t("columns.secondary-value"), (i) => row(i, t("columns.secondary-value")), 0.1),
  ];
  return (
    <EditableReferenceTable
      initialRows={initialRows}
      columns={expeditionColumns}
      endpoint="/api/admin/references/expedition"
      description={t("expedition-description")}
    />
  );
}

type TemplarRow = Record<string, string> & { level: string; cost: string };
export function TemplarReferenceAdmin({
  initialCosts,
}: {
  initialCosts: number[];
}) {
  const t = useTranslations("admin.references");
  const templarColumns: EditableColumn<TemplarRow>[] = [
    { key: "level", label: t("columns.level"), type: "number", readOnly: true, inputLabel: (i) => t("templar-level-label", { level: i + 1 }) },
    { key: "cost", label: t("columns.level-cost"), type: "number", min: 0, required: true, inputLabel: (i) => t("templar-cost-label", { level: i + 1 }) },
  ];
  const rows = initialCosts.map((cost, index) => ({
    level: String(index + 1),
    cost: String(cost),
  }));
  return (
    <EditableReferenceTable
      initialRows={rows}
      columns={templarColumns}
      endpoint="/api/admin/references/templars"
      description={t("templars-description")}
      serialize={(current) =>
        current.map((row) => ({
          level: Number(row.level),
          cost: Number(row.cost),
        }))
      }
    />
  );
}
