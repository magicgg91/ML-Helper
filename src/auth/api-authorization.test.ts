import { getServerSession } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("./options", () => ({ authOptions: {} }));
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

import { authorizedSession, forbiddenResponse } from "./api-authorization";

const mockedSession = vi.mocked(getServerSession);

// E1: authorizedSession now revalidates the live user row. Every test signs
// in `as(role)`, which stubs both the JWT session and a matching, active DB
// row so the capability logic under test is exercised, not the revocation.
function as(role: string) {
  mockedSession.mockResolvedValue({
    user: { id: role, role },
    expires: "2099-01-01",
  });
  findUnique.mockResolvedValue({ role, active: true });
}

describe("API role authorization", () => {
  beforeEach(() => {
    mockedSession.mockReset();
    findUnique.mockReset();
  });

  it("returns the session for an allowed server action", async () => {
    as("tools_manager");
    await expect(
      authorizedSession("calculators.write"),
    ).resolves.not.toBeNull();
  });

  it("returns a clear 403 response for a forbidden server action", async () => {
    as("guides_manager");
    await expect(authorizedSession("guides.write")).resolves.not.toBeNull();
    await expect(authorizedSession("calculators.write")).resolves.toBeNull();
    const response = forbiddenResponse();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "forbidden",
      message: expect.stringContaining("rôle"),
    });
  });

  it("grants access when the role has any capability in a list (references_manager: Templars/Gems reference editing)", async () => {
    as("references_manager");
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.not.toBeNull();
    // guides_manager no longer carries references.write (moved to
    // references_manager), so it no longer qualifies for this list either.
    as("guides_manager");
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.toBeNull();
    as("read_only");
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.toBeNull();
  });

  it("E1: revokes access when the live account has been deactivated", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "tools", role: "tools_manager" },
      expires: "2099-01-01",
    });
    findUnique.mockResolvedValue({ role: "tools_manager", active: false });
    await expect(authorizedSession("calculators.write")).resolves.toBeNull();
  });

  it("E1: evaluates the current DB role, not the one frozen in the JWT", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "tools", role: "tools_manager" },
      expires: "2099-01-01",
    });
    // Demoted to read_only in the DB since the JWT was issued.
    findUnique.mockResolvedValue({ role: "read_only", active: true });
    await expect(authorizedSession("calculators.write")).resolves.toBeNull();
  });
});
