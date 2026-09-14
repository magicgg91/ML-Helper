import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { UNKNOWN_IP } from "../lib/client-ip";

// M4 (bloc de correctifs E): throttling now has two dimensions.
//  - The per-account lock is keyed on (identifier + IP), not the identifier
//    alone. An attacker hammering a known admin username from their own IP
//    can therefore no longer lock the legitimate owner out — the owner logs
//    in from a different IP, a different bucket. Brute force of one account
//    from one IP is still stopped after `maximumFailures`.
//  - A coarser per-IP lock caps password spraying across many usernames from
//    a single IP, which the identifier-only scheme never restrained.
export const loginRateLimit = {
  maximumFailures: 5,
  lockDurationMs: 15 * 60 * 1000,
  // Higher threshold: this counts failures across *all* accounts from one
  // IP, so it must sit well above the per-account limit to avoid catching a
  // legitimate user behind shared NAT who fat-fingers a couple of logins.
  ipMaximumFailures: 20,
} as const;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase("en");
}

// Kept for backward compatibility and unit tests: the base identifier hash.
export function loginIdentifierHash(username: string) {
  return sha256(normalizeUsername(username));
}

// Per-account bucket, now scoped to the requesting IP.
export function loginAccountKey(username: string, ip: string) {
  return sha256(`login:${normalizeUsername(username)}|ip:${ip}`);
}

// Per-IP bucket, spanning every account tried from that IP.
export function loginIpKey(ip: string) {
  return sha256(`login-ip:${ip}`);
}

export function nextFailedLoginState(
  current: { failedAttempts: number; lockedUntil: Date | null } | null,
  now: Date,
  maximumFailures: number = loginRateLimit.maximumFailures,
) {
  const previousFailures =
    current?.lockedUntil && current.lockedUntil.getTime() <= now.getTime()
      ? 0
      : (current?.failedAttempts ?? 0);
  const failedAttempts = previousFailures + 1;
  return {
    failedAttempts,
    lockedUntil:
      failedAttempts >= maximumFailures
        ? new Date(now.getTime() + loginRateLimit.lockDurationMs)
        : null,
  };
}

async function isKeyAllowed(identifierHash: string, now: Date) {
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

async function registerKeyFailure(
  identifierHash: string,
  maximumFailures: number,
  now: Date,
) {
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.loginThrottle.findUnique({
      where: { identifierHash },
    });
    if (current?.lockedUntil && current.lockedUntil.getTime() > now.getTime())
      return;
    const { failedAttempts, lockedUntil } = nextFailedLoginState(
      current,
      now,
      maximumFailures,
    );
    await transaction.loginThrottle.upsert({
      where: { identifierHash },
      create: { identifierHash, failedAttempts, lockedUntil },
      update: { failedAttempts, lockedUntil },
    });
  });
}

// The coarse per-IP bucket only makes sense for a real, identifiable IP —
// when the proxy gives us nothing, every caller would share one "unknown"
// bucket, so we skip that dimension and fall back to the per-account lock
// alone (the pre-existing behavior).
function ipBucketApplies(ip: string) {
  return ip !== UNKNOWN_IP;
}

// A login is allowed only when neither the (account+IP) bucket nor the IP
// bucket is currently locked.
export async function isLoginAllowed(
  username: string,
  ip: string,
  now = new Date(),
) {
  const accountAllowed = await isKeyAllowed(loginAccountKey(username, ip), now);
  if (!accountAllowed) return false;
  if (!ipBucketApplies(ip)) return true;
  return isKeyAllowed(loginIpKey(ip), now);
}

export async function registerFailedLogin(
  username: string,
  ip: string,
  now = new Date(),
) {
  await registerKeyFailure(
    loginAccountKey(username, ip),
    loginRateLimit.maximumFailures,
    now,
  );
  if (ipBucketApplies(ip))
    await registerKeyFailure(
      loginIpKey(ip),
      loginRateLimit.ipMaximumFailures,
      now,
    );
}

export async function clearFailedLogins(username: string, ip: string) {
  const keys = [loginAccountKey(username, ip)];
  if (ipBucketApplies(ip)) keys.push(loginIpKey(ip));
  await prisma.loginThrottle.deleteMany({
    where: { identifierHash: { in: keys } },
  });
}
