import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersList, type AdminUserRow } from "./admin-users-list";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(cleanup);

const messages = {
  admin: {
    common: {
      "read-only": "Lecture seule",
      cancel: "Annuler",
      confirm: "Confirmer",
      close: "Fermer",
      visible: "Actif",
      hidden: "Désactivé",
    },
    users: {
      title: "Utilisateurs",
      create: "Créer l’utilisateur",
      username: "Identifiant",
      password: "Mot de passe",
      role: "Rôle",
      delete: "Supprimer",
      created: "Utilisateur créé",
      saved: "Utilisateur enregistré",
      "password-too-short":
        "Le nouveau mot de passe doit contenir au moins 12 caractères.",
      error: "Impossible d’effectuer l’action",
      "server-error": "Serveur indisponible",
      activate: "Activer",
      deactivate: "Désactiver",
      activated: "Utilisateur activé",
      deactivated: "Utilisateur désactivé",
      new: "Nouvel utilisateur",
      "new-panel-description": "Le compte est actif dès sa création.",
      generate: "Générer",
      generated: "Mot de passe généré",
      "password-hint": "12 caractères au minimum.",
      "table-caption": "Comptes d’administration",
      "columns-user": "Utilisateur",
      "columns-role": "Rôle",
      "columns-status": "Statut",
      "columns-actions": "Actions",
      you: "(toi)",
      "visibility-of": "Statut de {username}",
      "change-password": "Mot de passe",
      "change-password-title": "Changer le mot de passe de {username}",
      "change-password-confirm": "Changer le mot de passe",
      "more-actions": "Autres actions pour {username}",
      "delete-title": "Supprimer ce compte ?",
      "delete-body": "Le compte « {username} » sera supprimé définitivement.",
      deleted: "Utilisateur supprimé",
      "self-protected": "Tu ne peux pas modifier ton propre compte ici.",
      "no-results": "Aucun utilisateur.",
    },
  },
  roles: {
    super_admin: "Super Admin",
    admin: "Admin",
    guides_manager: "Gestion Guides",
    references_manager: "Référentiels",
    tools_manager: "Gestion Outils",
    read_only: "Lecture Seule",
  },
};

const roleDescriptions = {
  super_admin: "Peut modifier : Outils, Utilisateurs.",
  admin: "Peut modifier : Outils. Consulte : Utilisateurs.",
  guides_manager: "Peut modifier : Guides.",
  references_manager: "Peut modifier : Référentiels.",
  tools_manager: "Peut modifier : Outils.",
  read_only: "Lecture seule : Outils, Guides.",
};

const rows: AdminUserRow[] = [
  { id: "self", username: "rootadmin", role: "super_admin", active: true },
  { id: "u2", username: "claire", role: "guides_manager", active: true },
  { id: "u3", username: "marc", role: "read_only", active: false },
];

function renderList(props: Partial<Parameters<typeof AdminUsersList>[0]> = {}) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminUsersList
        rows={rows}
        currentUserId="self"
        roleDescriptions={roleDescriptions}
        canManage
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  refresh.mockReset();
});

describe("Bloc 119: the Users table", () => {
  it("marks the signed-in account", () => {
    renderList();
    const own = screen.getByRole("row", { name: /rootadmin/ });
    expect(within(own).getByText("(toi)")).toBeInTheDocument();
  });

  it("protects the signed-in account from itself", () => {
    // The server refuses all three (services/users.ts); the row says so
    // before anyone tries.
    renderList();
    const own = screen.getByRole("row", { name: /rootadmin/ });
    expect(
      within(own).getByRole("switch", { name: "Statut de rootadmin" }),
    ).toBeDisabled();
    // No role control at all on one's own row — the pill instead.
    expect(within(own).queryByRole("combobox")).toBeNull();
    expect(within(own).getByText("Super Admin")).toBeInTheDocument();
    fireEvent.click(
      within(own).getByRole("button", {
        name: "Autres actions pour rootadmin",
      }),
    );
    expect(screen.getByRole("menuitem", { name: "Désactiver" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Supprimer…" })).toBeDisabled();
  });

  it("lets a Super Admin change somebody else's role", async () => {
    renderList();
    const row = screen.getByRole("row", { name: /claire/ });
    fireEvent.change(within(row).getByRole("combobox"), {
      target: { value: "admin" },
    });
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/users/u2",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "admin" }),
        }),
      ),
    );
  });

  it("turns an account off and on from the switch", async () => {
    renderList();
    fireEvent.click(screen.getByRole("switch", { name: "Statut de marc" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/users/u3",
        expect.objectContaining({ body: JSON.stringify({ active: true }) }),
      ),
    );
    expect(await screen.findByText("Utilisateur activé")).toBeInTheDocument();
  });

  it("shows read-only roles no controls at all", () => {
    renderList({ canManage: false });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Nouvel utilisateur" }),
    ).toBeNull();
    expect(
      screen.getAllByText("Tu ne peux pas modifier ton propre compte ici."),
    ).toHaveLength(3);
  });
});

