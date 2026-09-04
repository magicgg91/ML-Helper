import { describe, expect, it } from "vitest";
import {
  loginAccountKey,
  loginIdentifierHash,
  loginIpKey,
  loginRateLimit,
  nextFailedLoginState,
} from "./login-security";

describe("admin login throttling", () => {
  it("normalizes and hashes identifiers without storing the username", () => {
    const hash = loginIdentifierHash(" Alice ");
    expect(hash).toBe(loginIdentifierHash("alice"));
    expect(hash).not.toContain("alice");
  });

  it("locks the identifier for 15 minutes after five failures", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    let state = null;
    for (
      let attempt = 0;
      attempt < loginRateLimit.maximumFailures;
      attempt += 1
    )
      state = nextFailedLoginState(state, now);
    expect(state?.failedAttempts).toBe(5);
    expect(state?.lockedUntil?.getTime()).toBe(
      now.getTime() + loginRateLimit.lockDurationMs,
    );
  });

  it("starts a fresh counter once an expired lock is reached", () => {
    const now = new Date("2026-08-21T12:30:00.000Z");
    expect(
      nextFailedLoginState(
        {
          failedAttempts: 5,
          lockedUntil: new Date("2026-08-21T12:15:00.000Z"),
        },
        now,
      ),
    ).toEqual({ failedAttempts: 1, lockedUntil: null });
  });

  it("honors a custom (higher) threshold for the per-IP bucket", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const state = nextFailedLoginState(
      { failedAttempts: 5, lockedUntil: null },
      now,
      loginRateLimit.ipMaximumFailures,
    );
    // 6 failures is well under the 20-failure IP threshold: still not locked.
    expect(state).toEqual({ failedAttempts: 6, lockedUntil: null });
  });
});

// M4: an attacker hammering a known username from their own IP must not be
// able to lock out the legitimate owner, who logs in from a different IP.
describe("M4: per-(account+IP) and per-IP throttle keys", () => {
  it("gives the same account a different bucket per IP", () => {
    expect(loginAccountKey("alice", "1.1.1.1")).not.toBe(
      loginAccountKey("alice", "2.2.2.2"),
    );
  });

  it("normalizes the username inside the account+IP key", () => {
    expect(loginAccountKey(" Alice ", "1.1.1.1")).toBe(
      loginAccountKey("alice", "1.1.1.1"),
    );
  });

  it("keys the per-IP bucket independently of any username", () => {
    expect(loginIpKey("1.1.1.1")).not.toBe(loginIpKey("2.2.2.2"));
    expect(loginIpKey("1.1.1.1")).not.toBe(loginAccountKey("alice", "1.1.1.1"));
  });

  it("never embeds the raw username or IP in a key", () => {
    const key = loginAccountKey("alice", "203.0.113.9");
    expect(key).not.toContain("alice");
    expect(key).not.toContain("203.0.113.9");
  });
});
