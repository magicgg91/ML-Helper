import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { auditMessage } from "../lib/audit-message";

const setupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12).max(128),
});

export class SetupAlreadyCompletedError extends Error {}

export async function hasSuperAdmin() {
  return (await prisma.user.count({ where: { role: "super_admin" } })) > 0;
}

export async function createInitialSuperAdmin(input: unknown) {
  const data = setupSchema.parse(input);
  const passwordHash = await hash(data.password, 12);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.count({ where: { role: "super_admin" } });
    if (existing) throw new SetupAlreadyCompletedError();
    const user = await tx.user.create({
      data: {
        username: data.username,
        passwordHash,
        role: "super_admin",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        actorRole: "super_admin",
        message: auditMessage(user.username, "setup", ""),
        action: "setup",
        entityType: "user",
        entityId: user.id,
        diff: { after: { username: user.username, role: user.role } },
      },
    });
    return user;
  });
}
