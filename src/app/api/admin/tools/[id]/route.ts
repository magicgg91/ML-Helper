import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { isReferenceCalculatorSlug } from "@/lib/admin-tools";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";

const payloadSchema = z.object({ active: z.boolean() });
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/tools/[id]">,
) {
  const session = await authorizedSession("calculators.toggle");
  if (!session) return forbiddenResponse();
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
  const { id } = await params;
  const before = await prisma.calculator.findUnique({ where: { id } });
  // M1: this endpoint governs *tools* (calculators.toggle). The 7 reference
  // rows share the Calculator table but are toggled only through the
  // references.write route — treat them as not found here so a tools_manager
  // can't flip a reference's public visibility by targeting its id directly.
  if (!before || isReferenceCalculatorSlug(before.slug))
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  const tool = await prisma.$transaction(async (tx) => {
    const updated = await tx.calculator.update({
      where: { id },
      data: { active: parsed.data.active },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        message: auditMessage(
          session.user.name ?? session.user.id,
          parsed.data.active ? "activate" : "deactivate",
          `l’outil ${before.slug}`,
        ),
        action: parsed.data.active ? "activate" : "deactivate",
        entityType: "tool",
        entityId: id,
        diff: { before: { active: before.active }, after: parsed.data },
      },
    });
    return updated;
  });
  return NextResponse.json({ id: tool.id, active: tool.active });
}
