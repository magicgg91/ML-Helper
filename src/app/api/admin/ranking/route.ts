import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth/options";
import { prisma } from "@/lib/prisma";
import { parseRankingConfig } from "@/lib/ranking";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const rows = parseRankingConfig(await request.json());
    const before = await prisma.referenceTable.findUnique({
      where: { key: "ranking_leagues" },
    });
    const table = await prisma.referenceTable.upsert({
      where: { key: "ranking_leagues" },
      create: {
        key: "ranking_leagues",
        label: { fr: "Classement par ligue", en: "Ranking by league" },
        columns: ["threshold", "target", "reward"],
        rows,
      },
      update: { rows },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: before ? "update" : "create",
        entityType: "calculator",
        entityId: table.id,
        diff: { before: before?.rows ?? null, after: rows },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "invalid_ranking_config" },
      { status: 400 },
    );
  }
}
