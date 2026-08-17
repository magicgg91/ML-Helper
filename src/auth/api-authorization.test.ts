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
      user: { id: "calc", role: "calculators_manager" },
      expires: "2099-01-01",
    });
    await expect(authorizedSession("references.write")).resolves.not.toBeNull();
  });

  it("returns a clear 403 response for a forbidden server action", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "guide", role: "guides_manager" },
      expires: "2099-01-01",
    });
    await expect(authorizedSession("references.write")).resolves.toBeNull();
    const response = forbiddenResponse();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "forbidden",
      message: expect.stringContaining("rôle"),
    });
  });
});
