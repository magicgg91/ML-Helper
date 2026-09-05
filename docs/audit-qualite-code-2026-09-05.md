# Audit qualité de code / dette technique — ML-Helper

*Date : 2026-09-05 · Base auditée : branche `dev` @ `3a9027e` (après Bloc 92) · 92 blocs de développement itératif*

---

## 0. Périmètre, méthode et verdict

**Objectif.** Évaluer la dette technique accumulée sur 92 blocs successifs (nombreuses révisions/reversions), en dehors des 3 audits déjà menés et corrigés : sécurité (Bloc 86), SEO (Bloc 91), accessibilité (Bloc 92).

**Méthode.** Vérifications automatisées + lecture ciblée, chaque constat vérifié individuellement :

- `knip` (fichiers/exports/dépendances non utilisés), puis **contre-vérification manuelle de chacun des 28 exports signalés** (usage réel dans `src/` + `e2e/`, y compris usage interne au fichier) — 3 faux positifs écartés ;
- `prisma migrate diff` (dérive schéma ↔ migrations), lecture du schéma et des 26 migrations ;
- inventaire exhaustif des 35 routes API (méthodes, helper d'auth, capability, validation, forme d'erreur, codes de statut) ;
- balayages TypeScript (`any`, `as`, `!`), i18n (parité des 5 locales, clés orphelines), tests (`.skip`/`.todo`, assertions faibles, couverture), variables d'environnement ;
- **comparaison directe fichier par fichier des implémentations jumelles** — la méthode qui s'était révélée productive lors de l'audit d'accessibilité, généralisée ici.

**Verdict d'ensemble.** Le code est **en bien meilleure santé que ne le laisserait craindre un projet de 92 blocs avec reversions**. Signaux forts : **zéro `any`** dans tout le code de production, **aucun test désactivé** (`.skip`/`.todo`/`.only`), les 35 routes API suivent **un seul et même patron d'autorisation** (`authorizedSession(capability)` + `forbiddenResponse()`) avec une forme d'erreur uniforme, seulement **12 assertions non-nulles** toutes vérifiées sûres, et de vraies factorisations partagées (`valueAtStar`, `useFilters`/`groupBySet`, `EditorActionBar`). Le nettoyage est réel : deux migrations sont des suppressions de fonctionnalités abandonnées.

La dette se concentre sur **trois axes** : (1) des **divergences entre jumeaux** — un correctif appliqué d'un côté et pas de l'autre, exactement le patron trouvé en Bloc 92 ; (2) de la **duplication structurelle** que les blocs successifs ont recopiée au lieu de factoriser, ce qui multiplie le coût de chaque correctif futur ; (3) des **résidus de révision** (exports morts, scaffold, clés i18n non rétro-portées).

### Ce qui est sain (à ne pas régresser)

