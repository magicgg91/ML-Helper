import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminReferencesList,
  type AdminReferenceRow,
} from "./admin-references-list";

afterEach(cleanup);

const messages = {
  admin: {
    common: {
      visible: "Visible",
      hidden: "Masqué",
      "read-only": "Lecture seule",
    },
    referentiels: {
      columns: { title: "Titre", actions: "Actions" },
      "search-label": "Rechercher un référentiel",
      "search-placeholder": "Nom du référentiel…",
      "table-caption": "Référentiels du site",
      "columns-used-by": "Utilisé par l’outil",
      "columns-visible": "Visible sur le site",
      "used-by-none": "—",
      "visibility-of": "Visibilité de {reference}",
      modify: "Modifier",
      "no-results": "Aucun référentiel.",
      "visibility-error": "Impossible de modifier la visibilité.",
      enabled: "Référentiel activé.",
      disabled: "Référentiel désactivé.",
    },
  },
};

const rows: AdminReferenceRow[] = [
  {
    id: "combat-equipment",
    title: "Équipements de Combat",
    active: true,
    editHref: "/admin/referentiels/reference-combat-equipment",
    usedBy: "Équipement de Combat",
  },
  {
    id: "events",
    title: "Événements",
    active: false,
    editHref: "/admin/referentiels/reference-events",
    usedBy: null,
  },
];

function list(canWrite = true, listRows = rows) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminReferencesList rows={listRows} canWrite={canWrite} />
    </NextIntlClientProvider>
  );
}

function renderList(canWrite = true) {
  return render(list(canWrite));
}

describe("Bloc 119: the Référentiels table", () => {
  // Bloc 128: the titles and the order they are in are resolved on the
  // server, in the admin's own language. The language switch refreshes the
  // page without reloading it, so the table has to take what comes back.
  it("takes the rows the server re-renders, so a language change lands", () => {
    const { rerender } = renderList();
    expect(screen.getByText("Événements")).toBeInTheDocument();
    rerender(
      list(
        true,
        rows.map((row) =>
          row.id === "events" ? { ...row, title: "Events" } : row,
        ),
      ),
    );
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.queryByText("Événements")).toBeNull();
  });

  it("links a reference to the tool that reads it", () => {
    renderList();
    expect(
      screen.getByRole("link", { name: "Équipement de Combat" }),
    ).toHaveAttribute("href", "/admin/tools");
  });

  it("marks a free-standing reference rather than leaving the cell empty", () => {
    renderList();
    const row = screen.getByRole("row", { name: /Événements/ });
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).queryByRole("link", { name: /outil/ })).toBeNull();
  });

  it("offers Modifier on every row, or says why not", () => {
    renderList();
    expect(screen.getAllByRole("link", { name: "Modifier" })).toHaveLength(2);
    cleanup();
    renderList(false);
    expect(screen.queryByRole("link", { name: "Modifier" })).toBeNull();
    expect(screen.getAllByText("Lecture seule")).toHaveLength(2);
  });

  it("searches on the displayed title", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "événem" },
    });
    const table = screen.getByRole("table");
    expect(within(table).getByText("Événements")).toBeInTheDocument();
    expect(within(table).queryByText("Équipements de Combat")).toBeNull();
  });

  it("says so when the search matches nothing", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("Aucun référentiel.")).toBeInTheDocument();
  });
});

describe("Bloc 119: the Référentiels visibility switch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  it("calls the endpoint the ⏻ button called, keyed by the slug", async () => {
    renderList();
    fireEvent.click(
      screen.getByRole("switch", { name: "Visibilité de Événements" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/guides/references/events/active",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ active: true }),
      }),
    );
    expect(await screen.findByText("Référentiel activé.")).toBeInTheDocument();
  });

  it("leaves the row alone when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderList();
    const control = screen.getByRole("switch", {
      name: "Visibilité de Équipements de Combat",
    });
    fireEvent.click(control);
    expect(
      await screen.findByText("Impossible de modifier la visibilité."),
    ).toBeInTheDocument();
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("is disabled for a role that may not write", () => {
    renderList(false);
    expect(
      screen.getByRole("switch", { name: "Visibilité de Événements" }),
    ).toBeDisabled();
  });
});
