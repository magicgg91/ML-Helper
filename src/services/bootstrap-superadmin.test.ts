import { describe, expect, it, vi } from "vitest";
import {
  bootstrapSuperAdmin,
  type BootstrapPrisma,
} from "./bootstrap-superadmin";

function prismaMock(existingUser: { id: string } | null = null) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(existingUser),
      create: vi.fn().mockResolvedValue({ id: "created-user" }),
    },
  } satisfies BootstrapPrisma;
}

describe("bootstrapSuperAdmin", () => {
  it("creates a missing Super Admin", async () => {
    const prisma = prismaMock();

    await expect(
      bootstrapSuperAdmin(prisma, {
        username: "rootadmin",
        password: "correct-horse-battery-staple",
      }),
    ).resolves.toBe(true);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "rootadmin",
        passwordHash: expect.not.stringContaining(
          "correct-horse-battery-staple",
        ),
        role: "super_admin",
      },
    });
  });

  it("does not modify an existing account", async () => {
    const prisma = prismaMock({ id: "existing-user" });

    await expect(
      bootstrapSuperAdmin(prisma, {
        username: "rootadmin",
        password: "correct-horse-battery-staple",
      }),
    ).resolves.toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects missing or weak bootstrap credentials", async () => {
    const prisma = prismaMock();

    await expect(
      bootstrapSuperAdmin(prisma, {
        username: "rootadmin",
        password: "too-short",
      }),
    ).rejects.toThrow("12+ character");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