- **Aucun `any`** dans `src/` hors tests ; 3 `as unknown as` tous justifiés (singleton Prisma, migration de lignes héritées, construction de `StuffState`).
- **Autorisation API homogène** : 29 routes admin via `authorizedSession(capability)`, 3 routes self-service via `requireApiSession()`, 1 bootstrap (`/admin/setup`) — chaque exception est motivée. Forme d'erreur uniforme `{ error: "code_snake_case" }`.
- **Aucun test désactivé ou oublié** sur ~135 fichiers de test + 12 specs e2e.
- **Factorisations réussies** : `valueAtStar()` (`star-progression.ts`, partagé Combat/Expédition), `useFilters`/`Filters`/`groupBySet`/`matchesFilters`/`RarityValueMergedTable` (partagés par les deux référentiels d'équipement), `EditorActionBar`, `formatSkillPercentValue` (Bloc 87).
- **Familles CSS de tuiles volontairement séparées** (`consumable-tile`, `templars-tile`, `gems-tile`, `events-tile`) : documenté en commentaire comme une leçon tirée des Blocs 38/Q, 40/B, 41/E, 53/B-C, 76/A, 78/B — une classe partagée entre 2 features cassait à chaque évolution indépendante. **À laisser en l'état.**
- **Variables d'environnement** cohérentes : tout ce qui est utilisé est documenté (`DATABASE_URL` via `schema.prisma`, `ML_HELPER_IMAGE` via `docker-compose.yml`).

---

## 1. Priorité ÉLEVÉE

### E1 — Le simulateur Combat charge son `localStorage` sans validation, là où son jumeau Expédition valide

- **Localisation :** `src/components/equipment-tools.tsx:472-478` contre `src/components/expedition-equipment-tools.tsx:59-87` et `:361`.
- **Constat :** Expédition possède deux gardes de type (`isValidExpeditionState`, `isValidExpeditionConfigs`) et ne charge la valeur sauvegardée qu'après validation, avec un commentaire explicite (Bloc 31/E.1) : *« une donnée malformée ou de forme périmée ne doit pas planter le simulateur »*. Combat, lui, fait :

  ```js
  const saved = localStorage.getItem(storageKey);
  if (saved) setState(JSON.parse(saved));   // aucune validation de forme
  ```

  Le `try/catch` autour ne protège que d'un JSON syntaxiquement invalide, pas d'un JSON **valide mais de forme périmée**. Or le rendu indexe ensuite `state[activeFamily][index]` puis lit `.equipment` / `.star` / `.gems` : une clé `mlhelper_stuff_simulator` héritée d'une version antérieure (les blocs 32/73/85 ont fait évoluer cette forme) ou modifiée à la main fait planter le composant.
- **Impact :** écran blanc sur le Simulateur de Stuff pour tout utilisateur dont le `localStorage` contient une forme ancienne — sans moyen de s'en sortir autrement qu'en vidant le stockage du navigateur. Le jumeau prouve que le risque a été identifié… d'un seul côté.
- **Action : corriger.** Porter le patron de garde d'Expédition sur Combat (valider `equipmentBlocks` × `equipmentSlotLayout`, puis la forme `{equipment, star, gems}`). Idéalement via un hook partagé `usePersistedState(key, validate, initial)` qui résout aussi F2 ci-dessous.

### E2 — 12 clés de traduction absentes en DE/ES/TR, masquées par le repli anglais ; 11 sont réellement affichées

- **Localisation :** `messages/{de,es,tr}.json` (907 clés) contre `messages/{fr,en}.json` (919 clés). Repli : `src/i18n/config.ts:58-64` (`getMessagesForLocale` fusionne systématiquement sur l'anglais).
- **Constat :** les 3 locales manquent exactement les **mêmes 12 clés**, dont **11 sont rendues** :

  | Clé manquante en DE/ES/TR | Rendue par | Nature |
  |---|---|---|
  | `Public.descriptions.guides` | `guides/page.tsx:20` | meta description SEO |
  | `Public.descriptions.legal` | `legal/page.tsx:18` | meta description SEO |
  | `Public.descriptions.guide-fallback` | `guides/[slug]/page.tsx:38` | meta description SEO |
  | `Public.descriptions.admin` | `admin/layout.tsx:32` | meta description |
  | `guides.detail.not-translated` | `guides/[slug]/page.tsx:114` | **texte visible** |
  | `references.consommables.filters.label` + `.category` | `consumables-reference.tsx` | **libellés visibles** |
  | `references.consommables.categories.{expedition,advisors,equipment,inventory}` | `consumables-reference.tsx` | **libellés visibles** |
  | `Public.descriptions.reference-detail` | (plus référencée) | orpheline |

  Comme `getMessagesForLocale` fusionne toujours sur l'anglais, il n'y a **ni crash ni clé brute affichée** : le texte anglais s'affiche silencieusement. C'est précisément ce qui a permis à la lacune de passer inaperçue.
- **Impact :** un visiteur allemand, espagnol ou turc voit les filtres du référentiel Boutique en anglais au milieu d'une page traduite, et les pages Guides/Mentions légales servent une meta description anglaise aux moteurs dans ces 3 langues — ce qui annule en partie le travail du Bloc 91/E2 pour 3 des 5 langues. Les descriptions SEO ont visiblement été ajoutées en fr/en sans rétro-portage.
- **Action : corriger + verrouiller.** Traduire les 11 clés utilisées, supprimer `Public.descriptions.reference-detail` (orpheline), et **ajouter un test de parité de clés** entre les 5 locales — aucun n'existe aujourd'hui, ce qui explique que rien ne l'ait signalé.

### E3 — La collision d'`id` d'erreur corrigée dans `EditableDataTable` subsiste dans son jumeau du même fichier

- **Localisation :** `src/components/editable-reference-table.tsx` — `EditableDataTable` (corrigé, `:118` + `:178`) contre `EditableReferenceTableInner.field()` (non corrigé, `:484`, `:502`, `:516`).
- **Constat :** en Bloc 92, une revue Codex a signalé que plusieurs `EditableDataTable` sur une même page produisaient des `id` d'erreur identiques (`error-0-<champ>`), si bien que l'`aria-describedby` d'un champ pointait vers l'erreur de la **première** table. Le correctif a introduit un préfixe par instance (`useId()`). **Le composant jumeau, dans le même fichier, construit toujours ses id ainsi :**

  ```js
  aria-describedby={errors[key] ? `${key}-error` : undefined}   // key = `${row}:${field}`
  ```

  Or son propre commentaire (Bloc 37/E, `:14-17`) précise qu'une page **héberge plusieurs de ces tables** (Combat, Expédition, pilotées par un bouton d'enregistrement partagé). La collision est donc structurellement identique, simplement non corrigée.
- **Impact :** même défaut d'accessibilité que celui corrigé en Bloc 92 — sur les pages d'administration Combat/Expédition, un lecteur d'écran annonce le message d'erreur de la mauvaise table.
- **Action : corriger** en appliquant le même `useId()` à `EditableReferenceTableInner`. Deux incohérences mineures adjacentes : la classe `field-invalid` n'est posée que sur la branche `<input>` (`:504`) et jamais sur `<select>` ni dans `EditableDataTable` ; et le drapeau de colonne `wide` est supporté par `EditableDataTable` (`:120-125`) mais **silencieusement ignoré** par `Inner` (`:592`, `:607`).

---

## 2. Priorité MOYENNE

### M1 — Duplication structurelle : chaque correctif transverse doit être écrit 6 à 8 fois

C'est la cause racine de E3 et du coût des blocs 91/92. Cinq grappes vérifiées :

| Duplication | Occurrences | Preuve |
|---|---|---|
| **Formule de coût de fusion** | 2 (identiques au caractère près) | `combatMergeCost` (`reference-equipment.ts:195-203`) et `expeditionMergeCost` (`:253-262`) : même `base[rarity]` + `rarityBase * 2 ** (Math.max(1, star) - 1)`. Le commentaire `:205-207` dit que Combat *« reproduit exactement »* Expédition — la fonction a été copiée au lieu d'être partagée, alors que `valueAtStar()` prouve que le projet sait factoriser. |
| **Repli de langue fr/en** | 4 | `pickLocaleText` **identique** dans `consumables-reference.tsx:14`, `templars-reference.tsx:19`, `events-reference.tsx:18` ; + `secondaryLabel` (`reference-tables.tsx:60-66`), même logique. (`localizedText()` de `lib/translations.ts` est le 5e, générique.) |
| **Tuile de résultat** | 6 sites / 3 variantes | `Stat` (`city-calculators.tsx:78`) et `Result` (`skills-calculators.tsx:742`) sont **le même composant** ; `Summary` ×2 (`equipment-tools.tsx:110`, `expedition-equipment-tools.tsx:161`) ; mini-tuiles démo ×2 (`combat-calculators.tsx:193-204`). |
| **Onglets** | 8 `role="tablist"`, 17 `role="tab"` | `city`(1), `combat`(3), `skills`(3), `reference-tables`(1), chacun ~12-15 lignes de plomberie identique. Le Bloc 92/M2 a dû câbler `aria-controls`/`tabpanel` **huit fois** à la main. |
| **Machine à états d'enregistrement admin** | 6-7 variantes, 3 formes | `ranking-admin-editor` (`setMessage` seul), `templars-presentation-editor` (`status`+`success`, rend son propre `<p>` vert `:153`), `consumables`/`events` (`status` seul → **jamais de vert**), `reference-admin-editors` (`status`+`success`), `named-parameters-editor` (`status` seul), `EditableReferenceTableInner`. `EditorActionBar` n'affiche que `message`, sans état de succès. |

- **Impact :** incohérence visible pour l'utilisateur (certains éditeurs admin ne confirment jamais en vert), et surtout un **multiplicateur de coût** sur tout correctif transverse — démontré par les blocs 91 et 92.
- **Action : factoriser progressivement**, par ordre de rentabilité : `<TabList>/<TabPanel>` (supprime 8 duplications et fiabilise l'ARIA), `useSaveStatus()` (harmonise le retour d'enregistrement), `<ResultTile>`, `pickFrEn()` dans `lib/translations.ts`, `mergeCostAtStar()` dans `star-progression.ts`. **Ne pas** toucher aux familles CSS de tuiles (séparation volontaire et documentée).

### M2 — Divergence de mémoïsation entre jumeaux : Expédition recalcule là où Combat mémoïse

- **Localisation :** `equipment-tools.tsx:484-486` contre `expedition-equipment-tools.tsx:372`.
- **Constat :** Combat mémoïse son calcul global — `const global = useMemo(() => computeStuffGlobal(...), [state, combatRows, gemParameters, increments])`. Expédition appelle `computeExpeditionTotal(state, rows, increments)` **directement dans le corps du composant**, donc à chaque rendu.
- Plus largement, la mémoïsation est quasi absente des calculateurs : `combat-calculators`, `skills-calculators`, `expedition-equipment-tools`, `ranking-calculator`, `events-reference` ont **0 `useMemo`**, aucun fichier n'utilise `useCallback` ni `memo()`. À l'inverse `reference-tables.tsx` en a 4, ce qui protège correctement la grille de ~180 tuiles (le seul endroit où le coût serait réellement sensible).
- **Impact :** modéré en pratique — les jeux de données des simulateurs sont petits (6 à 12 emplacements), donc pas de ralentissement perceptible. C'est surtout une **incohérence entre jumeaux** : la même charge est traitée différemment des deux côtés, sans raison documentée.
- **Action :** aligner Expédition sur Combat (`useMemo` sur `computeExpeditionTotal`/`computeExpeditionSlot`). **Ne pas** ajouter de mémoïsation ailleurs sans mesure : l'absence actuelle est sans conséquence mesurable et sur-optimiser nuirait à la lisibilité.

### M3 — Divergence sémantique : Expédition signale les valeurs non confirmées, Combat non

- **Localisation :** `reference-equipment.ts:109-121` (`expeditionValueAtStar` → `{ value, confirmed }`) contre `:41-50` (`combatValueAtStar` → `number | null`) ; rendu : `reference-tables.tsx:573-575` (`unconfirmed-label`) contre le `CombatTile` qui n'a pas cette notion.
- **Constat :** Expédition distingue une valeur *extrapolée* d'une valeur *confirmée en jeu* et l'affiche ; Combat renvoie un simple nombre, donc présente une valeur extrapolée exactement comme une valeur vérifiée.
- **Impact :** `AGENTS.md` et le cdc posent la règle « les données non confirmées restent signalées ». Le référentiel Combat ne la respecte pas, alors que son jumeau si.
- **Action : trancher explicitement.** Soit aligner Combat sur le contrat `{value, confirmed}`, soit documenter en commentaire pourquoi Combat n'en a pas besoin (toutes ses valeurs seraient confirmées). L'état actuel ressemble à un oubli, pas à un choix.

### M4 — Liens référentiel → outil codés en dur, alors que le sens inverse a un helper

- **Localisation :** `referenceHref()` existe (`lib/reference-catalog.ts:75`) pour outil → référentiel. Le sens inverse est écrit en littéral **5 fois** : `reference-tables.tsx:525` (`/tools/competences?open=simulator`), `:745` (`?open=expedition`), `gems-reference.tsx:145`, `templars-reference.tsx:154`, `level-up-reference.tsx:153` (`/tools/combat?open=xp`).
- **Impact :** le contrat `?open=<onglet>` (Bloc 53/F) n'est garanti par rien ; renommer un onglet casse silencieusement 5 liens, et rien ne le détecte.
- **Action : ajouter `toolHref(slug, tab)`** typé sur les identifiants d'onglets réels, et remplacer les 5 littéraux.

### M5 — Code mort : 8 exports jamais référencés + 1 fichier de scaffold + 1 dépendance

Vérifié un par un (usage réel dans `src/` **et** `e2e/`, y compris à l'intérieur du fichier de définition) :

| Symbole mort | Fichier | Origine probable |
|---|---|---|
| `canManageReferences` | `services/reference-table-admin.ts:7` | **supplanté** par `authorizedSession()`/`requireCapability()` (Bloc 86/E1) |
| `getCombatMergeCostBase` | `lib/reference-equipment-server.ts:209` | supplanté par `getCombatSecondaryBase()` (objet complet) |
| `getExpeditionMergeCostBase` | `:271` | idem |
| `getExpeditionDismantleBase` | `:274` | idem |
| `skillPrerequisiteSatisfied` | `lib/player-settings.ts:190` | règle de jeu exportée jamais consommée (la logique interne `prerequisiteSatisfied` sert encore) |
| `equipmentLabel` | `lib/equipment.ts:198` | résidu |
| `byCalculatorCatalogOrder` | `lib/calculator-catalog.ts:77` | résidu |
| `emptyTemplarPresentationRow` | `lib/templars-presentation.ts:31` | résidu |

Plus : `src/app/page.module.css` — **fichier de scaffold `create-next-app` jamais importé** (le Bloc 91/F3 avait supprimé les SVG de scaffold mais manqué ce CSS) ; et `eslint-config-prettier`, déclaré en devDependency mais **absent de la config ESLint**.

- **Action : supprimer** les 8 exports, `page.module.css` et la dépendance. `canManageReferences` mérite une mention : c'est un helper d'**autorisation** mort — le supprimer évite qu'un futur bloc l'utilise par erreur au lieu du chemin centralisé.
- *Note : 3 signalements de `knip` sont des faux positifs et doivent être conservés* — `docker-healthcheck.mjs` (utilisé par `Dockerfile:27` et `docker-compose.yml:30`), `toolCategories`, `emptyConsumableCatalog`, `rehypeShiftHeadings`.

### M6 — Les écritures partagées les plus sensibles n'ont pas de test unitaire

- **Localisation :** `src/services/reference-table-admin.ts` (`saveReferenceTable`) et `src/services/formula-parameters-admin.ts` — **aucun fichier de test ne les référence**.
- **Constat :** `saveReferenceTable` est le point d'écriture commun de **tous** les référentiels admin (Combat, Expédition, Templiers, Gemmes, Level Up, Boutique) et porte un correctif d'atomicité issu d'une revue Codex (PR #79) : l'upsert et son entrée d'audit doivent être dans **une seule transaction**, pour qu'un échec ne laisse jamais la table modifiée sans trace d'audit. Ce comportement — le plus critique du service — n'est vérifié par rien.
- **Impact :** une régression sur la transaction (ou sur l'écriture du diff d'audit) passerait les 1168 tests sans être vue.
- **Action : ajouter des tests unitaires ciblés** sur ces deux services (transaction, contenu du diff d'audit, distinction create/update). Le reste de la couverture est bon : `totp-profile` est couvert en e2e, et les modules réellement sans aucune couverture se limitent à `sort-by-label` (trivial).

### M7 — Commentaire de jumelage devenu faux : il interdit un portage déjà effectué

- **Localisation :** `expedition-equipment-tools.tsx:151-154`.
- **Constat :** le commentaire affirme *« always show all 10 stats … **unlike Combat's summary, which hides zero-contribution skills entirely. Kept specific to Expedition; do not port this to Combat.** »* Or Combat fait **exactement la même chose** depuis le Bloc 32/D.5 — `equipment-tools.tsx:85-87` : *« always show all 10 skills … defaulting a skill with no configured contribution to 0% instead of hiding it »*.
- **Impact :** un commentaire d'instruction (« ne pas porter ») qui décrit un état révolu — exactement le type de piège que l'audit SEO avait déjà rencontré. Un futur contributeur peut « corriger » Combat dans le mauvais sens.
- **Action : supprimer les deux dernières phrases** du commentaire. C'est le seul commentaire de ce type que j'ai pu **prouver** faux ; les autres échantillonnés étaient exacts.

### M8 — Fichiers devenus disproportionnés

- **Localisation :** `skills-calculators.tsx` (915), `city-calculators.tsx` (876), `reference-tables.tsx` (835), `reference-admin-editors.tsx` (738), `editable-reference-table.tsx` (645), `named-parameters-editor.tsx` (643), `equipment-tools.tsx` (638), `events-admin-editor.tsx` (626).
- **Constat :** chacun agrège plusieurs composants de premier niveau accumulés bloc après bloc. `skills-calculators.tsx` contient à lui seul la barre d'onglets, le simulateur Gemmes (2 modes), le calculateur Templiers et le composant `Result`.
- **Impact :** dette de lisibilité surtout ; c'est aussi ce qui rend les duplications de M1 difficiles à repérer.
- **Action :** découpage **opportuniste**, pas de refonte dédiée. Le découpage naturel suit les composants déjà nommés (`GemsCalculator`, `TemplarsCalculator`, `Result` → fichiers propres). À faire quand un bloc touche déjà le fichier. *(`lib/equipment-data.ts`, 4144 lignes, est un jeu de données, pas du code — à laisser.)*

---

## 3. Priorité FAIBLE

### F1 — Dérive cosmétique schéma ↔ migrations (ordre des colonnes)
`prisma migrate diff --from-migrations --to-schema-datamodel` **n'est pas vide** : il veut redéfinir `audit_logs`. Cause exacte vérifiée : `actor_role` et `message` ont été ajoutés par `ALTER TABLE ADD COLUMN` (migrations `20260817`/`20260818`), qui les **appose en fin de table** en SQLite, alors que `schema.prisma` les déclare au milieu. **Aucune colonne ni aucun index ne manque** (`audit_logs_created_at_idx` est bien créé par la migration initiale, ligne 81). Conséquence : un futur `prisma migrate dev` générerait une migration de réordonnancement parasite, et `migrate diff` ne peut pas servir de garde-fou CI. *Action : laisser en l'état (aucun impact fonctionnel), ou normaliser l'ordre des champs dans `schema.prisma` pour retrouver un diff vide.*

### F2 — 17 symboles exportés sans consommateur externe
Utilisés uniquement à l'intérieur de leur propre fichier : `authorizeAdminCredentials`, `adminCapabilities`, `localeStorageKey`, `cityToolSlugs`, `CITY_LEVEL_MAX`, `vpAt`, `equipmentBlockDefinitions`, `isEquipmentSkillAllowed`, `computeStuffBlock`, `leagueFileSlug`, `isGuideCategory`, `newGuideBlock`, `brandSuffix`, `leaguePointsPerLevel`, `skillPercentMaxFractionDigits`, `maxEquipmentStar`, `plannedLocales` (+ 8 types exportés inutilisés). *Action : retirer le mot-clé `export` — surface d'API réduite, et `knip` redevient exploitable comme garde-fou.*

### F3 — Duplication de la persistance `localStorage`
Le triplet « `setTimeout(0)` de chargement + drapeau `loaded` + effet de sauvegarde » est recopié 3 fois (`equipment-tools.tsx:455-483`, `expedition-equipment-tools.tsx:350-370`, `player-settings-panel.tsx:95+`), plus une variante dans `theme-toggle.tsx:12`. *Action : un hook `usePersistedState(key, validate, initial)` — il résoudrait aussi **E1** en rendant la validation obligatoire par construction.*

### F4 — Trois mécanismes de formatage numérique coexistent
`formatGameNumber` (compact, `city-calculators.ts:182`), `toLocaleString(locale)` écrit à la main (`ranking-calculator.tsx:110,146,147`), et `Math.round()` brut sans séparateur (`templars-reference.tsx:143-144`, `gems-reference.tsx:133`). Résultat : Templiers affiche `12345` là où Classement affiche `12 345`. Le choix compact/exact est **volontaire et documenté**, mais la voie « exact avec séparateurs » n'a pas de helper. À noter aussi : `formatPercent` est exporté depuis un **composant** (`reference-tables.tsx:86`) et importé par `gems-reference.tsx`. *Action : regrouper `formatGameNumber`, `formatSkillPercentValue` et `formatPercent` dans un `src/lib/format.ts`, y ajouter `formatExactNumber(value, locale)`.*

### F5 — Index absents sur les colonnes réellement filtrées
Le schéma ne contient qu'un seul index (`AuditLog.createdAt`). Les guides publics sont pourtant lus via `where: { status: "published", active: true }` + `orderBy: { publishedAt: "desc" }` (layout public et pages guides) sans index. *Action : faible priorité — volumétrie SQLite très réduite. À ajouter (`@@index([status, active, publishedAt])`) si le nombre de guides croît.*

### F6 — Asymétrie ARIA introduite par le Bloc 92 lui-même
`aria-expanded`/`aria-controls` ont été posés sur le bouton d'emplacement de Combat (`equipment-tools.tsx:256-257`, panneau `:607`) mais **pas** sur le jumeau Expédition (`expedition-equipment-tools.tsx:195-209`, panneau `:427-433`). *Action : porter les 3 attributs — correctif d'une ligne, et c'est le même patron de divergence que cet audit dénonce.*

### F7 — Divers
- `src/foundation.test.ts:5` : `expect(true).toBe(true)` — test placeholder à supprimer ou à remplir.
- `NODE_ENV` et `PORT` utilisés mais absents de `.env.example` (standards runtime, impact nul).
- **1370 références « Bloc N »** dans 202 fichiers. Elles constituent la mémoire du projet et sont majoritairement exactes (M7 est la seule fausse prouvée) : **à conserver**, mais préférer désormais le *pourquoi* au *numéro de bloc* dans les nouveaux commentaires.
- Frontière de style : l'admin utilise Tailwind (~18 occurrences de classes utilitaires) tandis que le public utilise `globals.css`. Frontière nette et assumée — *à documenter, pas à unifier.*

---

## 4. Résumé exécutif

Pour un projet construit en 92 blocs successifs avec de nombreuses reversions, le code est **remarquablement sain** : zéro `any` en production, aucun test désactivé, 35 routes API suivant un patron d'autorisation unique et une forme d'erreur uniforme, des assertions non-nulles toutes sûres, et de vraies factorisations partagées. La dette réelle n'est ni diffuse ni structurelle : elle tient à des **divergences entre implémentations jumelles** (un correctif appliqué d'un seul côté), à de la **duplication que les blocs ont recopiée au lieu de factoriser**, et à des **résidus de révision** jamais nettoyés.

**Les 3 actions à plus fort impact :**

1. **Corriger les 3 divergences de jumeaux à conséquence réelle (E1, E3, M7)** — la validation manquante du `localStorage` Combat (risque d'écran blanc), la collision d'`id` d'erreur non corrigée dans `EditableReferenceTableInner`, et le commentaire qui interdit un portage déjà fait. La comparaison systématique des jumeaux reste la méthode la plus rentable sur ce projet : elle a produit ici 6 constats vérifiés, dont un bug utilisateur.
2. **Traduire les 12 clés manquantes en DE/ES/TR et ajouter un test de parité des locales (E2)** — 11 sont réellement affichées, le repli anglais les masque, et rien ne détecte la lacune. C'est le seul constat qui dégrade aujourd'hui l'expérience d'utilisateurs réels.
3. **Factoriser les onglets et l'état d'enregistrement admin (M1)** — les deux grappes les plus coûteuses : les onglets ont forcé le Bloc 92 à câbler 8 fois le même ARIA, et les 6 variantes d'état d'enregistrement produisent des retours visuels incohérents. C'est l'investissement qui réduit le plus le coût des blocs futurs.

Le nettoyage du code mort (M5, F2) est peu risqué et peut accompagner n'importe quel bloc ultérieur.
