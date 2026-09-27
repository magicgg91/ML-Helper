-- Bloc 127 (PR 1/3) : le nom et la description d'un objet de la Boutique
-- passent de la paire FR/EN à un champ par langue.
--
-- Aucune modification de schéma : le catalogue est une ligne de
-- `reference_tables` dont la colonne `rows` porte du JSON — un objet par
-- section (`intro` plus les quatre catégories), chaque section un tableau de
-- lignes. Seule la forme des lignes change :
--
--   name_fr / name_en               ->  name        = { "fr": …, "en": … }
--   description_fr / description_en ->  description = { "fr": …, "en": … }
--
-- FR et EN deviennent simplement les deux premières langues remplies, et une
-- langue vide est **absente** de l'objet plutôt qu'écrite `""` : le Bloc 126/D
-- a montré ce que coûte la différence — `localizedText` tient une chaîne vide
-- pour écrite et s'arrête dessus au lieu de se replier sur une langue qui a
-- quelque chose à dire. `image` et `cost` ne sont pas du texte éditorial et ne
-- sont pas touchés.
--
-- Pourquoi en SQL et pas seulement à la lecture : `lib/consumables.ts` sait
-- lire les deux formes (`parseConsumableRow`), donc rien n'obligeait à
-- réécrire. Mais un repli de lecture n'est pas une migration : il laisse la
-- base dans l'ancienne forme indéfiniment, et la branche qui la comprend doit
-- vivre aussi longtemps. Ici la donnée passe à la forme nouvelle une fois, et
-- le repli ne reste que comme filet — une sauvegarde restaurée d'avant cette
-- migration, une image qui n'a pas encore tourné.
--
-- Vérifié sur une base jetable portant le catalogue réel (les 38 objets livrés,
-- dans leurs cinq sections), plus une ligne déjà migrée en cinq langues, une
-- ligne nommée en français seul, et une ligne dont la description est vide :
-- voir `src/lib/consumables-migration.test.ts`, qui applique ce fichier par le
-- même outil que le déploiement.
--
-- Deux formes ne sont délibérément PAS réécrites ici :
--
--   * le tableau plat d'avant le Bloc 48 (une seule liste, la catégorie en
--     colonne de la ligne), que `normalizeStoredValue` regroupe déjà à la
--     lecture ligne par ligne — le `json_type(rows) = 'object'` ci-dessous
--     l'écarte, et le prochain enregistrement l'écrit dans la forme nouvelle ;
--   * une ligne qui ne porte aucune des quatre clés de paire, c'est-à-dire une
--     ligne déjà migrée : elle traverse intacte, avec ses éventuelles langues
--     DE/ES/TR. Sans cette garde, l'objet aurait été reconstruit depuis des
--     paires absentes, donc vidé.

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
                    WHEN json_type(row_each.value, '$.name_fr') IS NOT NULL
                      OR json_type(row_each.value, '$.name_en') IS NOT NULL
                    -- `json_object` ne sait pas omettre une clé sous condition :
                    -- les deux sont écrites, puis celles dont la valeur est vide
                    -- sont retirées. Le chemin bidon '$.absent' est la branche
                    -- « ne rien retirer » — un NULL ici rendrait NULL l'appel
                    -- entier.
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
          -- L'ordre des lignes est l'ordre d'affichage public (cdc : « l'ordre
          -- choisi en admin est l'ordre d'affichage public ») : il est réaffirmé
          -- plutôt que laissé au hasard de l'agrégation.
          ORDER BY row_each."key"
        )
        FROM json_each(section.value) AS row_each
      -- Une section vide — `intro` l'est à la livraison — n'a aucune ligne à
      -- agréger : le tableau vide est écrit explicitement plutôt que le NULL
      -- qu'un agrégat sans ligne rendrait.
      ), '[]'))
      ELSE section.value
    END
  )
  FROM json_each("reference_tables"."rows") AS section
)
WHERE "key" = 'consumables'
  AND json_type("rows") = 'object';
