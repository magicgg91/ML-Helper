INSERT OR IGNORE INTO "formulas" (
  "id",
  "calculator_id",
  "key",
  "label",
  "formula_params"
)
SELECT
  'formula-city-parameters',
  "id",
  'city_parameters',
  '{"en":"Shared City parameters","fr":"Paramètres Villes partagés"}',
  '{"vp":{"base":20,"ratio":1.115},"walls":{"base":70,"ratio":1.2},"cost":{"base":10,"ratio":1.2},"multipliers":{"bronze":{"army":2,"gold":5},"silver":{"army":2.25,"gold":6.25},"gold":{"army":2.75,"gold":8.75},"platinum":{"army":2.75,"gold":8.75},"diamond":{"army":3,"gold":10},"legend":{"army":3,"gold":10}}}'
FROM "calculators"
WHERE "slug" = 'city-cost';
