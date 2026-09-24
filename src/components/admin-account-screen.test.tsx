import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAccountScreen } from "./admin-account-screen";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Bloc 125 §2: the Mon compte screen", () => {
  it("changes the current password", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<AdminAccountScreen totpEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), {
      target: { value: "old-password-value" },
    });
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "new-password-value" },
    });
    fireEvent.change(
      screen.getByLabelText("Confirmation du nouveau mot de passe"),
      { target: { value: "new-password-value" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    // The same endpoint and the same body as the panel it replaces: only the
    // place the form sits in has changed.
    expect(request).toHaveBeenCalledWith(
      "/api/admin/profile/password",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(await screen.findByText("Mot de passe mis à jour.")).toBeVisible();
  });

  it("refuses a confirmation that does not match, without asking the server", async () => {
    const request = vi.spyOn(globalThis, "fetch");
    render(<AdminAccountScreen totpEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), {
      target: { value: "old-password-value" },
    });
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "new-password-value" },
    });
    fireEvent.change(
      screen.getByLabelText("Confirmation du nouveau mot de passe"),
      { target: { value: "new-password-typo" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText(
        "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
      ),
    ).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it("masks all three password boxes", () => {
    render(<AdminAccountScreen totpEnabled={false} />);
    for (const label of [
      "Mot de passe actuel",
      "Nouveau mot de passe",
      "Confirmation du nouveau mot de passe",
    ])
      expect(screen.getByLabelText(label)).toHaveAttribute("type", "password");
  });

  it("starts two-factor enrollment and confirms the one-time code", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            secret: "JBSWY3DPEHPK3PXP",
            qrCodeDataUrl: "data:image/png;base64,AA==",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<AdminAccountScreen totpEnabled={false} />);
    expect(screen.getByText("Désactivée")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Activer l’authentification à deux facteurs",
      }),
    );
    expect(
      await screen.findByAltText("QR code d’authentification à deux facteurs"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Code à 6 chiffres"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer l’activation" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText("Authentification à deux facteurs activée."),
    ).toBeVisible();
  });

  it("asks before turning two-factor authentication off", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<AdminAccountScreen totpEnabled />);
    expect(screen.getByText("Activée")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ton mot de passe"), {
      target: { value: "old-password-value" },
    });
    fireEvent.change(screen.getByLabelText("Code à 6 chiffres"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Désactiver l’authentification à deux facteurs",
      }),
    );
    // Nothing has left the browser yet — the dialog is the gate.
    expect(request).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Désactiver l’authentification à deux facteurs",
      })[1]!,
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith(
      "/api/admin/profile/totp",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(dialog).not.toBeInTheDocument();
    expect(
      await screen.findByText("Authentification à deux facteurs désactivée."),
    ).toBeVisible();
  });
});
