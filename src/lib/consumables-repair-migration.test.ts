// @vitest-environment node
import { PrismaClient, type Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Bloc 143/B : la garde manquante de la migration Boutique (PR #167).
 *
 * Le défaut : cette migration entre dans sa branche de conversion dès qu'une
 * clé de paire existe sur la ligne, et reconstruit alors `$.name` et
 * `$.description` depuis la paire **seule**. Une ligne qui portait déjà la
 * forme objet avec DE/ES/TR, plus une paire résiduelle, perd ses trois langues.
 *
 * Les deux fichiers sont joués ici par l'outil du déploiement (`prisma`), sur
 * des bases jetables — le parser de `lib/consumables.ts` sait lire les deux
 * formes, donc un test sur lui seul passerait même si le SQL ne faisait rien.
 *
 * ⚠️ Ce que ce fichier ne prétend pas démontrer : que la réparation annule le
 * défaut dans l'ordre réel du déploiement. Elle s'exécute **après** la migration
 * d'origine ; sur une base qui n'a pas encore passé celle-ci, la perte a lieu
 * avant que la réparation n'ait la main, et rien ne la restaure. Le premier cas
 * ci-dessous constate cette perte, précisément pour qu'elle soit écrite quelque
 * part plutôt que supposée.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-repair-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const schema = path.join(process.cwd(), "prisma", "schema.prisma");
const migrationFile = (name: string) =>
  path.join(process.cwd(), "prisma", "migrations", name, "migration.sql");

const ORIGIN = migrationFile("20260927000000_consumables_localized_fields");
const REPAIR = migrationFile(
  "20260928000000_consumables_localized_fields_repair",
);

function prisma(databaseUrl: string, ...args: string[]) {
  execFileSync(prismaBin, [...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

/**
 * La ligne qui déclenche le défaut : la forme objet **et** la paire, sur le
 * même champ. C'est la fixture qui manquait au test d'origine — celui-ci avait
 * bien une ligne à moitié migrée, mais dont le nom objet n'avait plus de paire
 * à côté, donc la branche fautive n'était jamais atteinte.
 */
const coexisting = {
  image: "/consumables/coexist.webp",
  name: {
    fr: "Objet déjà traduit",
    en: "Already translated",
    de: "Schon übersetzt",
    es: "Ya traducido",
    tr: "Zaten çevrildi",
  },
  name_fr: "Objet déjà traduit",
  name_en: "Already translated",
  description: {
    fr: "Description déjà traduite.",
    de: "Schon übersetzte Beschreibung.",
  },
  description_fr: "Description déjà traduite.",
  description_en: "Already translated description.",
  cost: "100",
};

type StoredRow = Record<string, unknown>;

/** Sème une base neuve avec la ligne coexistante, puis y joue les fichiers donnés. */
async function runOn(label: string, files: string[]) {
  const url = `file:${path.join(scratch, `${label}.db`)}`;
  prisma(url, "migrate", "deploy");
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    await client.referenceTable.create({
      data: {
        key: "consumables",
        columns: ["image", "name_fr", "name_en", "cost"],
        rows: { intro: [coexisting] } as unknown as Prisma.InputJsonValue,
      },
    });
  } finally {
    await client.$disconnect();
  }
  for (const file of files) prisma(url, "db", "execute", "--file", file);
  const reader = new PrismaClient({ datasourceUrl: url });
  try {
    const stored = (await reader.referenceTable.findFirstOrThrow()).rows as {
      intro: StoredRow[];
    };
    return stored.intro[0];
  } finally {
    await reader.$disconnect();
  }
}

let afterOrigin: StoredRow;
let afterRepair: StoredRow;

beforeAll(async () => {
  afterOrigin = await runOn("origin", [ORIGIN]);
  afterRepair = await runOn("repair", [REPAIR]);
}, 180_000);

describe("Bloc 143/B : la migration de réparation de la Boutique", () => {
  /**
   * Le défaut, constaté plutôt que raconté. Ce cas n'est pas une garantie à
   * préserver : c'est le constat de ce que fait la migration d'origine, et la
   * raison d'être du fichier de réparation.
   */
  it("constate la perte : la migration d'origine écrase l'objet par la paire", () => {
    const name = afterOrigin.name as Record<string, string>;
    expect(Object.keys(name).sort()).toEqual(["en", "fr"]);
    expect(name.de).toBeUndefined();
    expect(name.es).toBeUndefined();
    expect(name.tr).toBeUndefined();
    // Et sur la description, dont l'allemand disparaît de la même façon.
    expect((afterOrigin.description as Record<string, string>).de).toBeUndefined();
  });

  it("garde les cinq langues du nom là où la paire les écrasait", () => {
    const name = afterRepair.name as Record<string, string>;
    expect(Object.keys(name).sort()).toEqual(["de", "en", "es", "fr", "tr"]);
    expect(name.de).toBe("Schon übersetzt");
    expect(name.es).toBe("Ya traducido");
    expect(name.tr).toBe("Zaten çevrildi");
  });

  it("garde de même la description déjà traduite", () => {
    const description = afterRepair.description as Record<string, string>;
    expect(Object.keys(description).sort()).toEqual(["de", "fr"]);
    expect(description.de).toBe("Schon übersetzte Beschreibung.");
    // L'anglais de la paire ne s'ajoute pas : le champ par langue gagne
    // **entier**, il ne fusionne pas avec la paire.
    expect(description.en).toBeUndefined();
  });

  it("retire quand même les clés de paire, comme la migration d'origine", () => {
    for (const key of [
      "name_fr",
      "name_en",
      "description_fr",
      "description_en",
    ])
      expect(afterRepair[key], key).toBeUndefined();
  });

  it("laisse intact ce qui n'est pas du texte éditorial", () => {
    expect(afterRepair.image).toBe("/consumables/coexist.webp");
    expect(afterRepair.cost).toBe("100");
  });
});

describe("Bloc 143/B : la réparation ne touche pas une base saine", () => {
  let twice: StoredRow;
  let once: StoredRow;

  beforeAll(async () => {
    // L'ordre du déploiement réel : l'origine, puis la réparation. Sur une
    // ligne que l'origine a déjà convertie, la réparation ne doit plus rien
    // changer — plus aucune clé de paire ne subsiste pour la déclencher.
    once = await runOn("chain-once", [ORIGIN]);
    twice = await runOn("chain-twice", [ORIGIN, REPAIR]);
  }, 180_000);

  it("rend exactement le même état que la migration d'origine seule", () => {
    expect(twice).toEqual(once);
  });
});

/**
 * Bloc 143/B : la garde, sur les trois migrations N-langues du Bloc 127.
 *
 * Le brief demandait de confirmer par lecture **et** par test que les deux
 * autres la portent, sans le supposer. Lire le fichier est ici le seul test
 * honnête : le SQL d'une migration déjà appliquée ne se rejoue pas, et compter
 * les commentaires ne prouverait rien — c'est le motif structurel de la garde
 * qui est compté, pas le mot « garde ».
 *
 * Le décompte attendu est le nombre de champs éditoriaux que chaque migration
 * convertit. Une migration qui en convertirait un de plus sans le garder ferait
 * tomber ce test, ce qui est exactement son objet.
 */
describe("Bloc 143/B : la garde sur les trois migrations N-langues", () => {
  const GUARD = /WHERE trim\(coalesce\(written\.value, ''\)\) <> ''/g;

  const cases = [
    // La migration d'origine de la Boutique (PR #167) : c'est elle qui ne l'a
    // pas. Elle est ici pour que le défaut reste écrit noir sur blanc, et pour
    // qu'on remarque si quelqu'un l'édite — ce qu'il ne faut pas faire.
    ["20260927000000_consumables_localized_fields", 0],
    ["20260927100000_templars_equipment_localized_fields", 3],
    ["20260927200000_events_localized_fields", 4],
    // La réparation de ce bloc : deux champs, deux gardes.
    ["20260928000000_consumables_localized_fields_repair", 2],
  ] as const;

  for (const [name, expected] of cases)
    it(`${name} porte ${expected} garde(s)`, () => {
      const sql = readFileSync(migrationFile(name), "utf8");
      expect(sql.match(GUARD)?.length ?? 0).toBe(expected);
    });
});
