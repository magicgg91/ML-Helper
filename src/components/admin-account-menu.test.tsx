import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
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
    render(<AdminAccountMenu username="alice" />);
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
});
