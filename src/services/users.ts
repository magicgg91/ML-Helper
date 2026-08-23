import { hash } from "bcryptjs";
import { z } from "zod";
import { isAdminRole } from "@/auth/roles";
import { prisma } from "@/lib/prisma";
import { auditMessage } from "@/lib/audit-message";

async function actorName(id: string) {
  return (
    await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { username: true },
    })
  ).username;
}

const inputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12).max(128),
  role: z.string().refine(isAdminRole),
});
export async function createAdminUser(
  actorId: string,
  actorRole: string,
  input: unknown,
) {
  const data = inputSchema.parse(input);
  const actor = await actorName(actorId);
  const passwordHash = await hash(data.password, 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username: data.username, passwordHash, role: data.role },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        actorRole,
        message: auditMessage(
          actor,
          "create",
          `l’utilisateur ${user.username}`,
        ),
        action: "create",
        entityType: "user",
        entityId: user.id,
        diff: { after: { username: user.username, role: user.role } },
      },
    });
    return user;
  });
}

export async function updateAdminUser(
  actorId: string,
  actorRole: string,
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      role: z.string().refine(isAdminRole).optional(),
      password: z.string().min(12).max(128).optional(),
      active: z.boolean().optional(),
    })
    .parse(input);
  if (actorId === id && data.active === false) {
    throw new Error("cannot_deactivate_self");
  }
  const actor = await actorName(actorId);
  const before = await prisma.user.findUniqueOrThrow({ where: { id } });
  const passwordHash = data.password
    ? await hash(data.password, 12)
    : undefined;
  const role = data.role ?? before.role;
  const active = data.active ?? before.active;
  const isActiveOnlyChange =
    data.active !== undefined &&
    data.active !== before.active &&
    data.role === undefined &&
    !passwordHash;
  const action = isActiveOnlyChange
    ? data.active
      ? "activate"
      : "deactivate"
    : "update";
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { role, passwordHash, active },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        actorRole,
        message: auditMessage(actor, action, `l’utilisateur ${user.username}`),
        action,
        entityType: "user",
        entityId: id,
        diff: {
          before: { role: before.role, active: before.active },
          after: {
            role: user.role,
            active: user.active,
            passwordChanged: Boolean(passwordHash),
          },
        },
      },
    });
    return user;
  });
}

export async function deleteAdminUser(
  actorId: string,
  actorRole: string,
  id: string,
) {
  if (actorId === id) throw new Error("cannot_delete_self");
  const actor = await actorName(actorId);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        actorRole,
        message: auditMessage(
          actor,
          "delete",
          `l’utilisateur ${user.username}`,
        ),
        action: "delete",
        entityType: "user",
        entityId: id,
        diff: { before: { username: user.username, role: user.role } },
      },
    });
    return user;
  });
}
