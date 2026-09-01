-- Bloc 60: "Événements" is a brand-new reference (no prior "tool" row to
-- copy its "active" flag from, same as consommables) — but unlike
-- consommables it ships with zero starting data (the joueur fills it in
-- progressively), so it starts INACTIVE and hidden from the public site
-- until an admin has entered enough content to switch it on themselves.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "description", "active", "inputs", "outputs", "tips")
VALUES ('calculator-events-reference', 'events', 'referentiels', '{}', 0, '{}', '{}', '{}');
