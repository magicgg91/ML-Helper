// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteAdminUser, updateAdminUser } from "./users";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockedFindUnique = vi.mocked(prisma.user.findUniqueOrThrow);
const mockedUpdate = vi.mocked(prisma.user.update);
const mockedTransaction = vi.mocked(prisma.$transaction);

type Row = { id: string; username: string; role: string; active: boolean };
const row = (overrides: Partial<Row> = {}): Row => ({
  id: "self",
  username: "rootadmin",
  role: "super_admin",
  active: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  // actorName() then the row being edited — both go through findUniqueOrThrow.
  mockedFindUnique.mockResolvedValue(
    row() as unknown as Awaited<
      ReturnType<typeof prisma.user.findUniqueOrThrow>
    >,
  );
  mockedUpdate.mockResolvedValue(
    row() as unknown as Awaited<ReturnType<typeof prisma.user.update>>,
  );
  mockedTransaction.mockImplementation(
    async (run: unknown) =>
      await (run as (tx: unknown) => Promise<unknown>)({
        user: { update: mockedUpdate },
        auditLog: { create: vi.fn() },
      }),
  );
});

/**
 * Bloc 119 §3: "un utilisateur ne peut ni se désactiver, ni se supprimer, ni
 * changer son propre rôle" — checked on the server, not only greyed out in
 * the interface.
 */
describe("Bloc 119: what an administrator may not do to their own account", () => {
  it("refuses to deactivate itself", async () => {
    await expect(
      updateAdminUser("self", "super_admin", "self", { active: false }),
    ).rejects.toThrow("cannot_deactivate_self");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("refuses to delete itself", async () => {
    await expect(
      deleteAdminUser("self", "super_admin", "self"),
    ).rejects.toThrow("cannot_delete_self");
  });

  it("refuses to change its own role", async () => {
    // The account demoting itself would be taking away the last hand that
    // can give the role back: only a Super Admin holds users.manage.
    await expect(
      updateAdminUser("self", "super_admin", "self", { role: "read_only" }),
    ).rejects.toThrow("cannot_change_own_role");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("accepts a form that posts the role it already has", async () => {
    await expect(
      updateAdminUser("self", "super_admin", "self", { role: "super_admin" }),
    ).resolves.toBeDefined();
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("still lets it act on somebody else's account", async () => {
    mockedFindUnique
      .mockResolvedValueOnce(
        row() as unknown as Awaited<
          ReturnType<typeof prisma.user.findUniqueOrThrow>
        >,
      )
      .mockResolvedValueOnce(
        row({
          id: "other",
          username: "claire",
          role: "read_only",
        }) as unknown as Awaited<
          ReturnType<typeof prisma.user.findUniqueOrThrow>
        >,
      );
    await expect(
      updateAdminUser("self", "super_admin", "other", {
        role: "guides_manager",
        active: false,
      }),
    ).resolves.toBeDefined();
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other" },
        data: expect.objectContaining({
          role: "guides_manager",
          active: false,
        }),
      }),
    );
  });
});
