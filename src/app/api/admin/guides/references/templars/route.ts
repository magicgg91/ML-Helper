import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { templarsPresentationReferenceKey } from "@/lib/templars-presentation-server";
import { templarKeys } from "@/lib/player-settings";
import type { TemplarPresentationCatalog } from "@/lib/templars-presentation";
import {
  numericString,
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

// Bloc 66/B: unlike Boutique, this catalog is a fixed set of exactly 5
// rows (one per TemplarKey, cdc-confirmed) — no add/remove/reorder, so the
// payload is a plain object keyed by the 5 technical keys rather than an
// array with free CRUD.
function parseRow(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("invalid row");
  const source = raw as Record<string, unknown>;
  return {
    image: stringField(source.image),
    name_fr: stringField(source.name_fr),
    name_en: stringField(source.name_en),
    description_fr: stringField(source.description_fr),
    description_en: stringField(source.description_en),
    // Left empty rather than defaulted to 0 when not confirmed yet
    // (AGENTS.md: never invent a game value) — though both are normally
    // pre-seeded from the already-confirmed templeBase/templarRates.
    temple_base: numericString(source.temple_base),
    bonus: numericString(source.bonus),
  };
}

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("invalid catalog");
    const source = body as Record<string, unknown>;
    const catalog: TemplarPresentationCatalog = Object.fromEntries(
      templarKeys.map((key) => [key, parseRow(source[key])]),
    ) as TemplarPresentationCatalog;
    await saveReferenceTable({
      key: templarsPresentationReferenceKey,
      target: "la présentation du référentiel Templiers",
      columns: [
        "image",
        "name_fr",
        "name_en",
        "description_fr",
        "description_en",
        "temple_base",
        "bonus",
      ],
      rows: catalog,
      userId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
