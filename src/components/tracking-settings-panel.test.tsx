import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { TrackingSettingsPanel } from "./tracking-settings-panel";

// Bloc 136 : le panneau redemande l'écran après un enregistrement, pour
// que le résumé de la section — calculé sur le serveur — suive.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Bloc 100/A: the field that decides whether a <script> is loaded on every
// page of the site — so what it does with a refusal matters as much as what it
// does with a save.
describe("TrackingSettingsPanel", () => {
  it("sends the typed URL and confirms it was stored", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://stats.example.com/script.js",
          websiteId: "",
        }),
        { status: 200 },
      ),
    );
    render(<TrackingSettingsPanel url="" websiteId="" />);
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
      websiteId: "",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "URL de suivi enregistrée.",
    );
    // Bloc 136, revue Codex (PR #156) : la pastille « Script actif » de la
    // section vient du serveur, et mentirait sans cette demande.
    expect(refresh).toHaveBeenCalled();
  });

  it("names a refused URL as a typo, not as a server failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_url" }), { status: 400 }),
    );
    render(<TrackingSettingsPanel url="" websiteId="" />);
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
      new Response(JSON.stringify({ url: "", websiteId: "" }), { status: 200 }),
    );
    render(
      <TrackingSettingsPanel
        url="https://stats.example.com/script.js"
        websiteId=""
      />,
    );
    const field = screen.getByLabelText("URL du script de suivi");
    expect(field).toHaveValue("https://stats.example.com/script.js");

    fireEvent.change(field, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Suivi désactivé",
    );
  });

  // Bloc 101: the identifier the tag carries next to its src. Optional, so the
  // panel must send it alongside the URL without making it a second gate.
  it("sends the site identifier along with the URL", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://stats.example.com/script.js",
          websiteId: "25931871-50b0-4123-a327-09f9c60cff18",
        }),
        { status: 200 },
      ),
    );
    render(<TrackingSettingsPanel url="" websiteId="" />);
    fireEvent.change(screen.getByLabelText("URL du script de suivi"), {
      target: { value: "https://stats.example.com/script.js" },
    });
    fireEvent.change(screen.getByLabelText("Identifiant du site"), {
      target: { value: "25931871-50b0-4123-a327-09f9c60cff18" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      url: "https://stats.example.com/script.js",
      websiteId: "25931871-50b0-4123-a327-09f9c60cff18",
    });
  });

  it("shows the stored identifier, and names a refused one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_website_id" }), {
        status: 400,
      }),
    );
    render(
      <TrackingSettingsPanel
        url="https://stats.example.com/script.js"
        websiteId="abc-123"
      />,
    );
    expect(screen.getByLabelText("Identifiant du site")).toHaveValue("abc-123");

    fireEvent.change(screen.getByLabelText("Identifiant du site"), {
      target: { value: '"><script>' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    // The URL is fine here: the message must point at the identifier, not
    // send the admin looking at the wrong field.
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cet identifiant contient des caractères",
    );
  });
});
