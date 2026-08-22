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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GuideStatusList", () => {
  it("gives the edit link and the toggle/delete buttons the polished editor-action styling", () => {
    render(
      <GuideStatusList
        rows={[row]}
        canPublish={false}
        canDelete={true}
        canWrite={true}
      />,
    );
    const edit = screen.getByRole("link", { name: "Éditer" });
    expect(edit).toHaveClass("editor-action", "editor-action-primary");
    expect(edit).toHaveAttribute("href", "/admin/guides/guide-1");
    const disable = screen.getByRole("button", { name: "Désactiver" });
    expect(disable).toHaveClass("editor-action", "editor-action-secondary");
    const remove = screen.getByRole("button", { name: "Supprimer" });
    expect(remove).toHaveClass("editor-action", "danger-action");
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
