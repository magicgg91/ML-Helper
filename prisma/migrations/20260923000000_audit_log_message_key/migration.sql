-- Bloc 116/C: the audit log's message becomes a translation key plus its
-- parameters, so /admin/logs can render it in the admin's own language
-- (EN/FR) instead of the French sentence the writer froze into the row.
--
-- The existing "message" column is kept, not dropped: it holds the only copy
-- of what every entry written before this migration says, and a French
-- sentence cannot be parsed back into a key and parameters without guessing.
-- Prisma now calls it legacyMessage; nothing writes it, and /admin/logs shows
-- it verbatim for rows whose message_key is empty.
ALTER TABLE "audit_logs" ADD COLUMN "message_key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "audit_logs" ADD COLUMN "message_params" TEXT NOT NULL DEFAULT '{}';
