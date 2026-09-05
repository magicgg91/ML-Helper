import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";
export async function GET() {
  if (!(await authorizedSession("logs.view"))) return forbiddenResponse();
  return NextResponse.json(
    await prisma.auditLog.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  );
}
export async function DELETE(request: Request) {
  const session = await authorizedSession("logs.purge");
  if (!session) return forbiddenResponse();
  try {
    const { start, end } = z
      .object({ start: z.coerce.date(), end: z.coerce.date() })
      .parse(await request.json());
    if (start > end) throw new Error("invalid_range");
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { gte: start, lte: end } },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        action: "purge",
        entityType: "audit_log",
        entityId: "date_range",
        message: auditMessage(
          session.user.name ?? session.user.id,
          "purge",
          `${result.count} entrées du journal`,
        ),
        diff: {
          after: {
            start: start.toISOString(),
            end: end.toISOString(),
            deleted: result.count,
          },
        },
      },
    });
    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
}
