import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UsersPage from "./page";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: vi.fn() } } }));
// The section names come back as their keys, which is enough to read the
// sentence the matrix produced.
vi.mock("next-intl/server", () => ({
  getTranslations:
    async (namespace?: string) =>
    (key: string, values?: Record<string, unknown>) =>
      namespace === "admin.navigation"
        ? key
        : values
          ? `${key}(${JSON.stringify(values)})`
          : key,
}));
vi.mock("@/components/admin-users-list", () => ({
  AdminUsersList: (props: Record<string, unknown>) => (
    <pre data-testid="props">{JSON.stringify(props)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedFindMany = vi.mocked(prisma.user.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage(role = "super_admin") {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "self", role, name: "rootadmin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  mockedFindMany.mockResolvedValue(
    [] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>,
  );
  render(await UsersPage());
  return JSON.parse(screen.getByTestId("props").textContent ?? "{}") as {
    roleDescriptions: Record<string, string>;
    currentUserId: string;
    canManage: boolean;
  };
}

describe("Bloc 119: the role descriptions come from the permission matrix", () => {
  it("separates an Admin from a Super Admin on what each may change", async () => {
    const { roleDescriptions } = await renderPage();
    // A Super Admin writes everywhere, so it has nothing in the "reads only"
    // half; an Admin cannot manage users, cannot purge the log, and cannot
    // open the legal pages at all.
    expect(roleDescriptions.super_admin).toContain("users");
    expect(roleDescriptions.super_admin).not.toContain("role-reads");
    expect(roleDescriptions.admin).toContain("role-writes");
    expect(roleDescriptions.admin).toContain("role-reads");
    expect(roleDescriptions.admin).not.toContain("content");
  });

  it("describes a manager role by the sections it owns", async () => {
    const { roleDescriptions } = await renderPage();
    expect(roleDescriptions.guides_manager).toBe(
      'role-writes({"sections":"guides"})',
    );
    // Bloc 137 : « Gestion Outils » n'écrit plus dans Configuration — le
    // classement, qu'il édite, est redevenu un paramètre d'outil, et la liste
    // des ligues appartient au site. La description est calculée sur la matrice,
    // donc elle suit sans qu'on l'écrive ici.
    expect(roleDescriptions.tools_manager).toBe(
      'role-writes({"sections":"tools"})',
    );
  });

  it("describes the read-only role as reading, not writing", async () => {
    const { roleDescriptions } = await renderPage();
    expect(roleDescriptions.read_only).toBe(
      'role-read-only({"sections":"tools, referentiels, guides"})',
    );
  });

  it("hands the list the signed-in account and the management permission", async () => {
    expect(await renderPage("super_admin")).toMatchObject({
      currentUserId: "self",
      canManage: true,
    });
    cleanup();
    // `admin` reads the screen but may not manage accounts.
    expect((await renderPage("admin")).canManage).toBe(false);
  });
});
