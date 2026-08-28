-- Bloc 36/A: same pattern as the "templiers" reference (see
-- 20260904000000_templiers_reference_independent_active) — the new Gems
-- reference gets its own Calculator row from day one, independent from the
-- "gems" tool row, so toggling one never toggles the other. Only the
-- formula params (skillLeagueValue/gemPrice) and their edit point stay
-- shared, via adminToolEditHref. Initial "active" is copied from the
-- existing "gems" row rather than hard-coded to true, so an installation
-- that already had the Gems tool hidden doesn't have the reference
-- reappear on upgrade.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "description", "active", "inputs", "outputs", "tips")
SELECT 'calculator-gemmes-reference', 'gemmes', 'referentiels', '{}', "active", '{}', '{}', '{}'
FROM "calculators" WHERE "slug" = 'gems';
