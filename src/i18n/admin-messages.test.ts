import { describe, expect, it } from "vitest";
import { getMessagesForLocale, mergeMessages } from "./config";

function translate(messages: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, messages);
}

async function translators() {
  const [enMessages, frMessages] = await Promise.all([
    getMessagesForLocale("en"),
    getMessagesForLocale("fr"),
  ]);
  return {
    en: (path: string) => translate(enMessages, path),
    fr: (path: string) => translate(frMessages, path),
  };
}

describe("admin page translations", () => {
  it("covers /admin dashboard", async () => {
    const { en, fr } = await translators();
    expect(en("admin.dashboard.title")).toBe("Dashboard");
    expect(fr("admin.dashboard.title")).toBe("Tableau de bord");
  });

  it("covers /admin/setup", async () => {
    const { en, fr } = await translators();
    expect(en("admin.setup.submit")).toBe("Create Super Admin");
    expect(fr("admin.setup.submit")).toBe("Créer le Super Admin");
  });

  it("covers /admin/guides", async () => {
    const { en, fr } = await translators();
    expect(en("admin.guides.columns.status")).toBe("Status");
    expect(fr("admin.guides.columns.status")).toBe("Statut");
  });

  it("covers /admin/guides/new", async () => {
    const { en, fr } = await translators();
    expect(en("admin.guides.new-title")).toBe("New guide");
    expect(fr("admin.guides.new-title")).toBe("Nouveau guide");
  });

  it("covers /admin/guides/[id]", async () => {
    const { en, fr } = await translators();
    expect(en("admin.guide-editor.submit-review")).toBe("Submit for review");
    expect(fr("admin.guide-editor.submit-review")).toBe("Soumettre en review");
  });

  it("covers the /admin/tools tools list", async () => {
    const { en, fr } = await translators();
    expect(en("admin.tools.title")).toBe("Tools");
    expect(fr("admin.tools.title")).toBe("Outils");
  });

  // Bloc 68 review (Codex): the Bloc 67 rename added its translated value
  // under the wrong namespace (admin.tools, never read by
  // EditReferentielPage) and left the key it actually consumes
  // (admin.referentiels.reference-level-up) untranslated — this exact
  // real-translation lookup is what would have caught it.
  it("covers the Progression reference editor heading (/admin/referentiels/reference-level-up)", async () => {
    const { fr } = await translators();
    expect(fr("admin.referentiels.reference-level-up")).toBe(
      "Éditer Progression",
    );
  });

  it("covers the existing ranking tool editor", async () => {
    const { en, fr } = await translators();
    expect(en("admin.ranking.save")).toBe("Save ranking");
    expect(fr("admin.ranking.save")).toBe("Enregistrer le classement");
  });

  it("covers /admin/users", async () => {
    const { en, fr } = await translators();
    expect(en("admin.users.create")).toBe("Create user");
    expect(fr("admin.users.create")).toBe("Créer l’utilisateur");
  });

  it("covers /admin/logs", async () => {
    const { en, fr } = await translators();
    expect(en("admin.logs.title")).toBe("Change history");
    expect(fr("admin.logs.title")).toBe("Historique des actions");
  });

  it("covers the admin login page", async () => {
    const { en, fr } = await translators();
    expect(en("login.submit")).toBe("Sign in");
    expect(fr("login.submit")).toBe("Se connecter");
  });

  it("covers reference editors integrated into /admin/guides", async () => {
    const { en, fr } = await translators();
    expect(en("admin.references.save")).toBe("Save entire table");
    expect(fr("admin.references.save")).toBe("Enregistrer toute la table");
  });

  it("covers the legal notice editor", async () => {
    const { en, fr } = await translators();
    expect(en("admin.content.title")).toBe("Legal notice");
    expect(fr("admin.content.title")).toBe("Mentions légales");
  });

  // CI fix: this used to assert on Navigation.admin, a key that happened to
  // be missing from fr.json — it would break the moment someone added the
  // French translation, even though the fallback mechanism itself would
  // still work. mergeMessages() with a hand-built gap tests the mechanism
  // without depending on today's translation coverage.
  it("falls back recursively to English for a key missing from a locale", () => {
    expect(
      mergeMessages(
        { Navigation: { admin: "Admin area" } },
        { Navigation: {} },
      ),
    ).toEqual({ Navigation: { admin: "Admin area" } });
  });
});
