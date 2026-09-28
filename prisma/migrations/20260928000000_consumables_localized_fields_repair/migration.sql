-- Bloc 143/B : la garde manquante de `20260927000000_consumables_localized_fields`.
--
-- Cette migration-là (PR #167, mergée) convertit les paires FR/EN de la
-- Boutique en un champ par langue. Elle entre dans sa branche de conversion dès
-- qu'une seule clé de paire existe sur la ligne, et reconstruit alors `$.name`
-- et `$.description` **depuis la paire seule**. Si la ligne portait déjà la
-- forme objet — avec DE/ES/TR dedans — et une paire résiduelle à côté, la paire
-- écrase l'objet et les trois langues disparaissent.
--
-- Codex a relevé exactement ce motif sur la PR #168 (Templiers/Équipements), où
-- la règle « le champ par langue gagne sur la paire quand les deux coexistent »
-- a été ajoutée, puis reprise d'avance par la PR #169 (Événements). La PR #167
-- avait été mergée avant et ne l'a jamais eue. Vérifié en lisant les trois
-- fichiers : la garde est présente 3 fois sur 3 champs convertis dans #168,
-- 4 fois sur 4 dans #169, et 0 fois sur 2 dans #167.
--
-- Pourquoi un nouveau fichier et non une correction de l'ancien : une migration
-- déjà appliquée ne s'édite jamais. Prisma enregistre la somme de contrôle du
-- fichier ; la modifier fait échouer `migrate deploy` sur toute base où elle a
-- déjà tourné, avec un message de dérive et aucun moyen simple de repartir.
--
-- CE QUE CE FICHIER NE PEUT PAS FAIRE, et il faut le dire clairement : il
-- s'exécute **après** celui qu'il corrige. Sur une base qui n'a pas encore passé
-- la migration d'origine, c'est elle qui tourne d'abord ; si la coexistence
-- existe à ce moment-là, les langues sont perdues avant que cette réparation
-- n'ait la main, et rien ne les restaure — une réparation ne ressuscite pas une
-- donnée effacée.
--
-- Ce que ce fichier fait, donc : il rend la règle correcte pour toute ligne qui
-- l'atteint encore dans la forme coexistante — une paire restée à côté d'un
-- objet déjà rempli — et il ne touche à rien d'autre. Sur une base saine, il ne
-- modifie aucune ligne : après la migration d'origine, plus aucune ligne de ce
-- catalogue ne porte de clé de paire.
--
-- Sur la portée réelle du défaut : avant la PR #167, la Boutique ne stockait que
-- FR/EN. Un DE/ES/TR ne peut donc y exister que s'il a été saisi par du code
-- postérieur à cette migration — code qui écrit la forme objet **sans** clé de
-- paire. Les deux conditions de la perte (objet rempli en DE/ES/TR *et* paire
-- résiduelle, avant que la migration d'origine ne tourne) ne peuvent pas être
-- réunies par une exploitation normale. Elles le peuvent par une sauvegarde
-- restaurée d'une base plus récente sur un historique de migrations plus ancien,
-- ou par une base modifiée à la main.

UPDATE "reference_tables"
SET "rows" = (
  SELECT json_group_object(
    section."key",
    CASE
      WHEN json_type(section.value) = 'array' THEN json(coalesce((
        SELECT json_group_array(
          CASE
            WHEN json_type(row_each.value, '$.name_fr') IS NOT NULL
              OR json_type(row_each.value, '$.name_en') IS NOT NULL
              OR json_type(row_each.value, '$.description_fr') IS NOT NULL
              OR json_type(row_each.value, '$.description_en') IS NOT NULL
            THEN json_remove(
              json_set(
                json_set(
                  row_each.value,
                  '$.name',
                  CASE
                    -- La garde : au moins une langue est déjà écrite dans
                    -- `$.name`. Le champ par langue gagne, la paire est
                    -- ignorée — et retirée plus bas comme les autres.
                    WHEN (
                      SELECT count(*)
                      FROM json_each(
                        CASE
                          WHEN json_type(row_each.value, '$.name') = 'object'
                          THEN json_extract(row_each.value, '$.name')
                          ELSE '{}'
                        END
                      ) AS written
                      WHERE trim(coalesce(written.value, '')) <> ''
                    ) > 0
                    THEN json(json_extract(row_each.value, '$.name'))
                    WHEN json_type(row_each.value, '$.name_fr') IS NOT NULL
                      OR json_type(row_each.value, '$.name_en') IS NOT NULL
                    -- `json_object` ne sait pas omettre une clé sous condition :
                    -- les deux sont écrites, puis celles dont la valeur est vide
                    -- sont retirées. Le chemin bidon '$.absent' est la branche
                    -- « ne rien retirer » — un NULL ici rendrait NULL l'appel
                    -- entier. Une langue blanche est absente, jamais `""`
                    -- (Bloc 126/D).
                    THEN json_remove(
                      json_object(
                        'fr', json_extract(row_each.value, '$.name_fr'),
                        'en', json_extract(row_each.value, '$.name_en')
                      ),
                      CASE
                        WHEN trim(coalesce(json_extract(row_each.value, '$.name_fr'), '')) = ''
                        THEN '$.fr' ELSE '$.absent'
                      END,
                      CASE
                        WHEN trim(coalesce(json_extract(row_each.value, '$.name_en'), '')) = ''
                        THEN '$.en' ELSE '$.absent'
                      END
                    )
                    ELSE json(coalesce(json_extract(row_each.value, '$.name'), '{}'))
                  END
                ),
                '$.description',
                CASE
                  WHEN (
                    SELECT count(*)
                    FROM json_each(
                      CASE
                        WHEN json_type(row_each.value, '$.description') = 'object'
                        THEN json_extract(row_each.value, '$.description')
                        ELSE '{}'
                      END
                    ) AS written
                    WHERE trim(coalesce(written.value, '')) <> ''
                  ) > 0
                  THEN json(json_extract(row_each.value, '$.description'))
                  WHEN json_type(row_each.value, '$.description_fr') IS NOT NULL
                    OR json_type(row_each.value, '$.description_en') IS NOT NULL
                  THEN json_remove(
                    json_object(
                      'fr', json_extract(row_each.value, '$.description_fr'),
                      'en', json_extract(row_each.value, '$.description_en')
                    ),
                    CASE
                      WHEN trim(coalesce(json_extract(row_each.value, '$.description_fr'), '')) = ''
                      THEN '$.fr' ELSE '$.absent'
                    END,
                    CASE
                      WHEN trim(coalesce(json_extract(row_each.value, '$.description_en'), '')) = ''
                      THEN '$.en' ELSE '$.absent'
                    END
                  )
                  ELSE json(coalesce(json_extract(row_each.value, '$.description'), '{}'))
                END
              ),
              '$.name_fr', '$.name_en', '$.description_fr', '$.description_en'
            )
            ELSE row_each.value
          END
          -- L'ordre des lignes est l'ordre d'affichage public : réaffirmé plutôt
          -- que laissé au hasard de l'agrégation.
          ORDER BY row_each."key"
        )
        FROM json_each(section.value) AS row_each
      ), '[]'))
      ELSE section.value
    END
  )
  FROM json_each("reference_tables"."rows") AS section
)
WHERE "key" = 'consumables'
  AND json_type("rows") = 'object';
