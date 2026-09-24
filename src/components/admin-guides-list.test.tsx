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
import { AdminGuidesList, type AdminGuideRow } from "./admin-guides-list";

afterEach(cleanup);

const messages = {
  admin: {
    common: {
      "read-only": "Lecture seule",
      cancel: "Annuler",
      confirm: "Confirmer",
    },
    guides: {
      columns: { status: "Statut", actions: "Actions" },
      statuses: {
        draft: "Brouillon",
        pending_review: "En review",
        published: "Publié",
      },
      "search-label": "Rechercher un guide",
      "search-placeholder": "Titre du guide…",
      "filter-label": "Statut",
      "filter-all": "Tous",
      "filter-published": "Publiés",
      "filter-drafts": "Brouillons",
      "filter-missing": "Traduction manquante",
      "table-caption": "Guides du site",
      "columns-guide": "Guide",
      "columns-translations": "Traductions",
      "columns-modified": "Modifié",
      byline: "{author} · créé le {date}",
      "translation-edit": "Modifier la version {language} de {title}",
      "translation-create": "Créer la version {language} de {title}",
      "translation-written": "{language} : version écrite",
      "translation-missing": "{language} : pas encore traduit",
      legend: "Puce pleine : version rédigée.",
      modify: "Modifier",
      "more-actions": "Autres actions pour {title}",
      "view-on-site": "Voir sur le site",
      publish: "Publier",
      unpublish: "Repasser en brouillon",
      delete: "Supprimer",
      "delete-confirm-title": "Supprimer ce guide ?",
      "delete-confirm-body": "« {title} » sera supprimé définitivement.",
      "delete-forbidden": "Ton rôle ne permet pas de supprimer ce guide.",
      deleted: "Guide supprimé définitivement.",
      "status-label": "Statut de {title}",
      "status-forbidden": "Ton rôle ne permet pas ce changement de statut.",
      "status-saved": "Statut enregistré.",
      empty: "Aucun guide créé.",
      "no-results": "Aucun résultat pour ce filtre.",
    },
  },
};

const languageNames = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
};

const rows: AdminGuideRow[] = [
  {
    id: "g1",
    slug: "debuter",
    title: "Bien débuter",
    author: "claire",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-22T18:04:00.000Z",
    status: "published",
    translations: { fr: true, en: true, de: false, es: false, tr: false },
  },
  {
    id: "g2",
    slug: "clans",
    title: "Les clans",
    author: "rootadmin",
    createdAt: "2026-08-15T08:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
    status: "draft",
    translations: { fr: true, en: true, de: true, es: true, tr: true },
  },
];

function renderList(
  props: Partial<Parameters<typeof AdminGuidesList>[0]> = {},
) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdminGuidesList
        rows={rows}
        languageNames={languageNames}
        canWrite
        canPublish
        canDelete
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("Bloc 119: the Guides table", () => {
  it("links the title to its editor and says who wrote it, and when", () => {
    renderList();
    expect(screen.getByRole("link", { name: "Bien débuter" })).toHaveAttribute(
      "href",
      "/admin/guides/g1",
    );
    // Europe/Paris, in the admin's language.
    expect(screen.getByText("claire · créé le 01/09/2026")).toBeInTheDocument();
  });

  it("shows the last change as a short date", () => {
    renderList();
    expect(screen.getByText("22 sept.")).toBeInTheDocument();
  });

  it("gives every language a chip that opens the editor on it", () => {
    renderList();
    // Written: the chip edits that version.
    expect(
      screen.getByRole("link", {
        name: "Modifier la version Français de Bien débuter",
      }),
    ).toHaveAttribute("href", "/admin/guides/g1?lang=fr");
    // Missing: the chip is the way to create it, not a grey label.
    expect(
      screen.getByRole("link", {
        name: "Créer la version Deutsch de Bien débuter",
      }),
    ).toHaveAttribute("href", "/admin/guides/g1?lang=de");
  });

  it("carries the legend the chips need", () => {
    renderList();
    expect(
      screen.getByText("Puce pleine : version rédigée."),
    ).toBeInTheDocument();
  });
});

describe("Bloc 119: the single status control", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  it("offers the three states of the editorial workflow", () => {
    renderList();
    const control = screen.getByRole("combobox", {
      name: "Statut de Bien débuter",
    });
    expect(
      within(control)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Brouillon", "En review", "Publié"]);
  });

  it("keeps Publié out of reach of a role that may not publish", () => {
    // Bloc 50: a Gestion Guides account writes and submits; publishing is a
    // publisher's action, and the option is not offered at all.
    renderList({ canPublish: false });
    const draftRow = screen.getByRole("combobox", {
      name: "Statut de Les clans",
    });
    expect(
      within(draftRow)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Brouillon", "En review"]);
    // …but a guide that is already published still reads as published.
    expect(
      within(screen.getByRole("combobox", { name: "Statut de Bien débuter" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toContain("Publié");
  });

  it("saves a change through the status endpoint", async () => {
    renderList();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Statut de Les clans" }),
      { target: { value: "published" } },
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/guides/g2/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "published" }),
      }),
    );
    expect(await screen.findByText("Statut enregistré.")).toBeInTheDocument();
  });

  it("says so when the server refuses the change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    renderList();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Statut de Les clans" }),
      { target: { value: "published" } },
    );
    expect(
      await screen.findByText(
        "Ton rôle ne permet pas ce changement de statut.",
      ),
    ).toBeInTheDocument();
  });

  it("is disabled for a role that may not write", () => {
    renderList({ canWrite: false });
    expect(
      screen.getByRole("combobox", { name: "Statut de Les clans" }),
    ).toBeDisabled();
  });
});

