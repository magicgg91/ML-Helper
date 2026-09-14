import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
const update = vi.fn();
// $transaction just runs the callback against our stub client.
const tx = { loginThrottle: { findUnique, upsert, update } };
vi.mock("./prisma", () => ({
  prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) },
}));

import { consumeRateLimit, rateLimitKey } from "./rate-limit";

const opts = { max: 3, windowMs: 60_000 };
const now = new Date("2026-09-04T10:00:00.000Z");

describe("M3: consumeRateLimit (fixed window)", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    update.mockReset();
  });

  it("derives a stable, opaque key per namespace+value", () => {
    expect(rateLimitKey("contact", "1.2.3.4")).toBe(
      rateLimitKey("contact", "1.2.3.4"),
    );
    expect(rateLimitKey("contact", "1.2.3.4")).not.toContain("1.2.3.4");
  });

  it("allows and opens a window when none is active", async () => {
    findUnique.mockResolvedValue(null);
    expect(await consumeRateLimit("k", opts, now)).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("allows and increments while under the window budget", async () => {
    findUnique.mockResolvedValue({
      failedAttempts: 1,
      lockedUntil: new Date(now.getTime() + 30_000),
    });
    expect(await consumeRateLimit("k", opts, now)).toBe(true);
    expect(update).toHaveBeenCalledOnce();
  });

  it("denies once the window budget is spent", async () => {
    findUnique.mockResolvedValue({
      failedAttempts: 3,
      lockedUntil: new Date(now.getTime() + 30_000),
    });
    expect(await consumeRateLimit("k", opts, now)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("resets to a fresh window once the previous one has elapsed", async () => {
    findUnique.mockResolvedValue({
      failedAttempts: 3,
      lockedUntil: new Date(now.getTime() - 1_000),
    });
    expect(await consumeRateLimit("k", opts, now)).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
