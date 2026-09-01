import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ReferenceStatusList,
  type ReferenceAdminRow,
} from "./reference-status-list";
import { renderWithIntl as render } from "../test/render-with-intl";

const row: ReferenceAdminRow = {
  id: "combat-equipment",
  slug: "combat-equipment",
  title: "Équipements de Combat",
  active: true,
  editHref: "/admin/referentiels/reference-combat-equipment",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReferenceStatusList", () => {
  it("renders the row with a read-only status text, no dropdown", () => {
    render(<ReferenceStatusList rows={[row]} canWrite={true} />);
    expect(screen.getByText("Équipements de Combat")).toBeVisible();
    expect(screen.getByText("Actif")).toBeVisible();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows the inactive status text when the reference is disabled", () => {
    render(
      <ReferenceStatusList
        rows={[{ ...row, active: false }]}
        canWrite={true}
      />,
    );
    expect(screen.getByText("Inactif")).toBeVisible();
  });

  it("uses editHref for the edit link", () => {
    render(<ReferenceStatusList rows={[row]} canWrite={true} />);
    expect(screen.getByRole("link", { name: "Éditer" })).toHaveAttribute(
      "href",
      "/admin/referentiels/reference-combat-equipment",
    );
  });

  it("hides the edit link when editHref is missing", () => {
    render(
      <ReferenceStatusList
        rows={[{ ...row, editHref: undefined }]}
        canWrite={true}
      />,
    );
    expect(screen.queryByRole("link", { name: "Éditer" })).toBeNull();
  });

  it("never renders a delete action", () => {
    render(<ReferenceStatusList rows={[row]} canWrite={true} />);
    expect(screen.queryByRole("button", { name: "Supprimer" })).toBeNull();
  });

  it("toggles the reference through the default references API endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ active: false }), { status: 200 }),
      );
    render(<ReferenceStatusList rows={[row]} canWrite={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/guides/references/combat-equipment/active",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(await screen.findByText("Référentiel désactivé.")).toBeVisible();
  });

  it("toggles through a custom toggleHref when given (Templars/Gems shared endpoint)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ active: false }), { status: 200 }),
      );
    render(
      <ReferenceStatusList
        rows={[{ ...row, toggleHref: "/api/admin/tools/calc-id-123" }]}
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

  it("hides the toggle button when canToggle is false", () => {
    render(
      <ReferenceStatusList
        rows={[{ ...row, canToggle: false }]}
        canWrite={true}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Désactiver" }),
    ).not.toBeInTheDocument();
  });

  it("hides edit/toggle actions when canWrite is false", () => {
    render(<ReferenceStatusList rows={[row]} canWrite={false} />);
    expect(screen.queryByRole("link", { name: "Éditer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Désactiver" })).toBeNull();
  });

  it("shows a no-results message when there are no rows", () => {
    render(<ReferenceStatusList rows={[]} canWrite={true} />);
    expect(screen.getByText("Aucun référentiel.")).toBeVisible();
  });

  it("reports a failure without crashing when the toggle request fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    render(<ReferenceStatusList rows={[row]} canWrite={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      await screen.findByText("Impossible de modifier la visibilité."),
    ).toBeVisible();
  });
});
