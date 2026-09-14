-- Moves the Gems simulator's base values (one independent value per
-- skill/league cell, ported as-is from the prototype's GEM_VALUES_FR) and
-- purchase prices out of hardcoded TypeScript constants into an
-- admin-editable Formula row, matching every other confirmed formula
-- (Villes, Templiers, XP, attaque démo).
INSERT OR IGNORE INTO "formulas" ("id", "calculator_id", "key", "formula_params")
SELECT
  'formula-gem-parameters',
  "id",
  'gem_parameters',
  '{"skillLeagueValue":{"striker":{"bronze":1,"silver":2,"gold":3,"platinum":4,"diamond":5,"legend":6},"brave":{"bronze":1,"silver":2,"gold":3,"platinum":4,"diamond":5,"legend":6},"scavenger":{"bronze":1,"silver":2,"gold":3,"platinum":4,"diamond":5,"legend":6},"guardian":{"bronze":1.5,"silver":3,"gold":4.5,"platinum":6,"diamond":7.5,"legend":9},"fearless":{"bronze":1,"silver":2,"gold":3,"platinum":4,"diamond":5,"legend":6},"prosperous":{"bronze":1.5,"silver":3,"gold":4.5,"platinum":6,"diamond":7.5,"legend":9},"recruiter":{"bronze":1.5,"silver":3,"gold":4.5,"platinum":6,"diamond":7.5,"legend":9},"cautious":{"bronze":0.5,"silver":1,"gold":1.5,"platinum":2,"diamond":2.5,"legend":3},"salvager":{"bronze":0.5,"silver":1,"gold":1.5,"platinum":2,"diamond":2.5,"legend":3},"rusher":{"bronze":2.5,"silver":5,"gold":7.5,"platinum":10,"diamond":12.5,"legend":15}},"gemPrice":{"silver":3000,"gold":4000,"platinum":5000,"diamond":6000,"legend":7000}}'
FROM "calculators"
WHERE "slug" = 'gems';
