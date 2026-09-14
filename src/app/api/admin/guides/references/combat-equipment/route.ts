import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import {
  getCombatGemSlotsBase,
  getCombatSkydustBase,
  referenceKeys,
} from "@/lib/reference-equipment-server";
import type { MergeCostRarityKey } from "@/lib/reference-equipment";
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
    // Bloc 35/6.1: Pouciel/gem-slots per rarity are now admin-editable
    // config (no longer a hardcoded lookup) — every saved row is stamped
    // from the current config, never from whatever the client submitted,
    // so the main table can't drift out of sync with it.
    const [skydustBase, gemSlotsBase] = await Promise.all([
      getCombatSkydustBase(),
      getCombatGemSlotsBase(),
    ]);
    const rows = body.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("invalid row");
      const source = raw as Record<string, unknown>;
      const rarity = stringField(source.rarity);
      const rarityKey = rarity as MergeCostRarityKey;
      const row: Record<string, string> = {
        rarity,
        skydust: String(skydustBase[rarityKey] ?? 0),
        gem_slots: String(gemSlotsBase[rarityKey] ?? 0),
      };
      for (const field of [
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
      target: "le référentiel Équipements de Combat",
      columns: Object.keys(rows[0]),
      rows,
      userId: session.user.id,
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
