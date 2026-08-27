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
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "login_throttles"');
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL, "password_hash" TEXT NOT NULL, "role" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_login_at" DATETIME, "totp_secret_encrypted" TEXT, "totp_enabled" BOOLEAN NOT NULL DEFAULT false)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "users_username_key" ON "users"("username")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "login_throttles" ("identifier_hash" TEXT NOT NULL PRIMARY KEY, "failed_attempts" INTEGER NOT NULL DEFAULT 0, "locked_until" DATETIME, "updated_at" DATETIME NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "audit_logs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "actor_role" TEXT NOT NULL, "message" TEXT NOT NULL DEFAULT \'\', "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT NOT NULL, "diff" JSONB, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "calculators" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL, "description" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT false, "inputs" JSONB NOT NULL, "outputs" JSONB NOT NULL, "tips" JSONB NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "calculators_slug_key" ON "calculators"("slug")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "formulas" ("id" TEXT NOT NULL PRIMARY KEY, "calculator_id" TEXT NOT NULL, "key" TEXT NOT NULL, "formula_params" JSONB NOT NULL, CONSTRAINT "formulas_calculator_id_fkey" FOREIGN KEY ("calculator_id") REFERENCES "calculators" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "formulas_calculator_id_key_key" ON "formulas"("calculator_id", "key")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "guides" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT \'draft\', "active" BOOLEAN NOT NULL DEFAULT true, "title" JSONB NOT NULL, "content" JSONB NOT NULL, "excerpt" JSONB NOT NULL, "cover_image" TEXT, "author" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL, "published_at" DATETIME)',
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
    'CREATE TABLE "reference_tables" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "columns" JSONB NOT NULL, "rows" JSONB NOT NULL, "calculator_id" TEXT)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "reference_tables_key_key" ON "reference_tables"("key")',
  );
  const calculators = [
    ["calculator-city-cost", "city-cost", "villes"],
    ["calculator-city-max-level", "city-max-level", "villes"],
    ["calculator-city-production", "city-production", "villes"],
    ["calculator-city-rewards", "city-rewards", "villes"],
    ["calculator-ranking", "ranking", "classement"],
    ["calculator-stuff-simulator", "stuff-simulator", "competences"],
    [
      "calculator-expedition-equipment-simulator",
      "expedition-equipment-simulator",
      "competences",
    ],
    ["calculator-gems", "gems", "competences"],
    ["calculator-templars", "templars", "competences"],
    ["calculator-xp-gain-rate", "xp-gain-rate", "combat"],
    ["calculator-demo-attack-troops", "demo-attack-troops", "combat"],
    ["calculator-combat-equipment", "combat-equipment", "referentiels"],
    ["calculator-expedition-equipment", "expedition-equipment", "referentiels"],
    ["calculator-level-up", "level-up", "referentiels"],
  ];
  for (const [id, slug, category] of calculators) {
    await prisma.calculator.create({
      data: {
        id,
        slug,
        category,
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
      id: "formula-xp-gain-tiers",
      calculatorId: "calculator-xp-gain-rate",
      key: "xp_gain_tiers",
      formulaParams: {
        tiers: [
          { low: 0, high: 40, rate: 0 },
          { low: 40, high: 50, rate: 50 },
          { low: 50, high: 150, rate: 100 },
          { low: 150, high: 200, rate: 150 },
          { low: 200, high: null, rate: 200 },
        ],
      },
    },
  });
  await prisma.formula.create({
    data: {
      id: "formula-demo-attack-percentages",
      calculatorId: "calculator-demo-attack-troops",
      key: "demo_attack_percentages",
      formulaParams: {
        percentages: {
          bronze: 100,
          silver: 50,
          gold: 40,
          platinum: 40,
          diamond: 30,
          legend: 30,
        },
      },
    },
  });
  await prisma.formula.create({
    data: {
      id: "formula-level-up",
      calculatorId: "calculator-level-up",
      key: "level_up_parameters",
      formulaParams: {
        xp: { base: 50, ratio: 1.3 },
        troops: {
          bronze: { coefficient: 32.2028, ratio: 1.245 },
          gold: { coefficient: 32.49, ratio: 1.24 },
          platinum: { coefficient: 35.88, ratio: 1.237 },
          diamond: { coefficient: 32.2028, ratio: 1.245 },
          legend: { coefficient: 32.2028, ratio: 1.245 },
        },
        maxLevel: 150,
        columnSize: 30,
        pageSize: 60,
        chestInterval: 10,
      },
    },
  });
  await prisma.formula.create({
    data: {
      id: "formula-templar-cost",
      calculatorId: "calculator-templars",
      key: "templar_cost",
      formulaParams: { base: 150, ratio: 1.3 },
    },
  });
  await prisma.formula.create({
    data: {
      id: "formula-gem-parameters",
      calculatorId: "calculator-gems",
      key: "gem_parameters",
      formulaParams: {
        skillLeagueValue: {
          striker: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
          brave: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
          scavenger: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
          guardian: {
            bronze: 1.5,
            silver: 3,
            gold: 4.5,
            platinum: 6,
            diamond: 7.5,
            legend: 9,
          },
          fearless: { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, legend: 6 },
          prosperous: {
            bronze: 1.5,
            silver: 3,
            gold: 4.5,
            platinum: 6,
            diamond: 7.5,
            legend: 9,
          },
          recruiter: {
            bronze: 1.5,
            silver: 3,
            gold: 4.5,
            platinum: 6,
            diamond: 7.5,
            legend: 9,
          },
          cautious: {
            bronze: 0.5,
            silver: 1,
            gold: 1.5,
            platinum: 2,
            diamond: 2.5,
            legend: 3,
          },
          salvager: {
            bronze: 0.5,
            silver: 1,
            gold: 1.5,
            platinum: 2,
            diamond: 2.5,
            legend: 3,
          },
          rusher: {
            bronze: 2.5,
            silver: 5,
            gold: 7.5,
            platinum: 10,
            diamond: 12.5,
            legend: 15,
          },
        },
        gemPrice: {
          silver: 3000,
          gold: 4000,
          platinum: 5000,
          diamond: 6000,
          legend: 7000,
        },
      },
    },
  });
  await prisma.guide.create({
    data: {
      id: "guide-visibility-test",
      slug: "guide-visible",
      category: ["debuter"],
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
