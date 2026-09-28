import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeagueLadder, LeagueRungStructure } from "@/lib/leagues";

/**
 * Bloc 137 : la route qui enregistre la liste des ligues et des divisions, et
 * rien que la liste.
 *
 * L'autre moitié de la garantie éprouvée dans `tools/ranking/route.test.ts` :
 * réordonner ou renommer depuis Configuration ne doit pas effacer les seuils que
 * l'écran de l'outil a réglés. Les deux écrans partagent une ligne de
 * `reference_tables` ; chacun n'écrit que ses champs.
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
  user: { id: "u1", role: "admin", name: "Alice" },
};
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async (needed: string) => {
    capability = needed;
    return session;
  },
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PUT } from "./route";

const band = {
  threshold: 10,
  movement: "promotion" as const,
  target: "silver",
  rewards: [{ type: "sapphires" as const, quantity: 300 }],
};

/** L'échelle stockée : des plages réglées, qu'aucun enregistrement d'ici ne doit perdre. */
const stored: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [band],
  },
  {
    id: "silver",
    league: "silver",
    division: "",
    name: {},
    position: 1,
    active: true,
    bands: [{ threshold: 50, movement: null, target: null, rewards: [] }],
  },
];

const structure = (ladder: LeagueLadder): LeagueRungStructure[] =>
  ladder.map((rung) => ({
    id: rung.id,
    league: rung.league,
    division: rung.division,
    name: rung.name,
    position: rung.position,
    active: rung.active,
  }));

const put = (payload: unknown) =>
  PUT(
    new Request("http://localhost/api/admin/config/leagues", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  );

const written = () => upsert.mock.calls[0][0].update.rows as LeagueLadder;

beforeEach(() => {
  vi.clearAllMocks();
  capability = undefined;
  session = { user: { id: "u1", role: "admin", name: "Alice" } };
  upsert.mockResolvedValue({ id: "row-1" });
  findMany.mockResolvedValue([
    { key: "leagues_divisions", rows: structuredClone(stored) },
  ]);
});

describe("PUT /api/admin/config/leagues", () => {
  it("asks for the capability the rest of Configuration uses", async () => {
    await put(structure(stored));
    // Bloc 137 : `configuration.write`, et non la capacité à part du Bloc 135 —
    // elle n'existait que pour faire entrer « Gestion Outils » sur cet écran.
    expect(capability).toBe("configuration.write");
  });

  it("refuses an unauthorised session", async () => {
    session = null;
    expect((await put(structure(stored))).status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("keeps the bands of every rung it was not sent any", async () => {
    // La garantie du bloc, dans ce sens-ci : la charge utile ne porte aucune
    // plage, et pourtant rien ne se perd.
    const renamed = structure(stored).map((rung) =>
      rung.id === "silver" ? { ...rung, division: "1" } : rung,
    );
    const response = await put(renamed);
    expect(response.status).toBe(200);
    expect(written()[0].bands).toEqual([band]);
    expect(written()[1].division).toBe("1");
    expect(written()[1].bands).toHaveLength(1);
  });

  it("follows the rungs when the list is reordered", async () => {
    await put(structure(stored).reverse());
    expect(written().map((rung) => rung.id)).toEqual(["silver", "bronze"]);
    expect(written().map((rung) => rung.position)).toEqual([0, 1]);
    // Chaque échelon a suivi avec ses plages, malgré le changement d'ordre.
    expect(written()[1].bands).toEqual([band]);
  });

  it("gives a rung that has just been created no bands", async () => {
    await put([
      ...structure(stored),
      {
        id: "legend",
        league: "legend",
        division: "",
        name: {},
        position: 2,
        active: false,
      },
    ]);
    expect(written()[2].id).toBe("legend");
    expect(written()[2].bands).toEqual([]);
  });

  it("lets a deleted rung take its bands with it", async () => {
    await put(structure(stored).filter((rung) => rung.id !== "silver"));
    expect(written().map((rung) => rung.id)).toEqual(["bronze"]);
  });

  it("refuses a rung with neither a base league nor a free name", async () => {
    const nameless = structure(stored).map((rung) =>
      rung.id === "silver" ? { ...rung, league: null, name: {} } : rung,
    );
    expect((await put(nameless)).status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("refuses a payload that is not a list", async () => {
    for (const payload of [null, {}, { rungs: [] }]) {
      expect((await put(payload)).status, JSON.stringify(payload)).toBe(400);
    }
    expect($transaction).not.toHaveBeenCalled();
  });

  it("logs who changed the list, and refreshes the public tools", async () => {
    await put(structure(stored));
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", action: "update" }),
      }),
    );
    expect(revalidate).toHaveBeenCalledWith("tools");
  });
});
