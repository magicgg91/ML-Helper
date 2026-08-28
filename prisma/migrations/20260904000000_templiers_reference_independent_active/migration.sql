-- Bloc 33/G: Templars' reference used to share the "templars" Calculator
-- row (and its single "active" column) with the tool itself, so toggling
-- one in the admin UI silently toggled the other. Giving the reference its
-- own row lets the two stay independent, same as combat-equipment/
-- expedition-equipment/level-up already are for their own tools. The
-- shared formula params (base/ratio) and edit point are untouched — this
-- row only needs to exist and carry its own "active" flag.
INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "name", "description", "active", "inputs", "outputs", "tips") VALUES
('calculator-templiers-reference', 'templiers', 'referentiels', '{"fr":"Templiers","en":"Templars"}', '{}', true, '{}', '{}', '{}');
