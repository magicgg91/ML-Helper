import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuideStatusList, type GuideAdminRow } from "./guide-status-list";
import { renderWithIntl as render } from "../test/render-with-intl";

const row: GuideAdminRow = {
  id: "guide-1",
  slug: "premiers-pas",
  title: "Premiers pas",
  author: "Équipe",
  createdAt: "01/01/2026",
  updatedAt: "01/01/2026",
  status: "draft",
  active: true,
  type: "guide",
};

const referenceRow: GuideAdminRow = {
  id: "combat-equipment",
  slug: "combat-equipment",
  title: "Équipements de Combat",
  author: "—",
  createdAt: "—",
  updatedAt: "—",
  status: "reference",
  active: true,
  type: "reference",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GuideStatusList", () => {
  it("renders the edit link and the toggle/delete buttons as shadcn Button components", () => {
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    const edit = screen.getByRole("link", { name: "Éditer" });
    expect(edit).toHaveAttribute("data-slot", "button");
    expect(edit).toHaveAttribute("href", "/admin/guides/guide-1");
    expect(edit).toHaveAttribute("title", "Éditer");
    expect(edit.querySelector("svg")).toBeInTheDocument();
    const disable = screen.getByRole("button", { name: "Désactiver" });
    expect(disable).toHaveAttribute("data-slot", "button");
    expect(disable).toHaveAttribute("title", "Désactiver");
    expect(disable.querySelector("svg")).toBeInTheDocument();
    const remove = screen.getByRole("button", { name: "Supprimer" });
    expect(remove).toHaveAttribute("data-slot", "button");
    expect(remove).toHaveAttribute("title", "Supprimer");
    expect(remove.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("toggles visibility and reports a failure without crashing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={false}
        canWrite={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/guides/guide-1/active",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(
      await screen.findByText("Impossible de modifier la visibilité."),
    ).toBeVisible();
  });

  it("filters rows by type with directly clickable buttons, no dropdown", () => {
    render(
      <GuideStatusList
        rows={[row, referenceRow]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );

    expect(screen.getByText("Premiers pas")).toBeVisible();
    expect(screen.getByText("Équipements de Combat")).toBeVisible();
    const typeFilterGroup = screen.getByRole("group", {
      name: "Filtrer par type",
    });
    expect(typeFilterGroup.querySelector("select")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Guide" }));
    expect(screen.getByText("Premiers pas")).toBeVisible();
    expect(screen.queryByText("Équipements de Combat")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Référentiel" }));
    expect(screen.queryByText("Premiers pas")).toBeNull();
    expect(screen.getByText("Équipements de Combat")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Tous" }));
    expect(screen.getByText("Premiers pas")).toBeVisible();
    expect(screen.getByText("Équipements de Combat")).toBeVisible();
  });

  it("shows a no-results message when a filter matches nothing", () => {
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Référentiel" }));
    expect(screen.getByText("Aucun résultat pour ce filtre.")).toBeVisible();
    expect(screen.queryByText("Premiers pas")).toBeNull();
  });

  it("hides the toggle button for a reference whose active state is controlled elsewhere (Templars, no calculators.toggle)", () => {
    const templarsRow: GuideAdminRow = {
      ...referenceRow,
      id: "templars",
      slug: "templars",
      title: "Templiers",
      editHref: "/admin/tools/templars",
      canToggle: false,
    };
    render(
      <GuideStatusList
        rows={[templarsRow]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    expect(screen.getByRole("link", { name: "Éditer" })).toHaveAttribute(
      "href",
      "/admin/tools/templars",
    );
    expect(
      screen.queryByRole("button", { name: "Désactiver" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Templars toggle and routes it through the calculators.toggle-gated /admin/tools endpoint, not the references route (Bloc 32/A.1)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ active: false }), { status: 200 }),
      );
    const templarsRow: GuideAdminRow = {
      ...referenceRow,
      id: "templars",
      slug: "templars",
      title: "Templiers",
      active: true,
      editHref: "/admin/tools/templars",
      canToggle: true,
      toggleHref: "/api/admin/tools/calc-id-123",
    };
    render(
      <GuideStatusList
        rows={[templarsRow]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/tools/calc-id-123",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("colors the type filter buttons with the violet accent when selected, 'Tous' selected by default (Bloc 32/A.2)", () => {
    render(
      <GuideStatusList
        rows={[row, referenceRow]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    const all = screen.getByRole("button", { name: "Tous" });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(all.closest(".family-buttons")).toBeInTheDocument();
    const guide = screen.getByRole("button", { name: "Guide" });
    expect(guide).toHaveAttribute("aria-pressed", "false");
  });

  it("puts the 'Nouveau' link on the same row as the filters, right-aligned (Bloc 32/A.3)", () => {
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
        newHref="/admin/guides/new"
      />,
    );
    const filterGroup = screen.getByRole("group", { name: "Filtrer par type" });
    const newLink = screen.getByRole("link", { name: "Nouveau" });
    expect(newLink).toHaveAttribute("href", "/admin/guides/new");
    expect(filterGroup.parentElement).toBe(newLink.parentElement);
    expect(filterGroup.parentElement).toHaveClass("admin-section-heading");
  });

  it("hides the 'Nouveau' link when no newHref is given", () => {
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "Nouveau" }),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting a guide", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
