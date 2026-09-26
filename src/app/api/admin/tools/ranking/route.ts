import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import {
  getLeagueLadder,
  isSavableLeagueLadder,
  leagueLadderKey,
  seasonMovements,
  seasonRewardTypes,
  withLadderBands,
} from "@/lib/leagues";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { revalidateContent } from "@/lib/revalidate-content";

/**
 * Bloc 137 : le classement — les seuils et récompenses de fin de saison —
 * enregistré depuis l'écran de l'outil Classement.
 *
 * Cette route avait existé jusqu'au Bloc 135, qui l'avait supprimée en
 * déplaçant l'échelle entière dans Configuration. C'était déplacer une chose de
 * trop : la liste des échelons est un référentiel du site, les plages sont le
 * paramètre de cet outil. Elle revient donc, sous la capacité qu'elle avait —
 * `calculators.write` — et « Gestion Outils » retrouve exactement le droit
 * qu'il exerçait avant le Bloc 135.
 *
 * Elle n'écrit **que** les plages. L'identité des échelons, leur ordre et leur
 * visibilité viennent de la ligne stockée et y retournent inchangés : sans quoi
 * enregistrer un classement défairait un renommage ou un réordonnancement fait
 * dans Configuration entre-temps (voir `withLadderBands`).
 */
const bandSchema = z.object({
  threshold: z.number(),
  movement: z.enum(seasonMovements).nullable(),
  target: z.string().nullable(),
  rewards: z.array(
    z.object({
      type: z.enum(seasonRewardTypes),
      quantity: z.number(),
    }),
  ),
});
const payloadSchema = z.object({
  bands: z.record(z.string(), z.array(bandSchema)),
});

export async function PUT(request: Request) {
  const session = await authorizedSession("calculators.write");
  if (!session) return forbiddenResponse();
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_ranking" }, { status: 400 });

  const current = await getLeagueLadder();
  const { ladder, ignored } = withLadderBands(current, parsed.data.bands);
  // Ce qui part en base est une échelle entière, donc c'est l'échelle entière
  // qui doit tenir — la même vérification que la route de Configuration fait de
  // son côté.
  if (!isSavableLeagueLadder(ladder))
    return NextResponse.json({ error: "invalid_ranking" }, { status: 400 });

  const table = await prisma.$transaction(async (tx) => {
    const row = await tx.referenceTable.upsert({
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
          auditMessage("ranking.update", {
            actor: session.user.name ?? session.user.id,
          }),
        ),
        action: "update",
        entityType: "reference_table",
        entityId: row.id,
        diff: { after: ladder },
      },
    });
    return row;
  });
  void table;
  // L'échelle nourrit le Classement public et le sélecteur de division des
  // Paramètres joueur.
  await revalidateContent("tools");
  // `ignored` nomme les échelons supprimés depuis Configuration pendant que cet
  // écran était ouvert : leurs plages n'ont pas été écrites, et le dire évite
  // qu'un enregistrement paraisse complet alors qu'il ne l'était pas.
  return NextResponse.json({ bands: parsed.data.bands, ignored });
}
