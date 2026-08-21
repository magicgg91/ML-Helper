import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";
import { localizedText } from "@/lib/translations";

const payloadSchema = z.object({ active: z.boolean() });
export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/tools/[id]">) {
  const session = await authorizedSession("calculators.toggle");
  if (!session) return forbiddenResponse();
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
  const { id } = await params;
  const before = await prisma.calculator.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  const tool = await prisma.$transaction(async (tx) => {
    const updated = await tx.calculator.update({ where: { id }, data: { active: parsed.data.active } });
    await tx.auditLog.create({ data: { userId: session.user.id, actorRole: session.user.role, message: auditMessage(session.user.name ?? session.user.id, parsed.data.active ? "activate" : "deactivate", `l’outil ${localizedText(before.name, "fr") || before.slug}`), action: parsed.data.active ? "activate" : "deactivate", entityType: "tool", entityId: id, diff: { before: { active: before.active }, after: parsed.data } } });
    return updated;
  });
  return NextResponse.json({ id: tool.id, active: tool.active });
}

