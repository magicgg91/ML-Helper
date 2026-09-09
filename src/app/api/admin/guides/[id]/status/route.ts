import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { canChangeGuideStatus, type GuideStatus } from "@/auth/guide-status";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";
import { localizedText } from "@/lib/translations";
import { canPerformGuideAction } from "@/auth/guide-actions";

const statusSchema = z.object({
  status: z.enum(["draft", "pending_review", "published"]),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/guides/[id]/status">,
) {
  const session = await authorizedSession("guides.write");
  if (!session) return forbiddenResponse();
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_guide_status" },
      { status: 400 },
    );
  const { id } = await params;
  const before = await prisma.guide.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "guide_not_found" }, { status: 404 });
  if (
    !canPerformGuideAction(
      session.user.role,
      parsed.data.status === "published" ? "publish" : "submit_review",
    ) ||
    !canChangeGuideStatus(
      session.user.role,
      before.status as GuideStatus,
      parsed.data.status,
    )
  )
    return forbiddenResponse();

  const guide = await prisma.$transaction(async (tx) => {
    const updated = await tx.guide.update({
      where: { id },
      data: {
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === "published"
            ? (before.publishedAt ?? new Date())
            : null,
      },
    });
    const action =
      parsed.data.status === "published"
        ? "publish"
        : before.status === "published"
          ? "unpublish"
          : parsed.data.status === "pending_review"
            ? "submit_review"
            : "update_status";
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        action,
        message: auditMessage(
          session.user.name ?? session.user.id,
          action,
          `le guide ${localizedText(before.title, "fr") || before.slug}`,
        ),
        entityType: "guide",
        entityId: id,
        diff: {
          before: { status: before.status },
          after: { status: parsed.data.status },
        },
      },
    });
    return updated;
  });
  return NextResponse.json({ id: guide.id, status: guide.status });
}
