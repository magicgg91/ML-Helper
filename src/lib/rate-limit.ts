import { createHash } from "node:crypto";
import { prisma } from "./prisma";

// M3 (bloc de correctifs D): a generic fixed-window rate limiter backed by
// the existing LoginThrottle table (reused as a counter, no schema change /
// migration needed) — the same storage the login lockout already uses.
// `failedAttempts` holds the number of hits in the current window;
// `lockedUntil` holds the window's end. Used to cap abusable public
// endpoints (contact form) per IP.
export function rateLimitKey(namespace: string, value: string): string {
  return createHash("sha256").update(`${namespace}:${value}`).digest("hex");
}

// Returns true when the request is allowed (and records the hit), false when
// the window's budget is already spent.
export async function consumeRateLimit(
  key: string,
  options: { max: number; windowMs: number },
  now: Date = new Date(),
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.loginThrottle.findUnique({
      where: { identifierHash: key },
    });
    const windowActive = Boolean(
      row?.lockedUntil && row.lockedUntil.getTime() > now.getTime(),
    );
    if (!windowActive) {
      // Fresh window (none yet, or the previous one has elapsed).
      await tx.loginThrottle.upsert({
        where: { identifierHash: key },
        create: {
          identifierHash: key,
          failedAttempts: 1,
          lockedUntil: new Date(now.getTime() + options.windowMs),
        },
        update: {
          failedAttempts: 1,
          lockedUntil: new Date(now.getTime() + options.windowMs),
        },
      });
      return true;
    }
    if ((row?.failedAttempts ?? 0) >= options.max) return false;
    await tx.loginThrottle.update({
      where: { identifierHash: key },
      data: { failedAttempts: { increment: 1 } },
    });
    return true;
  });
}
