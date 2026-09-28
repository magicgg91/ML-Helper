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

/**
 * La même base, mais avec une seule connexion.
 *
 * Prisma ouvre par défaut `cœurs × 2 + 1` connexions SQLite. Deux
 * instructions consécutives d'un même client peuvent donc partir sur deux
 * connexions différentes, et sous charge la seconde ne voit pas toujours ce
 * que la première vient de faire : `DROP INDEX "x"` suivi de
 * `CREATE INDEX "x"` échoue alors sur « index x already exists ».
 *
 * Mesuré ici, la suite complète tournant en parallèle : 14 échecs sur 25
 * exécutions du fichier de test de la remise à zéro, sur les deux noms que
 * la CI avait signalés (`audit_logs_created_at_idx`, `users_username_key`).
 * Avec une seule connexion, les mêmes 25 exécutions passent — c'est ce qui
 * transforme deux échecs de CI « inexpliqués » en une cause nommée.
 *
 * Réservé aux clients qui enchaînent du DDL brut : l'application, elle, ne
 * fait que des requêtes et gagne à garder son pool.
 */
export function singleConnection(databaseUrl: string) {
  return `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=1`;
}
