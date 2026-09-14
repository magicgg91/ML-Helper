import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

import { liveSession } from "./session-freshness";

function session(role: string): Session {
  return {
    user: { id: "u1", role, name: "admin" },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

describe("E1: liveSession re-checks the live user row", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns null when there is no session", async () => {
    expect(await liveSession(null)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("revokes a deactivated account on its next request", async () => {
    findUnique.mockResolvedValue({ role: "tools_manager", active: false });
    expect(await liveSession(session("tools_manager"))).toBeNull();
  });

  it("revokes a deleted account (row gone) on its next request", async () => {
    findUnique.mockResolvedValue(null);
    expect(await liveSession(session("tools_manager"))).toBeNull();
  });

  it("applies the current DB role to a demoted account, not the JWT role", async () => {
    findUnique.mockResolvedValue({ role: "read_only", active: true });
    const result = await liveSession(session("tools_manager"));
    expect(result?.user.role).toBe("read_only");
  });

  it("passes an unchanged, active session straight through", async () => {
    findUnique.mockResolvedValue({ role: "tools_manager", active: true });
    const input = session("tools_manager");
    expect(await liveSession(input)).toBe(input);
  });
});
