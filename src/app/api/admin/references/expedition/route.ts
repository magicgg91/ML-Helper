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
    if (!Array.isArray(body) || body.length !== 120)
      throw new Error("invalid rows");
    const rows = body.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("invalid row");
      const source = raw as Record<string, unknown>;
      return {
        rarity: stringField(source.rarity),
        set_name: stringField(source.set_name),
        family: stringField(source.family),
        slot: stringField(source.slot),
        type_stat_pct: numericString(source.type_stat_pct),
        secondary_stat_name: stringField(source.secondary_stat_name),
        secondary_stat_pct: numericString(source.secondary_stat_pct),
      };
    });
    await saveReferenceTable({
      key: referenceKeys.expedition,
      label: { fr: "Équipement d’Expédition", en: "Expedition Equipment" },
      columns: Object.keys(rows[0]),
      rows,
      userId: session!.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
