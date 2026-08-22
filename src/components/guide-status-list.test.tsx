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
