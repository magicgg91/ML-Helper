import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";
import { localizedText } from "@/lib/translations";

const payloadSchema = z.object({ active: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/calculators/[id]">,
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
  if (!before)
    return NextResponse.json(
      { error: "calculator_not_found" },
      { status: 404 },
    );
  const calculator = await prisma.$transaction(async (tx) => {
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
          `le calculateur ${localizedText(before.name, "fr") || before.slug}`,
        ),
        action: parsed.data.active ? "activate" : "deactivate",
        entityType: "calculator",
        entityId: id,
        diff: { before: { active: before.active }, after: parsed.data },
      },
    });
    return updated;
  });
  return NextResponse.json({ id: calculator.id, active: calculator.active });
}
