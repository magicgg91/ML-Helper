import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultCombatGemSlotsBase,
  defaultCombatMergeCostBase,
  defaultCombatSkydustBase,
} from "@/lib/reference-equipment";

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
  new Request(
    "http://localhost/api/admin/guides/references/combat-equipment-secondary",
    { method: "PUT", body: JSON.stringify(payload) },
  );

/** Les trois lignes de l'écran, dans leur ordre : Fusion, Gemmes, Destruction. */
const rows = (labels: unknown[]) => [
  { ...defaultCombatMergeCostBase, ...(labels[0] as object) },
  { ...defaultCombatGemSlotsBase, ...(labels[1] as object) },
  { ...defaultCombatSkydustBase, ...(labels[2] as object) },
];

const savedRows = () =>
  saveReferenceTable.mock.calls[0][0].rows as Record<string, unknown>[];

/**
 * Bloc 127 (PR 2/3) : le libellé de métrique passe de la paire FR/EN à un champ
 * par langue. Cette route n'avait aucun test.
 */
describe("PUT /api/admin/guides/references/combat-equipment-secondary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session = { user: { id: "u1", role: "super_admin", name: "Alice" } };
  });

  it("enregistre un libellé par langue, et prévient les pages publiques", async () => {
    const response = await PUT(
      body(
        rows([
          { metric_label: { fr: "Coût de fusion", de: "Verschmelzen" } },
          {},
          {},
        ]),
      ),
    );
    expect(response.status).toBe(200);
    expect(savedRows()[0].metric_label).toEqual({
      fr: "Coût de fusion",
      de: "Verschmelzen",
    });
    expect(revalidateContent).toHaveBeenCalledWith(
      "references",
      "combat-equipment",
    );
  });

  it("garde absente une langue laissée blanche", () => {
    // Un `""` empêcherait le libellé traduit par défaut de reprendre la main,
    // ce qui est exactement ce que ce champ doit permettre (Bloc 76/B).
    return PUT(
      body(rows([{ metric_label: { fr: "Fusion", en: "  " } }, {}, {}])),
    ).then(() => {
      expect(savedRows()[0].metric_label).toEqual({ fr: "Fusion" });
      expect(savedRows()[1].metric_label).toEqual({});
    });
  });

  /**
   * Revue Codex (PR #167, P1), appliquée ici : pendant la fenêtre de
   * déploiement, un onglet ouvert avant la livraison envoie encore la paire.
   * Sans repli, les libellés saisis seraient effacés en répondant 200.
   */
  it("convertit la charge utile de l'ancien écran au lieu de l'effacer", async () => {
    const response = await PUT(
      body(
        rows([
          { metric_label_fr: "Coût de fusion", metric_label_en: "Merge cost" },
          { metric_label_fr: "", metric_label_en: "" },
          {},
        ]),
      ),
    );
    expect(response.status).toBe(200);
    expect(savedRows()[0].metric_label).toEqual({
      fr: "Coût de fusion",
      en: "Merge cost",
    });
    expect(savedRows()[1].metric_label).toEqual({});
    expect(savedRows()[0]).not.toHaveProperty("metric_label_fr");
  });

  it("garde les trois lignes dans leur ordre, avec leurs nombres", () => {
    return PUT(body(rows([{}, {}, {}]))).then(() => {
      expect(savedRows()).toHaveLength(3);
      expect(savedRows()[0].Commun).toBe(defaultCombatMergeCostBase.Commun);
      expect(savedRows()[1].Commun).toBe(defaultCombatGemSlotsBase.Commun);
      expect(savedRows()[2].Commun).toBe(defaultCombatSkydustBase.Commun);
      expect(saveReferenceTable.mock.calls[0][0].columns[0]).toBe(
        "metric_label",
      );
    });
  });

  it("refuse une charge utile qui n'a pas ses trois lignes", async () => {
    const response = await PUT(body([{}, {}]));
    expect(response.status).toBe(400);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse un libellé qui n'est pas un objet de chaînes", async () => {
    const response = await PUT(
      body(rows([{ metric_label: "Fusion" }, {}, {}])),
    );
    expect(response.status).toBe(400);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse une session sans le droit d'écriture", async () => {
    session = null;
    const response = await PUT(body(rows([{}, {}, {}])));
    expect(response.status).toBe(403);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });
});
