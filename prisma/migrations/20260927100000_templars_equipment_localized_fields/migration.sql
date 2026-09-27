-- Bloc 127 (PR 2/3) : les deux écrans suivants de l'audit passent de la paire
-- FR/EN à un champ par langue — la présentation des Templiers, et les libellés
-- de métrique des Équipements de Combat et d'Expédition.
--
-- Aucune modification de schéma : les trois lignes concernées sont des lignes
-- de `reference_tables` dont la colonne `rows` porte du JSON. Seule la forme
-- change :
--
--   name_fr / name_en                   ->  name         = { "fr": …, "en": … }
--   description_fr / description_en     ->  description  = { … }
--   metric_label_fr / metric_label_en   ->  metric_label = { … }
--
-- Une langue vide est **absente** de l'objet plutôt qu'écrite `""` : le Bloc
-- 126/D a montré ce que coûte la différence, et pour les libellés de métrique
-- elle coûte encore plus cher — un `""` empêcherait le libellé par défaut,
-- pourtant traduit dans les cinq langues, de reprendre la main.
--
-- Pourquoi en SQL et pas seulement à la lecture : les deux modules savent lire
-- les deux formes, donc rien n'y obligeait. Mais un repli de lecture n'est pas
-- une migration — il laisse la base dans l'ancienne forme indéfiniment. Ici la
-- donnée passe à la forme nouvelle une fois, et le repli ne reste que comme
-- filet (sauvegarde restaurée d'avant, image pas encore déployée).
--
-- Vérifié en appliquant ce fichier par `prisma` sur des bases jetables portant
-- les données réelles des deux écrans : voir
-- `src/lib/templars-equipment-migration.test.ts`.
--
-- Comme pour la Boutique (PR 1/3), une ligne qui ne porte plus aucune clé de
-- paire traverse **intacte** : sans cette garde, son objet serait reconstruit
-- depuis des paires absentes, donc vidé — avec ses DE/ES/TR.

-- 1. Templiers : la ligne est un objet, une clé par templier.
UPDATE "reference_tables"
SET "rows" = (
  SELECT json_group_object(
    templar."key",
    CASE
      WHEN json_type(templar.value, '$.name_fr') IS NOT NULL
        OR json_type(templar.value, '$.name_en') IS NOT NULL
        OR json_type(templar.value, '$.description_fr') IS NOT NULL
        OR json_type(templar.value, '$.description_en') IS NOT NULL
      THEN json_remove(
        json_set(
          json_set(
            templar.value,
            '$.name',
            CASE
              WHEN json_type(templar.value, '$.name_fr') IS NOT NULL
                OR json_type(templar.value, '$.name_en') IS NOT NULL
              -- `json_object` ne sait pas omettre une clé sous condition : les
              -- deux sont écrites, puis celles dont la valeur est vide sont
              -- retirées. Le chemin bidon '$.absent' est la branche « ne rien
              -- retirer » — un NULL ici rendrait NULL l'appel entier.
              THEN json_remove(
                json_object(
                  'fr', json_extract(templar.value, '$.name_fr'),
                  'en', json_extract(templar.value, '$.name_en')
                ),
                CASE
                  WHEN trim(coalesce(json_extract(templar.value, '$.name_fr'), '')) = ''
                  THEN '$.fr' ELSE '$.absent'
                END,
                CASE
                  WHEN trim(coalesce(json_extract(templar.value, '$.name_en'), '')) = ''
                  THEN '$.en' ELSE '$.absent'
                END
              )
              ELSE json(coalesce(json_extract(templar.value, '$.name'), '{}'))
            END
          ),
          '$.description',
          CASE
            WHEN json_type(templar.value, '$.description_fr') IS NOT NULL
              OR json_type(templar.value, '$.description_en') IS NOT NULL
            THEN json_remove(
              json_object(
                'fr', json_extract(templar.value, '$.description_fr'),
                'en', json_extract(templar.value, '$.description_en')
              ),
              CASE
                WHEN trim(coalesce(json_extract(templar.value, '$.description_fr'), '')) = ''
                THEN '$.fr' ELSE '$.absent'
              END,
              CASE
                WHEN trim(coalesce(json_extract(templar.value, '$.description_en'), '')) = ''
                THEN '$.en' ELSE '$.absent'
              END
            )
            ELSE json(coalesce(json_extract(templar.value, '$.description'), '{}'))
          END
        ),
        '$.name_fr', '$.name_en', '$.description_fr', '$.description_en'
      )
      ELSE templar.value
    END
  )
  FROM json_each("reference_tables"."rows") AS templar
)
WHERE "key" = 'templars-presentation'
  AND json_type("rows") = 'object';

-- 2. Équipements : la ligne est un tableau, dont l'ordre est le sens (Fusion,
--    Gemmes, Destruction pour le Combat ; Fusion, Destruction pour
--    l'Expédition). Il est réaffirmé plutôt que laissé au hasard de
--    l'agrégation.
UPDATE "reference_tables"
SET "rows" = (
  SELECT json_group_array(
    CASE
      WHEN json_type(metric.value, '$.metric_label_fr') IS NOT NULL
        OR json_type(metric.value, '$.metric_label_en') IS NOT NULL
      THEN json_remove(
        json_set(
          metric.value,
          '$.metric_label',
          json_remove(
            json_object(
              'fr', json_extract(metric.value, '$.metric_label_fr'),
              'en', json_extract(metric.value, '$.metric_label_en')
            ),
            CASE
              WHEN trim(coalesce(json_extract(metric.value, '$.metric_label_fr'), '')) = ''
              THEN '$.fr' ELSE '$.absent'
            END,
            CASE
              WHEN trim(coalesce(json_extract(metric.value, '$.metric_label_en'), '')) = ''
              THEN '$.en' ELSE '$.absent'
            END
          )
        ),
        '$.metric_label_fr', '$.metric_label_en'
      )
      ELSE metric.value
    END
    ORDER BY metric."key"
  )
  FROM json_each("reference_tables"."rows") AS metric
)
WHERE "key" IN ('combat_equipment_secondary', 'expedition_equipment_secondary')
  AND json_type("rows") = 'array';
