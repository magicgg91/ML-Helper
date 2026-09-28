-- Bloc 119: a guide had two states for one question. `status` said draft /
-- pending_review / published, and `active` said visible / hidden, and the
-- public site only ever showed a guide that was BOTH published AND active.
-- Two switches, one meaning, and an admin screen that showed them side by
-- side without saying which one won.
--
-- `status` becomes the single state. A guide that was published but not
-- active was invisible to everyone, so it becomes a draft — and loses its
-- publication date with it, exactly as unpublishing it through the admin
-- would have done. A guide that was active but not published was already a
-- draft and stays one; pending_review is untouched, because it is a step of
-- the editorial workflow (a Gestion Guides account submits, a publisher
-- publishes) and not a second visibility flag.
UPDATE "guides"
SET "status" = 'draft', "published_at" = NULL
WHERE "status" = 'published' AND "active" = 0;

-- SQLite drops a column by rebuilding the table (same dance as
-- 20260825000000_guide_multi_categories).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "excerpt" JSONB NOT NULL,
    "cover_image" TEXT,
    "author" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "published_at" DATETIME
);

INSERT INTO "new_guides" (
  "id", "slug", "category", "status", "title", "content",
  "excerpt", "cover_image", "author", "created_at", "updated_at", "published_at"
)
SELECT
  "id", "slug", "category", "status", "title", "content",
  "excerpt", "cover_image", "author", "created_at", "updated_at", "published_at"
FROM "guides";

DROP TABLE "guides";
ALTER TABLE "new_guides" RENAME TO "guides";
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");
-- Bloc 93/F5's index, minus the column that left: every public read filters
-- on the status and orders by published_at.
CREATE INDEX "guides_status_published_at_idx" ON "guides"("status", "published_at");

PRAGMA foreign_keys=ON;
