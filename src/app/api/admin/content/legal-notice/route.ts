import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import { legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { alwaysActiveLocales } from "@/lib/locale-settings";
import { dropEmptyLocales, launchLocales } from "@/lib/translations";

// Bloc 44: fr/en stay required (unchanged) — DE/ES/TR are activated but
// their content arrives gradually via admin, never invented here. Bloc 44
// review: a request that omits a DE/ES/TR key entirely (any caller
// predating this bloc) is treated the same as one sending it empty,
// rather than rejected outright for a locale nothing requires yet.
const requiredLocale = z.string().trim().min(1).max(100_000);
const optionalLocale = z
  .string()
  .trim()
  .max(100_000)
  .optional()
  .transform((value) => value ?? "");
// Bloc 120: one field per launched locale, built from launchLocales rather
// than listed. Spelled out, a language added as a messages/*.json file would
// have reached the editor's dropdown and then been silently dropped here —
// Zod strips what the schema does not declare, so the save would have
// succeeded and the text vanished.
const schema = z.object({
  content: z.object(
    Object.fromEntries(
      launchLocales.map((locale) => [
        locale,
        (alwaysActiveLocales as readonly string[]).includes(locale)
          ? requiredLocale
          : optionalLocale,
      ]),
      // Same widening as in services/guides.ts: fromEntries loses the keys and
      // the two branches are different Zod classes parsing to the same string.
    ) as unknown as Record<string, z.ZodType<string, unknown>>,
  ),
});

export async function PATCH(request: Request) {
  const session = await authorizedSession("content.write");
  if (!session) return forbiddenResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });

  const before = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  const content = dropEmptyLocales(parsed.data.content);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.staticContent.upsert({
      where: { key: legalNoticeKey },
      create: {
        key: legalNoticeKey,
        content,
        updatedBy: session.user.id,
      },
      update: { content, updatedBy: session.user.id },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        ...auditMessageColumns(
          auditMessage("legal-notice.update", {
            actor: session.user.name ?? session.user.id,
          }),
        ),
        action: "update",
        entityType: "static_content",
        entityId: item.id,
        diff: { before: before?.content ?? null, after: content },
      },
    });
    return item;
  });

  return NextResponse.json(updated);
}
