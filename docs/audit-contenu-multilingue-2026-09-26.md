# Bloc 127 — Phase 1 : audit du contenu éditorial multilingue

**Date** : 26/09/2026 · **Base** : `dev` à `2914817` · **Périmètre** : tout texte
éditorial (saisi en administration, lu par un visiteur). Le chrome de
l'administration — libellés de boutons, titres d'écran, messages système —
reste EN/FR (Blocs 116/118) et **n'est pas dans ce périmètre**.

## Méthode

Recherche systématique dans le code, pas un échantillon (méthode Bloc 118).
Quatre passes croisées, chacune partant d'un bout différent de la chaîne :

1. **Par le lecteur** : les deux seuls résolveurs de langue du dépôt —
   `pickFrEn` (paire FR/EN) et `localizedText` (objet par locale) — et la
   totalité de leurs appelants.
2. **Par le stockage** : toutes les lectures Prisma du code public
   (11 modules `*-server.ts` et 8 pages), et toutes les clés
   `ReferenceTable` / `StaticContent` existantes.
3. **Par l'écriture** : les 34 routes `src/app/api/admin/**/route.ts`, et
   pour chacune les champs texte qu'elle accepte.
4. **Par l'écran d'édition** : les composants `admin-*.tsx`, selon qu'ils
   montent `contentPairLocales` (2 langues) ou `launchLocales` (5).

Les quatre passes convergent sur le même ensemble, ce qui est le résultat
recherché : aucune n'a trouvé d'écran que les trois autres ignoraient.

## Synthèse

| Écran                                                    | Stockage                             | Modèle                      | Risque perte de données (Bloc 125) | Verdict                   |
| -------------------------------------------------------- | ------------------------------------ | --------------------------- | ---------------------------------- | ------------------------- |
| **Boutique**                                             | base, `reference_tables.consumables` | paire FR/EN                 | neutralisé (onglets limités à 2)   | **à corriger**            |
| **Événements** — descriptions, objectifs, récompenses    | base, `reference_tables.events`      | paire FR/EN                 | neutralisé                         | **à corriger**            |
| **Événements** — nom de l'événement                      | base, même table                     | **aucune langue**           | sans objet                         | **à décider** (voir §4.1) |
| **Templiers, présentation**                              | base, `reference_tables.templars`    | paire FR/EN                 | neutralisé                         | **à corriger**            |
| **Équipements Combat/Expédition** — libellés de métrique | base, `*_equipment_secondary`        | paire FR/EN                 | neutralisé                         | **à corriger**            |
| **Équipements** — nom de set (`set_name`)                | base, `*_equipment`                  | **aucune langue**           | sans objet                         | **à décider** (voir §4.2) |
| Classement / ligues et divisions                         | base, `leagues_divisions`            | objet par locale            | néant                              | déjà correct (Bloc 135)   |
| Guides (titre, contenu, extrait)                         | base, `guides`                       | objet par locale            | néant                              | déjà correct              |
| Mentions légales                                         | base, `static_content.legal_notice`  | objet par locale            | néant                              | déjà correct              |
| Descriptions d'outils et de référentiels                 | base, `calculators.description`      | objet par locale            | néant                              | déjà correct (Bloc 130)   |
| Villes (4 outils)                                        | base, paramètres numériques          | sans objet                  | néant                              | pas de contenu concerné   |
| Combat (XP, troupes démo)                                | base, paramètres numériques          | sans objet                  | néant                              | pas de contenu concerné   |
| Gemmes (outil + référentiel)                             | base, paramètres numériques          | sans objet                  | néant                              | pas de contenu concerné   |
| Progression / Level Up                                   | base, paramètres numériques          | sans objet                  | néant                              | pas de contenu concerné   |
| Simulateurs d'équipement                                 | base, lignes d'équipement            | sans objet                  | néant                              | pas de contenu concerné   |
| Accueil « Les plus utilisés », « Aller plus loin »       | base, `site_settings`                | références (`{kind, slug}`) | néant                              | pas de contenu concerné   |
| Descriptions de **catégorie** d'outil                    | `messages/*.json`                    | 5 langues, non éditable     | néant                              | signalé (voir §4.3)       |

**Quatre écrans à corriger**, exactement ceux que le Bloc 125 avait restreints
— l'audit ne révèle aucun cinquième écran limité FR/EN. Il révèle en revanche
**deux champs sans aucune langue** et **une asymétrie** que le brief ne
mentionne pas (§4).

## 1. Les quatre écrans à corriger

Tous quatre suivent exactement le même schéma : une ligne JSON en base, deux
colonnes par champ (`<champ>_fr` / `<champ>_en`), lues par `pickFrEn`, écrites
par une route qui recopie champ par champ, éditées par un composant qui monte
`contentPairLocales` (`["fr", "en"]`).

### 1.1 Boutique — `src/lib/consumables.ts`

