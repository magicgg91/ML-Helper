import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { TrackingSettingsPanel } from "./tracking-settings-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Bloc 100/A: the field that decides whether a <script> is loaded on every
// page of the site — so what it does with a refusal matters as much as what it
// does with a save.
describe("TrackingSettingsPanel", () => {
  it("sends the typed URL and confirms it was stored", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ url: "https://stats.example.com/script.js" }),
          { status: 200 },
        ),
      );
    render(<TrackingSettingsPanel url="" />);
    fireEvent.change(screen.getByLabelText("URL du script de suivi"), {
      target: { value: "https://stats.example.com/script.js" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith(
      "/api/admin/config/tracking",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      url: "https://stats.example.com/script.js",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "URL de suivi enregistrée.",
    );
  });

  it("names a refused URL as a typo, not as a server failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_url" }), { status: 400 }),
    );
    render(<TrackingSettingsPanel url="" />);
    fireEvent.change(screen.getByLabelText("URL du script de suivi"), {
      target: { value: "pas-une-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Ce n'est pas une URL http(s) valide.",
    );
  });

  it("shows the stored URL, and says so when it is cleared", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "" }), { status: 200 }),
    );
    render(<TrackingSettingsPanel url="https://stats.example.com/script.js" />);
    const field = screen.getByLabelText("URL du script de suivi");
    expect(field).toHaveValue("https://stats.example.com/script.js");

    fireEvent.change(field, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Suivi désactivé",
    );
  });
});
