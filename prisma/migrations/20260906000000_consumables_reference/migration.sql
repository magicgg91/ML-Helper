-- Bloc 43: Consumables is a brand-new reference (no prior "tool" row to
-- copy its "active" flag from, unlike Templiers/Gemmes) — starts visible.
-- Its rows and free-text intro live in reference_tables/static_content
-- respectively and fall back to code-level defaults (consumables.ts) until
-- an admin edits them, same pattern as every other reference.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "description", "active", "inputs", "outputs", "tips")
VALUES ('calculator-consumables-reference', 'consumables', 'referentiels', '{}', 1, '{}', '{}', '{}');
