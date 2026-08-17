import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  numericString,
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!Array.isArray(body) || body.length !== 180)
      throw new Error("invalid rows");
    const rows = body.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("invalid row");
      const source = raw as Record<string, unknown>;
      const row: Record<string, string> = {};
      for (const field of [
        "rarity",
        "set_name",
        "family",
        "slot_type",
        "slot_name",
        "skill_1",
        "skill_2",
        "skill_3",
        "skill_4",
      ])
        row[field] = stringField(source[field]);
      for (const field of [
        "skydust",
        "gem_slots",
        "value_1_pct",
        "value_2_pct",
        "value_3_pct",
        "value_4_pct",
      ])
        row[field] = numericString(source[field]);
      return row;
    });
    await saveReferenceTable({
      key: referenceKeys.combat,
      label: { fr: "Équipements de Combat", en: "Combat Equipment" },
      columns: Object.keys(rows[0]),
      rows,
      userId: session!.user.id,
      actorRole: session.user.role,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
