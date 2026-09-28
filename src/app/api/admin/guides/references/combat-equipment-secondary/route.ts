import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { referenceKeys } from "@/lib/reference-equipment-server";
import {
  mergeCostRarityKeys,
  parseCombatGemSlotsBase,
  parseCombatMergeCostBase,
  parseCombatSkydustBase,
} from "@/lib/reference-equipment";
import {
  localizedFieldOrPair,
  saveReferenceTable,
} from "@/services/reference-table-admin";

// Bloc 75/A: the admin editor is now 1 merged table with 3 fixed-order
// rows — Fusion (merge cost), Gemmes (gem slots), Destruction (skydust) —
// each still parsed by its own existing parser, so the 3 previously
// separate quantities stay independently validated exactly as before.
// Bloc 76/B: metric_label is now editable free text (was a fixed,
// read-only display value) — stringField sanitizes it the same way every
// other free-text admin field here already is (set names, guide titles…).
// Fixed per Codex review on PR #94: stored per locale instead of one literal
// string, so a save from one locale's admin no longer overrides next-intl's
// translation for every other locale's visitors — see
// CombatSecondaryBase.labels in reference-equipment-server.ts.
// Bloc 127 (PR 2/3): that per-locale store is now the site's shared
// `LocalizedField`, so the five languages each have their own slot instead of
// French and "everybody else". A locale left blank stays absent, and the
// public read falls back to the translated default — never to another
// locale's override.
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
        ...gemSlots,
      },
      {
        metric_label: localizedFieldOrPair(raw[2], "metric_label"),
        ...skydust,
      },
    ];
  } catch {
    return NextResponse.json(
      { error: "invalid_combat_secondary_base" },
      { status: 400 },
    );
  }
  await saveReferenceTable({
    key: referenceKeys.combatSecondary,
    target: "combat-equipment-secondary",
    columns: ["metric_label", ...mergeCostRarityKeys],
    rows,
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  });
  await revalidateContent("references", "combat-equipment");
  return NextResponse.json({ mergeCost, gemSlots, skydust });
}
