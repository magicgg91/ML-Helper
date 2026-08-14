import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
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
  await prisma.$disconnect();
}
main().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});
