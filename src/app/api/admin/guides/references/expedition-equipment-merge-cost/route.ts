import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseExpeditionMergeCostBase,
} from "@/lib/reference-equipment";
import { saveReferenceTable } from "@/services/reference-table-admin";

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  // The admin editor is a 1-row EditableReferenceTable, which always
  // submits an array (e.g. [{ Commun: "700", ... }]), never the bare record.
  if (!Array.isArray(raw) || raw.length !== 1)
    return NextResponse.json(
      { error: "invalid_merge_cost_base" },
      { status: 400 },
    );
  const base = parseExpeditionMergeCostBase(raw[0]);
  await saveReferenceTable({
    key: referenceKeys.expeditionMergeCost,
    target: "le coût de fusion en Terradust de l’Équipement d’Expédition",
    columns: [...mergeCostRarityKeys],
    rows: [base],
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json(base);
}
