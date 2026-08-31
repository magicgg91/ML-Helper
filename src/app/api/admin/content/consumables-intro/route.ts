import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { consumablesIntroKey } from "@/lib/consumables";
import { prisma } from "@/lib/prisma";
import { dropEmptyLocales } from "@/lib/translations";

// Bloc 43: the free-text markdown zone at the top of the public Consumables
// page — same shape/pattern as legal-notice's content editor. Bloc 44: none
// of the 5 locales are required here (unlike legal-notice's fr/en) — the
// whole zone is meant to start empty and get filled in gradually, and an
// omitted key is treated the same as an empty one rather than rejected.
const localeContent = z
  .string()
  .trim()
  .max(100_000)
  .optional()
  .transform((value) => value ?? "");
const schema = z.object({
  content: z.object({
    fr: localeContent,
    en: localeContent,
    de: localeContent,
    es: localeContent,
    tr: localeContent,
  }),
});

export async function PATCH(request: Request) {
  const session = await authorizedSession("references.write");
  if (!session) return forbiddenResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });

  const before = await prisma.staticContent.findUnique({
    where: { key: consumablesIntroKey },
  });
  const content = dropEmptyLocales(parsed.data.content);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.staticContent.upsert({
      where: { key: consumablesIntroKey },
      create: {
        key: consumablesIntroKey,
        content,
        updatedBy: session.user.id,
      },
      update: { content, updatedBy: session.user.id },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        message: auditMessage(
          session.user.name ?? session.user.id,
          "update",
          "le texte d’introduction du référentiel Consommables",
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
