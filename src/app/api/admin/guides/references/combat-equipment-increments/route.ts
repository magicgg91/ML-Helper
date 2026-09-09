import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import { equipmentSkillLabels, parseEquipmentStarIncrements } from "@/lib/equipment";
import { saveReferenceTable } from "@/services/reference-table-admin";

// Bloc 75/C: mirrors expedition-equipment-increments/route.ts exactly — a
// 1-row EditableReferenceTable, one column per skill.
export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!Array.isArray(raw) || raw.length !== 1)
    return NextResponse.json(
      { error: "invalid_star_increments" },
      { status: 400 },
    );
  const increments = parseEquipmentStarIncrements(raw[0]);
  await saveReferenceTable({
    key: referenceKeys.combatIncrements,
    target: "les incréments par étoile des Équipements de Combat",
    columns: [...equipmentSkillLabels],
    rows: [increments],
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json(increments);
}
