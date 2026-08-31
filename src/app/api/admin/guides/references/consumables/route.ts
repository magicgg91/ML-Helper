import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { consumablesReferenceKey } from "@/lib/consumables-server";
import {
  consumableCategories,
  type ConsumableCatalog,
} from "@/lib/consumables";
import {
  numericString,
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

// Bloc 43: unlike Combat/Expedition/Level Up's fixed-length catalogs, this
// reference has free CRUD (cdc: "ajout et suppression libre de lignes") —
// no fixed row count to enforce, array order is itself the public display
// order.
// Bloc 48/B: the payload is now a plain object keyed by category (one
// table per category, category implicit to which array a row is in)
// instead of a single flat array with a category field per row.
export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("invalid catalog");
    const source = body as Record<string, unknown>;
    const catalog: ConsumableCatalog = Object.fromEntries(
      consumableCategories.map((category) => {
        const rawRows = source[category];
        if (!Array.isArray(rawRows)) throw new Error("invalid category rows");
        const rows = rawRows.map((raw) => {
          if (!raw || typeof raw !== "object") throw new Error("invalid row");
          const rowSource = raw as Record<string, unknown>;
          return {
            image: stringField(rowSource.image),
            name_fr: stringField(rowSource.name_fr),
            name_en: stringField(rowSource.name_en),
            description_fr: stringField(rowSource.description_fr),
            description_en: stringField(rowSource.description_en),
            // Left empty rather than defaulted to 0 when the cost isn't
            // confirmed yet (AGENTS.md: never invent a game value).
            cost: numericString(rowSource.cost),
          };
        });
        return [category, rows];
      }),
    ) as ConsumableCatalog;
    await saveReferenceTable({
      key: consumablesReferenceKey,
      target: "le référentiel Boutique",
      columns: [
        "image",
        "name_fr",
        "name_en",
        "description_fr",
        "description_en",
        "cost",
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
