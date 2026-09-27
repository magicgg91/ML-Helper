// @vitest-environment node
import { PrismaClient, type Prisma } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { templarKeys } from "./player-settings";
import {
  defaultCombatGemSlotsBase,
  defaultCombatMergeCostBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionMergeCostBase,
} from "./reference-equipment";
import { localizedFieldInLocale } from "./localized-field";

/**
 * Bloc 127 (PR 2/3) : la migration
 * `20260927100000_templars_equipment_localized_fields`, jouée pour de vrai.
 *
 * Elle réécrit du JSON en SQL sur trois lignes de `reference_tables`, de deux
 * formes différentes : la présentation des Templiers est un **objet** (une clé
 * par templier), les libellés d'équipement des **tableaux** dont l'ordre porte
 * le sens. Les modules savent lire les deux formes, donc un test sur eux seuls
 * passerait même si le SQL ne faisait rien : le fichier de migration est
 * appliqué tel quel, par le même outil que le déploiement.
 *
 * Les données de départ sont celles d'une installation réelle : les cinq
 * templiers avec leurs noms livrés, et les cinq libellés de métrique (trois au
 * Combat, deux en Expédition) avec les bases livrées autour d'eux.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-b127b-"));
const url = `file:${path.join(scratch, "migration.db")}`;
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
const schema = path.join(process.cwd(), "prisma", "schema.prisma");
const migration = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260927100000_templars_equipment_localized_fields",
  "migration.sql",
);

function prisma(...args: string[]) {
  execFileSync(prismaBin, [...args, "--schema", schema], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

/** Les cinq noms livrés, dans la forme paire qu'ils avaient en base. */
const shippedNames: Record<string, { fr: string; en: string }> = {
  striker: { fr: "Attaque", en: "Attack" },
  guardian: { fr: "Défense", en: "Defense" },
  prosperous: { fr: "Or", en: "Gold" },
  recruiter: { fr: "Recruteur", en: "Recruiter" },
  rusher: { fr: "Vitesse", en: "Speed" },
};

const storedTemplars: Record<
  string,
  Record<string, unknown>
> = Object.fromEntries(
  templarKeys.map((key) => [
    key,
    {
      image: `/templars/templar-${key}.webp`,
      name_fr: shippedNames[key].fr,
      name_en: shippedNames[key].en,
      // Une description écrite en français seul : l'anglais doit rester
      // **absent**, jamais `""` (Bloc 126/D).
      description_fr: key === "striker" ? "Le templier d'attaque." : "",
      description_en: "",
      temple_base: "3",
      bonus: "1.5",
    },
  ]),
);
// Un templier déjà migré, traduit en allemand : la migration ne doit pas
// reconstruire son objet depuis des paires absentes, donc le vider.
const migratedTemplar = {
  image: "/templars/templar-rusher.webp",
  name: { de: "Geschwindigkeit (Klan)" },
  description: { de: "Auf Deutsch.", fr: "En français." },
  temple_base: "3",
  bonus: "1.5",
};
storedTemplars.rusher = migratedTemplar;

const storedCombat = [
  {
    metric_label_fr: "Coût de fusion",
    metric_label_en: "Merge cost",
    ...defaultCombatMergeCostBase,
  },
  // Aucun libellé saisi : le champ doit ressortir vide, et le libellé traduit
  // par défaut reprend la main côté public.
  { metric_label_fr: "", metric_label_en: "", ...defaultCombatGemSlotsBase },
  { metric_label: { de: "Zerstörung" }, ...defaultCombatSkydustBase },
];
const storedExpedition = [
  {
    metric_label_fr: "Fusion Terradust",
    metric_label_en: "",
    ...defaultExpeditionMergeCostBase,
  },
  {
    metric_label_fr: "",
    metric_label_en: "Dismantle",
    ...defaultExpeditionDismantleBase,
  },
];

type StoredRow = Record<string, unknown>;
let templars: Record<string, StoredRow>;
let combat: StoredRow[];
let expedition: StoredRow[];

