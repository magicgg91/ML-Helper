INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "label", "formula_params")
SELECT 'formula-templar-cost', "id", 'templar_cost',
       '{"en":"Templar cost","fr":"Coût des Templiers"}',
       '{"base":150,"ratio":1.3}'
FROM "calculators" WHERE "slug" = 'templars';

DELETE FROM "reference_tables" WHERE "key" = 'templar_costs';
