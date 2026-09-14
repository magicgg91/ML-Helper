-- Bloc 93/F1: aligns audit_logs with schema.prisma.
--
-- 20260817000000_audit_actor_role added the column as
-- `actor_role TEXT NOT NULL DEFAULT 'unknown'` so existing rows could be
-- backfilled, but schema.prisma declares `actorRole String` with no
-- @default. The database therefore carried a default the schema did not
-- know about: `prisma migrate diff` was never empty, so it could not serve
-- as a CI drift guard, and a future `prisma migrate dev` would have emitted
-- this same migration as an unexplained stray.
--
-- Dropping the default rather than adding @default("unknown") to the schema
-- keeps `actorRole` a required field in Prisma's create input. It is an
-- audit-trail column: a caller that forgets it should fail loudly, not
-- silently record 'unknown'. Every application write already passes it
-- explicitly (saveReferenceTable, saveFormulaParameters and the admin
-- routes), so no code changes with it.
--
-- SQLite cannot ALTER a column's default, hence the table rebuild. This
-- also restores the declared column order, which ALTER TABLE ADD COLUMN had
-- left with actor_role and message appended at the end.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "actor_role", "created_at", "diff", "entity_id", "entity_type", "id", "message", "user_id") SELECT "action", "actor_role", "created_at", "diff", "entity_id", "entity_type", "id", "message", "user_id" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
