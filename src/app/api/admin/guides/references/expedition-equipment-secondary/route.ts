import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseExpeditionDismantleBase,
  parseExpeditionMergeCostBase,
} from "@/lib/reference-equipment";
import {
  localizedFieldOrPair,
  saveReferenceTable,
} from "@/services/reference-table-admin";

// Bloc 75/B: the admin editor is now 1 merged table with 2 fixed-order
// rows — Fusion (Terradust merge cost), Destruction (Terradust on
// dismantle) — each still parsed by its own existing parser.
// Bloc 76/B: metric_label is now editable free text (was read-only) —
// see the equivalent Combat route comment for the full reasoning. Fixed per
// Codex review on PR #94: stored per locale, see the Combat route.
// Bloc 127 (PR 2/3): one field per language, same as the Combat route.
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
  let rows;
  try {
    // Bloc 127 (PR 2/3) : le libellé par langue est analysé strictement
    // (`localizedFieldOrPair`). Un champ mal formé rend le 400 que cette
    // route rend déjà pour une charge utile mal formée, jamais une
    // exception — et rien n'est enregistré à moitié.
    rows = [
      {
        metric_label: localizedFieldOrPair(raw[0], "metric_label"),
        ...mergeCost,
      },
      {
        metric_label: localizedFieldOrPair(raw[1], "metric_label"),
        ...dismantle,
      },
    ];
  } catch {
    return NextResponse.json(
      { error: "invalid_expedition_secondary_base" },
      { status: 400 },
    );
  }
  await saveReferenceTable({
    key: referenceKeys.expeditionSecondary,
    target: "expedition-equipment-secondary",
    columns: ["metric_label", ...mergeCostRarityKeys],
    rows,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  await revalidateContent("references", "expedition-equipment");
  return NextResponse.json({ mergeCost, dismantle });
}
