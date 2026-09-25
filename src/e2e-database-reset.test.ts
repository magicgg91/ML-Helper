// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { e2eDatabaseFile, e2eDatabaseUrl } from "../prisma/e2e-database";
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

const client = () => new PrismaClient({ datasourceUrl: url });

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
