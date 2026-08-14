import { hash } from "bcryptjs";
import { z } from "zod";
import { isAdminRole } from "@/auth/roles";
import { prisma } from "@/lib/prisma";

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
export async function createAdminUser(actorId: string, input: unknown) {
  const data = inputSchema.parse(input);
  const passwordHash = await hash(data.password, 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username: data.username, passwordHash, role: data.role },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
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
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      role: z.string().refine(isAdminRole),
      password: z.string().min(12).max(128).optional(),
    })
    .parse(input);
  const before = await prisma.user.findUniqueOrThrow({ where: { id } });
  const passwordHash = data.password
    ? await hash(data.password, 12)
    : undefined;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { role: data.role, passwordHash },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "update",
        entityType: "user",
        entityId: id,
        diff: {
          before: { role: before.role },
          after: { role: user.role, passwordChanged: Boolean(passwordHash) },
        },
      },
    });
    return user;
  });
}

export async function deleteAdminUser(actorId: string, id: string) {
  if (actorId === id) throw new Error("cannot_delete_self");
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "delete",
        entityType: "user",
        entityId: id,
        diff: { before: { username: user.username, role: user.role } },
      },
    });
    return user;
  });
}
