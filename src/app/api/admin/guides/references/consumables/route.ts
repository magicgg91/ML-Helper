import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { consumablesReferenceKey } from "@/lib/consumables-server";
import {
  consumableCategories,
  type ConsumableCatalog,
} from "@/lib/consumables";
import {
  localizedField,
  numericString,
  saveReferenceTable,
  stringField,
} from "@/services/reference-table-admin";

// Bloc 43: Consumables has free CRUD (cdc: "ajout et suppression libre de
// lignes") — no fixed row count to enforce, array order is itself the
// public display order.
// Bloc 48/B: the payload is a plain object keyed by category (one table
// per category, category implicit to which array a row is in).
// Bloc 58/A: "intro" is now a 5th table with the exact same row shape as
// the 4 category tables (the free-text markdown intro zone is gone) —
// parsed and saved the same way, alongside them, in the same single write
// (Bloc 57's single-audit-log-line guarantee holds for free: back to one
// write, one entry, since there is only ever one table to save again).
const consumableSections = ["intro", ...consumableCategories] as const;

function parseRows(rawRows: unknown) {
  if (!Array.isArray(rawRows)) throw new Error("invalid category rows");
  return rawRows.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("invalid row");
    const rowSource = raw as Record<string, unknown>;
    return {
      image: stringField(rowSource.image),
      // Bloc 127: one field per language instead of the fr/en pair. Strict,
      // like the cost below: a malformed field rejects the whole catalogue
      // with a 400 rather than saving half of it.
      name: localizedField(rowSource.name),
      description: localizedField(rowSource.description),
      // Left empty rather than defaulted to 0 when the cost isn't
      // confirmed yet (AGENTS.md: never invent a game value).
      cost: numericString(rowSource.cost),
    };
  });
}

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("invalid catalog");
    const source = body as Record<string, unknown>;
    const catalog: ConsumableCatalog = Object.fromEntries(
      consumableSections.map((section) => [
        section,
        parseRows(source[section]),
      ]),
    ) as ConsumableCatalog;
    await saveReferenceTable({
      key: consumablesReferenceKey,
      target: "consumables",
      columns: ["image", "name", "description", "cost"],
      rows: catalog,
      userId: session.user.id,
      actorRole: session.user.role,
      actorName: session.user.name ?? session.user.id,
    });
    await revalidateContent("references", "shop");
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
