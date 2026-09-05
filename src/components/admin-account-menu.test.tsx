import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAccountMenu } from "./admin-account-menu";
import { renderWithIntl as render } from "../test/render-with-intl";

const signOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  signOut.mockReset();
});

describe("AdminAccountMenu", () => {
  it("changes the current password and exposes sign out", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(<AdminAccountMenu username="alice" totpEnabled={false} />);
    fireEvent.click(screen.getByText("alice"));
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), {
      target: { value: "old-password-value" },
    });
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "new-password-value" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(await screen.findByText("Mot de passe mis à jour.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
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
    render(<AdminAccountMenu username="alice" totpEnabled={false} />);
    fireEvent.click(screen.getByText("alice"));
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
});
