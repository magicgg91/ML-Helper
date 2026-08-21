import { describe, expect, it } from "vitest";
import {
  loginIdentifierHash,
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
});
