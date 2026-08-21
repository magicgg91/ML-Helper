INSERT OR IGNORE INTO "calculators" ("id", "slug", "category", "name", "description", "active", "inputs", "outputs", "tips") VALUES
('calculator-xp-gain-rate', 'xp-gain-rate', 'combat', '{"fr":"Taux de gain d''XP","en":"XP Gain Rate"}', '{}', true, '{}', '{}', '{}'),
('calculator-demo-attack-troops', 'demo-attack-troops', 'combat', '{"fr":"Troupes en attaque démo","en":"Demo Attack Troops"}', '{}', true, '{}', '{}', '{}');

INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "label", "formula_params")
SELECT 'formula-xp-gain-tiers', "id", 'xp_gain_tiers', '{"fr":"Paliers de gain d''XP","en":"XP gain tiers"}', '{"tiers":[{"low":0,"high":40,"rate":0},{"low":40,"high":50,"rate":50},{"low":50,"high":150,"rate":100},{"low":150,"high":200,"rate":150},{"low":200,"high":null,"rate":200}]}' FROM "calculators" WHERE "slug" = 'xp-gain-rate';

INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "label", "formula_params")
SELECT 'formula-demo-attack-percentages', "id", 'demo_attack_percentages', '{"fr":"Pourcentages d''attaque démo","en":"Demo attack percentages"}', '{"percentages":{"bronze":100,"silver":50,"gold":40,"platinum":40,"diamond":30,"legend":30}}' FROM "calculators" WHERE "slug" = 'demo-attack-troops';
