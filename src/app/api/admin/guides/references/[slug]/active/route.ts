import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";

const schema = z.object({ active: z.boolean() });
export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/guides/references/[slug]/active">) {
  const session = await authorizedSession("references.write"); if (!session) return forbiddenResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "invalid_visibility" }, { status: 400 });
  const { slug } = await params; if (!["combat-equipment", "expedition-equipment"].includes(slug)) return NextResponse.json({ error: "reference_not_found" }, { status: 404 });
  const reference = await prisma.$transaction(async (tx) => { const updated = await tx.calculator.update({ where: { slug }, data: { active: parsed.data.active } }); await tx.auditLog.create({ data: { userId: session.user.id, actorRole: session.user.role, message: auditMessage(session.user.name ?? session.user.id, parsed.data.active ? "activate" : "deactivate", `le référentiel ${slug}`), action: parsed.data.active ? "activate" : "deactivate", entityType: "reference_table", entityId: slug, diff: { after: parsed.data } } }); return updated; });
  return NextResponse.json({ active: reference.active });
}
