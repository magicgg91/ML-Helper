import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("./prisma", () => ({ prisma: { referenceTable: { findMany } } }));

import {
  defaultLeagueLadder,
  getLeagueLadder,
  leagueLadderKey,
} from "./leagues";

beforeEach(() => findMany.mockReset());

/** Une échelle stockée minimale, reconnaissable à son seul échelon. */
const stored = (key: string) => ({
  key,
  rows: [
    {
      id: "champions",
      league: null,
      division: "",
      name: { fr: "Champions" },
      position: 0,
      active: true,
      bands: [],
    },
  ],
});

/**
 * Bloc 135 : la clé de la ligne, et le repli sur l'ancienne.
 *
 * La migration renomme `ranking_leagues` en `leagues_divisions`. Entre le
 * démarrage d'une image et le `prisma migrate deploy` qui la précède, ou sur
 * une base restaurée d'avant, la nouvelle clé n'existe pas — et sans repli
 * l'échelle qu'une administration a construite disparaîtrait du site public au
 * profit des six ligues par défaut, sans le moindre message.
 */
describe("Bloc 135 : getLeagueLadder", () => {
  it("lit la ligne sous sa clé actuelle", async () => {
    findMany.mockResolvedValue([stored(leagueLadderKey)]);
    const ladder = await getLeagueLadder();
    expect(ladder).toHaveLength(1);
    expect(ladder[0].id).toBe("champions");
    // Les deux clés sont demandées d'un seul aller-retour.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: { in: [leagueLadderKey, "ranking_leagues"] } },
      }),
    );
  });

  it("retombe sur l'ancienne clé quand la migration n'a pas encore tourné", async () => {
    findMany.mockResolvedValue([stored("ranking_leagues")]);
    expect((await getLeagueLadder())[0].id).toBe("champions");
  });

  it("préfère la nouvelle clé quand les deux lignes existent", async () => {
    findMany.mockResolvedValue([
      { key: "ranking_leagues", rows: stored("ranking_leagues").rows },
      {
        key: leagueLadderKey,
        rows: [
          {
            id: "gold-1",
            league: "gold",
            division: "1",
            name: {},
            position: 0,
            active: true,
            bands: [],
          },
        ],
      },
    ]);
    expect((await getLeagueLadder())[0].id).toBe("gold-1");
  });

  it("rend les six ligues livrées quand rien n'est stocké", async () => {
    findMany.mockResolvedValue([]);
    expect(await getLeagueLadder()).toEqual(defaultLeagueLadder);
  });
});
