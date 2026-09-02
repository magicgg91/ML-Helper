import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { templarsPresentationReferenceKey } from "@/lib/templars-presentation-server";
import { templarKeys } from "@/lib/player-settings";
import type { TemplarPresentationCatalog } from "@/lib/templars-presentation";
import {
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

// Bloc 66/B: unlike Boutique, this catalog is a fixed set of exactly 5
// rows (one per TemplarKey, cdc-confirmed) — no add/remove/reorder, so the
// payload is a plain object keyed by the 5 technical keys rather than an
// array with free CRUD. Base Temple/Bonus are deliberately not part of
// this row shape — see templars-presentation.ts's own comment.
function parseRow(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("invalid row");
  const source = raw as Record<string, unknown>;
  return {
    image: stringField(source.image),
    name_fr: stringField(source.name_fr),
    name_en: stringField(source.name_en),
    description_fr: stringField(source.description_fr),
    description_en: stringField(source.description_en),
  };
}

export async function PUT(request: Request) {
  // Codex review (PR #85): this edit point is reachable with either
  // capability (see /admin/tools/[id]/page.tsx's own dual-capability
  // check for the shared templars editor) — a tools_manager could open
  // the form and edit it, only to hit a 403 on save if this route kept
  // checking references.write alone.
  const session = await authorizedSession([
    "calculators.write",
    "references.write",
  ]);
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
      columns: ["image", "name_fr", "name_en", "description_fr", "description_en"],
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
