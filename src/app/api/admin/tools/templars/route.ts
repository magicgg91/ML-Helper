import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { templarKeys } from "@/lib/player-settings";
import { parseTemplarParameters } from "@/lib/templar-parameters";
import type { TemplarPresentationCatalog } from "@/lib/templars-presentation";
import { templarsPresentationReferenceKey } from "@/lib/templars-presentation-server";
import { saveFormulaParametersIn } from "@/services/formula-parameters-admin";
import {
  numericString,
  saveReferenceTableIn,
  stringField,
} from "@/services/reference-table-admin";

/**
 * Bloc 119 §3 bis: one save for the whole Templiers screen.
 *
 * The screen used to carry two buttons — "Enregistrer les paramètres" for the
 * cost formula and "Enregistrer toute la page" for the presentation catalog —
 * so an admin could leave with half of their work stored. Both now travel in
 * one request and land in one transaction: either the formula and the catalog
 * are both saved, with both of today's audit entries, or neither is.
 *
 * Bloc 66/B, restored Bloc 68/C: the catalog is a fixed set of exactly 5 rows
 * (one per TemplarKey, cdc-confirmed) — no add/remove/reorder, so the payload
 * is an object keyed by the 5 technical keys.
 */
function parseRow(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("invalid row");
  const source = raw as Record<string, unknown>;
  return {
    image: stringField(source.image),
    name_fr: stringField(source.name_fr),
    name_en: stringField(source.name_en),
    description_fr: stringField(source.description_fr),
    description_en: stringField(source.description_en),
    temple_base: numericString(source.temple_base),
    bonus: numericString(source.bonus),
  };
}

const presentationColumns = [
  "image",
  "name_fr",
  "name_en",
  "description_fr",
  "description_en",
  "temple_base",
  "bonus",
];

export async function PUT(request: Request) {
  // Also reachable from the Référentiels table's "Templiers" reference row
  // (references_manager: references.write, no calculators.write), and from
  // the Outils table (tools_manager: the other way round) — so this edit
  // point accepts either capability, as its page does.
  const session = await authorizedSession([
    "calculators.write",
    "references.write",
  ]);
  if (!session) return forbiddenResponse();
  const raw = await request.json().catch(() => null);
  const base = Number(raw?.parameters?.base),
    ratio = Number(raw?.parameters?.ratio);
  if (
    !Number.isFinite(base) ||
    base <= 0 ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  )
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const parameters = parseTemplarParameters({ base, ratio });

  let presentation: TemplarPresentationCatalog;
  try {
    const source = raw?.presentation;
    if (!source || typeof source !== "object" || Array.isArray(source))
      throw new Error("invalid catalog");
    presentation = Object.fromEntries(
      templarKeys.map((key) => [
        key,
        parseRow((source as Record<string, unknown>)[key]),
      ]),
    ) as TemplarPresentationCatalog;
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }

  const actor = {
    userId: session.user.id,
    actorRole: session.user.role,
    actorName: session.user.name ?? session.user.id,
  };
  await prisma.$transaction(async (tx) => {
    await saveFormulaParametersIn(tx, {
      calculatorSlug: "templars",
      key: "templar_cost",
      formulaParams: parameters,
      target: "templars",
      ...actor,
    });
    await saveReferenceTableIn(tx, {
      key: templarsPresentationReferenceKey,
      target: "templars-reference",
      columns: presentationColumns,
      rows: presentation,
      ...actor,
    });
  });
  return NextResponse.json({ parameters, presentation });
}
