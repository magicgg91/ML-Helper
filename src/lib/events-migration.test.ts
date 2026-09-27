// @vitest-environment node
import { PrismaClient, type Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localizedText } from "./translations";

/**
 * Bloc 127 (PR 3/3) : la migration `20260927200000_events_localized_fields`,
 * jouée pour de vrai.
 *
 * L'écran le plus profond de l'audit : la ligne `events` est un objet par
 * ligue, chacune portant un **tableau** d'événements, chacun portant un
 * **tableau** de paliers. Trois niveaux, et deux ordres qui portent du sens —
 * la chaîne des événements dans la saison, et le rang des paliers dont le
 * dernier est l'objectif final. Le module de lecture sait lire les deux
 * formes, donc un test sur lui seul passerait même si le SQL ne faisait rien :
 * le fichier est appliqué tel quel, par l'outil du déploiement.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-b127c-"));
const url = `file:${path.join(scratch, "migration.db")}`;
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const schema = path.join(process.cwd(), "prisma", "schema.prisma");
const migration = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260927200000_events_localized_fields",
  "migration.sql",
);

function prisma(...args: string[]) {
  execFileSync(prismaBin, [...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

/** Un palier de la forme livrée : deux paires FR/EN. */
const tier = (objectiveFr: string, objectiveEn: string, rewardFr: string) => ({
  objective_fr: objectiveFr,
  objective_en: objectiveEn,
  reward_fr: rewardFr,
  reward_en: "",
});

/**
 * Une saison réelle : Or enchaîne quatre événements sur ses 14 jours, avec
 * leurs paliers, et c'est cette forme-là que la base porte aujourd'hui.
 */
const storedGold = {
  seasonDurationDays: 14,
  events: [
    {
      name: "Architecte",
      description_fr: "Construis et améliore tes bâtiments.",
      description_en: "Build and upgrade your buildings.",
      duration: 72,
      color: "violet",
      tiers: [
        tier("100 000 points", "100,000 points", "50 saphirs"),
        tier("250 000 points", "250,000 points", "120 saphirs"),
        tier("1 000 000 points", "1,000,000 points", "500 saphirs"),
      ],
    },
    {
      name: "Conquérant",
      description_fr: "Prends des cités.",
      description_en: "",
      duration: 48,
      color: "ember",
      tiers: [tier("10 cités", "10 cities", "1 000 000 d'or")],
    },
    // Aucune description saisie : les deux langues doivent ressortir absentes,
    // jamais `""` — c'est ce vide qui laisse le repli fonctionner.
    {
      name: "Pillard",
      description_fr: "",
      description_en: "",
      duration: 24,
      color: "amber",
      tiers: [],
    },
    // Déjà migré, et traduit au-delà de la paire : la migration ne doit pas
    // reconstruire cet objet depuis des paires absentes, donc le vider.
    {
      name: { de: "Baumeister", tr: "Mimar" },
      description: { de: "Auf Deutsch." },
      duration: 24,
      color: "sapphire",
      tiers: [
        {
          objective: { es: "Cien mil puntos" },
          reward: { es: "Cincuenta zafiros" },
        },
      ],
    },
  ],
};

/**
 * Bronze : une ligue sans événement, qui existe quand même dans le catalogue.
 * Elle doit traverser sans que sa durée de saison bouge.
 */
const storedBronze = { seasonDurationDays: 21, events: [] };

/**
 * Argent : un événement portant **les deux formes** à la fois, et un palier
 * dans le même cas (revue Codex P1 de la PR #168, appliquée d'avance ici).
 */
const storedSilver = {
  seasonDurationDays: 14,
  events: [
    {
      name: { de: "Zerstörer (DE)" },
      // La chaîne d'avant ce bloc est là aussi : l'objet doit gagner.
      description: { tr: "Türkçe açıklama" },
      description_fr: "Une description française.",
      description_en: "An English description.",
      duration: 24,
      color: "emerald",
      tiers: [
        {
          objective: { es: "Objetivo en español" },
          objective_fr: "Objectif français",
          objective_en: "English objective",
          reward_fr: "Récompense",
          reward_en: "Reward",
        },
      ],
    },
  ],
};

type Stored = Record<string, unknown>;
let catalog: Record<string, { seasonDurationDays: number; events: Stored[] }>;

