INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "name", "description", "active", "inputs", "outputs", "tips") VALUES
('calculator-level-up', 'level-up', 'referentiels', '{"fr":"Level Up","en":"Level Up"}', '{}', true, '{}', '{}', '{}');

INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "label", "formula_params")
SELECT 'formula-level-up', "id", 'level_up_parameters', '{"fr":"Paramètres Level Up","en":"Level Up parameters"}', '{"xp":{"base":50,"ratio":1.3},"troops":{"bronze":{"coefficient":32.2028,"ratio":1.245},"gold":{"coefficient":32.49,"ratio":1.24},"platinum":{"coefficient":35.88,"ratio":1.237},"diamond":{"coefficient":32.2028,"ratio":1.245},"legend":{"coefficient":32.2028,"ratio":1.245}},"maxLevel":150,"columnSize":30,"pageSize":60,"chestInterval":10}' FROM "calculators" WHERE "slug" = 'level-up';
