-- Bloc 135 : l'échelle des ligues et des divisions quitte l'outil Classement.
--
-- Deux choses changent, et aucune n'est une modification de schéma : l'échelle
-- est une ligne de `reference_tables` dont la colonne `rows` porte du JSON.
--
--   1. Le nom libre d'un échelon passe de la paire `nameFr`/`nameEn` à un objet
--      par langue, `name`, comme le titre d'un guide et la description d'un
--      outil (Bloc 130). Le site publie cinq langues ; la paire montrait le
--      renommage français à quatre lecteurs sur cinq, ce qu'AGENTS.md interdit
--      pour tout texte vu par un utilisateur. FR et EN deviennent simplement
--      les deux premières langues remplies, et une langue vide est **absente**
--      de l'objet plutôt qu'écrite `""` — le Bloc 126/D a montré ce que coûte
--      la différence : `localizedText` traite une chaîne vide comme écrite et
--      s'arrête là au lieu de se replier sur une langue qui a quelque chose à
--      dire.
--
--   2. La clé de la ligne passe de `ranking_leagues` à `leagues_divisions`.
--      L'échelle n'appartient plus au Classement : les Gemmes, la Progression,
--      les Événements et les Villes en lisent la ligue de base, et son CRUD est
--      dans Configuration. Une clé qui nomme encore un seul consommateur
--      envoie le prochain lecteur au mauvais endroit.
--
-- Pourquoi en SQL et pas seulement à la lecture : `lib/leagues.ts` sait déjà
-- lire les deux formes (il migre aussi, à la lecture, la forme d'avant le Bloc
-- 108 et les phrases françaises d'avant le Bloc 27), donc rien n'obligeait à
-- réécrire. Mais un repli de lecture n'est pas une migration : il laisse la
-- base dans l'ancienne forme indéfiniment, et la branche qui la comprend doit
-- vivre aussi longtemps. Ici la donnée passe à la forme nouvelle une fois, et
-- le repli ne reste que comme filet — une sauvegarde restaurée d'avant cette
-- migration, une image qui n'a pas encore tourné.
--
-- Vérifié sur une échelle de production reconstituée (10 échelons : Bronze,
-- Argent/Or/Platine/Diamant en Division 2 et 1, Légende) plus un échelon libre
-- sans ligue de base : ordre conservé, plages intactes, `active: false`
-- conservé, un renommage français seul donnant `{"fr": "…"}` et une paire
-- complète `{"fr": "…", "en": "…"}`.

UPDATE "reference_tables"
SET "rows" = (
  SELECT json_group_array(
    -- L'ancienne paire est retirée après que l'objet a été posé : `json_remove`
    -- d'un chemin absent est sans effet, donc un échelon qui n'avait ni l'une
    -- ni l'autre traverse sans dommage.
    json_remove(
      json_set(
        json_each.value,
        '$.name',
        -- `json_object` ne sait pas omettre une clé sous condition : les deux
        -- sont écrites, puis celles dont la valeur est vide sont retirées. Le
        -- chemin bidon '$.absent' est la branche « ne rien retirer » — un NULL
        -- ici rendrait NULL l'appel entier.
        json_remove(
          json_object(
            'fr', json_extract(json_each.value, '$.nameFr'),
            'en', json_extract(json_each.value, '$.nameEn')
          ),
          CASE
            WHEN trim(coalesce(json_extract(json_each.value, '$.nameFr'), '')) = ''
            THEN '$.fr' ELSE '$.absent'
          END,
          CASE
            WHEN trim(coalesce(json_extract(json_each.value, '$.nameEn'), '')) = ''
            THEN '$.en' ELSE '$.absent'
          END
        )
      ),
      '$.nameFr', '$.nameEn'
    )
    -- L'ordre de l'échelle est la moitié de son sens (il porte le League Lock
    -- et les cibles de montée) : il est réaffirmé plutôt que laissé au hasard
    -- de l'agrégation.
    ORDER BY json_each."key"
  )
  FROM json_each("reference_tables"."rows")
)
WHERE "key" = 'ranking_leagues';

-- Le renommage ne s'applique que s'il ne heurte pas une ligne existante :
-- `reference_tables.key` est unique, et une installation qui aurait déjà les
-- deux doit garder la sienne plutôt que faire échouer le déploiement.
UPDATE "reference_tables"
SET "key" = 'leagues_divisions'
WHERE "key" = 'ranking_leagues'
  AND NOT EXISTS (
    SELECT 1 FROM "reference_tables" WHERE "key" = 'leagues_divisions'
  );
