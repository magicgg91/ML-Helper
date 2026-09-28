// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  e2eDatabaseFile,
  e2eDatabaseUrl,
  singleConnection,
} from "../prisma/e2e-database";
import { resetE2eDatabase } from "../prisma/e2e-seed";

/**
 * Bloc 121: the reset that makes phase-one.spec.ts retryable, checked here
 * rather than only through a Playwright run.
 *
 * It runs against a throwaway database file, so it proves the behaviour
 * without touching prisma/e2e.db — which a suite running in parallel may be
 * using at this very moment.
 */

const scratch = mkdtempSync(path.join(tmpdir(), "ml-helper-reset-"));
const url = `file:${path.join(scratch, "reset.db")}`;
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

// Les clients de ce fichier enchaînent eux aussi du DDL brut pour monter
// leurs états de départ : même raison, même remède.
const client = () => new PrismaClient({ datasourceUrl: singleConnection(url) });

describe("Bloc 121: the per-attempt database reset", () => {
  it("builds the seeded state from an empty file", async () => {
    await resetE2eDatabase(url);
    const prisma = client();
    try {
      // What every attempt of the serial scenario starts from: the tools and
      // the one published guide, and no account at all — the Super Admin is
      // created by the scenario itself, through /admin/setup.
      expect(await prisma.calculator.count()).toBeGreaterThan(0);
      expect(await prisma.guide.count()).toBe(1);
      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.auditLog.count()).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  /**
   * Bloc 131 (correctif CI) : un index orphelin ne bloque pas la remise à
   * zéro.
   *
   * La CI a fait échouer `CREATE INDEX "audit_logs_created_at_idx"` sur
   * « index already exists », au troisième appel de la fonction, dans une
   * suite complète. En SQLite un index part avec sa table : l'état que ce
   * test met en place ne devrait donc pas exister, et c'est précisément
   * pourquoi il est écrit — la remise à zéro doit survivre à un état qu'on
   * ne sait pas expliquer, pas seulement à celui qu'on attend.
   *
   * L'index est posé ici sur une autre table, faute de pouvoir fabriquer
   * l'orphelin directement : SQLite emporte l'index quand on retire la
   * sienne. Le nom est ce qui compte — c'est lui qui entre en collision.
   */
  it("passe outre un index resté d'un état antérieur", async () => {
    await resetE2eDatabase(url);
    const stale = client();
    try {
      await stale.$executeRawUnsafe(
        'CREATE TABLE "leftover" ("created_at" DATETIME)',
      );
      await stale.$executeRawUnsafe('DROP INDEX "audit_logs_created_at_idx"');
      await stale.$executeRawUnsafe(
        'CREATE INDEX "audit_logs_created_at_idx" ON "leftover"("created_at")',
      );
    } finally {
      await stale.$disconnect();
    }

    // Sans le retrait nommé des index, cette ligne lève
    // « index audit_logs_created_at_idx already exists ».
    await expect(resetE2eDatabase(url)).resolves.toBeUndefined();

    const prisma = client();
    try {
      expect(await prisma.calculator.count()).toBeGreaterThan(0);
      expect(await prisma.auditLog.count()).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  /**
   * Ce que le balayage apporte en plus des listes qu'il remplace : une table
   * qu'aucune liste ne connaît s'en va aussi. L'ancienne remise à zéro
   * retirait dix tables nommées et laissait tout le reste en place, pour
   * toujours.
   */
  it("emporte aussi ce qu'aucune liste ne connaissait", async () => {
    await resetE2eDatabase(url);
    const intrus = client();
    try {
      await intrus.$executeRawUnsafe(
        'CREATE TABLE "table_d_un_autre_temps" ("id" TEXT)',
      );
      await intrus.$executeRawUnsafe(
        'CREATE INDEX "index_d_un_autre_temps" ON "table_d_un_autre_temps"("id")',
      );
    } finally {
      await intrus.$disconnect();
    }

    await resetE2eDatabase(url);

    const apres = client();
    try {
      const restants = await apres.$queryRawUnsafe<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE name LIKE '%d_un_autre_temps'",
      );
      expect(restants).toEqual([]);
    } finally {
      await apres.$disconnect();
    }
  });

  /**
   * Et quand le balayage ne suffit pas, il le dit.
   *
   * Deux tables qui se référencent l'une l'autre, chacune avec une ligne :
   * SQLite refuse de retirer l'une tant que l'autre est là, dans les deux
   * sens. La remise à zéro s'arrête alors plutôt que de repartir sur une
   * base à moitié détruite — et nomme ce qui a survécu, ce qui vaut mieux
   * qu'un « already exists » vingt lignes plus loin, le message qui a coûté
   * deux échecs de CI inexpliqués.
   */
  it("refuse de continuer, en nommant ce qui a survécu", async () => {
    await resetE2eDatabase(url);
    const noeud = client();
    try {
      await noeud.$executeRawUnsafe(
        'CREATE TABLE "poule" ("id" TEXT PRIMARY KEY, "oeuf_id" TEXT REFERENCES "oeuf"("id"))',
      );
      await noeud.$executeRawUnsafe(
        'CREATE TABLE "oeuf" ("id" TEXT PRIMARY KEY, "poule_id" TEXT REFERENCES "poule"("id"))',
      );
      // Les clés étrangères de SQLite sont vérifiées à l'insertion : on pose
      // les deux lignes sans lien, puis on les relie.
      await noeud.$executeRawUnsafe(
        'INSERT INTO "poule" ("id", "oeuf_id") VALUES (\'p\', NULL)',
      );
      await noeud.$executeRawUnsafe(
        'INSERT INTO "oeuf" ("id", "poule_id") VALUES (\'o\', \'p\')',
      );
      await noeud.$executeRawUnsafe(
        'UPDATE "poule" SET "oeuf_id" = \'o\' WHERE "id" = \'p\'',
      );
    } finally {
      await noeud.$disconnect();
    }

    await expect(resetE2eDatabase(url)).rejects.toThrow(/poule|oeuf/);

    // On dénoue, sinon la base reste inutilisable pour les tests suivants —
    // ce que la remise à zéro vient justement de refuser de masquer. Sans
    // les lignes, les deux tables redeviennent retirables.
    const denoue = client();
    try {
      // Couper les deux liens suffit : ce sont les lignes qui référencent qui
      // empêchent de retirer les tables, pas les tables elles-mêmes.
      await denoue.$executeRawUnsafe('UPDATE "poule" SET "oeuf_id" = NULL');
      await denoue.$executeRawUnsafe('UPDATE "oeuf" SET "poule_id" = NULL');
    } finally {
      await denoue.$disconnect();
    }
    await expect(resetE2eDatabase(url)).resolves.toBeUndefined();
  });

  it("leaves nothing of a previous attempt behind", async () => {
    await resetE2eDatabase(url);
    const dirty = client();
    try {
      // Everything the scenario writes over an attempt, in miniature: the
      // account, a row keyed by a name a later attempt would collide with,
      // and an audit trail.
      const admin = await dirty.user.create({
        data: {
          id: "attempt-1-admin",
          username: "rootadmin",
          passwordHash: "hash",
          role: "super_admin",
        },
      });
      await dirty.user.create({
        data: {
          id: "attempt-1-pagination",
          username: "pagination-user",
          passwordHash: "hash",
          role: "read_only",
        },
      });
      await dirty.auditLog.create({
        data: {
          id: "attempt-1-log",
          userId: admin.id,
          actorRole: "super_admin",
          action: "create",
          entityType: "user",
          entityId: "attempt-1-pagination",
        },
      });
      await dirty.guide.create({
        data: {
          id: "attempt-1-guide",
          slug: "written-during-attempt-1",
          category: [],
          title: {},
          content: {},
          excerpt: {},
          author: "drill",
          updatedAt: new Date(),
        },
      });
    } finally {
      await dirty.$disconnect();
    }

    await resetE2eDatabase(url);

    const prisma = client();
    try {
      // The Super Admin is gone, not reused: this is what let the retry's
      // /admin/setup redirect to /login instead of running.
      expect(await prisma.user.count()).toBe(0);
      // And so is the user whose name a second attempt would have collided
      // with on create (409), the second test in that file that could not run
      // twice.
      expect(
        await prisma.user.findFirst({ where: { username: "pagination-user" } }),
      ).toBeNull();
      expect(await prisma.auditLog.count()).toBe(0);
      expect(
        await prisma.guide.findUnique({
          where: { slug: "written-during-attempt-1" },
        }),
      ).toBeNull();
      // The seed itself is back, not merely emptied.
      expect(
        await prisma.guide.findUnique({ where: { slug: "guide-visible" } }),
      ).not.toBeNull();
      expect(await prisma.calculator.count()).toBeGreaterThan(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("points the suite and the dev server at the same file", () => {
    // The relative form Prisma resolves against prisma/, not the working
    // directory, is the trap this constant exists to remove — and
    // playwright.config.ts hands the server this exact string.
    expect(e2eDatabaseUrl).toBe(`file:${e2eDatabaseFile}`);
    expect(path.isAbsolute(e2eDatabaseFile)).toBe(true);
    expect(e2eDatabaseFile.endsWith(path.join("prisma", "e2e.db"))).toBe(true);
  });
});

/**
 * Bloc 143/C : la remise à zéro, comparée à une base fraîchement amorcée —
 * table par table, ligne par ligne, sans exclusion.
 *
 * Ce que ce fichier vérifiait déjà : quelques compteurs choisis. Le piège
 * qu'il laissait ouvert : un champ mutable qu'aucun compteur ne regarde. Une
 * remise à zéro qui restaure « presque tout » est pire qu'une qui ne restaure
 * rien, parce qu'on lui fait confiance — et un faux échec e2e ressemble à un
 * défaut de code, ce qui envoie chercher un bug qui n'existe pas.
 *
 * D'où la comparaison stricte, et sans liste de colonnes à ignorer : le semis
 * date lui-même ce qu'il crée (`SEEDED_AT`), donc deux remises à zéro rendent
 * un état identique. Exclure les colonnes qui bougent serait précisément
 * l'endroit où un champ non restauré passerait.
 */
describe("Bloc 143/C : la remise à zéro restaure tout, pas presque tout", () => {
  const dumpUrl = `file:${path.join(scratch, "dump.db")}`;

  /** Toutes les tables, toutes les lignes, dans un ordre stable. */
  async function dump() {
    const prisma = new PrismaClient({
      datasourceUrl: singleConnection(dumpUrl),
    });
    try {
      const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      );
      const state: Record<string, string[]> = {};
      for (const { name } of tables) {
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM "${name}"`,
        );
        state[name] = rows
          .map((row) =>
            JSON.stringify(row, (_key, value) =>
              typeof value === "bigint" ? String(value) : value,
            ),
          )
          .sort();
      }
      return state;
    } finally {
      await prisma.$disconnect();
    }
  }

  /** Salir comme le scénario e2e salit : visibilité, contenu, réglages. */
  async function dirty() {
    const prisma = new PrismaClient({
      datasourceUrl: singleConnection(dumpUrl),
    });
    try {
      // La bascule de visibilité d'un outil — celle qui avait fait soupçonner
      // cette fonction au Bloc 141.
      await prisma.calculator.updateMany({ data: { active: false } });
      // Une écriture de contenu de référentiel.
      await prisma.referenceTable.updateMany({ data: { columns: ["sali"] } });
      // Une dépublication de guide.
      await prisma.guide.updateMany({ data: { status: "draft" } });
      // Une langue coupée.
      await prisma.localeSetting.updateMany({ data: { active: false } });
      // Un réglage de site inventé, qui n'existe pas dans l'état semé.
      await prisma.siteSetting.upsert({
        where: { key: "bloc-143-sali" },
        create: {
          key: "bloc-143-sali",
          value: "x",
          updatedAt: new Date("2026-06-06T06:06:06.000Z"),
        },
        update: { value: "x" },
      });
      // Un compte et son journal : le scénario en crée, la base semée n'en a
      // aucun.
      const user = await prisma.user.create({
        data: {
          id: "bloc-143-sali",
          username: "sali",
          passwordHash: "x",
          role: "super_admin",
        },
      });
      await prisma.auditLog.create({
        data: {
          id: "bloc-143-sali",
          userId: user.id,
          actorRole: "super_admin",
          action: "update",
          entityType: "calculator",
          entityId: "x",
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  it("rend un état identique à celui d'une base fraîchement amorcée", async () => {
    await resetE2eDatabase(dumpUrl);
    const fresh = await dump();

    await dirty();
    // La base est bien sale : sans cette vérification, une salissure qui
    // n'écrit rien rendrait la comparaison suivante vide de sens.
    expect(await dump()).not.toEqual(fresh);

    await resetE2eDatabase(dumpUrl);
    expect(await dump()).toEqual(fresh);
  }, 120_000);
});
