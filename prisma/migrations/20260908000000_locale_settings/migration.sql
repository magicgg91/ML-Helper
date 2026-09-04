-- Bloc 90: per-locale public visibility (activate/deactivate a language from
-- the admin Configuration tab). One row per locale that has been toggled; a
-- locale with no row defaults to active. The 5 translation JSON files stay
-- static in the repo — this only governs the public language selector and the
-- disabled-locale redirect, never the admin editorial locales.
CREATE TABLE "locale_settings" (
    "locale" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL
);