```ts
export type ConsumableRow = {
  image: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  cost: string;
};
```

- **Stockage** : base, clé `consumables`, un objet par section
  (`intro` + 4 catégories), chaque section un tableau de lignes.
- **Volume livré** : ~40 lignes portant nom + description.
- **Lecture publique** : `consumables-reference.tsx`, `pickFrEn` sur les
  deux champs — un visiteur allemand lit l'anglais.
- **Écriture** : `PUT /api/admin/guides/references/consumables`, catalogue
  entier en un envoi, parse champ par champ.
- **Édition** : `admin-shop-editor.tsx`, 2 onglets.

### 1.2 Événements — `src/lib/events.ts`

```ts
export type EventRow = {
  name: string; // ← aucune langue, cf. §4.1
  description_fr: string;
  description_en: string;
  duration: EventDuration;
  color: EventColor; // énumérations
  tiers: EventTierRow[];
};
export type EventTierRow = {
  objective_fr: string;
  objective_en: string;
  reward_fr: string;
  reward_en: string;
};
```

- **Trois champs par paire**, dont deux imbriqués dans les paliers.
- **Volume livré** : zéro ligne — le référentiel est livré vide et rempli en
  administration (migration : rien à réécrire sur une base neuve, tout à
  réécrire sur une base en service).
- **Lecture publique** : `events-reference.tsx` (frise, tuiles, tableau des
  paliers).
- **Édition** : `admin-events-editor.tsx`, 2 onglets.

### 1.3 Templiers, présentation — `src/lib/templars-presentation.ts`

```ts
export type TemplarPresentationRow = {
  image: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  temple_base: string;
  bonus: string;
};
```

- **Volume** : 5 lignes (une par compétence), avec des noms par défaut déjà
  traduits dans les 5 langues **côté `messages`** (`game.templars.<clé>`) mais
  recopiés en FR/EN seulement dans la valeur par défaut du référentiel.
  → à la migration, les 5 langues de ces noms sont **déjà connues** et
  n'auront pas besoin d'être devinées ; pour les descriptions, en revanche,
  DE/ES/TR resteront absentes.
- **Édition** : `admin-templars-editor.tsx`, 2 onglets.

### 1.4 Libellés de métrique des équipements — `reference-equipment-server.ts`

```ts
labels?: { [metric]: { fr?: string; en?: string } }   // metric_label_fr / _en
```

- **Volume** : 5 libellés (3 Combat : fusion, gemmes, destruction ; 2
  Expédition : fusion, destruction).
- **Particularité à préserver** : `secondaryLabel()` (dans
  `reference-tables.tsx`) **ne se replie pas sur l'autre langue** — un
  libellé absent retombe sur la valeur traduite par défaut, jamais sur le
  texte brut d'une autre langue. C'est délibéré (revue Codex, PR #94) et
  **doit survivre au passage à N langues** : le repli de `localizedText`
  (anglais puis français) serait ici une régression, pas un progrès. C'est
  le seul des quatre écrans dont la règle de lecture diffère.
- **Édition** : `admin-equipment-editor.tsx`, 2 onglets.

## 2. Ce qui est déjà correct (vérifié, pas supposé)

- **Classement / ligues et divisions** — `RungName = Partial<Record<LaunchLocale, string>>`,
  lu par `localizedText`, édité sur 5 langues. Bloc 135 : **hors périmètre,
  confirmé**. C'est le modèle de référence pour la phase 2.
- **Guides** — `title`/`content`/`excerpt` en objet par locale, `localizedText`,
  `hasLocalizedText` pour ne pas afficher une traduction absente comme si
  elle existait.
- **Mentions légales** — `static_content.legal_notice`, objet par locale,
  éditeur sur `launchLocales`.
- **Descriptions d'outils et de référentiels** — `calculators.description`,
  objet par locale (Bloc 130), lues par `getPublicDescriptions`.
- **Villes, Combat, Gemmes, Progression, simulateurs** — après lecture des
  routes d'écriture correspondantes (`tools/city-parameters`,
  `tools/xp-gain-rate`, `tools/demo-attack-troops`, `tools/gems`,
  `guides/references/level-up`, les 4 routes `*-increments`), **aucune ne
  transporte de champ texte** : uniquement des nombres, des drapeaux et des
  clés. Les libellés qui s'affichent à l'écran (rareté, famille, compétence,
  emplacement, ligue) sont des **clés d'énumération stockées en français**
  puis traduites par `src/i18n/game-translation-keys.ts` vers
  `messages/*.json` — 5 langues, correct, et ce ne sont pas des textes
  éditoriaux.
- **Mises en avant de l'accueil et « Aller plus loin »** — `site_settings`
  ne stocke que des références (`{kind, slug}`), jamais du texte.

## 3. Le garde-fou existant contre la classe de bug du Bloc 125

