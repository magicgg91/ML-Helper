import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  expeditionStatKeys,
  parseExpeditionStarIncrements,
} from "@/lib/reference-equipment";
import { saveReferenceTable } from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  // The admin editor is a 1-row EditableReferenceTable, which always
  // submits an array (e.g. [{ Or: "0.5", ... }]), never the bare record.
  if (!Array.isArray(raw) || raw.length !== 1)
    return NextResponse.json(
      { error: "invalid_star_increments" },
      { status: 400 },
    );
  const increments = parseExpeditionStarIncrements(raw[0]);
  await saveReferenceTable({
    key: referenceKeys.expeditionIncrements,
    target: "les incréments par étoile des Équipements d’Expédition",
    columns: [...expeditionStatKeys],
    rows: [increments],
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json(increments);
}
