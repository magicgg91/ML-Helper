import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";
import {
  homeHighlightsKey,
  homeHighlightsSchema,
  serializeHomeHighlights,
} from "@/lib/home-highlights";
import { prisma } from "@/lib/prisma";
import { revalidateContent } from "@/lib/revalidate-content";

/**
 * Bloc 132 §4 : enregistre la sélection « Mis en avant » de l'accueil.
 *
 * Gardée par `configuration.write`, comme les langues à côté — c'est du
 * contenu éditorial, pas du code exécuté dans la page (ce qui justifiait le
 * `configuration.scripts` de la route de suivi).
 *
 * Une liste vide est un choix valide : elle masque le panneau. C'est aussi
 * ce qui distingue « je ne veux rien mettre en avant » de « personne n'a
 * encore choisi », où l'accueil retombe sur sa liste de repli — d'où une
 * ligne vraiment enregistrée plutôt qu'un effacement.
 */
export async function PUT(request: Request) {
  const session = await authorizedSession("configuration.write");
  if (!session) return forbiddenResponse();

  const payload = await request.json().catch(() => null);
  const parsed = homeHighlightsSchema.safeParse(
    (payload as { highlights?: unknown } | null)?.highlights,
  );
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const value = serializeHomeHighlights(parsed.data);

  await prisma.$transaction(async (tx) => {
    // La valeur précédente se lit dans la transaction : lue dehors, deux
    // enregistrements concurrents partiraient du même « avant » et le
    // second consignerait un écart qu'il n'a jamais remplacé.
    const before = await tx.siteSetting.findUnique({
      where: { key: homeHighlightsKey },
      select: { value: true },
    });
    await tx.siteSetting.upsert({
      where: { key: homeHighlightsKey },
      create: { key: homeHighlightsKey, value },
      update: { value },
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        actorRole: session.user.role,
        ...auditMessageColumns(
          auditMessage("highlights.update", {
            actor: session.user.name ?? session.user.id,
          }),
        ),
        action: "update",
        entityType: "site_setting",
        entityId: homeHighlightsKey,
        diff: { before: before?.value ?? "", after: value },
      },
    });
  });

  // L'accueil rend la sélection : chaque langue de la page tombe du cache.
  await revalidateContent("home");

  return NextResponse.json({ highlights: parsed.data });
}
