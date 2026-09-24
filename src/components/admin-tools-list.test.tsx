import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminToolsList, type AdminToolRow } from "./admin-tools-list";

afterEach(cleanup);

const messages = {
  admin: {
    common: {
      visible: "Visible",
      hidden: "Masqué",
      "read-only": "Lecture seule",
    },
    tools: {
      columns: { tool: "Outil", action: "Action" },
      "category-values": {
        villes: "Villes",
        combat: "Combat",
        classement: "Classement",
        competences: "Compétences",
      },
      "search-label": "Rechercher un outil",
      "search-placeholder": "Nom de l’outil…",
      "filter-label": "Catégorie",
      "filter-all": "Toutes",
      "table-caption": "Outils du site",
      "columns-source": "Source des paramètres",
      "columns-visible": "Visible sur le site",
      "source-own": "Paramètres de l’outil",
      "source-shared": "Paramètres partagés par {count} outils",
      "source-reference": "Référentiel {name}",
      "source-none": "Aucun paramètre",
      edit: "Modifier",
      open: "Ouvrir",
      "nothing-to-edit": "Rien à modifier",
      "visibility-of": "Visibilité de {tool}",
      "no-results": "Aucun outil ne correspond à cette recherche.",
      active: "Actif",
      inactive: "Inactif",
      saving: "Enregistrement…",
      "save-error": "Échec de l’enregistrement (HTTP {status}).",
      "state-saved": "{tool} est maintenant {state}.",
      "server-error": "Impossible de joindre le serveur.",
    },
  },
};

const rows: AdminToolRow[] = [
  {
    id: "1",
    slug: "city-cost",
    label: "Coût de Ville",
    category: "villes",
    active: true,
    source: {
      kind: "shared",
      href: "/admin/tools/city-parameters",
      sharedCount: 3,
    },
    description: { fr: "Ce que coûte une ville." },
  },
  {
    id: "2",
    slug: "city-rewards",
    label: "Récompenses de Production",
    category: "villes",
    active: true,
    source: { kind: "none" },
    description: {},
  },
  {
    id: "3",
    slug: "ranking",
    label: "Classement",
    category: "classement",
    active: false,
    source: { kind: "own", href: "/admin/tools/ranking" },
    description: {},
  },
  {
    id: "4",
    slug: "stuff-simulator",
    label: "Équipement de Combat",
    category: "competences",
    active: true,
    source: {
      kind: "reference",
      href: "/admin/referentiels/reference-combat-equipment",
      referenceLabel: "Équipements de Combat",
    },
    description: {},
  },
];

function list(props: Partial<Parameters<typeof AdminToolsList>[0]> = {}) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminToolsList
        rows={rows}
        canEdit
        canToggle
        canOpenReferences
        {...props}
      />
    </NextIntlClientProvider>
  );
}

function renderList(props: Partial<Parameters<typeof AdminToolsList>[0]> = {}) {
  return render(list(props));
}

describe("Bloc 119: the Outils table", () => {
  // Bloc 128: the tool names and the order they are in are both resolved on
  // the server, in the admin's own language. The language switch refreshes
  // the page without reloading it, so the table has to take what comes back —
  // before this, it kept the French names under an English page until
  // somebody reloaded by hand.
  it("takes the rows the server re-renders, so a language change lands", () => {
    const { rerender } = renderList();
    expect(screen.getByText("Récompenses de Production")).toBeInTheDocument();
    rerender(
      list({
        rows: rows.map((row) =>
          row.id === "2" ? { ...row, label: "Production Rewards" } : row,
        ),
      }),
    );
    expect(screen.getByText("Production Rewards")).toBeInTheDocument();
    expect(screen.queryByText("Récompenses de Production")).toBeNull();
  });

  it("groups the rows by category, with a count per group", () => {
    renderList();
    expect(
      screen.getByRole("columnheader", { name: "Villes 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Classement 1" }),
    ).toBeInTheDocument();
  });

  it("names the source of every row, including the ones with none", () => {
    renderList();
    expect(
      screen.getByText("Paramètres partagés par 3 outils"),
    ).toBeInTheDocument();
    expect(screen.getByText("Paramètres de l’outil")).toBeInTheDocument();
    expect(screen.getByText("Aucun paramètre")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Référentiel Équipements de Combat" }),
    ).toHaveAttribute("href", "/admin/referentiels/reference-combat-equipment");
  });

  it("offers Modifier, Ouvrir, or the reason there is neither", () => {
    renderList();
    expect(screen.getAllByRole("link", { name: "Modifier" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ouvrir" })).toHaveAttribute(
      "href",
      "/admin/referentiels/reference-combat-equipment",
    );
    // §2: never a hole — the row that cannot be edited says why.
    expect(screen.getByText("Rien à modifier")).toBeInTheDocument();
  });

  it("explains the empty action column to a read-only role", () => {
    renderList({ canEdit: false, canOpenReferences: false });
    expect(screen.queryByRole("link", { name: "Modifier" })).toBeNull();
    expect(screen.getAllByText("Lecture seule")).toHaveLength(3);
    expect(screen.getByText("Rien à modifier")).toBeInTheDocument();
    // …and the reference chip stops being a link it cannot follow.
    expect(screen.queryByRole("link", { name: /Référentiel/ })).toBeNull();
  });
});

describe("Bloc 119: filtering the Outils table", () => {
  it("keeps only the chosen category", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /Classement/ }));
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("cell", { name: "Classement" }),
    ).toBeInTheDocument();
    expect(within(table).queryByText("Coût de Ville")).toBeNull();
  });

  it("searches on the displayed name", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ville" },
    });
    expect(screen.getByText("Coût de Ville")).toBeInTheDocument();
    expect(screen.queryByText("Équipement de Combat")).toBeNull();
  });

  it("counts on the chips what clicking them would leave", () => {
    // A chip saying "Villes 2" that yields nothing once clicked is a lie:
    // the counts follow the search box.
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ville" },
    });
    expect(
      screen.getByRole("button", { name: "Villes 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Compétences 0" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Toutes 1" }),
    ).toBeInTheDocument();
  });

  it("says so when nothing matches", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Aucun outil ne correspond à cette recherche."),
    ).toBeInTheDocument();
  });
});

describe("Bloc 119: the visibility switch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  it("calls the same endpoint the ⏻ button called, with the new state", async () => {
    renderList();
    const control = screen.getByRole("switch", {
      name: "Visibilité de Coût de Ville",
    });
    expect(control).toHaveAttribute("aria-checked", "true");
    fireEvent.click(control);
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/tools/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      }),
    );
    expect(
      await screen.findByText("Coût de Ville est maintenant inactif."),
    ).toBeInTheDocument();
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("keeps the row as it was when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderList();
    const control = screen.getByRole("switch", {
      name: "Visibilité de Classement",
    });
    fireEvent.click(control);
    expect(
      await screen.findByText("Échec de l’enregistrement (HTTP 403)."),
    ).toBeInTheDocument();
    // Not flipped optimistically: what is on screen is what the server has.
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("is disabled for a role that may not toggle", () => {
    renderList({ canToggle: false });
    expect(
      screen.getByRole("switch", { name: "Visibilité de Classement" }),
    ).toBeDisabled();
  });
});
