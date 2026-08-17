import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { prisma } from "@/lib/prisma";
import { parseRankingConfig } from "@/lib/ranking";
import { auditMessage } from "@/lib/audit-message";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
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
        actorRole: session.user.role,
        action: before ? "update" : "create",
        entityType: "calculator",
        entityId: table.id,
        message: auditMessage(
          session.user.name ?? session.user.id,
          before ? "update" : "create",
          "le classement par ligue",
        ),
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
