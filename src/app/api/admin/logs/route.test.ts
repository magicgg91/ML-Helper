import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMany, auditCreate } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  auditCreate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { deleteMany, create: auditCreate, findMany: vi.fn() } },
}));

let capabilityAsked: string | undefined;
let allowed = true;
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async (capability: string) => {
    capabilityAsked = capability;
    return allowed
      ? { user: { id: "u1", role: "super_admin", name: "Root" } }
      : null;
  },
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { DELETE } from "./route";

const purge = (body: unknown) =>
  DELETE(
    new Request("http://localhost/api/admin/logs", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  allowed = true;
  capabilityAsked = undefined;
  deleteMany.mockResolvedValue({ count: 42 });
});

/**
 * Bloc 131/E : la purge du journal a changé de page — de Historique vers
 * Configuration — et rien d'autre.
 *
 * Ce fichier tient le « rien d'autre ». Une action destructive dont l'écran
 * bouge est exactement le moment où l'on vérifie que ce n'est pas la garde
 * qui a bougé avec lui : la route est la seule chose qui protège vraiment,
 * la carte n'étant qu'une porte d'entrée.
 */
describe("Bloc 131/E — la purge du journal, côté serveur", () => {
  it("n'est ouverte qu'à qui peut purger", async () => {
    allowed = false;
    const response = await purge({ start: "2026-01-01", end: "2026-02-01" });
    expect(response.status).toBe(403);
    // La capacité demandée, et pas une autre : `logs.view` laisserait
    // passer un admin qui n'a le droit que de lire.
    expect(capabilityAsked).toBe("logs.purge");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("supprime la période demandée, bornes comprises", async () => {
    const response = await purge({
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-02-01T00:00:00.000Z",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 42 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date("2026-01-01T00:00:00.000Z"),
          lte: new Date("2026-02-01T00:00:00.000Z"),
        },
      },
    });
  });

  /**
   * La seule action qui efface le journal y laisse sa propre trace, avec son
   * auteur, la période et le nombre supprimé — sans quoi une purge serait la
   * seule chose que l'historique ne raconte pas.
   */
  it("s'inscrit elle-même au journal qu'elle vient de vider", async () => {
    await purge({
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-02-01T00:00:00.000Z",
    });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const { data } = auditCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      userId: "u1",
      actorRole: "super_admin",
      action: "purge",
      entityType: "audit_log",
    });
    expect(data.diff.after).toEqual({
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-02-01T00:00:00.000Z",
      deleted: 42,
    });
  });

  it("refuse une période à l'envers, sans rien supprimer", async () => {
    const response = await purge({
      start: "2026-02-01",
      end: "2026-01-01",
    });
    expect(response.status).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("refuse un corps qui n'est pas une période", async () => {
    const response = await purge({ start: "pas une date" });
    expect(response.status).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
