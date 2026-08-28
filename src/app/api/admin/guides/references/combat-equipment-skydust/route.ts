import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseCombatSkydustBase,
} from "@/lib/reference-equipment";
import { saveReferenceTable } from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  // The admin editor is a 1-row EditableReferenceTable, which always
  // submits an array (e.g. [{ Commun: "3", ... }]), never the bare record.
  if (!Array.isArray(raw) || raw.length !== 1)
    return NextResponse.json(
      { error: "invalid_skydust_base" },
      { status: 400 },
    );
  const base = parseCombatSkydustBase(raw[0]);
  await saveReferenceTable({
    key: referenceKeys.combatSkydust,
    target: "le Pouciel à la destruction des Équipements de Combat",
    columns: [...mergeCostRarityKeys],
    rows: [base],
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json(base);
}
