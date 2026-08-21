import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { parseRankingConfig, rankingLeagues } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write"); if (!session) return forbiddenResponse();
  try {
    const raw = await request.json(); if (!raw || typeof raw !== "object") throw new Error("invalid");
    const config = parseRankingConfig(raw);
    for (const league of rankingLeagues) if (!Array.isArray((raw as Record<string, unknown>)[league]) || config[league].length !== ((raw as Record<string, unknown[]>)[league]).length) throw new Error("invalid");
    await prisma.$transaction(async (tx) => { const table = await tx.referenceTable.upsert({ where: { key: "ranking_leagues" }, create: { key: "ranking_leagues", label: { en: "Ranking leagues", fr: "Ligues du classement" }, columns: ["threshold", "target", "reward"], rows: config }, update: { rows: config } }); await tx.auditLog.create({ data: { userId: session.user.id, actorRole: session.user.role, message: auditMessage(session.user.name ?? session.user.id, "update", "les seuils du classement"), action: "update", entityType: "reference_table", entityId: table.id, diff: { after: config } } }); });
    return NextResponse.json(config);
  } catch { return NextResponse.json({ error: "invalid_ranking" }, { status: 400 }); }
}
