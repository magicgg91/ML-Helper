import { beforeEach, describe, expect, it, vi } from "vitest";
import { leagues } from "@/lib/player-settings";

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
  new Request("http://localhost/api/admin/guides/references/events", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

/** Les six ligues : la route les exige toutes, l'écran en montre une. */
const catalog = (bronzeEvents: unknown[]) =>
  Object.fromEntries(
    leagues.map((league) => [
      league,
      {
        seasonDurationDays: 14,
        events: league === "bronze" ? bronzeEvents : [],
      },
    ]),
  );

const saved = () =>
  saveReferenceTable.mock.calls[0][0].rows as Record<
    string,
    { events: Record<string, unknown>[] }
  >;

/**
 * Bloc 127 (PR 3/3) : les quatre champs éditoriaux des Événements passent de
 * la paire FR/EN à un champ par langue. Cette route n'avait aucun test.
 */
describe("PUT /api/admin/guides/references/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session = { user: { id: "u1", role: "super_admin", name: "Alice" } };
  });

  it("enregistre chaque langue là où elle est écrite, et prévient le public", async () => {
    const response = await PUT(
      body(
        catalog([
          {
            name: { fr: "Recruteur", de: "Rekrutierer" },
            description: { fr: "Enrôle des troupes." },
            duration: 24,
            color: "violet",
            tiers: [
              {
                objective: { fr: "1G troupes", de: "1G Truppen" },
                reward: { fr: "100M or" },
              },
            ],
          },
        ]),
      ),
    );
    expect(response.status).toBe(200);
    const event = saved().bronze.events[0];
    expect(event.name).toEqual({ fr: "Recruteur", de: "Rekrutierer" });
    expect(event.description).toEqual({ fr: "Enrôle des troupes." });
    expect((event.tiers as Record<string, unknown>[])[0].objective).toEqual({
      fr: "1G troupes",
      de: "1G Truppen",
    });
    expect(revalidateContent).toHaveBeenCalledWith("references", "events");
  });

  /**
   * Revue Codex P2 (PR #169) : pendant la fenêtre de déploiement, un onglet
   * ouvert avant la livraison envoie encore l'ancienne forme — et le nom y
   * est une **chaîne**, pas une paire. Sans ce cas, l'analyseur strict la
   * refusait et tout l'enregistrement repartait en 400, alors que le filet
   * existe précisément pour qu'il passe.
   */
  it("accepte la charge utile de l'ancien écran, nom en chaîne compris", async () => {
    const response = await PUT(
      body(
        catalog([
          {
            name: "Recruteur",
            description_fr: "Enrôle des troupes.",
            description_en: "Enlist troops.",
            duration: 24,
            color: "violet",
            tiers: [
              {
                objective_fr: "1G troupes",
                objective_en: "1B troops",
                reward_fr: "100M or",
                reward_en: "",
              },
            ],
          },
        ]),
      ),
    );
    expect(response.status).toBe(200);
    const event = saved().bronze.events[0];
    // La chaîne devient du français, comme la migration le fait en base.
    expect(event.name).toEqual({ fr: "Recruteur" });
    expect(event.description).toEqual({
      fr: "Enrôle des troupes.",
      en: "Enlist troops.",
    });
    const tier = (event.tiers as Record<string, unknown>[])[0];
    expect(tier.objective).toEqual({ fr: "1G troupes", en: "1B troops" });
    // Une langue blanche reste absente, jamais écrite vide (Bloc 126/D).
    expect(tier.reward).toEqual({ fr: "100M or" });
    expect(event).not.toHaveProperty("description_fr");
  });

  it("refuse un événement qu'aucun visiteur ne saurait lire", async () => {
    // Un nom écrit en turc seul est blanc pour tout le monde sauf un Turc :
    // la règle est « français ou anglais », les deux langues de repli.
    const response = await PUT(
      body(
        catalog([
          {
            name: { tr: "Toplayıcı" },
            description: {},
            duration: 24,
            color: "violet",
            tiers: [{ objective: { fr: "A" }, reward: { fr: "B" } }],
          },
        ]),
      ),
    );
    expect(response.status).toBe(400);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse un palier sans objectif ou sans récompense lisible", async () => {
    const response = await PUT(
      body(
        catalog([
          {
            name: { fr: "Recruteur" },
            description: {},
            duration: 24,
            color: "violet",
            tiers: [{ objective: { fr: "A" }, reward: {} }],
          },
        ]),
      ),
    );
    expect(response.status).toBe(400);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });

  it("refuse une description écrite dans une seule langue sans repli", async () => {
    // Facultative, mais pas à moitié écrite : vide, ou lisible par tous.
    const response = await PUT(
      body(
        catalog([
          {
            name: { fr: "Recruteur" },
            description: { de: "Nur auf Deutsch" },
            duration: 24,
            color: "violet",
            tiers: [{ objective: { fr: "A" }, reward: { fr: "B" } }],
          },
        ]),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("refuse un nom qui n'est pas un objet de chaînes", async () => {
    const response = await PUT(
      body(
        catalog([
          {
            name: { fr: 42 },
            description: {},
            duration: 24,
            color: "violet",
            tiers: [{ objective: { fr: "A" }, reward: { fr: "B" } }],
          },
        ]),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("refuse une saison que ses événements débordent", async () => {
    const payload = catalog([
      {
        name: { fr: "Recruteur" },
        description: {},
        duration: 72,
        color: "violet",
        tiers: [{ objective: { fr: "A" }, reward: { fr: "B" } }],
      },
    ]) as Record<string, { seasonDurationDays: number; events: unknown[] }>;
    payload.bronze.seasonDurationDays = 1;
    const response = await PUT(body(payload));
    expect(response.status).toBe(400);
  });

  it("refuse une session sans le droit d'écriture", async () => {
    session = null;
    const response = await PUT(body(catalog([])));
    expect(response.status).toBe(403);
    expect(saveReferenceTable).not.toHaveBeenCalled();
  });
});