describe("Bloc 119: creating a user", () => {
  const openPanel = () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: "Nouvel utilisateur" }));
    return screen.getByRole("dialog", { name: "Nouvel utilisateur" });
  };

  it("opens a side panel with the six roles and what each one does", () => {
    const panel = openPanel();
    for (const label of [
      "Super Admin",
      "Admin",
      "Gestion Guides",
      "Référentiels",
      "Gestion Outils",
      "Lecture Seule",
    ])
      // Anchored: the name starts with the role's label and continues with
      // its description, and "Admin" is a prefix of nothing but itself here.
      expect(
        within(panel).getByRole("radio", { name: new RegExp(`^${label}`) }),
      ).toBeInTheDocument();
    // The description is computed from the matrix, and says what separates
    // an Admin from a Super Admin.
    expect(
      within(panel).getByText(
        "Peut modifier : Outils. Consulte : Utilisateurs.",
      ),
    ).toBeInTheDocument();
  });

  it("preselects Lecture seule", () => {
    const panel = openPanel();
    expect(
      within(panel).getByRole("radio", { name: /Lecture Seule/ }),
    ).toBeChecked();
  });

  it("generates a password long enough for the server's policy", () => {
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("button", { name: "Générer" }));
    const field = within(panel).getByLabelText(
      "Mot de passe",
    ) as HTMLInputElement;
    expect(field.value.length).toBeGreaterThanOrEqual(12);
    // Drawn in the browser, from the platform CSPRNG: the server is never
    // asked for a password (Bloc 119 §4).
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a password shorter than the policy without calling the server", () => {
    const panel = openPanel();
    fireEvent.change(within(panel).getByLabelText("Identifiant"), {
      target: { value: "nouveau" },
    });
    fireEvent.change(within(panel).getByLabelText("Mot de passe"), {
      target: { value: "court" },
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Créer l’utilisateur" }),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Le nouveau mot de passe doit contenir au moins 12 caractères.",
      ),
    ).toBeInTheDocument();
  });

  it("puts the new account in the table, not only in the database", async () => {
    // Regression (caught in e2e): this list holds its rows in state, so a
    // router.refresh() alone updated the sidebar's counter and left the
    // table one row behind.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: "u9",
          username: "nouveau",
          role: "guides_manager",
        }),
      }),
    );
    const panel = openPanel();
    fireEvent.change(within(panel).getByLabelText("Identifiant"), {
      target: { value: "nouveau" },
    });
    fireEvent.change(within(panel).getByLabelText("Mot de passe"), {
      target: { value: "un-mot-de-passe-assez-long" },
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Créer l’utilisateur" }),
    );
    expect(await screen.findByText("Utilisateur créé")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /nouveau/ })).toBeInTheDocument();
  });

  it("creates the account and asks the screen for its data again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: "u9",
          username: "nouveau",
          role: "guides_manager",
        }),
      }),
    );
    const panel = openPanel();
    fireEvent.change(within(panel).getByLabelText("Identifiant"), {
      target: { value: "nouveau" },
    });
    fireEvent.change(within(panel).getByLabelText("Mot de passe"), {
      target: { value: "un-mot-de-passe-assez-long" },
    });
    fireEvent.click(
      within(panel).getByRole("radio", { name: /Gestion Guides/ }),
    );
    fireEvent.click(
      within(panel).getByRole("button", { name: "Créer l’utilisateur" }),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "nouveau",
            password: "un-mot-de-passe-assez-long",
            role: "guides_manager",
          }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

describe("Bloc 119: the password and the deletion", () => {
  it("changes a password from the row, in a panel of its own", async () => {
    renderList();
    const row = screen.getByRole("row", { name: /claire/ });
    fireEvent.click(within(row).getByRole("button", { name: "Mot de passe" }));
    const panel = screen.getByRole("dialog", {
      name: "Changer le mot de passe de claire",
    });
    fireEvent.change(within(panel).getByLabelText("Mot de passe"), {
      target: { value: "un-autre-mot-de-passe" },
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Changer le mot de passe" }),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/users/u2",
        expect.objectContaining({
          body: JSON.stringify({ password: "un-autre-mot-de-passe" }),
        }),
      ),
    );
  });

  it("deletes only through the dialog", async () => {
    renderList();
    fireEvent.click(
      screen.getByRole("button", { name: "Autres actions pour claire" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer…" }));
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce compte ?",
    });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/admin/users/u2", {
        method: "DELETE",
      }),
    );
    expect(await screen.findByText("Utilisateur supprimé")).toBeInTheDocument();
  });
});
