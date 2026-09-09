import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditGuidePage from "./[id]/page";
import { prisma } from "@/lib/prisma";
import { renderWithIntl as render } from "../../../test/render-with-intl";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/auth/require-session", () => ({
  requireCapability: async () => ({
    user: { id: "u1", role: "super_admin", name: "Admin" },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: { findUnique: vi.fn() },
  },
}));

afterEach(cleanup);

// Bloc 50: this file used to only cover the reference-editing branches of
// EditGuidePage (moved to admin/referentiels/edit-referentiel-page.test.tsx
// alongside the routes themselves) — now that those branches are gone,
// this exercises the guide-editing path that's actually left here.
describe("EditGuidePage", () => {
  it("renders the guide editor for a real guide id", async () => {
    vi.mocked(prisma.guide.findUnique).mockResolvedValue({
      id: "guide-1",
      slug: "premiers-pas",
      category: "[]",
      coverImage: null,
      status: "draft",
      title: "{}",
      excerpt: "{}",
      content: "{}",
    } as unknown as Awaited<ReturnType<typeof prisma.guide.findUnique>>);

    render(
      await EditGuidePage({
        params: Promise.resolve({ id: "guide-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("edit-title")).toBeInTheDocument();
  });
});