beforeAll(async () => {
  prisma("migrate", "deploy");
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    await client.referenceTable.create({
      data: {
        key: "events",
        columns: ["name"],
        rows: {
          bronze: storedBronze,
          silver: storedSilver,
          gold: storedGold,
          platinum: { seasonDurationDays: 14, events: [] },
          diamond: { seasonDurationDays: 14, events: [] },
          legend: { seasonDurationDays: 14, events: [] },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } finally {
    await client.$disconnect();
  }
  prisma("db", "execute", "--file", migration);
  const reader = new PrismaClient({ datasourceUrl: url });
  try {
    const row = await reader.referenceTable.findUnique({
      where: { key: "events" },
    });
    catalog = row!.rows as typeof catalog;
  } finally {
    await reader.$disconnect();
  }
}, 120_000);

describe("Bloc 127 : la migration des Événements", () => {
  it("garde les six ligues et leurs durées de saison", () => {
    expect(Object.keys(catalog).sort()).toEqual([
      "bronze",
      "diamond",
      "gold",
      "legend",
      "platinum",
      "silver",
    ]);
    expect(catalog.bronze.seasonDurationDays).toBe(21);
    expect(catalog.gold.seasonDurationDays).toBe(14);
    expect(catalog.bronze.events).toEqual([]);
  });

  it("garde l'ordre des événements, qui place la saison", () => {
    // Architecte, Conquérant, Pillard, Baumeister — c'est cet ordre, et la
    // durée cumulée de ce qui précède, qui donne à chaque tuile son « Jx-Jy ».
    expect(catalog.gold.events).toHaveLength(4);
    expect(catalog.gold.events.map((event) => event.duration)).toEqual([
      72, 48, 24, 24,
    ]);
    expect(catalog.gold.events.map((event) => event.color)).toEqual([
      "violet",
      "ember",
      "amber",
      "sapphire",
    ]);
  });

  it("garde l'ordre des paliers, dont le dernier est l'objectif final", () => {
    const tiers = catalog.gold.events[0].tiers as Stored[];
    expect(tiers).toHaveLength(3);
    expect(
      tiers.map((row) => (row.objective as Record<string, string>).fr),
    ).toEqual(["100 000 points", "250 000 points", "1 000 000 points"]);
  });

  it("fait du nom d'avant ce bloc un français, traduisible ensuite", () => {
    expect(catalog.gold.events[0].name).toEqual({ fr: "Architecte" });
    expect(catalog.gold.events[1].name).toEqual({ fr: "Conquérant" });
  });

  it("remplace la paire par un champ par langue, texte pour texte", () => {
    expect(catalog.gold.events[0].description).toEqual({
      fr: "Construis et améliore tes bâtiments.",
      en: "Build and upgrade your buildings.",
    });
    expect(catalog.gold.events[1].description).toEqual({
      fr: "Prends des cités.",
    });
    const tiers = catalog.gold.events[0].tiers as Stored[];
    expect(tiers[0].objective).toEqual({
      fr: "100 000 points",
      en: "100,000 points",
    });
    expect(tiers[0].reward).toEqual({ fr: "50 saphirs" });
  });

  it("laisse absente une langue laissée blanche, jamais écrite vide", () => {
    expect(catalog.gold.events[2].description).toEqual({});
  });

  it("ne laisse aucune colonne de paire derrière elle", () => {
    for (const event of catalog.gold.events) {
      for (const column of ["description_fr", "description_en"])
        expect(event).not.toHaveProperty(column);
      for (const row of event.tiers as Stored[])
        for (const column of [
          "objective_fr",
          "objective_en",
          "reward_fr",
          "reward_en",
        ])
          expect(row).not.toHaveProperty(column);
    }
  });

  it("ne touche pas un événement déjà migré, ses DE/ES/TR compris", () => {
    const event = catalog.gold.events[3];
    expect(event.name).toEqual({ de: "Baumeister", tr: "Mimar" });
    expect(event.description).toEqual({ de: "Auf Deutsch." });
    const tiers = event.tiers as Stored[];
    expect(tiers[0].objective).toEqual({ es: "Cien mil puntos" });
    expect(tiers[0].reward).toEqual({ es: "Cincuenta zafiros" });
  });

  it("préfère le champ par langue quand les deux formes coexistent", () => {
    // Revue Codex P1 (PR #168) : la paire ne doit pas écraser un objet qui
    // porte déjà des langues qu'elle ne sait pas exprimer.
    const event = catalog.silver.events[0];
    expect(event.name).toEqual({ de: "Zerstörer (DE)" });
    expect(event.description).toEqual({ tr: "Türkçe açıklama" });
    const tiers = event.tiers as Stored[];
    expect(tiers[0].objective).toEqual({ es: "Objetivo en español" });
    // La récompense, elle, n'existait qu'en paire : elle est bien convertie.
    expect(tiers[0].reward).toEqual({ fr: "Récompense", en: "Reward" });
    expect(event).not.toHaveProperty("description_fr");
    expect(tiers[0]).not.toHaveProperty("objective_fr");
  });

  it("rend des objets JSON, jamais des chaînes contenant du JSON", () => {
    for (const league of Object.values(catalog)) {
      expect(typeof league).toBe("object");
      for (const event of league.events) {
        expect(typeof event).toBe("object");
        for (const row of event.tiers as Stored[])
          expect(typeof row).toBe("object");
      }
    }
  });

  it("rend des textes que la lecture publique relit langue par langue", () => {
    const description = catalog.gold.events[0].description as Record<
      string,
      string
    >;
    expect(localizedText(description, "fr")).toBe(
      "Construis et améliore tes bâtiments.",
    );
    expect(localizedText(description, "en")).toBe(
      "Build and upgrade your buildings.",
    );
    // L'allemand n'est pas traduit : il se replie sur l'anglais, et c'est
    // voulu — contrairement aux libellés d'équipement, rien ici n'a de
    // traduction par défaut derrière lui.
    expect(localizedText(description, "de")).toBe(
      "Build and upgrade your buildings.",
    );
  });
});
