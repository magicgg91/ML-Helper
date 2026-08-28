-- Bloc 33/G: Templars' reference used to share the "templars" Calculator
-- row (and its single "active" column) with the tool itself, so toggling
-- one in the admin UI silently toggled the other. Giving the reference its
-- own row lets the two stay independent, same as combat-equipment/
-- expedition-equipment/level-up already are for their own tools. The
-- shared formula params (base/ratio) and edit point are untouched — this
-- row only needs to exist and carry its own "active" flag. Its initial
-- "active" value is copied from the existing "templars" row rather than
-- hard-coded to true, so an installation that already had the reference
-- hidden (templars.active = false) doesn't have it reappear on upgrade.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "description", "active", "inputs", "outputs", "tips")
SELECT 'calculator-templiers-reference', 'templiers', 'referentiels', '{}', "active", '{}', '{}', '{}'
FROM "calculators" WHERE "slug" = 'templars';
