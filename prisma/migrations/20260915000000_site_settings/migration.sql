-- Bloc 100: named site-wide settings edited from the admin Configuration tab,
-- starting with the visit-tracking script URL. One row per key, so a future
-- Configuration section needs no migration of its own.
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);
