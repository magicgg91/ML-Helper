import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import {
  consumableCategories,
  consumablesIntroKey,
  type ConsumableCatalog,
} from "@/lib/consumables";
import { consumablesReferenceKey } from "@/lib/consumables-server";
import { prisma } from "@/lib/prisma";
import { dropEmptyLocales } from "@/lib/translations";
import { numericString, stringField } from "@/services/reference-table-admin";

// Bloc 57/A: the admin screen's single save button now hits this one
// endpoint for both the intro markdown and the items catalog, wrapped in a
// single transaction with a single audit log entry — it used to be 2
// separate requests (PATCH /api/admin/content/consumables-intro + this PUT),
// each writing its own audit log row, so one click on "Enregistrer toute la
// page" produced 2 lines in /admin/logs instead of 1.
const localeContent = z
  .string()
  .trim()
  .max(100_000)
  .optional()
  .transform((value) => value ?? "");
const introSchema = z.object({
  fr: localeContent,
  en: localeContent,
  de: localeContent,
  es: localeContent,
  tr: localeContent,
});

export async function PUT(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("invalid body");
    const { intro, catalog: rawCatalog } = body as Record<string, unknown>;

    const introContent = dropEmptyLocales(introSchema.parse(intro ?? {}));

    if (
      !rawCatalog ||
      typeof rawCatalog !== "object" ||
      Array.isArray(rawCatalog)
    )
      throw new Error("invalid catalog");
    const source = rawCatalog as Record<string, unknown>;
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

    await prisma.$transaction(async (tx) => {
      const beforeIntro = await tx.staticContent.findUnique({
        where: { key: consumablesIntroKey },
      });
      await tx.staticContent.upsert({
        where: { key: consumablesIntroKey },
        create: {
          key: consumablesIntroKey,
          content: introContent,
          updatedBy: session.user.id,
        },
        update: { content: introContent, updatedBy: session.user.id },
      });
      const beforeRows = await tx.referenceTable.findUnique({
        where: { key: consumablesReferenceKey },
      });
      const table = await tx.referenceTable.upsert({
        where: { key: consumablesReferenceKey },
        create: {
          key: consumablesReferenceKey,
          columns: [
            "image",
            "name_fr",
            "name_en",
            "description_fr",
            "description_en",
            "cost",
          ],
          rows: catalog,
        },
        update: { rows: catalog },
      });
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actorRole: session.user.role,
          action: beforeRows ? "update" : "create",
          entityType: "reference_table",
          entityId: table.id,
          message: auditMessage(
            session.user.name ?? session.user.id,
            beforeRows ? "update" : "create",
            "le référentiel Boutique",
          ),
          // Codex review (PR #78): the combined save's diff must still
          // cover the intro, not just the catalog rows — an intro-only
          // edit (rows unchanged) used to be traceable via the separate
          // route's own before/after; folding both writes into one entry
          // must not silently drop that half of the change.
          diff: {
            before: {
              intro: beforeIntro?.content ?? null,
              rows: beforeRows?.rows ?? null,
            },
            after: { intro: introContent, rows: catalog },
          },
        },
      });
    });

    return NextResponse.json({ intro: introContent, catalog });
  } catch {
    return NextResponse.json(
      { error: "invalid_reference_rows" },
      { status: 400 },
    );
  }
}
