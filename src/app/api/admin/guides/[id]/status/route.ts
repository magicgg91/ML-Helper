import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { canChangeGuideStatus, type GuideStatus } from "@/auth/guide-status";
import { prisma } from "@/lib/prisma";

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
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        action:
          parsed.data.status === "published"
            ? "publish"
            : before.status === "published"
              ? "unpublish"
              : "update_status",
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
