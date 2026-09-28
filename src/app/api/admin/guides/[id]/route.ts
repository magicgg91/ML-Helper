import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { canPerformGuideAction } from "@/auth/guide-actions";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { isUniqueConflict, updateGuide } from "@/services/guides";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/guides/[id]">,
) {
  const session = await authorizedSession("guides.write");
  if (!session || !canPerformGuideAction(session.user.role, "edit"))
    return forbiddenResponse();
  const { id } = await params;
  try {
    const guide = await updateGuide(
      {
        id: session.user.id,
        name: session.user.name ?? session.user.id,
        role: session.user.role,
      },
      id,
      await request.json(),
    );
    await revalidateContent("guides", guide.slug);
    return NextResponse.json({ id: guide.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: isUniqueConflict(error)
          ? "slug_already_exists"
          : "invalid_guide",
      },
      { status: isUniqueConflict(error) ? 409 : 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/guides/[id]">,
) {
  const session = await authorizedSession("guides.delete");
  if (!session || !canPerformGuideAction(session.user.role, "delete"))
    return forbiddenResponse();
  const { id } = await params;
  const before = await prisma.guide.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "guide_not_found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.guide.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        action: "delete",
        entityType: "guide",
        entityId: id,
        ...auditMessageColumns(
          auditMessage("guide.delete", {
            actor: session.user.name ?? session.user.id,
            title: localizedText(before.title, "fr") || before.slug,
          }),
        ),
        diff: {
          before: {
            slug: before.slug,
            status: before.status,
          },
        },
      },
    });
  });
  await revalidateContent("guides", before.slug);
  return NextResponse.json({ deleted: true });
}
