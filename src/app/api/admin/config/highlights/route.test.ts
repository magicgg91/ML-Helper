import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, auditCreate, $transaction } = vi.hoisted(() => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const auditCreate = vi.fn();
  return {
    findUnique,
    upsert,
    auditCreate,
    $transaction: vi.fn(
      async (
        callback: (client: {
          siteSetting: { findUnique: typeof findUnique; upsert: typeof upsert };
          auditLog: { create: typeof auditCreate };
        }) => unknown,
      ) =>
        callback({
          siteSetting: { findUnique, upsert },
          auditLog: { create: auditCreate },
        }),
    ),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction } }));

let capabilityAsked: string | undefined;
let allowed = true;
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async (capability: string) => {
    capabilityAsked = capability;
    return allowed
      ? { user: { id: "u1", role: "admin", name: "Alice" } }
      : null;
  },
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PUT } from "./route";
import { homeHighlightsKey } from "@/lib/home-highlights";

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/admin/config/highlights", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  allowed = true;
  capabilityAsked = undefined;
  findUnique.mockResolvedValue(null);
});

/**
 * Bloc 132 §4 : la route qui enregistre la sélection « Mis en avant ».
 *
 * Elle écrit une ligne de configuration, et ce que la base ne peut pas
 * garantir pour du JSON — la forme, la taille, l'unicité — c'est elle qui
 * le refuse.
 */
describe("PUT /api/admin/config/highlights", () => {
  it("demande configuration.write, pas le droit des scripts", async () => {
    await put({ highlights: [] });
    // La route de suivi à côté exige `configuration.scripts` parce que sa
    // valeur devient du code exécuté dans la page. Ici c'est du contenu
    // éditorial : un `admin` doit pouvoir le faire.
    expect(capabilityAsked).toBe("configuration.write");
  });

  it("refuse une session sans le droit", async () => {
    allowed = false;
    expect((await put({ highlights: [] })).status).toBe(403);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("enregistre la sélection dans son ordre", async () => {
    const highlights = [
      { kind: "guide", slug: "bien-debuter" },
      { kind: "tool", slug: "city-cost" },
    ];
    const response = await put({ highlights });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ highlights });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: homeHighlightsKey },
      create: { key: homeHighlightsKey, value: JSON.stringify(highlights) },
      update: { value: JSON.stringify(highlights) },
    });
  });

  // Vider la sélection, c'est masquer le panneau — pas revenir au repli.
  // D'où une ligne vraiment écrite, plutôt qu'un effacement.
  it("enregistre une sélection vide au lieu d'effacer la ligne", async () => {
    expect((await put({ highlights: [] })).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { value: "[]" } }),
    );
  });

  it.each([
    ["rien du tout", {}],
    ["une nature inconnue", { highlights: [{ kind: "page", slug: "a" }] }],
    ["un slug vide", { highlights: [{ kind: "tool", slug: "" }] }],
    [
      "six entrées",
      {
        highlights: Array.from({ length: 6 }, (_, index) => ({
          kind: "guide",
          slug: `g${index}`,
        })),
      },
    ],
    [
      "deux fois la même",
      {
        highlights: [
          { kind: "tool", slug: "city-cost" },
          { kind: "tool", slug: "city-cost" },
        ],
      },
    ],
  ])("refuse %s", async (_label, body) => {
    const response = await put(body);
    expect(response.status).toBe(400);
    expect($transaction).not.toHaveBeenCalled();
  });

  it("consigne le changement, avec la valeur qu'il remplace", async () => {
    findUnique.mockResolvedValue({ value: '[{"kind":"tool","slug":"gems"}]' });
    await put({ highlights: [{ kind: "guide", slug: "clan" }] });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageKey: "highlights.update",
          entityType: "site_setting",
          entityId: homeHighlightsKey,
          diff: {
            before: '[{"kind":"tool","slug":"gems"}]',
            after: '[{"kind":"guide","slug":"clan"}]',
          },
        }),
      }),
    );
  });

  // Lu hors transaction, deux enregistrements concurrents partiraient du
  // même « avant » et le second consignerait un écart qu'il n'a jamais
  // remplacé.
  it("lit la valeur précédente dans la transaction", async () => {
    await put({ highlights: [] });
    expect(findUnique).toHaveBeenCalledWith({
      where: { key: homeHighlightsKey },
      select: { value: true },
    });
  });
});
