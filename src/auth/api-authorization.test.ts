import { getServerSession } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizedSession, forbiddenResponse } from "./api-authorization";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("./options", () => ({ authOptions: {} }));

const mockedSession = vi.mocked(getServerSession);

describe("API role authorization", () => {
  beforeEach(() => mockedSession.mockReset());

  it("returns the session for an allowed server action", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "tools", role: "tools_manager" },
      expires: "2099-01-01",
    });
    await expect(
      authorizedSession("calculators.write"),
    ).resolves.not.toBeNull();
  });

  it("returns a clear 403 response for a forbidden server action", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "guide", role: "guides_manager" },
      expires: "2099-01-01",
    });
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
    mockedSession.mockResolvedValue({
      user: { id: "references", role: "references_manager" },
      expires: "2099-01-01",
    });
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.not.toBeNull();
    // guides_manager no longer carries references.write (moved to
    // references_manager), so it no longer qualifies for this list either.
    mockedSession.mockResolvedValue({
      user: { id: "guide", role: "guides_manager" },
      expires: "2099-01-01",
    });
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.toBeNull();
    mockedSession.mockResolvedValue({
      user: { id: "read-only", role: "read_only" },
      expires: "2099-01-01",
    });
    await expect(
      authorizedSession(["calculators.write", "references.write"]),
    ).resolves.toBeNull();
  });
});
