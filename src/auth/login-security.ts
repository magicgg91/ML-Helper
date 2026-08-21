import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";

export const loginRateLimit = {
  maximumFailures: 5,
  lockDurationMs: 15 * 60 * 1000,
} as const;

export function loginIdentifierHash(username: string) {
  return createHash("sha256")
    .update(username.trim().toLocaleLowerCase("en"))
    .digest("hex");
}

export function nextFailedLoginState(
  current: { failedAttempts: number; lockedUntil: Date | null } | null,
  now: Date,
) {
  const previousFailures =
    current?.lockedUntil && current.lockedUntil.getTime() <= now.getTime()
      ? 0
      : (current?.failedAttempts ?? 0);
  const failedAttempts = previousFailures + 1;
  return {
    failedAttempts,
    lockedUntil:
      failedAttempts >= loginRateLimit.maximumFailures
        ? new Date(now.getTime() + loginRateLimit.lockDurationMs)
        : null,
  };
}

export async function isLoginAllowed(username: string, now = new Date()) {
  const identifierHash = loginIdentifierHash(username);
  const throttle = await prisma.loginThrottle.findUnique({
    where: { identifierHash },
  });
  if (!throttle?.lockedUntil) return true;
  if (throttle.lockedUntil.getTime() > now.getTime()) return false;
  await prisma.loginThrottle.update({
    where: { identifierHash },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  return true;
}

export async function registerFailedLogin(username: string, now = new Date()) {
  const identifierHash = loginIdentifierHash(username);
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.loginThrottle.findUnique({
      where: { identifierHash },
    });
    if (current?.lockedUntil && current.lockedUntil.getTime() > now.getTime())
      return;
    const { failedAttempts, lockedUntil } = nextFailedLoginState(current, now);
    await transaction.loginThrottle.upsert({
      where: { identifierHash },
      create: { identifierHash, failedAttempts, lockedUntil },
      update: { failedAttempts, lockedUntil },
    });
  });
}

export async function clearFailedLogins(username: string) {
  await prisma.loginThrottle.deleteMany({
    where: { identifierHash: loginIdentifierHash(username) },
  });
}
