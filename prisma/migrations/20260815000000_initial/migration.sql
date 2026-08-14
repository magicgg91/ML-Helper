CREATE TABLE "guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
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

CREATE TABLE "calculators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "tips" JSONB NOT NULL
);

CREATE TABLE "formulas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculator_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "formula_params" JSONB NOT NULL,
    CONSTRAINT "formulas_calculator_id_fkey" FOREIGN KEY ("calculator_id") REFERENCES "calculators" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "reference_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "calculator_id" TEXT,
    CONSTRAINT "reference_tables_calculator_id_fkey" FOREIGN KEY ("calculator_id") REFERENCES "calculators" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" DATETIME
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "static_content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT NOT NULL,
    CONSTRAINT "static_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");
CREATE UNIQUE INDEX "calculators_slug_key" ON "calculators"("slug");
CREATE UNIQUE INDEX "formulas_calculator_id_key_key" ON "formulas"("calculator_id", "key");
CREATE UNIQUE INDEX "reference_tables_key_key" ON "reference_tables"("key");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE UNIQUE INDEX "static_content_key_key" ON "static_content"("key");
