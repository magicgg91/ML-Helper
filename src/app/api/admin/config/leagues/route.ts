import { revalidateContent } from "@/lib/revalidate-content";
import { NextResponse } from "next/server";
import { authorizedSession, forbiddenResponse } from "@/auth/api-authorization";
import {
  getLeagueLadder,
  isSavableLadderStructure,
  isSavableLeagueLadder,
  leagueLadderKey,
  parseLeagueLadder,
  withLadderStructure,
  type LeagueRungStructure,
} from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { auditMessage, auditMessageColumns } from "@/lib/audit-message";

/**
 * Bloc 135, recoupée au Bloc 137 : la **liste** des ligues et des divisions,
 * enregistrée depuis Configuration.
 *
 * Elle n'écrit que l'identité des échelons — quelle ligue de base, quelle
 * division, quel nom libre, dans quel ordre, publié ou non. Les plages de fin
 * de saison sont le classement, donc le paramètre de l'outil Classement, et
 * repassent par `/api/admin/tools/ranking`. Les plages déjà stockées de chaque
 * échelon sont conservées telles quelles (voir `withLadderStructure`) : sans
 * cela, réordonner la liste effacerait les seuils.
 *
 * Sous `configuration.write`, comme le reste de cet écran. Le Bloc 135 avait
 * inventé `leagues.write` pour que « Gestion Outils » garde la main sur
 * l'échelle ; ce rôle édite maintenant le classement depuis l'écran de l'outil,
 * qui est le droit qu'il exerçait avant, et la capacité à part disparaît.
 */
export async function PUT(request: Request) {
  const session = await authorizedSession("configuration.write");
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
    // `parseLeagueLadder` reste l'analyseur : il connaît les formes anciennes et
    // refuse une ligne incomplète. Ce qu'on en garde ici, c'est l'identité — les
    // plages qu'il aurait lues sont celles de la ligne stockée, pas celles de
    // cet écran, qui ne les édite plus.
    const parsed = parseLeagueLadder(raw);
    if (parsed.length !== raw.length) throw new Error("invalid");
    // L'ordre de l'écran est celui de la liste reçue, pas les `position` qu'elle
    // porte. `parseLeagueLadder` trie sur `position` — utile en lecture, où c'est
    // la seule source d'ordre — mais ici les deux existent, et laisser gagner un
    // `position` périmé annulerait le glisser-déposer qu'on vient de faire.
    // `withLadderStructure` renumérote ensuite sur l'index, si bien qu'une seule
    // notion d'ordre traverse tout le chemin.
    const order = new Map(
      (raw as { id?: unknown }[]).map((rung, index) => [rung?.id, index]),
    );
    const structure: LeagueRungStructure[] = [...parsed]
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((rung) => ({
        id: rung.id,
        league: rung.league,
        division: rung.division,
        name: rung.name,
        position: rung.position,
        active: rung.active,
      }));
    if (!isSavableLadderStructure(structure)) throw new Error("invalid");
    // Bloc 137 : la fusion, et non la charge utile telle quelle — chaque échelon
    // repart avec les plages qu'il avait déjà.
    const ladder = withLadderStructure(await getLeagueLadder(), structure);
    // Ce qui part en base est une échelle entière, donc c'est elle qui doit
    // tenir : les plages conservées ont été écrites par l'autre écran, mais
    // c'est cette route qui les renvoie au stockage.
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
