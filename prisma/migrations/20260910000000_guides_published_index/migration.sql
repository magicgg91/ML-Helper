-- Bloc 93/F5: every public read of guides filters on (status, active) and
-- orders by published_at — the guides list, the home page, the public layout
-- (so, on every public request) and the sitemap. Slug lookups are already
-- served by the unique index on slug. Guides are only ever written from the
-- admin, so the index's write cost is negligible against that read frequency.
CREATE INDEX "guides_status_active_published_at_idx" ON "guides"("status", "active", "published_at");
