import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "reference_tables"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "calculators"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "guides"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "audit_logs"');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "users"');
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "users" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL, "password_hash" TEXT NOT NULL, "role" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_login_at" DATETIME)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "users_username_key" ON "users"("username")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "audit_logs" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT NOT NULL, "diff" JSONB, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "calculators" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL, "name" JSONB NOT NULL, "description" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT false, "inputs" JSONB NOT NULL, "outputs" JSONB NOT NULL, "tips" JSONB NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "calculators_slug_key" ON "calculators"("slug")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "guides" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'draft\', "title" JSONB NOT NULL, "content" JSONB NOT NULL, "excerpt" JSONB NOT NULL, "cover_image" TEXT, "author" TEXT NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL, "published_at" DATETIME)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE "reference_tables" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "label" JSONB NOT NULL, "columns" JSONB NOT NULL, "rows" JSONB NOT NULL, "calculator_id" TEXT)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "reference_tables_key_key" ON "reference_tables"("key")',
  );
  await prisma.$disconnect();
}
main().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});
