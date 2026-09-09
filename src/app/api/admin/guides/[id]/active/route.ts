import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { canPerformGuideAction } from "@/auth/guide-actions";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/guides/[id]/active">,
) {
  const session = await authorizedSession("guides.write");
  if (!session || !canPerformGuideAction(session.user.role, "toggle"))
    return forbiddenResponse();
  const parsed = z
    .object({ active: z.boolean() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
  const { id } = await params;
  const before = await prisma.guide.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "guide_not_found" }, { status: 404 });
  const action = parsed.data.active ? "activate" : "deactivate";
  const guide = await prisma.$transaction(async (tx) => {
    const updated = await tx.guide.update({ where: { id }, data: parsed.data });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        action,
        entityType: "guide",
        entityId: id,
        message: auditMessage(
          session.user.name ?? session.user.id,
          action,
          `le guide ${localizedText(before.title, "fr") || before.slug}`,
        ),
        diff: {
          before: { active: before.active },
          after: { active: updated.active },
        },
      },
    });
    return updated;
  });
  return NextResponse.json({ id, active: guide.active });
}
