import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeagueLadder } from "@/lib/leagues";

/**
 * Bloc 137 : la route qui enregistre le classement, et rien que le classement.
 *
 * Elle avait existé jusqu'au Bloc 135, qui l'avait supprimée en déplaçant
 * l'échelle entière dans Configuration — plages de fin de saison comprises,
 * alors qu'elles sont le paramètre de cet outil. Elle revient, sous la capacité
 * qu'elle avait (`calculators.write`), et avec une garantie de plus : l'identité
 * des échelons vient de la ligne stockée et y retourne inchangée.
 *
 * C'est le cœur du bloc, vérifié ici de bout en bout plutôt que sur la seule
 * fonction de fusion : deux écrans écrivent une seule ligne, et celui-ci ne doit
 * pas pouvoir défaire le travail de l'autre.
 */
const { $transaction, findMany, upsert, auditCreate, revalidate } = vi.hoisted(
  () => {
    // Typé par sa signature, pour que `written()` puisse lire l'échelle partie
    // en base sans transtypage, et sans paramètre inutilisé à nommer.
    const upsert =
      vi.fn<(args: { update: { rows: unknown } }) => Promise<{ id: string }>>();
    const auditCreate = vi.fn();
    // Revue Codex : la route lit l'échelle *dans* sa transaction, pour qu'une
    // écriture simultanée ne puisse pas partir du même instantané qu'elle. Le
    // faux client de transaction porte donc la lecture, et ces cas passent par
    // l'analyseur réel — plus près de la production qu'un chargeur moqué.
    const findMany = vi.fn<() => Promise<{ key: string; rows: unknown }[]>>();
    const tx = {
      referenceTable: { findMany, upsert },
      auditLog: { create: auditCreate },
    };
    return {
      findMany,
      upsert,
      auditCreate,
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      revalidate: vi.fn(),
    };
  },
);
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction } }));
vi.mock("@/lib/revalidate-content", () => ({ revalidateContent: revalidate }));

let capability: string | undefined;
let session: { user: { id: string; role: string; name: string } } | null = {
  user: { id: "u1", role: "tools_manager", name: "Alice" },
};
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async (needed: string) => {
    capability = needed;
    return session;
  },
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PUT } from "./route";

/** L'échelle stockée : une identité travaillée, et des plages à remplacer. */
const stored: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [{ threshold: 10, movement: null, target: null, rewards: [] }],
  },
  {
    id: "studio-cup",
    league: null,
    division: "2",
    name: { fr: "Coupe du studio", de: "Studio-Pokal" },
    position: 1,
    active: false,
    bands: [],
  },
];

const put = (payload: unknown) =>
  PUT(
    new Request("http://localhost/api/admin/tools/ranking", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  );

/** L'échelle telle qu'elle est partie en base. */
const written = () => upsert.mock.calls[0][0].update.rows as LeagueLadder;

beforeEach(() => {
  vi.clearAllMocks();
  capability = undefined;
  session = { user: { id: "u1", role: "tools_manager", name: "Alice" } };
  upsert.mockResolvedValue({ id: "row-1" });
  findMany.mockResolvedValue([
    { key: "leagues_divisions", rows: structuredClone(stored) },
  ]);
});

describe("PUT /api/admin/tools/ranking", () => {
  it("asks for the capability the tool screens use", async () => {
    await put({ bands: { bronze: [] } });
    // `calculators.write`, et non la capacité à part que le Bloc 135 avait
    // inventée : « Gestion Outils » retrouve le droit qu'il exerçait avant.
    expect(capability).toBe("calculators.write");
  });

  it("refuses an unauthorised session", async () => {
    session = null;
    expect((await put({ bands: {} })).status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("writes the bands it was sent", async () => {
    const band = {
      threshold: 25,
      movement: "promotion" as const,
      target: "studio-cup",
      rewards: [{ type: "sapphires" as const, quantity: 400 }],
    };
    const response = await put({ bands: { bronze: [band] } });
    expect(response.status).toBe(200);
    expect(written()[0].bands).toEqual([band]);
  });

  it("leaves every rung's identity and order exactly as stored", async () => {
    // La garantie du bloc : régler un classement ne défait pas un renommage ni
    // un réordonnancement faits dans Configuration entre-temps.
    await put({ bands: { bronze: [], "studio-cup": [] } });
    const identity = (ladder: LeagueLadder) =>
      ladder.map((rung) => ({
        id: rung.id,
        league: rung.league,
        division: rung.division,
        name: rung.name,
        position: rung.position,
        active: rung.active,
      }));
    expect(identity(written())).toEqual(identity(stored));
  });

  it("ignores a rung the ladder no longer has, and names it", async () => {
    // Deux administrateurs : l'un supprime un échelon depuis Configuration,
    // l'autre avait cet écran ouvert. Ce qui existe encore est écrit, ce qui n'a
    // plus lieu d'être est nommé dans la réponse — ni perdu en silence, ni
    // ressuscité.
    const response = await put({
      bands: {
        bronze: [],
        "diamond-2": [
          { threshold: 5, movement: null, target: null, rewards: [] },
        ],
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: ["diamond-2"] });
    expect(written().map((rung) => rung.id)).toEqual(["bronze", "studio-cup"]);
  });

  it("refuses a payload that is not bands by rung", async () => {
    for (const payload of [
      null,
      [],
      { bands: [] },
      { bands: { bronze: "nope" } },
      { bands: { bronze: [{ threshold: "10" }] } },
    ]) {
      const response = await put(payload);
      expect(response.status, JSON.stringify(payload)).toBe(400);
    }
    expect($transaction).not.toHaveBeenCalled();
  });

  it("refuses a reward quantity that is negative or fractional", async () => {
    // Revue Codex : `z.number()` acceptait les deux, et `isSavableLeagueLadder`
    // ne vérifie que les seuils — un appelant qui contourne l'écran pouvait donc
    // faire afficher au public une récompense de -3 ou de 1,5. Une récompense est
    // une quantité absolue (AGENTS.md), donc entière et non négative.
    for (const quantity of [-3, 1.5]) {
      const response = await put({
        bands: {
          bronze: [
            {
              threshold: 10,
              movement: null,
              target: null,
              rewards: [{ type: "sapphires", quantity }],
            },
          ],
        },
      });
      expect(response.status, String(quantity)).toBe(400);
    }
    expect($transaction).not.toHaveBeenCalled();
  });

  it("refuses a threshold outside the playable range", async () => {
    // La même vérification que la route de Configuration fait de son côté : ce
    // qui part en base est une échelle entière, donc c'est elle qui doit tenir.
    const response = await put({
      bands: {
        bronze: [{ threshold: 150, movement: null, target: null, rewards: [] }],
      },
    });
    expect(response.status).toBe(400);
    // La transaction s'ouvre — c'est en elle que l'échelle est lue et fusionnée
    // — puis se défait sans rien écrire.
    expect(upsert).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("logs who changed the ranking, and refreshes the public tools", async () => {
    await put({ bands: { bronze: [] } });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          actorRole: "tools_manager",
          action: "update",
          entityType: "reference_table",
        }),
      }),
    );
    expect(revalidate).toHaveBeenCalledWith("tools");
  });
});
