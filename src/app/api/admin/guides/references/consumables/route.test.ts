import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConsumableCatalog } from "@/lib/consumables";

const { saveReferenceTable, revalidateContent } = vi.hoisted(() => ({
  saveReferenceTable: vi.fn(),
  revalidateContent: vi.fn(),
}));
vi.mock("@/services/reference-table-admin", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/reference-table-admin")
  >("@/services/reference-table-admin");
  return {
    saveReferenceTable,
    stringField: actual.stringField,
    numericString: actual.numericString,
    localizedField: actual.localizedField,
    localizedFieldOrPair: actual.localizedFieldOrPair,
  };
});
vi.mock("@/lib/revalidate-content", () => ({ revalidateContent }));

let session: { user: { id: string; role: string; name: string } } | null = {
  user: { id: "u1", role: "super_admin", name: "Alice" },
};
vi.mock("@/auth/api-authorization", () => ({
  authorizedSession: async () => session,
  forbiddenResponse: () => new Response(null, { status: 403 }),
}));

import { PUT } from "./route";

const body = (payload: unknown) =>
  new Request("http://localhost/api/admin/guides/references/consumables", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

/** Un catalogue complet, avec la seule ligne qu'on fait varier dans l'intro. */
const catalogWith = (row: unknown) => ({
  intro: [row],
  advisors: [],
  equipment: [],
  expedition: [],
  inventory: [],
});

const savedRows = () =>
  saveReferenceTable.mock.calls[0][0].rows as Record<
    string,
    Record<string, unknown>[]
  >;

describe("PUT /api/admin/guides/references/consumables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session = { user: { id: "u1", role: "super_admin", name: "Alice" } };
  });

  it("enregistre un champ par langue, et prévient les pages publiques", async () => {
    const response = await PUT(
      body(
        catalogWith({
          image: "/consumables/sapphires.webp",
          name: { fr: "Saphirs", en: "Sapphires", de: "Saphire" },
          description: { fr: "La monnaie.", en: "The currency." },
          cost: "",
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect(savedRows().intro[0].name).toEqual({
      fr: "Saphirs",
      en: "Sapphires",
      de: "Saphire",
    });
    expect(revalidateContent).toHaveBeenCalledWith("references", "shop");
  });

  /**
   * Revue Codex (PR #167, P1) : la fenêtre de déploiement.
   *
   * Un onglet d'administration ouvert avant la livraison envoie encore la paire
   * FR/EN. Sans repli, la route lisait `undefined`, stockait `{}`, et
   * l'enregistrement effaçait le nom et la description de tout le catalogue en
   * répondant 200.
   */
  describe("une charge utile de l'ancien écran, pendant le déploiement", () => {
    const legacyRow = {
      image: "/consumables/sapphires.webp",
      name_fr: "Saphirs",
      name_en: "Sapphires",
      description_fr: "La monnaie du jeu.",
      description_en: "The game's currency.",
      cost: "",
    };

    it("est convertie plutôt qu'ignorée — rien n'est effacé", async () => {
      const response = await PUT(body(catalogWith(legacyRow)));
      expect(response.status).toBe(200);
      expect(savedRows().intro[0].name).toEqual({
        fr: "Saphirs",
        en: "Sapphires",
      });
      expect(savedRows().intro[0].description).toEqual({
        fr: "La monnaie du jeu.",
        en: "The game's currency.",
      });
      // La paire elle-même ne reste pas en base : la ligne est écrite dans la
      // forme nouvelle, comme si l'écran d'aujourd'hui l'avait envoyée.
      expect(savedRows().intro[0]).not.toHaveProperty("name_fr");
    });

    it("garde absente une langue blanche de la paire", async () => {
      await PUT(
        body(catalogWith({ ...legacyRow, name_en: "", description_en: "" })),
      );
      expect(savedRows().intro[0].name).toEqual({ fr: "Saphirs" });
      expect(savedRows().intro[0].description).toEqual({
        fr: "La monnaie du jeu.",
      });
    });

    it("préfère l'objet par langue quand les deux formes sont là", async () => {
      await PUT(
        body(
          catalogWith({
            ...legacyRow,
            name: { fr: "Saphirs (nouveau)", de: "Saphire" },
          }),
        ),
      );
      expect(savedRows().intro[0].name).toEqual({
        fr: "Saphirs (nouveau)",
        de: "Saphire",
      });
    });
  });

  /**
   * Revue Codex (PR #167, P2) : le repli public s'arrête à l'anglais puis au
   * français. Une ligne écrite en allemand seul serait blanche pour tous les
   * autres visiteurs — AGENTS.md : « repli sur l'anglais si une traduction
   * manque, jamais un vide ».
   */
  it("refuse une ligne qu'aucun repli ne saurait rendre", async () => {
    const response = await PUT(
      body(
        catalogWith({
          image: "",
          name: { de: "Saphire" },
          description: { de: "Die Währung." },
          cost: "",
        }),
      ),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_reference_rows" });
    // Refusée en entier : rien n'est écrit à moitié.
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse un catalogue vidé de ses textes, quelle qu'en soit l'origine", async () => {
    const response = await PUT(
      body(catalogWith({ image: "", name: {}, description: {}, cost: "" })),
    );
    expect(response.status).toBe(400);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse un champ qui n'est pas un objet de chaînes", async () => {
    for (const name of ["Saphirs", 12, ["Saphirs"], { fr: 12 }]) {
      vi.clearAllMocks();
      const response = await PUT(
        body(
          catalogWith({
            image: "",
            name,
            description: { fr: "La monnaie." },
            cost: "",
          }),
        ),
      );
      expect(response.status, JSON.stringify(name)).toBe(400);
      expect(saveReferenceTable).not.toHaveBeenCalled();
    }
  });

  it("enregistre le catalogue livré tel quel", async () => {
    const response = await PUT(body(defaultConsumableCatalog));
    expect(response.status).toBe(200);
    expect(savedRows().advisors[0].name).toEqual(
      defaultConsumableCatalog.advisors[0].name,
    );
    expect(saveReferenceTable.mock.calls[0][0].columns).toEqual([
      "image",
      "name",
      "description",
      "cost",
    ]);
  });

  it("refuse une session sans le droit d'écriture", async () => {
    session = null;
    const response = await PUT(body(defaultConsumableCatalog));
    expect(response.status).toBe(403);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });
});