beforeAll(async () => {
  prisma("migrate", "deploy");
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    for (const [key, rows] of [
      ["templars-presentation", storedTemplars],
      ["combat_equipment_secondary", storedCombat],
      ["expedition_equipment_secondary", storedExpedition],
    ] as const)
      await client.referenceTable.create({
        data: {
          key,
          columns: ["image"],
          // Même conversion que `saveReferenceTable` porte déjà pour ces
          // lignes : l'index signature d'un Record n'est pas prouvablement
          // InputJsonValue pour le vérificateur.
          rows: rows as unknown as Prisma.InputJsonValue,
        },
      });
  } finally {
    await client.$disconnect();
  }
  prisma("db", "execute", "--file", migration);
  const reader = new PrismaClient({ datasourceUrl: url });
  try {
    const rows = await reader.referenceTable.findMany();
    const find = (key: string) => rows.find((row) => row.key === key)!.rows;
    templars = find("templars-presentation") as Record<string, StoredRow>;
    combat = find("combat_equipment_secondary") as StoredRow[];
    expedition = find("expedition_equipment_secondary") as StoredRow[];
  } finally {
    await reader.$disconnect();
  }
}, 120_000);

describe("Bloc 127 : la migration de la présentation des Templiers", () => {
  it("garde les cinq templiers, leurs images et leurs nombres", () => {
    expect(Object.keys(templars).sort()).toEqual([...templarKeys].sort());
    for (const key of templarKeys) {
      expect(templars[key].image, key).toBe(`/templars/templar-${key}.webp`);
      expect(templars[key].temple_base, key).toBe("3");
      expect(templars[key].bonus, key).toBe("1.5");
    }
  });

  it("remplace la paire par un champ par langue, texte pour texte", () => {
    expect(templars.striker.name).toEqual(shippedNames.striker);
    expect(templars.guardian.name).toEqual(shippedNames.guardian);
    expect(templars.striker.description).toEqual({
      fr: "Le templier d'attaque.",
    });
  });

  it("ne laisse aucune colonne de paire derrière elle", () => {
    for (const key of templarKeys)
      for (const column of [
        "name_fr",
        "name_en",
        "description_fr",
        "description_en",
      ])
        expect(templars[key], `${key}.${column}`).not.toHaveProperty(column);
  });

  it("laisse absente une langue laissée blanche, jamais écrite vide", () => {
    expect(templars.guardian.description).toEqual({});
  });

  it("ne touche pas une ligne déjà migrée, son allemand compris", () => {
    expect(templars.rusher.name).toEqual({ de: "Geschwindigkeit (Klan)" });
    expect(templars.rusher.description).toEqual({
      de: "Auf Deutsch.",
      fr: "En français.",
    });
  });
});

describe("Bloc 127 : la migration des libellés de métrique", () => {
  it("garde l'ordre des lignes, qui porte leur sens", () => {
    // Combat : Fusion, Gemmes, Destruction — l'écran d'administration et le
    // tableau public lisent cet ordre, pas une clé.
    expect(combat).toHaveLength(3);
    expect(expedition).toHaveLength(2);
    expect(combat[0].Commun).toBe(defaultCombatMergeCostBase.Commun);
    expect(combat[1].Commun).toBe(defaultCombatGemSlotsBase.Commun);
    expect(combat[2].Commun).toBe(defaultCombatSkydustBase.Commun);
  });

  it("remplace la paire par un champ par langue", () => {
    expect(combat[0].metric_label).toEqual({
      fr: "Coût de fusion",
      en: "Merge cost",
    });
    expect(expedition[0].metric_label).toEqual({ fr: "Fusion Terradust" });
    expect(expedition[1].metric_label).toEqual({ en: "Dismantle" });
    for (const row of [...combat, ...expedition]) {
      expect(row).not.toHaveProperty("metric_label_fr");
      expect(row).not.toHaveProperty("metric_label_en");
    }
  });

  it("rend vide un libellé que personne n'a saisi", () => {
    // Et c'est ce vide qui laisse le libellé traduit par défaut reprendre la
    // main : un `""` l'en empêcherait.
    expect(combat[1].metric_label).toEqual({});
  });

  it("ne touche pas un libellé déjà migré", () => {
    expect(combat[2].metric_label).toEqual({ de: "Zerstörung" });
  });

  it("rend des libellés que la lecture publique relit langue par langue", () => {
    // La règle de `secondaryLabel` : la langue du visiteur et elle seule.
    const label = combat[0].metric_label as Record<string, string>;
    expect(localizedFieldInLocale(label, "fr")).toBe("Coût de fusion");
    expect(localizedFieldInLocale(label, "en")).toBe("Merge cost");
    // L'allemand n'est pas surchargé : rien ici, donc le libellé traduit par
    // défaut côté composant.
    expect(localizedFieldInLocale(label, "de")).toBe("");
  });
});
