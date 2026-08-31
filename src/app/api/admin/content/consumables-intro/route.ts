import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { consumablesIntroKey } from "@/lib/consumables";
import { prisma } from "@/lib/prisma";

// Bloc 43: the free-text markdown zone at the top of the public Consumables
// page — same shape/pattern as legal-notice's content editor.
const localeContent = z.string().trim().max(100_000);
const schema = z.object({
  content: z.object({ fr: localeContent, en: localeContent }),
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
  const content = parsed.data.content;
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
