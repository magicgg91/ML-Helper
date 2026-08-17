import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { mergeLaunchTranslations } from "@/lib/translations";

const localized = z.object({ fr: z.string().trim(), en: z.string().trim() });
const schema = z.object({
  name: localized,
  description: localized,
  tips: localized,
});

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/calculators/[id]/translations">,
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
    return NextResponse.json(
      { error: "calculator_not_found" },
      { status: 404 },
    );
  const data = {
    name: mergeLaunchTranslations(before.name, parsed.data.name),
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
        action: "update_translations",
        entityType: "calculator",
        entityId: id,
        diff: {
          before: {
            name: before.name,
            description: before.description,
            tips: before.tips,
          },
          after: data,
        },
      },
    }),
  ]);
  return NextResponse.json(data);
}
