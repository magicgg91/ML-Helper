// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseLeagueLadder, rungFreeName } from "./leagues";

/**
 * Bloc 135 : la migration `20260926000000_leagues_divisions_central`, jouée
 * pour de vrai.
 *
 * Elle réécrit du JSON en SQL — `nameFr`/`nameEn` deviennent un objet `name`
 * par langue, et la clé de la ligne passe de `ranking_leagues` à
 * `leagues_divisions`. Le parser de `lib/leagues.ts` sait lire les deux formes,
 * donc un test sur lui seul passerait même si le SQL ne faisait rien : c'est
 * précisément ce qu'il ne faut pas ici. Le fichier de migration est donc
 * appliqué tel quel, par le même outil que le déploiement (`prisma`), sur une
 * base jetable.
 *
 * L'échelle de départ est celle de la production : dix échelons — Bronze,
 * Argent/Or/Platine/Diamant en Division 2 puis Division 1, Légende — plus un
 * échelon libre sans ligue de base, un renommage français seul, et une paire
 * FR/EN complète.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-leagues-"));
const url = `file:${path.join(scratch, "migration.db")}`;
const legacyUrl = `file:${path.join(scratch, "legacy.db")}`;
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const schema = path.join(process.cwd(), "prisma", "schema.prisma");
const migration = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260926000000_leagues_divisions_central",
  "migration.sql",
);

/** La CLI Prisma, sur la base qu'on lui nomme. */
function prisma(databaseUrl: string, ...args: string[]) {
  execFileSync(prismaBin, [...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

/** Un échelon dans la forme d'avant ce bloc : le nom libre en paire FR/EN. */
const rung = (
  id: string,
  league: string | null,
  division: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  league,
  division,
  nameFr: "",
  nameEn: "",
  position: 0,
  active: true,
  bands: [],
  ...extra,
});

const storedLadder = [
  rung("bronze", "bronze", "", { position: 0 }),
  rung("silver-2", "silver", "2", {
    position: 1,
    bands: [
      {
        threshold: 50,
        movement: "stay",
        target: "silver-2",
        rewards: [{ type: "gems", quantity: 2 }],
      },
    ],
  }),
  rung("silver-1", "silver", "1", { position: 2 }),
  rung("gold-2", "gold", "2", { position: 3 }),
  rung("gold-1", "gold", "1", { position: 4 }),
  rung("platinum-2", "platinum", "2", { position: 5 }),
  rung("platinum-1", "platinum", "1", { position: 6 }),
  rung("diamond-2", "diamond", "2", { position: 7 }),
  // Renommée en français seulement : l'anglais reste vide et doit rester absent.
  rung("diamond-1", "diamond", "1", { position: 8, nameFr: "Diamant Élite" }),
  // Un échelon libre, sans ligue de base, nommé dans les deux langues, et
  // préparé sans être publié.
  rung("champions", null, "", {
    position: 9,
    active: false,
    nameFr: "Champions",
    nameEn: "Champions",
  }),
];

/**
 * La forme d'avant le Bloc 108 : une clé par ligue, ses plages en valeur.
 * `parseLeagueLadder` sait encore la lire, donc une installation qui n'a pas
 * ré-enregistré son échelle depuis peut très bien la porter.
 */
const legacyObjectLadder = {
  bronze: [],
  silver: [
    {
      threshold: 1,
      movement: "promotion",
      league: "gold",
      rewards: [{ type: "sapphires", quantity: 999 }],
    },
  ],
  gold: [],
  platinum: [],
  diamond: [],
  legend: [],
};

let migrated: Array<Record<string, unknown>>;
let key: string;
let legacyRow: { key: string; rows: unknown };

beforeAll(async () => {
  // Les tables, par le chemin du déploiement. La migration du bloc tourne ici
  // sur une base vide : elle ne trouve rien et ne fait rien.
  prisma(url, "migrate", "deploy");
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    await client.referenceTable.create({
      data: {
        key: "ranking_leagues",
        columns: ["threshold", "movement", "target", "rewards"],
        rows: storedLadder,
      },
    });
  } finally {
    await client.$disconnect();
  }
  // Puis la migration, sur la donnée d'avant — ce que le déploiement fait
  // dans l'autre ordre, la ligne existant déjà.
  prisma(url, "db", "execute", "--file", migration);
  const reader = new PrismaClient({ datasourceUrl: url });
  try {
    const row = await reader.referenceTable.findFirstOrThrow();
    key = row.key;
    migrated = row.rows as Array<Record<string, unknown>>;
  } finally {
    await reader.$disconnect();
  }

  // Et la même migration sur une base restée dans la forme objet, à part :
  // `reference_tables.key` est unique, les deux ne peuvent pas cohabiter.
  prisma(legacyUrl, "migrate", "deploy");
  const legacyClient = new PrismaClient({ datasourceUrl: legacyUrl });
  try {
    await legacyClient.referenceTable.create({
      data: {
        key: "ranking_leagues",
        columns: ["threshold"],
        rows: legacyObjectLadder,
      },
    });
  } finally {
    await legacyClient.$disconnect();
  }
  prisma(legacyUrl, "db", "execute", "--file", migration);
  const legacyReader = new PrismaClient({ datasourceUrl: legacyUrl });
  try {
    legacyRow = await legacyReader.referenceTable.findFirstOrThrow();
  } finally {
    await legacyReader.$disconnect();
  }
}, 120_000);

describe("Bloc 135 : la migration de l'échelle", () => {
  it("renomme la clé de la ligne", () => {
    expect(key).toBe("leagues_divisions");
  });

  it("garde les dix échelons, dans leur ordre", () => {
    expect(migrated).toHaveLength(10);
    expect(migrated.map((item) => item.id)).toEqual([
      "bronze",
      "silver-2",
      "silver-1",
      "gold-2",
      "gold-1",
      "platinum-2",
      "platinum-1",
      "diamond-2",
      "diamond-1",
      "champions",
    ]);
  });

  it("remplace la paire FR/EN par un objet par langue", () => {
    expect(
      migrated.filter((item) => "nameFr" in item || "nameEn" in item),
    ).toEqual([]);
    // FR et EN deviennent les deux premières langues remplies…
    expect(migrated[9].name).toEqual({ fr: "Champions", en: "Champions" });
    // …et une langue laissée blanche est absente, jamais écrite "" — sans
    // quoi `localizedText` la tiendrait pour écrite et s'arrêterait dessus
    // au lieu de se replier (Bloc 126/D).
    expect(migrated[8].name).toEqual({ fr: "Diamant Élite" });
    expect(migrated[0].name).toEqual({});
  });

  it("ne touche à rien d'autre : plages, ligue de base, visibilité", () => {
    expect(migrated[1].bands).toEqual([
      {
        threshold: 50,
        movement: "stay",
        target: "silver-2",
        rewards: [{ type: "gems", quantity: 2 }],
      },
    ]);
    expect(migrated[9].league).toBeNull();
    expect(migrated[9].active).toBe(false);
    expect(migrated[8].division).toBe("1");
  });

  it("rend une échelle que l'application relit sans perte", () => {
    const ladder = parseLeagueLadder(migrated);
    expect(ladder).toHaveLength(10);
    expect(rungFreeName(ladder[8], "fr")).toBe("Diamant Élite");
    // Un lecteur allemand n'a pas de nom allemand : il lit l'anglais, puis le
    // français — la règle de repli du site.
    expect(rungFreeName(ladder[8], "de")).toBe("Diamant Élite");
    expect(rungFreeName(ladder[9], "en")).toBe("Champions");
    expect(ladder[9].active).toBe(false);
  });
});

/**
 * Revue Codex (PR #160), P1 : la forme d'avant le Bloc 108 survit.
 *
 * `parseLeagueLadder` sait encore lire un objet à une clé par ligue, donc une
 * installation qui n'a pas ré-enregistré son échelle depuis le Bloc 108 la
 * porte encore. `json_each` itère alors les *valeurs* de cet objet : la
 * réécriture rendait un tableau de tableaux de plages — et, l'agrégation
 * triant sur les clés, dans l'ordre alphabétique des ligues par-dessus le
 * marché. L'analyseur n'y reconnaissait plus aucun échelon et le site public
 * retombait sur les six ligues livrées : les seuils et récompenses configurés
 * remplacés par les valeurs par défaut, sans un mot.
 *
 * Reproduit sur une base jetable avant d'être corrigé ; la réécriture ne
 * touche plus que la forme tableau.
 */
describe("Bloc 135 : la forme objet d'avant le Bloc 108", () => {
  it("est laissée intacte, avec ses seuils et ses récompenses", () => {
    expect(legacyRow.rows).toEqual(legacyObjectLadder);
  });

  it("voit quand même sa clé renommée", () => {
    expect(legacyRow.key).toBe("leagues_divisions");
  });

  it("se relit sans perte, l'analyseur la migrant comme avant", () => {
    const ladder = parseLeagueLadder(legacyRow.rows);
    expect(ladder).toHaveLength(6);
    const silver = ladder.find((rung) => rung.id === "silver");
    // La plage configurée par l'administration, et non celle livrée avec le
    // code : c'est tout l'enjeu.
    expect(silver?.bands).toEqual([
      {
        threshold: 1,
        movement: "promotion",
        target: "gold",
        rewards: [{ type: "sapphires", quantity: 999 }],
      },
    ]);
  });
});
