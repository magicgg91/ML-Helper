import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseExpeditionDismantleBase,
  parseExpeditionMergeCostBase,
} from "@/lib/reference-equipment";
import { saveReferenceTable } from "@/services/reference-table-admin";

// Bloc 75/B: the admin editor is now 1 merged table with 2 fixed-order
// rows — Fusion (Terradust merge cost), Destruction (Terradust on
// dismantle) — each still parsed by its own existing parser.
export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!Array.isArray(raw) || raw.length !== 2)
    return NextResponse.json(
      { error: "invalid_expedition_secondary_base" },
      { status: 400 },
    );
  const mergeCost = parseExpeditionMergeCostBase(raw[0]);
  const dismantle = parseExpeditionDismantleBase(raw[1]);
  const rows = [
    { metric_label: raw[0]?.metric_label ?? "", ...mergeCost },
    { metric_label: raw[1]?.metric_label ?? "", ...dismantle },
  ];
  await saveReferenceTable({
    key: referenceKeys.expeditionSecondary,
    target: "le Terradust (fusion, destruction) des Équipements d’Expédition",
    columns: ["metric_label", ...mergeCostRarityKeys],
    rows,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json({ mergeCost, dismantle });
}
