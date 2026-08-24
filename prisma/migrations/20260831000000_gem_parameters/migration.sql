-- Moves the Gems simulator's base values (skill/league factors) and
-- purchase prices out of hardcoded TypeScript constants into an
-- admin-editable Formula row, matching every other confirmed formula
-- (Villes, Templiers, XP, attaque démo).
INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "formula_params")
SELECT
  'formula-gem-parameters',
  "id",
  'gem_parameters',
  '{"skillFactor":{"striker":1,"brave":1,"scavenger":1,"guardian":1.5,"fearless":1,"prosperous":1.5,"recruiter":1.5,"cautious":0.5,"salvager":0.5,"rusher":2.5},"leagueFactor":{"bronze":1,"silver":2,"gold":3,"platinum":4,"diamond":5,"legend":6},"gemPrice":{"silver":3000,"gold":4000,"platinum":5000,"diamond":6000,"legend":7000}}'
FROM "calculators"
WHERE "slug" = 'gems';
