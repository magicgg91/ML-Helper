import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth/options";
import { equipmentSkillLabels } from "@/lib/equipment";
import {
  missingCombatRows,
  type CombatReferenceRow,
} from "@/lib/reference-equipment";
import { combatOverridesKey } from "@/lib/reference-equipment-server";
import { prisma } from "@/lib/prisma";

const identity = (row: Partial<CombatReferenceRow>) =>
  `${row.rarity}|${row.set_name}|${row.slot_type}`;

function parseRows(value: unknown): Partial<CombatReferenceRow>[] {
  if (!Array.isArray(value)) throw new Error("invalid");
  const allowedRows = new Set(missingCombatRows().map(identity));
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("invalid");
    const row = raw as Partial<CombatReferenceRow>;
    if (!allowedRows.has(identity(row))) throw new Error("invalid");
    const result: Partial<CombatReferenceRow> = {
      rarity: row.rarity,
      set_name: row.set_name,
      slot_type: row.slot_type,
    };
    for (const number of [1, 2, 3, 4] as const) {
      const skill = String(row[`skill_${number}`] ?? "").trim();
      const rawValue = String(row[`value_${number}_pct`] ?? "").trim();
      if (
        skill &&
        !equipmentSkillLabels.includes(
          skill as (typeof equipmentSkillLabels)[number],
        )
      )
        throw new Error("invalid");
      if (
        rawValue &&
        (!Number.isFinite(Number(rawValue)) || Number(rawValue) < 0)
      )
        throw new Error("invalid");
      result[`skill_${number}`] = skill || (number === 1 ? "Inconnu" : "");
      result[`value_${number}_pct`] = rawValue;
    }
    return result;
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const rows = parseRows(await request.json());
    const before = await prisma.referenceTable.findUnique({
      where: { key: combatOverridesKey },
    });
    const table = await prisma.referenceTable.upsert({
      where: { key: combatOverridesKey },
      create: {
        key: combatOverridesKey,
        label: {
          fr: "Valeurs manquantes des équipements de combat",
          en: "Missing combat equipment values",
        },
        columns: ["rarity", "set_name", "slot_type", "skills"],
        rows,
      },
      update: { rows },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: before ? "update" : "create",
        entityType: "reference_table",
        entityId: table.id,
        diff: { before: before?.rows ?? null, after: rows },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
