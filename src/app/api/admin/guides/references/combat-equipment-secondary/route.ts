import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseCombatGemSlotsBase,
  parseCombatMergeCostBase,
  parseCombatSkydustBase,
} from "@/lib/reference-equipment";
import { saveReferenceTable, stringField } from "@/services/reference-table-admin";

// Bloc 75/A: the admin editor is now 1 merged table with 3 fixed-order
// rows — Fusion (merge cost), Gemmes (gem slots), Destruction (skydust) —
// each still parsed by its own existing parser, so the 3 previously
// separate quantities stay independently validated exactly as before.
// Bloc 76/B: metric_label is now editable free text (was a fixed,
// read-only display value) — stringField sanitizes it the same way every
// other free-text admin field here already is (set names, guide titles…).
// Fixed per Codex review on PR #94: stored per locale (fr/en) instead of one
// literal string, so a save from one locale's admin no longer overrides
// next-intl's translation for every other locale's visitors — see
// CombatSecondaryBase.labels in reference-equipment-server.ts.
export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  if (!Array.isArray(raw) || raw.length !== 3)
    return NextResponse.json(
      { error: "invalid_combat_secondary_base" },
      { status: 400 },
    );
  const mergeCost = parseCombatMergeCostBase(raw[0]);
  const gemSlots = parseCombatGemSlotsBase(raw[1]);
  const skydust = parseCombatSkydustBase(raw[2]);
  const rows = [
    {
      metric_label_fr: stringField(raw[0]?.metric_label_fr),
      metric_label_en: stringField(raw[0]?.metric_label_en),
      ...mergeCost,
    },
    {
      metric_label_fr: stringField(raw[1]?.metric_label_fr),
      metric_label_en: stringField(raw[1]?.metric_label_en),
      ...gemSlots,
    },
    {
      metric_label_fr: stringField(raw[2]?.metric_label_fr),
      metric_label_en: stringField(raw[2]?.metric_label_en),
      ...skydust,
    },
  ];
  await saveReferenceTable({
    key: referenceKeys.combatSecondary,
    target: "le Pouciel (fusion, gemmes, destruction) des Équipements de Combat",
    columns: ["metric_label_fr", "metric_label_en", ...mergeCostRarityKeys],
    rows,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  return NextResponse.json({ mergeCost, gemSlots, skydust });
}