describe("Bloc 119: the row's secondary actions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  const openMenu = (title: string) =>
    fireEvent.click(
      screen.getByRole("button", { name: `Autres actions pour ${title}` }),
    );

  it("offers the public page, the status change and the deletion", () => {
    renderList();
    openMenu("Bien débuter");
    expect(
      screen.getByRole("menuitem", { name: "Voir sur le site" }),
    ).toHaveAttribute("href", "/guides/debuter");
    // Published, so the menu offers the way back to draft.
    expect(
      screen.getByRole("menuitem", { name: "Repasser en brouillon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Supprimer…" }),
    ).toBeInTheDocument();
  });

  it("offers Publier on a guide that is not published", () => {
    renderList();
    openMenu("Les clans");
    expect(
      screen.getByRole("menuitem", { name: "Publier" }),
    ).toBeInTheDocument();
  });

  it("deletes only after the dialog is confirmed", async () => {
    // Bloc 119: the full-width red button in the row is gone; deletion goes
    // through a dialog that names the guide.
    renderList();
    openMenu("Les clans");
    fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer…" }));
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce guide ?",
    });
    expect(
      within(dialog).getByText("« Les clans » sera supprimé définitivement."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/admin/guides/g2", {
        method: "DELETE",
      }),
    );
    expect(
      await screen.findByText("Guide supprimé définitivement."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Les clans")).toBeNull();
  });

  it("leaves the guide alone when the dialog is cancelled", () => {
    renderList();
    openMenu("Les clans");
    fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer…" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hides the deletion from a role that may not delete", () => {
    renderList({ canDelete: false });
    openMenu("Les clans");
    expect(screen.queryByRole("menuitem", { name: "Supprimer…" })).toBeNull();
  });

  it("explains the empty action column to a read-only role", () => {
    renderList({ canWrite: false });
    expect(screen.queryByRole("link", { name: "Modifier" })).toBeNull();
    expect(screen.getAllByText("Lecture seule")).toHaveLength(2);
  });
});

describe("Bloc 119: filtering the guides", () => {
  it("separates the published from the rest", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: "Publiés 1" }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Bien débuter")).toBeInTheDocument();
    expect(within(table).queryByText("Les clans")).toBeNull();
  });

  it("finds the guides that are missing a translation", () => {
    renderList();
    fireEvent.click(
      screen.getByRole("button", { name: "Traduction manquante 1" }),
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("Bien débuter")).toBeInTheDocument();
    expect(within(table).queryByText("Les clans")).toBeNull();
  });

  it("searches on the title", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "clans" },
    });
    expect(screen.getByRole("button", { name: "Tous 1" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).queryByText("Bien débuter"),
    ).toBeNull();
  });

  it("tells an empty table from an empty filter", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Aucun résultat pour ce filtre."),
    ).toBeInTheDocument();
    cleanup();
    renderList({ rows: [] });
    expect(screen.getByText("Aucun guide créé.")).toBeInTheDocument();
  });
});

describe("Codex review (PR #148): a read-only reader gets no editor links", () => {
  it("shows the title as text, not a link to a page they cannot open", () => {
    renderList({ canWrite: false });
    expect(screen.getByText("Bien débuter")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bien débuter" })).toBeNull();
  });

  it("keeps the translation chips, and says what they mean, without linking them", () => {
    renderList({ canWrite: false });
    // The column still answers which languages are written — the chip just
    // stops being a way in.
    expect(screen.getAllByText("fr").length).toBe(rows.length);
    expect(
      screen.queryByRole("link", {
        name: "Créer la version Deutsch de Bien débuter",
      }),
    ).toBeNull();
    expect(
      screen.getByTitle("Deutsch : pas encore traduit"),
    ).toBeInTheDocument();
  });

  it("still links both for somebody who may edit", () => {
    renderList();
    expect(screen.getByRole("link", { name: "Bien débuter" })).toHaveAttribute(
      "href",
      "/admin/guides/g1",
    );
    expect(
      screen.getByRole("link", {
        name: "Créer la version Deutsch de Bien débuter",
      }),
    ).toHaveAttribute("href", "/admin/guides/g1?lang=de");
  });
});
