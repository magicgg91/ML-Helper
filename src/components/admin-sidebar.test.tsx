import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar, type AdminSidebarCounts } from "./admin-sidebar";

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
// The three controls at the bottom are existing components with their own
// tests; this file is about the navigation itself.
vi.mock("./admin-account-menu", () => ({
  AdminAccountMenu: ({ label }: { label?: string }) => <div>{label}</div>,
}));
vi.mock("./admin-locale-toggle", () => ({
  AdminLocaleToggle: () => <div role="group">EN/FR</div>,
}));
vi.mock("./theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
}));

afterEach(cleanup);

const messages = {
  admin: {
    title: "Administration",
    "view-site": "Voir le site public",
    "navigation-label": "Navigation administration",
    account: { title: "Mon compte" },
    navigation: {
      dashboard: "Tableau de bord",
      tools: "Outils",
      referentiels: "Référentiels",
      guides: "Guides",
      content: "Pages légales",
      users: "Utilisateurs",
      logs: "Historique",
      config: "Configuration",
      "group-content": "Contenu",
      "group-access": "Accès",
      "group-site": "Site",
      "legal-to-do":
        "{count, plural, =1 {# champ à compléter} other {# champs à compléter}}",
    },
  },
  roles: {
    super_admin: "Super Admin",
    admin: "Admin",
    guides_manager: "Gestion Guides",
  },
};

function renderSidebar({
  role = "super_admin",
  counts = {},
  username = "rootadmin",
}: {
  role?: string;
  counts?: AdminSidebarCounts;
  username?: string;
} = {}) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminSidebar
        role={role}
        username={username}
        totpEnabled={false}
        counts={counts}
      />
    </NextIntlClientProvider>,
  );
  return screen.getByRole("navigation", { name: "Navigation administration" });
}

describe("Bloc 119: AdminSidebar — what each role sees", () => {
  it("gives a Super Admin the eight sections, in their groups", () => {
    const nav = renderSidebar();
    expect(within(nav).getAllByRole("link")).toHaveLength(8);
    for (const group of ["Contenu", "Accès", "Site"])
      expect(within(nav).getByText(group)).toBeInTheDocument();
    // The dashboard stands alone, above the first named group (§2).
    expect(within(nav).queryByText("Tableau de bord")).toBeInTheDocument();
  });

  it("hides Pages légales from an Admin, who has no content capability", () => {
    // Not a display choice: `admin` is denied content.read in the matrix, and
    // the link is filtered by the same `can()` the server guard uses.
    const nav = renderSidebar({ role: "admin" });
    expect(
      within(nav).queryByRole("link", { name: /Pages légales/ }),
    ).toBeNull();
    expect(within(nav).getAllByRole("link")).toHaveLength(7);
  });

  it("limits a guides manager to the dashboard and the guides", () => {
    const nav = renderSidebar({ role: "guides_manager" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Tableau de bord", "Guides"]);
    // And the group headings of sections it cannot reach are gone with them.
    expect(within(nav).queryByText("Accès")).toBeNull();
  });
});

describe("Bloc 119: AdminSidebar — the current section and the counters", () => {
  it("marks the section being read, subpages included", () => {
    pathname = "/admin/guides/guide-1";
    const nav = renderSidebar();
    expect(within(nav).getByRole("link", { name: /Guides/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // /admin is current on itself alone, or every page would mark it.
    expect(
      within(nav).getByRole("link", { name: "Tableau de bord" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the dashboard on the dashboard", () => {
    pathname = "/admin";
    const nav = renderSidebar();
    expect(
      within(nav).getByRole("link", { name: "Tableau de bord" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows the counter of a section that has one", () => {
    pathname = "/admin";
    const nav = renderSidebar({
      counts: { tools: 12, referentiels: 4, guides: 7, users: 3 },
    });
    expect(within(nav).getByRole("link", { name: "Outils 12" })).toBeVisible();
    expect(within(nav).getByRole("link", { name: "Guides 7" })).toBeVisible();
    // Historique and Configuration count nothing — no empty badge either.
    expect(
      within(nav).getByRole("link", { name: "Historique" }),
    ).toBeInTheDocument();
  });

  it("puts an amber badge on Pages légales, saying what it counts", () => {
    pathname = "/admin";
    const nav = renderSidebar({ counts: { legalPlaceholders: 7 } });
    const link = within(nav).getByRole("link", {
      name: "Pages légales 7 champs à compléter",
    });
    // The number alone is the visible form; the sentence is what a screen
    // reader gets, so "7" is not read as a count of legal pages.
    expect(within(link).getByText("7")).toHaveAttribute("aria-hidden", "true");
    expect(within(link).getByText("7 champs à compléter")).toHaveClass(
      "sr-only",
    );
  });

  it("says one field in the singular", () => {
    pathname = "/admin";
    const nav = renderSidebar({ counts: { legalPlaceholders: 1 } });
    expect(within(nav).getByText("1 champ à compléter")).toBeInTheDocument();
  });

  it("hides the badge once nothing is left to fill in", () => {
    pathname = "/admin";
    const nav = renderSidebar({ counts: { legalPlaceholders: 0 } });
    expect(
      within(nav).getByRole("link", { name: "Pages légales" }),
    ).toBeInTheDocument();
    expect(within(nav).queryByText(/à compléter/)).toBeNull();
  });
});

describe("Bloc 119: AdminSidebar — the block at the bottom", () => {
  it("shows who is signed in, their role, and the way out", () => {
    pathname = "/admin";
    renderSidebar({ username: "rootadmin" });
    expect(screen.getByText("rootadmin")).toBeInTheDocument();
    // The translated role, never the raw `super_admin` key.
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.queryByText("super_admin")).toBeNull();
    expect(screen.getByText("Mon compte")).toBeInTheDocument();
  });

  it("opens the public site in a new tab", () => {
    pathname = "/admin";
    renderSidebar();
    const link = screen.getByRole("link", { name: "Voir le site public" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps the language and theme controls", () => {
    pathname = "/admin";
    renderSidebar();
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thème" })).toBeInTheDocument();
  });
});
