import { compare } from "bcryptjs";
import QRCode from "qrcode";
import { z } from "zod";
import {
  createTotpEnrollment,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotpToken,
} from "@/auth/totp";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";

const tokenSchema = z.object({ token: z.string().regex(/^\d{6}$/) });
const disableSchema = tokenSchema.extend({
  currentPassword: z.string().min(1),
});

export async function startTotpEnrollment(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.totpEnabled) throw new Error("totp_already_enabled");
  const enrollment = createTotpEnrollment(user.username);
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecretEncrypted: encryptTotpSecret(enrollment.secret) },
  });
  return {
    secret: enrollment.secret,
    qrCodeDataUrl: await QRCode.toDataURL(enrollment.uri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    }),
  };
}

export async function enableTotp(userId: string, role: string, input: unknown) {
  const { token } = tokenSchema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpSecretEncrypted) throw new Error("totp_setup_required");
  if (!verifyTotpToken(decryptTotpSecret(user.totpSecretEncrypted), token))
    throw new Error("invalid_totp");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        actorRole: role,
        message: auditMessage(
          user.username,
          "activate",
          "l’authentification à deux facteurs de son compte",
        ),
        action: "activate_totp",
        entityType: "user",
        entityId: userId,
        diff: { after: { totpEnabled: true } },
      },
    }),
  ]);
}

export async function disableTotp(
  userId: string,
  role: string,
  input: unknown,
) {
  const data = disableSchema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (
    !user.totpEnabled ||
    !user.totpSecretEncrypted ||
    !(await compare(data.currentPassword, user.passwordHash)) ||
    !verifyTotpToken(decryptTotpSecret(user.totpSecretEncrypted), data.token)
  )
    throw new Error("invalid_totp_disable");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecretEncrypted: null },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        actorRole: role,
        message: auditMessage(
          user.username,
          "deactivate",
          "l’authentification à deux facteurs de son compte",
        ),
        action: "deactivate_totp",
        entityType: "user",
        entityId: userId,
        diff: { after: { totpEnabled: false } },
      },
    }),
  ]);
}
