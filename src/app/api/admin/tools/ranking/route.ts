import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { isSavableRankingLadder, parseRankingLadder } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  try {
    const raw = await request.json();
    // Bloc 108/A: the payload is now the ordered list of ladder entries, so
    // "every one of six fixed keys must be present" is gone. What replaces it
    // is stricter where it matters: nothing may be silently dropped. A row the
    // parser refuses (a threshold out of range, an entry with no way to name
    // itself) shortens the list, and that mismatch is a 400 rather than a
    // half-saved ladder.
    if (!Array.isArray(raw)) throw new Error("invalid");
    const ladder = parseRankingLadder(raw);
    if (ladder.length !== raw.length) throw new Error("invalid");
    raw.forEach((entry, index) => {
      const bands = (entry as { bands?: unknown }).bands;
      if (Array.isArray(bands) && bands.length !== ladder[index].bands.length)
        throw new Error("invalid");
    });
    if (!isSavableRankingLadder(ladder)) throw new Error("invalid");
    await prisma.$transaction(async (tx) => {
      const table = await tx.referenceTable.upsert({
        where: { key: "ranking_leagues" },
        create: {
          key: "ranking_leagues",
          columns: ["threshold", "movement", "target", "rewards"],
          rows: ladder,
        },
        update: { rows: ladder },
      });
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actorRole: session.user.role,
          ...auditMessageColumns(
            auditMessage("ranking.update", {
              actor: session.user.name ?? session.user.id,
            }),
          ),
          action: "update",
          entityType: "reference_table",
          entityId: table.id,
          diff: { after: ladder },
        },
      });
    });
    await revalidateContent("tools");
    return NextResponse.json(ladder);
  } catch {
    return NextResponse.json({ error: "invalid_ranking" }, { status: 400 });
  }
}
