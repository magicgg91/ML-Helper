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
import { AdminLanguagesPanel, type LanguageRow } from "./admin-languages-panel";

// Bloc 136 : le panneau redemande l'écran après un changement, pour que le
// résumé de la section — calculé sur le serveur — suive.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(cleanup);

const messages = {
  admin: {
    common: { visible: "Visible", hidden: "Masqué" },
    config: {
      columns: { language: "Langue" },
      "columns-translated": "Guides traduits",
      "columns-public": "Sur le site public",
      "languages-section": "Langues",
      "always-active": "Toujours active",
      "no-guides": "Aucun guide",
      "visibility-of": "Visibilité de {language} sur le site public",
      active: "Active",
      inactive: "Inactive",
      saving: "Enregistrement…",
      "save-error": "Échec de l’enregistrement (HTTP {status}).",
      "state-saved": "{language} est maintenant {state}.",
      "server-error": "Impossible de joindre le serveur.",
      languages: { fr: "Français", en: "English", de: "Deutsch" },
    },
  },
};

const rows: LanguageRow[] = [
  { locale: "fr", active: true, locked: true, translated: 4, total: 4 },
  { locale: "en", active: true, locked: true, translated: 4, total: 4 },
  { locale: "de", active: true, locked: false, translated: 1, total: 4 },
  { locale: "es", active: false, locked: false, translated: 0, total: 4 },
];

function renderPanel() {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminLanguagesPanel rows={rows} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
});

describe("Bloc 119: the language table", () => {
  it("names each language and shows its code in mono", () => {
    renderPanel();
    const row = screen.getByRole("row", { name: /Deutsch/ });
    expect(within(row).getByText("DE")).toHaveClass("font-admin-mono");
  });

  it("falls back to the code for a language nobody has named yet", () => {
    // Bloc 120: a sixth language is a messages/*.json file away; the table
    // must not throw before somebody translates its name.
    renderPanel();
    expect(screen.getByRole("row", { name: /ES/ })).toBeInTheDocument();
  });

  it("says how many guides are translated, and colours the answer", () => {
    renderPanel();
    // Complete, partial, none: three different things to know before
    // turning a language on.
    const complete = screen.getByRole("row", { name: /Français/ });
    expect(within(complete).getByText("4 / 4")).toHaveClass("bg-admin-ok");
    const partial = screen.getByRole("row", { name: /Deutsch/ });
    expect(within(partial).getByText("1 / 4")).toHaveClass("bg-admin-warn");
    const none = screen.getByRole("row", { name: /ES/ });
    expect(within(none).getByText("0 / 4")).toHaveClass("bg-admin-neutral");
  });

  it("locks the two base languages behind a padlock, not a dead switch", () => {
    // Bloc 90 guardrail D: EN and FR are never deactivatable, and the API
    // refuses it too.
    renderPanel();
    for (const locale of ["fr", "en"]) {
      expect(screen.getByTestId(`locale-locked-${locale}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`locale-toggle-${locale}`)).toBeNull();
    }
    expect(screen.getAllByText("Toujours active")).toHaveLength(2);
  });

  it("switches a language off through the same endpoint as before", async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("locale-toggle-de"));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/config/locales",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ locale: "de", active: false }),
        }),
      ),
    );
    expect(
      await screen.findByText("Deutsch est maintenant inactive."),
    ).toBeInTheDocument();
  });

  it("leaves the row alone when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderPanel();
    const control = screen.getByTestId("locale-toggle-de");
    fireEvent.click(control);
    expect(
      await screen.findByText("Échec de l’enregistrement (HTTP 403)."),
    ).toBeInTheDocument();
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  /**
   * Bloc 136, revue Codex (PR #156) : le résumé « n actives sur 5 » de la
   * section repliable est calculé sur le serveur. Sans cette demande, il
   * restait sur son ancien compte jusqu'au prochain chargement complet —
   * c'est-à-dire qu'une section repliée mentait sur son état.
   */
  it("redemande l'écran après un changement accepté", async () => {
    refresh.mockClear();
    renderPanel();
    fireEvent.click(screen.getByTestId("locale-toggle-de"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("ne le redemande pas quand le serveur refuse", async () => {
    refresh.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderPanel();
    fireEvent.click(screen.getByTestId("locale-toggle-de"));
    expect(
      await screen.findByText("Échec de l’enregistrement (HTTP 403)."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