`src/lib/content-pair-round-trip.test.ts` tient aujourd'hui la propriété
« écrire une langue n'écrase pas l'autre » — **sur le modèle à deux langues**.
Il vérifie notamment que les onglets offerts sont exactement les langues que
le modèle stocke. La phase 2 doit le **remplacer** par sa version à N langues
plutôt que le supprimer : c'est le test qui aurait attrapé le bug d'origine,
et sa forme (offrir exactement ce que le modèle stocke) reste la bonne
question à poser après migration.

## 4. Trois constats que le brief ne mentionnait pas

### 4.1 Le nom d'un événement n'a aucune langue

`EventRow.name` est une chaîne unique, sans locale, saisie dans un champ
unique de l'éditeur (à côté d'une description, elle, à onglets), et rendue
telle quelle à trois endroits de la page publique. Un visiteur allemand lit
donc le nom d'événement en français.

Ce n'est **pas** le bug du Bloc 125 (rien n'est écrasé) mais c'est bien du
contenu éditorial privé de traduction, donc dans l'esprit du bloc. Le passage
à N langues est le même travail que pour les trois autres champs de la même
table. **À arbitrer** : si le studio nomme ses événements identiquement dans
toutes les langues, le champ actuel est juste ; sinon il rejoint le lot.

### 4.2 Le nom de set d'un équipement n'a aucune langue

Même constat pour `set_name` (`CombatReferenceRow` / `ExpeditionReferenceRow`),
rendu brut comme titre de bloc et comme texte alternatif d'image. Tous les
autres champs de ces lignes sont des énumérations traduites.

Différence importante avec §4.1 : ce sont des **noms propres du jeu**
(« Spirit Fyra »), qui sont plausiblement identiques dans toutes les langues
du jeu — auquel cas le champ actuel est correct et il n'y a rien à faire. Je
ne tranche pas à ta place : je le signale parce qu'un audit qui prétend être
exhaustif doit le lister.

### 4.3 La description d'une catégorie d'outil n'est pas éditable

Asymétrie mesurée dans le code :

- page d'un **référentiel** (`referentiels/[slug]/page.tsx:67`) :
  `stored || t('descriptions.<slug>')` — la base d'abord, le fichier statique
  en repli. Conforme au principe du brief.
- page d'une **catégorie d'outils** (`tools/[slug]/page.tsx:49` et
  `layout.tsx:151`) : `tools('descriptions.<catégorie>')` **seulement** — la
  description saisie en administration n'est jamais consultée.

La cause est structurelle, pas un oubli : les descriptions de la base sont
indexées par slug de calculateur, alors que ces quatre textes décrivent une
_catégorie_ (`cities`, `combat`, `ranking`, `skills`), qui n'a pas de ligne en
base. Aucun visiteur n'est privé de traduction (les 5 langues sont dans
`messages`), mais ces 4 textes échappent à la règle « le contenu éditorial se
modifie sans livraison ». **Signalé, pas corrigé** : leur donner une ligne en
base est un bloc à part entière.

## 5. Découpage proposé pour la phase 2

Le périmètre réel est **plus petit que ce que le brief anticipait** — quatre
écrans, une seule mécanique, ~50 lignes de données au total — mais les quatre
partagent tellement de structure qu'il serait coûteux de les traiter
indépendamment. Découpage en **trois PR successives** :

**PR 1 — le socle et le premier écran (Boutique).**
Le type `LocalizedField` et son parse partagé, le remplacement du garde-fou
`content-pair-round-trip` par sa version à N langues, la migration de forme
avec repli de lecture, `LangTabs` sur 5 langues dans l'éditeur Boutique,
lecture publique par `localizedText`. C'est la PR qui fixe l'architecture ;
les deux suivantes n'en sont que l'application.

**PR 2 — Templiers et Équipements.**
Templiers pour sa symétrie exacte avec Boutique (les 5 noms ont déjà leurs
5 langues, à reprendre sans les inventer). Équipements pour son unique
particularité : le **non-repli** de `secondaryLabel`, à préserver
explicitement et à tester.

**PR 3 — Événements.**
Trois champs, dont deux imbriqués dans les paliers : la migration la plus
profonde. Inclut le nom d'événement (§4.1) **si tu le demandes**.

Chaque PR : migration de forme (aucun changement de schéma Prisma — la donnée
est déjà en JSON), `revalidateContent` réutilisé tel quel, tests de round-trip
et de migration sur base jetable reconstituant des données réalistes, captures
admin + public dans au moins deux langues dont une hors FR/EN.

## 6. Ce qu'il me faut avant d'attaquer la phase 2

1. **Validation du découpage** en trois PR ci-dessus.
2. **Arbitrage sur le nom d'événement** (§4.1) : à passer en N langues, ou
   laisser tel quel ?
3. **Arbitrage sur le nom de set** (§4.2) : nom propre identique partout, ou
   à traduire ?
4. La description de catégorie (§4.3) est hors périmètre sauf avis contraire.
