-- Bloc 127 (PR 3/3) : le dernier écran de l'audit passe de la paire FR/EN à un
-- champ par langue — les Événements, et les paliers de chacun d'eux.
--
-- Aucune modification de schéma : la ligne `events` de `reference_tables` porte
-- déjà du JSON. Seule la forme change, sur quatre champs :
--
--   name                                ->  name        = { "fr": …, … }
--   description_fr / description_en     ->  description = { … }
--   objective_fr / objective_en         ->  objective   = { … }   (par palier)
--   reward_fr / reward_en               ->  reward      = { … }   (par palier)
--
-- Le **nom** n'était pas une paire mais une chaîne unique : le même texte pour
-- les cinq langues. Il devient du français, la langue dans laquelle il a été
-- saisi ; un visiteur allemand le lisait déjà tel quel, il le lira désormais
-- par repli — et pourra être traduit, ce qui était impossible.
--
-- Une langue vide est **absente** de l'objet plutôt qu'écrite `""` (Bloc
-- 126/D) : `""` est une traduction qui existe et ne dit rien, sur laquelle la
-- lecture s'arrête au lieu de se replier.
--
-- ⚠️ Deux ordres portent ici du sens, et tous deux sont réaffirmés par un
-- `ORDER BY` plutôt que laissés au hasard de l'agrégation :
--
--   * `events` — les événements s'enchaînent bout à bout dans la saison, et
--     c'est leur ordre qui place chaque segment sur la frise publique (la
--     durée cumulée de ceux qui précèdent donne le « Jx-Jy » de chacun).
--     Les intervertir décalerait toute la saison.
--   * `tiers` — le **dernier** palier d'un événement est son objectif final,
--     et c'est à ce titre qu'il s'affiche en pastille sur la tuile publique
--     (`lastTier`, events-reference.tsx). Les intervertir changerait ce que
--     la tuile annonce.
--
-- Vérifié en appliquant ce fichier par `prisma` sur une base jetable portant
-- des événements et des paliers de la forme réellement livrée :
-- `src/lib/events-migration.test.ts`.
--
-- Les gardes sont celles des deux PR précédentes, dans le même ordre :
--
--  1. **Le champ par langue gagne** quand les deux formes coexistent sur la
--     même ligne — la règle de `parseLocalizedFieldPair` côté lecture. Sans
--     elle, la paire FR/EN écraserait un objet portant déjà DE/ES/TR, qu'elle
--     ne sait pas exprimer (revue Codex P1 sur la PR #168).
--  2. Sinon, la paire est convertie, la langue vide retirée.
--  3. Une ligne qui ne porte plus aucune clé de paire traverse **intacte**,
--     enveloppée de `json(...)` pour que l'agrégation la reprenne comme objet
--     et non comme une chaîne contenant du JSON.

UPDATE "reference_tables"
SET "rows" = (
  SELECT json_group_object(
    league."key",
    json_set(
      league.value,
      '$.events',
      (
        SELECT json_group_array(
          CASE
            WHEN json_type(event.value, '$.description_fr') IS NOT NULL
              OR json_type(event.value, '$.description_en') IS NOT NULL
              OR json_type(event.value, '$.name') = 'text'
              OR EXISTS (
                SELECT 1
                FROM json_each(coalesce(json_extract(event.value, '$.tiers'), '[]')) AS probe
                WHERE json_type(probe.value, '$.objective_fr') IS NOT NULL
                  OR json_type(probe.value, '$.objective_en') IS NOT NULL
                  OR json_type(probe.value, '$.reward_fr') IS NOT NULL
                  OR json_type(probe.value, '$.reward_en') IS NOT NULL
              )
            THEN json_remove(
              json_set(
                json_set(
                  json_set(
                    event.value,
                    '$.name',
                    CASE
                      -- Garde 1 : le nom est déjà un objet, au moins une
                      -- langue écrite dedans.
                      WHEN (
                        SELECT count(*)
                        FROM json_each(
                          CASE
                            WHEN json_type(event.value, '$.name') = 'object'
                            THEN json_extract(event.value, '$.name')
                            ELSE '{}'
                          END
                        ) AS written
                        WHERE trim(coalesce(written.value, '')) <> ''
                      ) > 0
                      THEN json(json_extract(event.value, '$.name'))
                      -- La chaîne unique d'avant ce bloc devient du français.
                      WHEN trim(coalesce(json_extract(event.value, '$.name'), '')) <> ''
                      THEN json_object('fr', json_extract(event.value, '$.name'))
                      ELSE json('{}')
                    END
                  ),
                  '$.description',
                  CASE
                    WHEN (
                      SELECT count(*)
                      FROM json_each(
                        coalesce(json_extract(event.value, '$.description'), '{}')
                      ) AS written
                      WHERE trim(coalesce(written.value, '')) <> ''
                    ) > 0
                    THEN json(json_extract(event.value, '$.description'))
                    WHEN json_type(event.value, '$.description_fr') IS NOT NULL
                      OR json_type(event.value, '$.description_en') IS NOT NULL
                    -- `json_object` ne sait pas omettre une clé sous
                    -- condition : les deux sont écrites, puis celles dont la
                    -- valeur est vide sont retirées. Le chemin bidon
                    -- '$.absent' est la branche « ne rien retirer » — un NULL
                    -- y rendrait NULL l'appel entier.
                    THEN json_remove(
                      json_object(
                        'fr', json_extract(event.value, '$.description_fr'),
                        'en', json_extract(event.value, '$.description_en')
                      ),
                      CASE
                        WHEN trim(coalesce(json_extract(event.value, '$.description_fr'), '')) = ''
                        THEN '$.fr' ELSE '$.absent'
                      END,
                      CASE
                        WHEN trim(coalesce(json_extract(event.value, '$.description_en'), '')) = ''
                        THEN '$.en' ELSE '$.absent'
                      END
                    )
                    ELSE json(coalesce(json_extract(event.value, '$.description'), '{}'))
                  END
                ),
                '$.tiers',
                (
                  SELECT json_group_array(
                    CASE
                      WHEN json_type(tier.value, '$.objective_fr') IS NOT NULL
                        OR json_type(tier.value, '$.objective_en') IS NOT NULL
                        OR json_type(tier.value, '$.reward_fr') IS NOT NULL
                        OR json_type(tier.value, '$.reward_en') IS NOT NULL
                      THEN json_remove(
                        json_set(
                          json_set(
                            tier.value,
                            '$.objective',
                            CASE
                              WHEN (
                                SELECT count(*)
                                FROM json_each(
                                  coalesce(json_extract(tier.value, '$.objective'), '{}')
                                ) AS written
                                WHERE trim(coalesce(written.value, '')) <> ''
                              ) > 0
                              THEN json(json_extract(tier.value, '$.objective'))
                              WHEN json_type(tier.value, '$.objective_fr') IS NOT NULL
                                OR json_type(tier.value, '$.objective_en') IS NOT NULL
                              THEN json_remove(
                                json_object(
                                  'fr', json_extract(tier.value, '$.objective_fr'),
                                  'en', json_extract(tier.value, '$.objective_en')
                                ),
                                CASE
                                  WHEN trim(coalesce(json_extract(tier.value, '$.objective_fr'), '')) = ''
                                  THEN '$.fr' ELSE '$.absent'
                                END,
                                CASE
                                  WHEN trim(coalesce(json_extract(tier.value, '$.objective_en'), '')) = ''
                                  THEN '$.en' ELSE '$.absent'
                                END
                              )
                              ELSE json(coalesce(json_extract(tier.value, '$.objective'), '{}'))
                            END
                          ),
                          '$.reward',
                          CASE
                            WHEN (
                              SELECT count(*)
                              FROM json_each(
                                coalesce(json_extract(tier.value, '$.reward'), '{}')
                              ) AS written
                              WHERE trim(coalesce(written.value, '')) <> ''
                            ) > 0
                            THEN json(json_extract(tier.value, '$.reward'))
                            WHEN json_type(tier.value, '$.reward_fr') IS NOT NULL
                              OR json_type(tier.value, '$.reward_en') IS NOT NULL
                            THEN json_remove(
                              json_object(
                                'fr', json_extract(tier.value, '$.reward_fr'),
                                'en', json_extract(tier.value, '$.reward_en')
                              ),
                              CASE
                                WHEN trim(coalesce(json_extract(tier.value, '$.reward_fr'), '')) = ''
                                THEN '$.fr' ELSE '$.absent'
                              END,
                              CASE
                                WHEN trim(coalesce(json_extract(tier.value, '$.reward_en'), '')) = ''
                                THEN '$.en' ELSE '$.absent'
                              END
                            )
                            ELSE json(coalesce(json_extract(tier.value, '$.reward'), '{}'))
                          END
                        ),
                        '$.objective_fr', '$.objective_en',
                        '$.reward_fr', '$.reward_en'
                      )
                      ELSE json(tier.value)
                    END
                    ORDER BY tier."key"
                  )
                  FROM json_each(coalesce(json_extract(event.value, '$.tiers'), '[]')) AS tier
                )
              ),
              '$.description_fr', '$.description_en'
            )
            ELSE json(event.value)
          END
          ORDER BY event."key"
        )
        FROM json_each(coalesce(json_extract(league.value, '$.events'), '[]')) AS event
      )
    )
  )
  FROM json_each("reference_tables"."rows") AS league
)
WHERE "key" = 'events'
  AND json_type("rows") = 'object';
