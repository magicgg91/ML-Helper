-- Bloc 43: Consumables is a brand-new reference (no prior "tool" row to
-- copy its "active" flag from, unlike Templiers/Gemmes) — starts visible.
-- Its rows and free-text intro live in reference_tables/static_content
-- respectively and fall back to code-level defaults (consumables.ts) until
-- an admin edits them, same pattern as every other reference.
-- Bloc 44 review: the public slug is French ("consommables"), matching
-- templiers/gemmes and the URL from the original task spec — only this
-- row's slug value changed, every internal technical key stays English.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "description", "active", "inputs", "outputs", "tips")
VALUES ('calculator-consumables-reference', 'consommables', 'referentiels', '{}', 1, '{}', '{}', '{}');
