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
  // EditReferentielPage) and left the key it actually consumes untranslated —
  // this exact real-translation lookup is what would have caught it.
  // Bloc 125 §8: the screen is named after the reference, with the name the
  // Référentiels table already shows, so that key is the one to check.
  it("covers the Progression reference editor heading (/admin/referentiels/reference-level-up)", async () => {
    const { en, fr } = await translators();
    expect(fr("admin.referentiels.references.level-up")).toBe("Progression");
    expect(en("admin.referentiels.references.level-up")).toBe("Level Up");
  });

  /**
   * Bloc 135, recoupé au Bloc 137 : le vocabulaire suit la découpe des écrans.
   *
   * `admin.leagues` est celui de la section de Configuration — la liste des
   * échelons. `admin.ranking` est revenu pour l'écran de l'outil — les plages de
   * fin de saison. Les deux existent, et chacun ne dit que ce que son écran
   * montre : c'est ce que ces deux cas épinglent.
   */
  it("covers the leagues and divisions section (/admin/config)", async () => {
    const { en, fr } = await translators();
    expect(en("admin.leagues.section")).toBe("Leagues and divisions");
    expect(fr("admin.leagues.section")).toBe("Ligues et divisions");
    expect(en("admin.leagues.add-entry")).toBe("Add a league or division");
    expect(fr("admin.leagues.add-entry")).toBe(
      "Ajouter une ligue ou une division",
    );
  });

  it("covers the ranking tool's own screen (/admin/tools/ranking)", async () => {
    const { en, fr } = await translators();
    expect(en("admin.ranking.add")).toBe("Add range");
    expect(fr("admin.ranking.add")).toBe("Ajouter une plage");
    expect(en("admin.ranking.bands-section")).toBe("End-of-season bands");
    expect(fr("admin.ranking.bands-section")).toBe("Plages de fin de saison");
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
    // Bloc 119: likewise — and the sentence the brief requires kept.
    expect(en("admin.references.unknown-value-warning")).toBe(
      "Only fill in an unknown value once it is confirmed in game.",
    );
    expect(fr("admin.references.unknown-value-warning")).toBe(
      "Ne renseigne une valeur inconnue qu’après confirmation en jeu.",
    );
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
