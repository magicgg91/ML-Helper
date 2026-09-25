import { PrismaClient } from "@prisma/client";
import { e2eDatabaseUrl } from "./e2e-database";

/**
 * Bloc 121: the e2e database, created from scratch and seeded, as a function
 * the suite can call — not only a script `pnpm test:e2e:prepare` runs once
 * before the server starts.
 *
 * phase-one.spec.ts is one serial scenario over one database: its second test
 * creates the one-time Super Admin every later test signs in as. Playwright
 * retries a serial group from its first test, so before this bloc a retry
 * replayed that setup against a database that already had it — /admin
 * redirected to /login and the group could never recover, which is why the
 * file had to opt out of retries (Bloc 116/B). It is not the only test that
 * could not run twice: "the audit log paginates by 20 entries" creates the
 * user `pagination-user`, and a second attempt would get a 409 on it.
 *
 * Giving each attempt this reset is what makes those tests replayable, and
 * the retry the rest of the suite already has finally safe to grant.
 */

/**
 * Drops every table, recreates the schema and re-seeds it: the same state
 * `pnpm test:e2e:prepare` produces, reachable from a test hook.
 *
 * DROP IF EXISTS rather than DELETE FROM so a half-migrated or half-written
 * database from a previous attempt cannot survive as a stale column.
 */
export async function resetE2eDatabase(databaseUrl = e2eDatabaseUrl) {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    /**
     * Bloc 121 / correctif CI : on balaie ce que la base contient, au lieu
     * d'énumérer ce qu'on croit qu'elle contient.
     *
     * Les deux listes écrites à la main — dix tables, puis sept index ajoutés
     * au Bloc 131 — ont chacune fini par laisser passer quelque chose. La CI
     * a échoué deux fois, sur deux noms différents (`audit_logs_created_at_idx`
     * puis `users_username_key`), toujours sur un « already exists » à la
     * création, et la seconde fois alors même que le nom en question était
     * dans la liste des `DROP INDEX IF EXISTS` exécutés juste avant. Le
     * mécanisme n'est toujours pas établi ; ce qui l'est, c'est qu'une liste
     * figée ne peut pas décrire un état qu'on ne sait pas expliquer.
     *
     * `sqlite_master` le décrit, lui. On retire tout ce qu'il annonce, on
     * recommence tant qu'il reste quelque chose (une table emporte ses index,
     * donc un passage suffit presque toujours), et on refuse de continuer si
     * quoi que ce soit survit — une erreur qui nomme le survivant vaut mieux
     * qu'un « already exists » vingt lignes plus bas.
     *
     * Effet de bord utile : les tables inconnues partent aussi, là où
     * l'ancienne liste les laissait derrière elle indéfiniment.
     */
    const survivants = async () =>
      prisma.$queryRawUnsafe<{ type: string; name: string }[]>(
        "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND type IN ('table', 'index', 'view', 'trigger') ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END",
      );
    let refus: string[] = [];
    for (let passage = 0; passage < 4; passage += 1) {
      const objets = await survivants();
      if (objets.length === 0) break;
      refus = [];
      let retires = 0;
      for (const { type, name } of objets)
        try {
          await prisma.$executeRawUnsafe(
            `DROP ${type.toUpperCase()} IF EXISTS "${name}"`,
          );
          retires += 1;
        } catch (erreur) {
          // Une table encore référencée par une autre : `sqlite_master` liste
          // dans l'ordre de création, pas dans celui des dépendances, et
          // retirer `users` avant `audit_logs` viole la clé étrangère. On la
          // reprend au passage suivant, une fois ses enfants partis — d'où
          // les passages plutôt qu'un ordre écrit à la main, qui serait la
          // liste figée qu'on vient de supprimer.
          refus.push(
            `${type} ${name} → ${erreur instanceof Error ? erreur.message.replace(/\s+/g, " ").trim() : String(erreur)}`,
          );
        }
      // Plus rien ne part : insister ne ferait que répéter les mêmes refus.
      if (retires === 0) break;
    }
    const restants = await survivants();
    if (restants.length > 0)
      throw new Error(
        `Remise à zéro incomplète, ces objets ont survécu : ${restants
          .map((objet) => `${objet.type} ${objet.name}`)
          .join(
            ", ",
          )}${refus.length > 0 ? ` — refus : ${refus.join(" ; ")}` : ""}`,
      );
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL, "password_hash" TEXT NOT NULL, "role" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_login_at" DATETIME, "totp_secret_encrypted" TEXT, "totp_enabled" BOOLEAN NOT NULL DEFAULT false)',
    );
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "users_username_key" ON "users"("username")',
    );
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "login_throttles" ("identifier_hash" TEXT NOT NULL PRIMARY KEY, "failed_attempts" INTEGER NOT NULL DEFAULT 0, "locked_until" DATETIME, "updated_at" DATETIME NOT NULL)',
    );
    // Bloc 90: per-locale public visibility (admin Configuration tab).
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "locale_settings" ("locale" TEXT NOT NULL PRIMARY KEY, "active" BOOLEAN NOT NULL DEFAULT true, "updated_at" DATETIME NOT NULL)',
    );
    // Bloc 100: the Configuration tab's named settings (tracking script URL).
    // Starts empty, which is what "no tracking configured" means.
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "site_settings" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL, "updated_at" DATETIME NOT NULL)',
    );
    await prisma.$executeRawUnsafe(
      'CREATE TABLE "audit_logs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "actor_role" TEXT NOT NULL, "message_key" TEXT NOT NULL DEFAULT \'\', "message_params" TEXT NOT NULL DEFAULT \'{}\', "message" TEXT NOT NULL DEFAULT \'\', "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT NOT NULL, "diff" JSONB, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
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
      'CREATE TABLE "guides" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT \'draft\', "title" JSONB NOT NULL, "content" JSONB NOT NULL, "excerpt" JSONB NOT NULL, "cover_image" TEXT, "author" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL, "published_at" DATETIME)',
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
      [
        "calculator-expedition-equipment",
        "expedition-equipment",
        "referentiels",
      ],
      ["calculator-level-up", "level-up", "referentiels"],
      ["calculator-templiers-reference", "templiers", "referentiels"],
      ["calculator-gemmes-reference", "gemmes", "referentiels"],
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
    // Bloc 60: unlike every calculator above, "events" ships with zero
    // starting data and must start inactive/hidden (see the real migration,
    // prisma/migrations/20260907000000_events_reference) — seeded separately
    // here instead of joining the uniform active:true loop.
    await prisma.calculator.create({
      data: {
        id: "calculator-events-reference",
        slug: "events",
        category: "referentiels",
        description: {},
        active: false,
        inputs: {},
        outputs: {},
        tips: {},
      },
    });
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
          maxLevel: 200,
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
            striker: {
              bronze: 1,
              silver: 2,
              gold: 3,
              platinum: 4,
              diamond: 5,
              legend: 6,
            },
            brave: {
              bronze: 1,
              silver: 2,
              gold: 3,
              platinum: 4,
              diamond: 5,
              legend: 6,
            },
            scavenger: {
              bronze: 1,
              silver: 2,
              gold: 3,
              platinum: 4,
              diamond: 5,
              legend: 6,
            },
            guardian: {
              bronze: 1.5,
              silver: 3,
              gold: 4.5,
              platinum: 6,
              diamond: 7.5,
              legend: 9,
            },
            fearless: {
              bronze: 1,
              silver: 2,
              gold: 3,
              platinum: 4,
              diamond: 5,
              legend: 6,
            },
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
  } finally {
    await prisma.$disconnect();
  }
}
