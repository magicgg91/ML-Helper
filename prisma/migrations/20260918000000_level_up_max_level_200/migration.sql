-- Bloc 63/B: the Progression reference now runs to level 200, the highest
-- reachable in game. maxLevel is not one of the fields the admin editor
-- exposes, so the only value this row can hold is the 150 seeded by
-- 20260824010000_level_up_reference — raising the code default alone would
-- leave every existing install capped at 150, because the stored row wins
-- (parseLevelUpParameters reads it and only falls back when it is absent).
--
-- Guarded on that seeded 150 so an operator who has deliberately set another
-- value keeps it, and so re-running this on an already-migrated row is a
-- no-op. The troop and XP formulas are unchanged and already valid over the
-- whole span (Blocs 98 and 107): nothing else in the row moves.
UPDATE "formulas"
SET "formula_params" = json_set("formula_params", '$.maxLevel', 200)
WHERE "key" = 'level_up_parameters'
  AND json_extract("formula_params", '$.maxLevel') = 150;
