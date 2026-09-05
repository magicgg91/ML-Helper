import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseExpeditionDismantleBase,
  parseExpeditionMergeCostBase,
} from "@/lib/reference-equipment";
import { saveReferenceTable, stringField } from "@/services/reference-table-admin";

// Bloc 75/B: the admin editor is now 1 merged table with 2 fixed-order
// rows — Fusion (Terradust merge cost), Destruction (Terradust on
// dismantle) — each still parsed by its own existing parser.
// Bloc 76/B: metric_label is now editable free text (was read-only) —
// see the equivalent Combat route comment for the full reasoning. Fixed per
// Codex review on PR #94: stored per locale (fr/en), see the Combat route.
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
    {
      metric_label_fr: stringField(raw[0]?.metric_label_fr),
      metric_label_en: stringField(raw[0]?.metric_label_en),
      ...mergeCost,
    },
    {
      metric_label_fr: stringField(raw[1]?.metric_label_fr),
      metric_label_en: stringField(raw[1]?.metric_label_en),
      ...dismantle,
    },
  ];
  await saveReferenceTable({
    key: referenceKeys.expeditionSecondary,
    target: "le Terradust (fusion, destruction) des Équipements d’Expédition",
    columns: ["metric_label_fr", "metric_label_en", ...mergeCostRarityKeys],
    rows,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json({ mergeCost, dismantle });
}
