import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "reference_tables"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "formulas"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "calculators"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "guides"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "static_content"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "audit_logs"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "users"');
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL, "password_hash" TEXT NOT NULL, "role" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_login_at" DATETIME)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "users_username_key" ON "users"("username")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "audit_logs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "actor_role" TEXT NOT NULL, "message" TEXT NOT NULL DEFAULT \'\', "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT NOT NULL, "diff" JSONB, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "calculators" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL, "name" JSONB NOT NULL, "description" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT false, "inputs" JSONB NOT NULL, "outputs" JSONB NOT NULL, "tips" JSONB NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "calculators_slug_key" ON "calculators"("slug")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "formulas" ("id" TEXT NOT NULL PRIMARY KEY, "calculator_id" TEXT NOT NULL, "key" TEXT NOT NULL, "label" JSONB NOT NULL, "formula_params" JSONB NOT NULL, CONSTRAINT "formulas_calculator_id_fkey" FOREIGN KEY ("calculator_id") REFERENCES "calculators" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "formulas_calculator_id_key_key" ON "formulas"("calculator_id", "key")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "guides" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'draft\', "active" BOOLEAN NOT NULL DEFAULT true, "title" JSONB NOT NULL, "content" JSONB NOT NULL, "excerpt" JSONB NOT NULL, "cover_image" TEXT, "author" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL, "published_at" DATETIME)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "static_content" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "content" JSONB NOT NULL, "updated_at" DATETIME NOT NULL, "updated_by" TEXT NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "static_content_key_key" ON "static_content"("key")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "reference_tables" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "label" JSONB NOT NULL, "columns" JSONB NOT NULL, "rows" JSONB NOT NULL, "calculator_id" TEXT)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "reference_tables_key_key" ON "reference_tables"("key")',
  );
  const calculators = [
    ["calculator-city-cost", "city-cost", "villes", "Coût de Ville"],
    [
      "calculator-city-max-level",
      "city-max-level",
      "villes",
      "Niveau Max Atteignable",
    ],
    ["calculator-city-production", "city-production", "villes", "Production"],
    ["calculator-ranking", "ranking", "classement", "Ranking"],
    [
      "calculator-stuff-simulator",
      "stuff-simulator",
      "competences",
      "Simulateur de Stuff",
    ],
    [
      "calculator-stuff-comparison",
      "stuff-comparison",
      "competences",
      "Comparaison de stuff",
    ],
    ["calculator-gems", "gems", "competences", "Gemmes"],
    ["calculator-templars", "templars", "competences", "Templiers"],
    [
      "calculator-combat-equipment",
      "combat-equipment",
      "referentiels",
      "Équipements de Combat",
    ],
    [
      "calculator-expedition-equipment",
      "expedition-equipment",
      "referentiels",
      "Équipement d’Expédition",
    ],
  ];
  for (const [id, slug, category, name] of calculators) {
    await prisma.calculator.create({
      data: {
        id,
        slug,
        category,
        name: { fr: name },
        description: {},
        active: true,
        inputs: {},
        outputs: {},
        tips: {},
      },
    });
  }
  await prisma.formula.create({
    data: {
      id: "formula-city-parameters",
      calculatorId: "calculator-city-cost",
      key: "city_parameters",
      label: {
        en: "Shared City parameters",
        fr: "Paramètres Villes partagés",
      },
      formulaParams: {
        vp: { base: 20, ratio: 1.115 },
        walls: { base: 70, ratio: 1.2 },
        cost: { base: 10, ratio: 1.2 },
        multipliers: {
          bronze: { army: 2, gold: 5 },
          silver: { army: 2.25, gold: 6.25 },
          gold: { army: 2.75, gold: 8.75 },
          platinum: { army: 2.75, gold: 8.75 },
          diamond: { army: 3, gold: 10 },
          legend: { army: 3, gold: 10 },
        },
      },
    },
  });
  await prisma.formula.create({
    data: {
      id: "formula-templar-cost",
      calculatorId: "calculator-templars",
      key: "templar_cost",
      label: { en: "Templar cost", fr: "Coût des Templiers" },
      formulaParams: { base: 150, ratio: 1.3 },
    },
  });
  await prisma.guide.create({
    data: {
      id: "guide-visibility-test",
      slug: "guide-visible",
      category: "Débutants",
      status: "published",
      title: { fr: "Guide visible", en: "Visible guide" },
      excerpt: {
        fr: "Guide utilisé pour vérifier la dépublication.",
        en: "Guide used to verify unpublishing.",
      },
      content: {
        fr: `## Guide Markdown

| Colonne | Valeur |
| --- | --- |
| Test | 42 |

- Élément à puces

1. Première étape
2. Deuxième étape

- [ ] À faire
- [x] Terminé

~~Ancien texte~~

\`\`\`ts
const answer = 42;
\`\`\`

> Citation de test

[Lien de test](https://example.com)`,
        en: "Test content",
      },
      author: "Équipe ML-Helper",
      publishedAt: new Date(),
    },
  });
  await prisma.$disconnect();
}
main().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});
