PRAGMA foreign_keys=OFF;

CREATE TABLE "new_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "active" BOOLEAN NOT NULL DEFAULT true,
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
  "id", "slug", "category", "status", "active", "title", "content",
  "excerpt", "cover_image", "author", "created_at", "updated_at", "published_at"
)
SELECT
  "id", "slug",
  CASE "category"
    WHEN 'debutants' THEN json_array('debuter')
    WHEN 'stuff' THEN json_array('equipement')
    ELSE json_array("category")
  END,
  "status", "active", "title", "content", "excerpt", "cover_image",
  "author", "created_at", "updated_at", "published_at"
FROM "guides";

DROP TABLE "guides";
ALTER TABLE "new_guides" RENAME TO "guides";
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");

PRAGMA foreign_keys=ON;
