// @vitest-environment node
import { PrismaClient, type Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  consumableCategories,
  defaultConsumableCatalog,
  parseConsumableRow,
  type ConsumableRow,
} from "./consumables";
import { localizedText } from "./translations";

/**
 * Bloc 127 (PR 1/3) : la migration
 * `20260927000000_consumables_localized_fields`, jouée pour de vrai.
 *
 * Elle réécrit du JSON en SQL — `name_fr`/`name_en` et
 * `description_fr`/`description_en` deviennent un champ par langue. Le parser
 * de `lib/consumables.ts` sait lire les deux formes, donc un test sur lui seul
 * passerait même si le SQL ne faisait rien : c'est précisément ce qu'il ne faut
 * pas ici. Le fichier de migration est donc appliqué tel quel, par le même
 * outil que le déploiement (`prisma`), sur une base jetable.
 *
 * Le catalogue de départ est **celui de la production** : les 38 objets livrés,
 * reconvertis dans la forme paire qu'ils avaient en base, plus trois cas qu'on
 * ne peut pas fabriquer depuis le catalogue livré — une ligne nommée en
 * français seul, une ligne déjà migrée en cinq langues, et une ligne sans
 * description.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-consumables-"));
const url = `file:${path.join(scratch, "migration.db")}`;
const legacyUrl = `file:${path.join(scratch, "legacy.db")}`;
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const schema = path.join(process.cwd(), "prisma", "schema.prisma");
const migration = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260927000000_consumables_localized_fields",
  "migration.sql",
);

/** La CLI Prisma, sur la base qu'on lui nomme. */
function prisma(databaseUrl: string, ...args: string[]) {
  execFileSync(prismaBin, [...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

/** Une ligne livrée, dans la forme paire qu'elle avait en base avant ce bloc. */
const asPair = (row: ConsumableRow) => ({
  image: row.image,
  name_fr: row.name.fr ?? "",
  name_en: row.name.en ?? "",
  description_fr: row.description.fr ?? "",
  description_en: row.description.en ?? "",
  cost: row.cost,
});

const sections = ["intro", ...consumableCategories] as const;

const storedCatalog: Record<string, unknown[]> = {
  ...Object.fromEntries(
    sections.map((section) => [
      section,
      defaultConsumableCatalog[section].map(asPair),
    ]),
  ),
  // Renommé en français seulement : l'anglais doit rester **absent**, pas `""`.
  // C'est ce que le Bloc 126/D a payé — une chaîne vide annule le repli.
  intro: [
    {
      image: "/consumables/sapphires.webp",
      name_fr: "Saphirs",
      name_en: "",
      description_fr: "La monnaie du jeu.",
      description_en: "",
      cost: "",
    },
    // Déjà migrée, et traduite dans les cinq langues : la migration ne doit pas
    // reconstruire son objet depuis des paires absentes, donc le vider.
    {
      image: "/consumables/inventory.webp",
      name: {
        fr: "Inventaire",
        en: "Inventory",
        de: "Inventar",
        es: "Inventario",
        tr: "Envanter",
      },
      description: {
        fr: "Vos objets.",
        en: "Your items.",
        de: "Ihre Objekte.",
      },
      cost: "",
    },
    // Nommée, sans description : les deux côtés vides donnent un champ vide,
    // et non deux chaînes vides.
    {
      image: "/consumables/coming.webp",
      name_fr: "À venir",
      name_en: "Coming soon",
      description_fr: "",
      description_en: "",
      cost: "",
    },
    // À moitié migrée : le nom l'est déjà (et traduit en allemand), la
    // description est restée en paire. C'est la seule forme qui atteint la
    // branche « garder ce qui est déjà là » du SQL, champ par champ — sans
    // cette ligne, la mutation qui remplace cette branche par un objet vide
    // passait inaperçue (trouvé par mutation, d'où sa présence ici).
    {
      image: "/consumables/half.webp",
      name: {
        fr: "À moitié migré",
        en: "Half migrated",
        de: "Halb migriert",
      },
      description_fr: "Description restée en paire.",
      description_en: "Description still a pair.",
      cost: "",
    },
  ],
};

/** Le tableau plat d'avant le Bloc 48 : une seule liste, la catégorie en colonne. */
const legacyFlatArray = [
  {
    image: "/consumables/advisor-commander.webp",
    category: "advisors",
    name_fr: "Commandant",
    name_en: "Commander",
    description_fr: "Un conseiller.",
    description_en: "An advisor.",
    cost: "800",
  },
];

type StoredRow = Record<string, unknown>;
let migrated: Record<string, StoredRow[]>;
let legacyRows: unknown;

beforeAll(async () => {
  // Les tables, par le chemin du déploiement. La migration du bloc tourne ici
  // sur une base vide : elle ne trouve rien et ne fait rien.
  prisma(url, "migrate", "deploy");
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    await client.referenceTable.create({
      data: {
        key: "consumables",
        columns: [
          "image",
          "name_fr",
          "name_en",
          "description_fr",
          "description_en",
          "cost",
        ],
        // Prisma's Json input type doesn't structurally accept a plain
        // Record<string, …> (its index signature isn't provably
        // InputJsonValue-shaped), which is the same cast `saveReferenceTable`
        // itself carries for this very catalogue.
        rows: storedCatalog as Prisma.InputJsonValue,
      },
    });
  } finally {
    await client.$disconnect();
  }
  // Puis la migration, sur la donnée d'avant — ce que le déploiement fait dans
  // l'autre ordre, la ligne existant déjà.
  prisma(url, "db", "execute", "--file", migration);
  const reader = new PrismaClient({ datasourceUrl: url });
  try {
    const row = await reader.referenceTable.findFirstOrThrow();
    migrated = row.rows as Record<string, StoredRow[]>;
  } finally {
    await reader.$disconnect();
  }

  // Et la même migration sur une base restée dans la forme tableau plat, à
  // part : `reference_tables.key` est unique, les deux ne peuvent pas cohabiter.
  prisma(legacyUrl, "migrate", "deploy");
  const legacyClient = new PrismaClient({ datasourceUrl: legacyUrl });
  try {
    await legacyClient.referenceTable.create({
      data: { key: "consumables", columns: ["image"], rows: legacyFlatArray },
    });
  } finally {
    await legacyClient.$disconnect();
  }
  prisma(legacyUrl, "db", "execute", "--file", migration);
  const legacyReader = new PrismaClient({ datasourceUrl: legacyUrl });
  try {
    legacyRows = (await legacyReader.referenceTable.findFirstOrThrow()).rows;
  } finally {
    await legacyReader.$disconnect();
  }
}, 120_000);

describe("Bloc 127 : la migration du catalogue Boutique", () => {
  it("garde les cinq sections et toutes leurs lignes, dans leur ordre", () => {
    expect(Object.keys(migrated).sort()).toEqual([...sections].sort());
    for (const category of consumableCategories) {
      const shipped = defaultConsumableCatalog[category];
      expect(migrated[category], category).toHaveLength(shipped.length);
      // L'ordre est l'ordre d'affichage public : il se vérifie, il ne se
      // suppose pas.
      expect(
        migrated[category].map((row) => (row.name as { fr: string }).fr),
        category,
      ).toEqual(shipped.map((row) => row.name.fr));
    }
    // Les 38 objets livrés, plus les quatre cas ajoutés dans l'intro.
    const total = sections.reduce(
      (count, section) => count + migrated[section].length,
      0,
    );
    expect(total).toBe(38 + 4);
  });

  it("ne laisse aucune colonne de paire derrière elle", () => {
    const withPair = sections.flatMap((section) =>
      migrated[section].filter((row) =>
        ["name_fr", "name_en", "description_fr", "description_en"].some(
          (key) => key in row,
        ),
      ),
    );
    expect(withPair).toEqual([]);
  });

  it("remplace la paire par un champ par langue, texte pour texte", () => {
    for (const category of consumableCategories)
      defaultConsumableCatalog[category].forEach((shipped, index) => {
        const row = migrated[category][index];
        expect(row.name, `${category}[${index}].name`).toEqual({
          fr: shipped.name.fr,
          en: shipped.name.en,
        });
        expect(row.description, `${category}[${index}].description`).toEqual({
          fr: shipped.description.fr,
          en: shipped.description.en,
        });
        // `image` et `cost` ne sont pas du texte éditorial : rien ne les touche.
        expect(row.image).toBe(shipped.image);
        expect(row.cost).toBe(shipped.cost);
      });
  });

  it("laisse absente une langue laissée blanche, jamais écrite vide", () => {
    // Le cœur du Bloc 126/D : `localizedText` tient `""` pour écrit et
    // s'arrête dessus, au lieu de se replier sur une langue qui dit quelque
    // chose. Une ligne nommée en français seul doit donc n'avoir QUE `fr`.
    expect(migrated.intro[0].name).toEqual({ fr: "Saphirs" });
    expect(migrated.intro[0].description).toEqual({
      fr: "La monnaie du jeu.",
    });
    // Et une description vide des deux côtés donne un champ vide.
    expect(migrated.intro[2].name).toEqual({
      fr: "À venir",
      en: "Coming soon",
    });
    expect(migrated.intro[2].description).toEqual({});
  });

  it("garde ce qui est déjà migré d'une ligne à moitié convertie", () => {
    // Le nom est déjà un objet, la description est encore une paire : chaque
    // champ suit son propre chemin, et celui qui n'a plus de paire garde sa
    // valeur — l'allemand compris — au lieu d'être rebâti depuis rien.
    expect(migrated.intro[3].name).toEqual({
      fr: "À moitié migré",
      en: "Half migrated",
      de: "Halb migriert",
    });
    expect(migrated.intro[3].description).toEqual({
      fr: "Description restée en paire.",
      en: "Description still a pair.",
    });
  });

  it("ne touche pas une ligne déjà migrée, ses cinq langues comprises", () => {
    // Sans la garde sur les clés de paire, l'objet aurait été reconstruit
    // depuis des paires absentes — donc vidé, DE/ES/TR avec lui.
    expect(migrated.intro[1].name).toEqual({
      fr: "Inventaire",
      en: "Inventory",
      de: "Inventar",
      es: "Inventario",
      tr: "Envanter",
    });
    expect(migrated.intro[1].description).toEqual({
      fr: "Vos objets.",
      en: "Your items.",
      de: "Ihre Objekte.",
    });
  });

  it("rend un catalogue que l'application relit sans perte", () => {
    const row = parseConsumableRow(migrated.advisors[0]);
    const shipped = defaultConsumableCatalog.advisors[0];
    expect(row).toEqual(shipped);
    // Un visiteur allemand lit l'anglais — ce que la paire ne savait pas faire
    // autrement qu'en confondant « allemand » et « pas français ».
    expect(localizedText(row.name, "de")).toBe(shipped.name.en);
    // …et la ligne traduite en allemand lui rend l'allemand.
    expect(
      localizedText(parseConsumableRow(migrated.intro[1]).name, "de"),
    ).toBe("Inventar");
  });
});

/**
 * La forme d'avant le Bloc 48 : un tableau plat, la catégorie en colonne.
 *
 * `normalizeStoredValue` la regroupe déjà à la lecture, ligne par ligne, et
 * `json_each` itérerait ici les lignes et non les sections : la réécriture
 * aurait rendu un objet dont les clés sont des indices. Elle est donc écartée
 * — et c'est le prochain enregistrement qui l'écrit dans la forme nouvelle,
 * comme le Bloc 48 l'avait déjà prévu.
 */
describe("Bloc 127 : le tableau plat d'avant le Bloc 48", () => {
  it("est laissé intact par le SQL", () => {
    expect(legacyRows).toEqual(legacyFlatArray);
  });

  it("se relit quand même en champs par langue, par le repli de lecture", () => {
    const row = parseConsumableRow(
      (legacyRows as Record<string, unknown>[])[0],
    );
    expect(row.name).toEqual({ fr: "Commandant", en: "Commander" });
    expect(row.description).toEqual({
      fr: "Un conseiller.",
      en: "An advisor.",
    });
  });
});
