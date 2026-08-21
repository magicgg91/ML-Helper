import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { mergeLaunchTranslations } from "@/lib/translations";
import { auditMessage } from "@/lib/audit-message";

const localized = z.object({ fr: z.string().trim(), en: z.string().trim() });
const schema = z.object({ description: localized, tips: localized });
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/tools/[id]/translations">,
) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_translations" },
      { status: 400 },
    );
  const { id } = await params;
  const before = await prisma.calculator.findUnique({ where: { id } });
  if (!before)
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  const data = {
    description: mergeLaunchTranslations(
      before.description,
      parsed.data.description,
    ),
    tips: mergeLaunchTranslations(before.tips, parsed.data.tips),
  };
  await prisma.$transaction([
    prisma.calculator.update({ where: { id }, data }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        message: auditMessage(
          session.user.name ?? session.user.id,
          "update_translations",
          `l’outil ${before.slug}`,
        ),
        action: "update_translations",
        entityType: "tool",
        entityId: id,
        diff: {
          before: { description: before.description, tips: before.tips },
          after: data,
        },
      },
    }),
  ]);
  return NextResponse.json(data);
}
