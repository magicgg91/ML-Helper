import path from "node:path";

/**
 * Bloc 121: the e2e database's location, in one place.
 *
 * `DATABASE_URL=file:./e2e.db` — the relative form this used to be written
 * with — is resolved by Prisma against `prisma/`, the schema's own directory,
 * not against the working directory. That is fine for a single reader, and a
 * trap the moment a second one appears: the Playwright process building its
 * own client from the same string would be pointing somewhere else entirely.
 * One absolute path, computed from the repository root, is what the dev
 * server, `pnpm test:e2e:prepare` and the per-attempt reset all read.
 *
 * No Prisma import here on purpose — playwright.config.ts loads this module,
 * and a config file should not pull in a database client to learn a path.
 */
export const e2eDatabaseFile = path.join(process.cwd(), "prisma", "e2e.db");
export const e2eDatabaseUrl = `file:${e2eDatabaseFile}`;
