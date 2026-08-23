import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersManager } from "./users-manager";
import { renderWithIntl as render } from "../test/render-with-intl";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const users = [
  { id: "user-1", username: "alice", role: "admin", active: true },
  { id: "user-2", username: "bob", role: "read_only", active: false },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UsersManager", () => {
  it("renders the create/save/delete actions as shadcn Button components", () => {
    render(<UsersManager users={users} />);
    expect(
      screen.getByRole("button", { name: "Créer l’utilisateur" }),
    ).toHaveAttribute("data-slot", "button");
    const save = screen.getAllByRole("button", { name: "Enregistrer" })[0];
    expect(save).toHaveAttribute("data-slot", "button");
    expect(save).toHaveAttribute("title", "Enregistrer");
    expect(save.querySelector("svg")).toBeInTheDocument();
    const remove = screen.getAllByRole("button", { name: "Supprimer" })[0];
    expect(remove).toHaveAttribute("data-slot", "button");
    expect(remove).toHaveAttribute("title", "Supprimer");
    expect(remove.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("hides every mutation control for a read-only viewer", () => {
    render(<UsersManager users={users} canManage={false} />);
    expect(
      screen.queryByRole("button", { name: "Créer l’utilisateur" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Rôle alice")).not.toBeInTheDocument();
    expect(screen.getByText("alice")).toBeVisible();
    expect(screen.getByText("Admin")).toBeVisible();
  });

  it("refuses to save a new password shorter than 12 characters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<UsersManager users={users} />);
    fireEvent.change(screen.getByLabelText("Mot de passe alice"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);
    expect(
      await screen.findByText(
        "Le nouveau mot de passe doit contenir au moins 12 caractères.",
      ),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a role change for an existing user", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<UsersManager users={users} />);
    fireEvent.change(screen.getByLabelText("Rôle alice"), {
      target: { value: "read_only" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/user-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ role: "read_only" });
    expect(await screen.findByText("Utilisateur enregistré")).toBeVisible();
  });

  it("shows each user's active status", () => {
    render(<UsersManager users={users} />);
    expect(screen.getByText("Actif")).toBeVisible();
    expect(screen.getByText("Désactivé")).toBeVisible();
  });

  it("deactivates an active user", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<UsersManager users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Désactiver" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/user-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ active: false });
    expect(await screen.findByText("Utilisateur désactivé")).toBeVisible();
  });

  it("reactivates a disabled user", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<UsersManager users={users} />);
    fireEvent.click(screen.getByRole("button", { name: "Activer" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ active: true });
    expect(await screen.findByText("Utilisateur activé")).toBeVisible();
  });

  it("deletes a user and surfaces a server failure", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }));
    render(<UsersManager users={users} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Supprimer" })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/users/user-1", {
        method: "DELETE",
      }),
    );
    expect(
      await screen.findByText("Impossible d’effectuer l’action"),
    ).toBeVisible();
  });
});
