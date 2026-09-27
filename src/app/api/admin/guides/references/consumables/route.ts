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
import { readableInEveryLocale } from "@/lib/localized-field";

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

/**
 * Un champ de texte de la ligne reçue, dans la forme que l'éditeur envoie.
 *
 * Revue Codex (PR #167, P1) : pendant la fenêtre de déploiement, un onglet
 * d'administration ouvert avant la livraison envoie encore la paire
 * `<champ>_fr`/`_en` et aucun objet par langue. Sans ce repli, `localizedField`
 * recevait `undefined`, rendait `{}`, et l'enregistrement effaçait le nom et la
 * description de **tous** les objets du catalogue en répondant 200. C'est le
 * même filet que la lecture (`parseConsumableRow`), du côté de l'écriture, et
 * il disparaîtra avec elle.
 */
function editorialField(row: Record<string, unknown>, field: string) {
  if (row[field] !== undefined) return localizedField(row[field]);
  return localizedField({
    fr: stringField(row[`${field}_fr`]),
    en: stringField(row[`${field}_en`]),
  });
}

function parseRows(rawRows: unknown) {
  if (!Array.isArray(rawRows)) throw new Error("invalid category rows");
  return rawRows.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("invalid row");
    const rowSource = raw as Record<string, unknown>;
    // Bloc 127: one field per language instead of the fr/en pair. Strict,
    // like the cost below: a malformed field rejects the whole catalogue
    // with a 400 rather than saving half of it.
    const name = editorialField(rowSource, "name");
    const description = editorialField(rowSource, "description");
    // Revue Codex (PR #167, P2) : le serveur tient la règle, pas seulement
    // l'écran. `localizedText` essaie la langue du visiteur, puis l'anglais,
    // puis le français : une ligne écrite en allemand seul serait blanche pour
    // tous les autres, ce qu'AGENTS.md interdit. Un catalogue sans texte
    // lisible est refusé en entier plutôt qu'écrit à moitié — et c'est aussi ce
    // qui arrête une charge utile vidée de ses textes, quelle qu'en soit
    // l'origine.
    if (!readableInEveryLocale(name) || !readableInEveryLocale(description))
      throw new Error("missing fallback translation");
    return {
      image: stringField(rowSource.image),
      name,
      description,
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
