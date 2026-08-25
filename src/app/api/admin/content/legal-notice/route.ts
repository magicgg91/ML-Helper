import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage } from "@/lib/audit-message";
import { legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";

const localeContent = z.string().trim().min(1).max(100_000);
const schema = z.object({
  content: z.object({ fr: localeContent, en: localeContent }),
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
  const content = parsed.data.content;
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
        message: auditMessage(
          session.user.name ?? session.user.id,
          "update",
          "les mentions légales",
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
