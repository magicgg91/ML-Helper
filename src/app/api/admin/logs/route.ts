import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/auth/options";
import { prisma } from "@/lib/prisma";
async function actor() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "super_admin" ? session : null;
}
export async function GET() {
  if (!(await actor()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(
    await prisma.auditLog.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  );
}
export async function DELETE(request: Request) {
  const session = await actor();
  if (!session)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const { start, end } = z
      .object({ start: z.coerce.date(), end: z.coerce.date() })
      .parse(await request.json());
    if (start > end) throw new Error("invalid_range");
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { gte: start, lte: end } },
    });
    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
}
