import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export async function changeOwnPassword(
  userId: string,
  role: string,
  input: unknown,
) {
  const data = schema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await compare(data.currentPassword, user.passwordHash)))
    throw new Error("invalid_current_password");
  const passwordHash = await hash(data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.auditLog.create({
      data: {
        userId,
        actorRole: role,
        action: "change_password",
        entityType: "user",
        entityId: userId,
        diff: { after: { passwordChanged: true } },
      },
    }),
  ]);
}
