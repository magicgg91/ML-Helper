import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import {
  isSavableLeagueLadder,
  leagueLadderKey,
  parseLeagueLadder,
} from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";

/**
 * Bloc 135 : l'échelle des ligues et des divisions, enregistrée depuis
 * Configuration.
 *
 * Elle était `/api/admin/tools/ranking`, sous `calculators.write`. Elle est
 * maintenant sous `leagues.write` — une capacité à elle, précisément pour que
 * le rôle « Gestion Outils » garde le droit qu'il avait quand le CRUD vivait
 * sur l'écran d'un outil, sans pour autant hériter du reste de Configuration
 * (langues du site, script de suivi, purge du journal). Voir
 * `auth/permissions.ts`.
 */
export async function PUT(request: Request) {
  const session = await authorizedSession("leagues.write");
  if (!session) return forbiddenResponse();
  try {
    const raw = await request.json();
    // Bloc 108/A : la charge utile est la liste ordonnée des échelons, donc
    // « chacune des six clés fixes doit être présente » n'existe plus. Ce qui
    // la remplace est plus strict là où ça compte : rien ne doit disparaître
    // en silence. Une ligne que l'analyseur refuse (un seuil hors plage, un
    // échelon sans rien pour se nommer) raccourcit la liste, et cet écart est
    // un 400 plutôt qu'une échelle à moitié enregistrée.
    if (!Array.isArray(raw)) throw new Error("invalid");
    const ladder = parseLeagueLadder(raw);
    if (ladder.length !== raw.length) throw new Error("invalid");
    raw.forEach((rung, index) => {
      const bands = (rung as { bands?: unknown }).bands;
      if (Array.isArray(bands) && bands.length !== ladder[index].bands.length)
        throw new Error("invalid");
    });
    if (!isSavableLeagueLadder(ladder)) throw new Error("invalid");
    await prisma.$transaction(async (tx) => {
      const table = await tx.referenceTable.upsert({
        where: { key: leagueLadderKey },
        create: {
          key: leagueLadderKey,
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
            auditMessage("leagues.update", {
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
    // L'échelle nourrit les outils publics — le Classement et le sélecteur de
    // division des Paramètres joueur.
    await revalidateContent("tools");
    return NextResponse.json(ladder);
  } catch {
    return NextResponse.json({ error: "invalid_ladder" }, { status: 400 });
  }
}
