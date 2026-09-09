ALTER TABLE "users" ADD COLUMN "totp_secret_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "login_throttles" (
  "identifier_hash" TEXT NOT NULL PRIMARY KEY,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" DATETIME,
  "updated_at" DATETIME NOT NULL
);
