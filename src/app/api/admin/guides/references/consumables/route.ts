import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { consumablesReferenceKey } from "@/lib/consumables-server";
import { parseConsumableCategory } from "@/lib/consumables";
import {
  numericString,
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

// Bloc 43: unlike Combat/Expedition/Level Up's fixed-length catalogs, this
// reference has free CRUD (cdc: "ajout et suppression libre de lignes") —
// no fixed row count to enforce, array order is itself the public display
// order.
export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!Array.isArray(body)) throw new Error("invalid rows");
    const rows = body.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("invalid row");
      const source = raw as Record<string, unknown>;
      return {
        image: stringField(source.image),
        name_fr: stringField(source.name_fr),
        name_en: stringField(source.name_en),
        description_fr: stringField(source.description_fr),
        description_en: stringField(source.description_en),
        // Left empty rather than defaulted to 0 when the cost isn't
        // confirmed yet (AGENTS.md: never invent a game value).
        cost: numericString(source.cost),
        category: parseConsumableCategory(
          source.category,
          stringField(source.name_fr),
        ),
      };
    });
    await saveReferenceTable({
      key: consumablesReferenceKey,
      target: "le référentiel Consommables",
      columns: [
        "image",
        "name_fr",
        "name_en",
        "description_fr",
        "description_en",
        "cost",
        "category",
      ],
      rows,
      userId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
