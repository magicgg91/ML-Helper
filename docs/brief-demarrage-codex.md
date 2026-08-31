# Brief de démarrage — ML-Helper (pour Codex)

Ce document est le point d'entrée pour démarrer le développement. Il résume le plan de travail phasé et le setup technique à mettre en place en tout premier. **Le détail complet des spécifications (formules, modèles de données, décisions produit) est dans `docs/cahier-des-charges-ml-helper.md`, à consulter systématiquement avant d'implémenter chaque brique.**

Domaine cible : `ml-helper.com`.

**📍 État d'avancement (à mettre à jour au fil des tâches) :** Phase 0 (setup) ✅ validée et poussée. Phase 1 (fondations : schéma Prisma, auth, back-office minimal) ✅ validée et mergée. **Phase 2 (site public + tous les simulateurs déjà spécifiés) ✅ entièrement validée et mergée** — Villes, Classement, Compétences (Gemmes/Templiers/Simulateur de Stuff/Comparateur), Référentiels sont tous fonctionnels **(⚠️ mais leur emplacement dans la navigation a changé depuis — voir "Restructuration navigation" en tête de la liste unifiée, section 4)**. **Blocs 0 à 41 de la Liste unifiée (section 4) tous ✅ terminés et mergés sur dev.** Restent, non bloquants : Bloc 10 (assets images, dépôt progressif). Avant d'attaquer la Phase 3 (Combat Fight/Enemy Troops, contenu des guides, référentiel Consommables) : cadrage produit encore à faire sur ces 3 chantiers.

---

## 0. Setup à faire avant tout développement fonctionnel

### Repo & branches
1. Créer le repo GitHub **privé**, aucune licence pour l'instant
2. Créer la branche `dev` (branche de travail active — tout le développement s'y passe)
3. `main` — branche par défaut du repo, joue le rôle de `prod` : **protégée**, PR obligatoire pour merger, même en solo (le garde-fou est la CI, pas la review humaine)
4. Ne jamais pousser directement sur `main`

### Scaffold technique
- Next.js (React + TypeScript)
- Prisma + SQLite (penser au `binaryTargets` musl pour Alpine dès le schéma initial — voir cahier des charges section 2 bis, sinon le build plante avec une erreur peu explicite)
- NextAuth.js (Credentials Provider configuré pour `username`, pas email — configuration explicite requise, ce n'est pas le comportement par défaut)
- next-intl, structure prête pour EN/FR au lancement (ES/DE en cible, pas à câbler maintenant)
- Variables CSS custom properties dès les premiers composants (mode clair/sombre prévu dès le départ, pas de couleurs codées en dur)

### Tests automatisés — à écrire dès le départ, pas ajoutés après coup
- **Unitaires** : Vitest
- **Composants/Frontend** : React Testing Library
- **E2E** : Playwright
- Même un projet vide doit sortir de cette étape avec une suite de tests qui tourne (smoke tests), pas juste la config posée

### Pipeline GitHub Actions
| Déclencheur | Actions |
|---|---|
| Push/PR vers `dev` | Lint + tests unitaires + composants + e2e, **puis build + push de l'image Docker taguée `:dev`** sur ghcr.io |
| PR vers `main` (ouverture/mise à jour) | Suite de tests complète, obligatoire avant d'autoriser le merge |
| Merge vers `main` | Build + push de l'image Docker taguée `:latest` sur ghcr.io |

Déploiement réel (pull + relance du conteneur sur le serveur) reste **manuel**, pas d'outil d'auto-déploiement à mettre en place.

### Dockerfile
Multi-stage : une étape dépendances + build, image finale minimale avec le build Next.js compilé en mode `standalone`, base `node:alpine`. Persistance via bind mount (`/app/data` ← dossier hôte), pas de volume Docker nommé.

---

## 1. Phase 1 — Fondations (avant tout outil public)

- Schéma Prisma complet : Guide, Calculateur, Formule (paramètres numériques nommés — **pas de champ formule libre éditable**, voir cahier des charges section 6), Table de référence (`lookup_table`), Utilisateur, Log, Contenu statique
- Auth admin (NextAuth, 5 rôles : Super Admin / Admin / Gestion Guides / Gestion Outils / Lecture Seule — droits détaillés section 3.2 du cahier des charges)
- Back-office minimal : `/admin` (dashboard vide), `/admin/users` (CRUD, Super Admin uniquement), `/admin/logs` (lecture + purge manuelle par plage de dates)
- Système de logs (qui a fait quoi, quand, sur quoi — voir section 6 bis)

**Definition of done phase 1 :** un Super Admin peut se connecter, créer un compte Admin, et voir les logs de cette création. Rien de public encore.

---

## 2. Phase 2 — Site public + outils déjà spécifiés

C'est la plus grosse phase. Tout ce qui suit est **déjà entièrement spécifié** dans le cahier des charges (section 7) — pas de zone d'ombre fonctionnelle, uniquement de l'implémentation.

**⚠️ Avant de commencer cette phase, lire `AGENTS.md` section "Référence UI/logique — le prototype fait foi".** `docs/prototype-ml-helper-unifie.html` est l'implémentation de référence à porter — plus fiable que le texte seul sur les détails fins (formules, restrictions, comportements d'UI).

### Pages publiques
`/`, `/tools`, `/tools/[slug]`, `/guides`, `/guides/[slug]` (contenu réel pas encore rédigé, structure suffit), `/contact`, `/legal`, `/login`

### Paramètres du joueur (localStorage, pas de compte joueur nécessaire)
- Niveau, ligue, VP
- **"Compétences avec équipement"** : 10 % éditables directement (stuff seul, sans les points — voir note ci-dessous)
- **"Distribution des points"** : outil de planification séparé, calcule le % à partir de points investis (base par ligue + taux par point, plafonds, prérequis avec auto-remplissage et blocage si budget insuffisant)
- Templiers personnels (5 types, 0-20 chacun)
- Bonus de Temple du Clan (5 champs, saisie directe, minimums = base du temple, pas aligné sur le taux Templier de chaque stat)
- Sélecteur d'unité (×1/k/M/G) sur les grands champs numériques issus de la progression du jeu (VP, or disponible...) — **exception : le budget en saphirs (Gemmes, mode Budget disponible) n'en a pas**, saisie directe
- Stepper −/+ sur tous les champs nombre (pas les flèches natives du navigateur), y compris les champs générés dynamiquement

**⚠️ Point de modélisation à garder en tête :** "Compétences avec équipement" et "Distribution des points" sont volontairement **indépendants** — le premier est la valeur réellement utilisée par tous les calculateurs, le second est un outil de simulation qui n'écrit pas dans le premier automatiquement.

### Catégorie Villes
- **Coût de Ville** (City Cost) — formules villes section 7.1, ligue Légende confirmée
- **Niveau Max Atteignable** (City Max Level) — nécessite une recherche itérative, pas une formule directe (codé en dur, pas éditable en admin — voir section 7.1)
- **Production** (fusion de 3 anciens calculateurs) — production par ville, production totale détaillée (base/dont stuff/dont temple), récompenses (heures de production → bonus), et case "reskill full-prod"

### Catégorie Classement
- **Ranking** — convertisseur position ↔ pourcentage, seuils et récompenses par ligue (Légende/Diamant/Argent complets, Bronze/Or/Platine partiels — à compléter en admin une fois les données confirmées)

### Catégorie Compétences
- **Simulateur de Stuff** — 4 blocs (Attaque/Défense/Or/Vitesse), grille 3×3 par bloc, catalogues mixtes pour Or (Or+Troupes-Vitesse) et Défense (Défense+Or), **liste blanche stricte des compétences comptabilisées par bloc et par famille d'objet** (ex: bloc Or = Prospérité + Recruteur uniquement, pas les autres compétences que les objets Or possèdent réellement — voir section 7.1)
- **Comparaison de stuff** — mêmes 4 blocs et catalogues mixtes que le Simulateur, sélecteur de set explicite (rareté + nom + famille) pour lever l'ambiguïté d'un catalogue mixte
- **Gemmes** — 2 modes : Optimisation (multi-stat, mix de plusieurs compétences sur les mêmes emplacements avec ligue indépendante par ligne) et Budget disponible (saphirs, une seule compétence à la fois) — formule et algorithmes entièrement spécifiés section 7.1
- **Templiers** — table de coût exacte (pas une formule), 5 types indépendants

### Catégorie Référentiels
- **Équipements de Combat** — tableau filtrable, formule de progression par étoile **100% confirmée** (additive, incrément par compétence — table complète en section 7.1), 30 lignes de valeurs encore vides à laisser éditables en admin
- **Équipement d'Expédition** — tableau filtrable, formule par étoile confirmée pour 2 stats sur 10 seulement (repli sur hypothèse non fiable pour les 8 autres, à garder visible comme tel dans l'UI)

**Definition of done phase 2 :** un visiteur peut utiliser tous les calculateurs ci-dessus sans compte, avec persistance de ses paramètres en localStorage, en EN et FR.

---

## 3. Phase 3 — Après stabilisation de la phase 2

**⚠️ Ne pas confondre "Phase" (ce document) et "V1/V2" (cahier des charges).** Les "Phases" ici décrivent l'ordre de développement avec Codex sur le périmètre déjà cadré. "V1/V2" (cahier des charges, section 1.1) décrit des versions produit — la V1 correspond à tout ce qui est actuellement en développement (Phases 0-3 ici), la **V2 (comptes joueurs, sans deadline) n'a pas encore de Phase associée**, elle n'entre pas dans le scope Codex actuel.

**📋 Le détail complet du backlog restant (UI/UX, admin, technique) est en section 4 "Liste unifiée"**, organisée par ordre d'implémentation recommandé — pas dupliqué ici.

Pas de zone d'ombre technique, juste du contenu/périmètre pas encore prêt côté produit :
- **Combat** (Level Up, Fight, Enemy Troops) — catégorie non spécifiée pour ces 3-là, à cadrer avec le porteur de projet avant de coder. **Mais 2 simulateurs y sont déjà spécifiés et prototypés** : Taux de gain d'XP (point 31) et Troupes max en attaque démo (point 32), prêts à envoyer à Codex indépendamment du reste.
- **Contenu des guides** — le modèle est prêt, rédaction en cours (via ChatGPT, hors périmètre Codex) — voir `docs/cahier-des-charges-ml-helper.md` section 10 pour le plan complet (56 guides, 8 catégories) et le suivi ✅/⬜
- **Référentiel Consommables** — structure connue (photo/nom/description/coût en saphirs), reste à collecter la liste des objets
- **ES/DE/PL/TR** — prévu dans l'architecture i18n mais pas prioritaire

---

## Rappels transverses à respecter partout

- **Jamais de formule libre éditable en admin** — uniquement des paramètres numériques nommés (décision actée, voir section 6 du cahier des charges)
- **Formatage des grands nombres** : compact par palier (k/M/G/T/P), seuils précis en section 3.3
- **Arrondi** : entier pour les quantités absolues (or, troupes, coûts), décimales conservées pour les pourcentages
- **Formules jamais exposées côté public** — uniquement les résultats, jamais `VP = 20 × 1.115^(n-1)` visible pour un joueur
- Toute donnée encore marquée "non confirmé"/"hypothèse" dans le cahier des charges doit rester **éditable en admin** avec sa valeur actuelle par défaut, pas bloquante pour livrer la fonctionnalité
- **Formule additive par étoile (`base + incrément × (n−1)`) commune Combat/Expédition** — actuellement écrite uniquement pour le Combat (`equipmentValueAtStar()` dans `src/lib/equipment.ts`), à extraire en helper neutre partagé (voir cahier des charges section 7.1, note d'implémentation ajoutée lors de l'audit Bloc 6) **dans la même tâche que la construction du calculateur Expédition** — ne pas la recopier telle quelle pour l'équipement d'expédition, et ne pas faire l'extraction avant, tant que le second appelant n'existe pas encore

---

## 4. 📋 Liste unifiée — toutes les actions restantes, dans l'ordre d'implémentation recommandé

*Consolidée à partir du backlog UI/UX et du suivi d'implémentation du cahier des charges. **Réorganisée par ordre de dépendance** (fondations avant ce qui en dépend) plutôt que par simple priorité visuelle — voir logique de tri en préambule de chaque bloc. Les numéros entre parenthèses `(point X)` renvoient à la numérotation d'origine, utilisée ailleurs dans ce document et dans le cahier des charges. Mise à jour au fil de l'eau, cocher/rayer au fur et à mesure.*

### Bloc 0 — Restructuration de navigation, décidée ✅ **Terminé** (PR [#8](https://github.com/magicgg91/ML-Helper/pull/8))
*Actée en discussion, y compris l'organisation admin.*

- **Référentiels sortis de "Outils", rejoignent "Guides"** — "Outils" devient réservé aux vrais simulateurs (Villes/Combat/Classement/Compétences). Une seule entrée de menu "Guides", avec **2 sections distinctes à l'intérieur de la même page** : "Guides" (texte) et "Référentiels" (tables), chacune avec ses propres cartes de catégorie et son propre filtrage — pas de fusion de contenu, juste co-localisation dans la navigation. Détail complet en section 3.1 du cahier des charges (routes en section 4).
- **Liens croisés obligatoires** — puisque les référentiels ne sont plus adjacents aux simulateurs qui les utilisent, chaque simulateur concerné doit avoir un lien direct ("Voir le référentiel complet") vers le référentiel pertinent. Concerne au minimum : Simulateur de Stuff et Comparaison de stuff → Référentiel Équipements de Combat.
- **✅ Organisation admin décidée** — l'admin Référentiels suit l'admin Guides, pas l'admin Outils. Le rôle **"Gestion Guides" édite désormais aussi les référentiels** (ne modifie pas la validation de publication réservée à Admin/Super Admin) ; le rôle **"Gestion Outils" ne couvre plus que les simulateurs**. Voir section 3.2 du cahier des charges (table des rôles mise à jour).

### Bloc 1 — Bug actif, à corriger en premier ✅ **Terminé** (PR [#9](https://github.com/magicgg91/ML-Helper/pull/9))
*Isolé, rapide, sur du contenu déjà publié.*

- **Guides — moteur de rendu markdown cassé** *(point 25)* : le markdown n'est pas correctement interprété à l'affichage d'un guide publié. Utiliser **`react-markdown`** + **`remark-gfm`** (tableaux, listes de tâches, strikethrough) pour le rendu côté page publique `/guides/[slug]`, plus **`rehype-sanitize`** par précaution. Vérifier blocs de code, tableaux, listes, citations, liens.

### Bloc 2 — Fondation : internationalisation ✅ **Terminé** (2a PR [#10](https://github.com/magicgg91/ML-Helper/pull/10), 2b PR [#11](https://github.com/magicgg91/ML-Helper/pull/11), 2c PR [#12](https://github.com/magicgg91/ML-Helper/pull/12), 2d PR [#13](https://github.com/magicgg91/ML-Helper/pull/13))
*À faire avant tout le reste pour éviter de retoucher deux fois chaque écran (une fois pour le contenu, une fois pour l'i18n). Découpé en sous-tâches : 2a (fondation technique) → 2b (pages publiques Outils) → 2c (Guides + Référentiels) → 2d (admin).*

- **Internationalisation incomplète — architecture simplifiée et précisée (2 mécanismes seulement)** *(point 1)* : Absolument tout texte d'interface, **public ET admin, sans aucune exception** (y compris les labels internes admin de Formule/Table de référence, pas de traitement spécial) → **fichiers de traduction statiques next-intl**, un JSON par langue, clé technique (`key`/`slug`) de chaque enregistrement comme clé de traduction. **Seule exception : contenu éditorial dynamique** (guides, mentions légales) → reste en JSON par locale en base, puisque c'est du contenu créé dynamiquement, pas fixe. **Règle de repli : traduction manquante → affichage en anglais par défaut**, sur les deux mécanismes. Objectif concret : ajouter une langue = ajouter un fichier JSON (+ compléter les objets JSON existants pour le contenu éditorial), zéro modification de code. Détail complet en section 3.3 du cahier des charges.

### Bloc 3 — Fondation : restructuration admin ✅ **Terminé** (mergé — n° de PR non communiqué, probablement #14 vu la numérotation)
*Un seul gros bloc cohérent, nécessaire avant le chargement de contenu qui en dépend (bloc 4). Suppose le Bloc 0 déjà fait (l'organisation Guides+Référentiels doit être en place avant de construire les tableaux admin).*

- **Nommage "Outils" partout, y compris admin** *(point 8)* — "Calculateur"/"Simulateurs" (comme terme englobant) ne doivent plus apparaître nulle part côté utilisateur — "Outils" est le terme final (rôle admin renommé "Gestion Outils"), à répercuter dans le code.
- **Tableau admin Outils (simulateurs uniquement)** *(point 9, révisé)* (`/admin/tools`) — colonnes Nom/Statut/Actions, bouton "Modifier" par ligne. **Les référentiels n'y sont plus** — ils rejoignent le tableau admin Guides (voir Bloc 0), même pattern (colonne Type : Guide / Référentiel).
- **Cas Villes — point d'édition partagé** *(point 10)* — les 3 simulateurs Villes doivent pointer vers la même pop-up d'édition des paramètres (VP/Remparts/Coût/multiplicateurs Army-Gold par ligue, toutes les valeurs sont maintenant connues, section 7.1) — pas de duplication.
- **Édition des référentiels à revoir** *(point 11)* — dropdowns pour rareté/famille/emplacement/compétence, pouciel et emplacements gemmes non éditables (auto-calculés), filtres en haut du tableau. **À construire dans le tableau admin Guides, pas Outils** (voir ci-dessus).
- **Templiers — remplacer la table de coût par la formule** *(point 12)* — 2 paramètres nommés (base=150, ratio=1,3) au lieu d'une `lookup_table` à 21 lignes.
- **Bouton retour manquant dans les pages d'édition admin** *(point 13)*.
- **Éditeur Classement dédié (jamais formellement numéroté avant, à ajouter)** — l'édition admin des seuils/récompenses par ligue du Classement se fait via un blob JSON brut, à remplacer par une UI dédiée par ligue (bouton "+" pour ajouter un rang/seuil, champs de saisie individuels par ligne). Généraliser en **composant de table éditable réutilisable** plutôt que de le refaire pour chaque `lookup_table` (Templiers, équipements) — cohérent avec le point 11 ci-dessus.

### Bloc 4 — Contenu à charger (dépend du bloc 3) ✅ **Terminé** (PR [#15](https://github.com/magicgg91/ML-Helper/pull/15))
*Rapide une fois l'admin prêt.*

- **Contenu des mentions légales** *(point 14)* — texte français rédigé (section 6 bis du cahier des charges), à charger comme valeur par défaut si pas déjà fait.
- **Multiplicateurs Villes par ligue** *(point 15)* — toutes les valeurs sont maintenant confirmées (6 ligues), à charger en admin une fois le point d'édition partagé (bloc 3) construit.

### Bloc 5 — Nouveaux simulateurs Combat + référentiel Level Up ✅ **Terminé** (PR [#16](https://github.com/magicgg91/ML-Helper/pull/16))
*Entièrement spécifiés, faible risque, indépendants du reste — bon calage pour souffler après les blocs 2-3. **Deux natures différentes à ne pas mélanger dans l'implémentation : 5a = vrais simulateurs (→ `/tools`), 5b = référentiel (→ `/guides`, section Référentiels, jamais `/tools`).***

**5a — Simulateurs (Outils, catégorie Combat) :**
- **Combat — Taux de gain d'XP** *(point 31)* — ✅ Résolu et prototypé (formule + seuils confirmés, UI construite dans `docs/prototype-ml-helper-unifie.html` : un champ VP, mode attaquant/cible, sortie en tableau des 5 paliers avec plage de VP adverse). Voir section 7.1 du cahier des charges. **Prêt à être envoyé comme tâche Codex, reproduire fidèlement le prototype.**
- **Combat — Troupes max envoyées en "attaque démo"** *(point 32)* — ✅ Résolu : formule confirmée (`TroupesMax = X% × Remparts(niveau_ville_visée)`, X selon la ligue de l'attaquant : Bronze 100%, Argent 50%, Or/Platine 40%, Diamant/Légende 30%). Vitesse d'attaque réduite = information seulement, **pas à intégrer au calcul**. **Prêt à être envoyé comme tâche Codex.**

**5b — Référentiel (section Référentiels de `/guides`, PAS Outils) :**
- **Level Up (référentiel, pas calculateur)** *(inclus dans le point 18)* — **🚨 catégorie thématique Combat mais nature référentiel : rejoint `/guides/referentiels/level-up` aux côtés d'Équipements de Combat/Expédition, jamais `/tools`, malgré le regroupement historique avec 5a dans ce bloc.** Formule troupes ✅ verrouillée pour **Légende, Diamant et Bronze (identique pour les trois)**, ✅ verrouillée séparément pour **Platine** (formule distincte), ✅ verrouillée séparément pour **Or** (formule distincte, ne pas confondre avec Légende malgré une ressemblance trompeuse aux petits niveaux — voir piège méthodologique en section 7.1 du cdc), ✅ **formule d'XP requis par niveau verrouillée** (universelle, identique sur les 6 ligues, régression exacte sur 110 points), cycle de coffres tous les 10 niveaux ✅ **confirmé universel sur les 6 ligues** (Coffre→Urne→Coffret à bijoux→Jarre→Caisse, boucle de 5, identique partout — seules les formules de troupes varient par ligue) — contenu exact des coffres couvert par le guide Level Up plutôt que la donnée structurée. **Reste : données troupes Argent, seule donnée manquante pour ce référentiel** (XP et cycle de coffres déjà universels, donc déjà connus pour Argent aussi) — **peut être envoyé dès maintenant pour 5 ligues sur 6** (Légende/Diamant/Bronze/Platine/Or, XP et coffres complets), Argent complété plus tard.

### Bloc 6 — UI/UX : alignement visuel Dev ↔ Prototype ✅ **Terminé** (via Claude Code, PR [#23](https://github.com/magicgg91/ML-Helper/pull/23), 8 commits — 219 tests/59 fichiers verts, e2e à confirmer en CI réelle, pas vérifiable en local)
*Ordre d'exécution réel convenu : 5 → 7 → 8 → 9 → 6. Portée légèrement élargie par rapport à la spec initiale (voir 2 points ajoutés en fin de liste).*

- **Alignement Dev ↔ Prototype** *(point 2)* et **Paramètres du joueur — résumé manquant en repli** *(point 3)* — ✅ **Terminé** (PR [#24](https://github.com/magicgg91/ML-Helper/pull/24), 246 tests/65 fichiers).
- **Simulateur de Stuff — rendu des emplacements** *(point 4)* — couleur de rareté sur la case, gemmes visibles avec ligue+étoiles+couleur de compétence (palette exacte en section 7.1 du cahier des charges).
- **Classement — barre visuelle** *(point 5)* — indicateur rouge de position exacte, libellés hors barre en quinconce, couleurs par catégorie (Descente/Maintien/Montée, clair→foncé).
- **Calculateurs Villes — affichage des résultats** *(point 6)* — base ville seule en premier, détail Stuff/Temple séparé, total en évidence (reprendre le pattern déjà en place sur Production).
- **Page d'accueil simulateurs — carte pas assez cliquable** *(point 7)* — tout le cadre doit l'être, pas juste le compteur.
- **Page des guides — cartes** *(points 35+36, fusionnés)* — entièrement cliquables, 3 par ligne au lieu de 5.
- **🆕 Boutons admin plus soignés, partout** *(élargi depuis le Bloc 7ter, qui ne l'avait fait que sur l'éditeur de guides)* — étendre le même traitement visuel à tous les boutons admin (tableaux Outils/Guides, actions CRUD, connexion), pas juste l'écran d'édition markdown.
- **🆕 Placeholders pour images manquantes** *(nouveau — voir cdc section 12, décision ajoutée)* — les images d'équipements/gemmes seront ajoutées progressivement, pas toutes d'un coup. Le site ne doit jamais afficher une icône d'image cassée : composant de repli visuel tant que le fichier n'existe pas encore sur le serveur.

### Bloc 7 — Guides : technique complémentaire ✅ **Terminé** (PR [#17](https://github.com/magicgg91/ML-Helper/pull/17))
*Même écran d'édition à retoucher, logique de les grouper.*

- **Guides — éditeur markdown à améliorer** *(point 26)* — remplacer la zone de texte brute par **`@uiw/react-md-editor`** (coloration syntaxique, aperçu en direct côte à côte, toolbar optionnelle) — reste un éditeur markdown-natif, pas de blocs WYSIWYG. L'aperçu doit utiliser le même moteur que le rendu public (`react-markdown`+`remark-gfm`, bloc 1) pour cohérence exacte.
- **Éditeur de guides — sélecteur de catégories multiples** *(point 30)* — un guide peut appartenir à plusieurs catégories à la fois (champ `category` passé de enum simple à tableau). L'éditeur admin doit permettre de cocher/sélectionner une ou plusieurs des 8 catégories, pas un menu déroulant à choix unique. Impacte aussi l'affichage public.
- **Éditeur de guide — champ image représentative** *(point 37)* — le champ `cover_image` existe déjà dans le modèle de données (section 5) mais n'est pas encore exposé dans l'éditeur admin. Ajouter un sélecteur d'image, affichée à gauche de la carte sur la page de liste.

### Bloc 7bis — Correctifs de mise en page éditeur (retour d'usage post-Bloc 7) ✅ **Terminé** (PR [#18](https://github.com/magicgg91/ML-Helper/pull/18))
*Rapide, isolé, même écran que le Bloc 7 — à faire avant le Bloc 8 pendant que c'est frais.*

- **Sélecteur de catégories multiples trop encombrant** — rendre plus compact (liste déroulante à choix multiples ou puces/chips repliables plutôt qu'une liste de 8 cases à cocher en pleine largeur).
- **Sélecteur de langue trop encombrant** — remplacer par une liste déroulante compacte, pas d'onglets ni d'accordéon (cdc section 6, décision précisée).
- **Proportions éditeur/aperçu à corriger** — l'aperçu en direct prend trop de hauteur/place ; la zone de saisie markdown est trop petite en largeur et en hauteur. Rééquilibrer en faveur de la zone de saisie.
- **Éditeur mentions légales aligné sur l'éditeur de guides** *(cdc section 3.1, révisé)* — bascule du simple textarea prévu initialement vers le même `@uiw/react-md-editor` que les guides (Bloc 7), pour cohérence entre les deux écrans d'édition markdown du site.

### Bloc 7ter — Aperçu intégré, boutons repositionnés, thème clair (2e retour d'usage post-Bloc 7bis) ✅ **Terminé** (PR [#20](https://github.com/magicgg91/ML-Helper/pull/20))
*Rapide, isolé, même écran encore — dernier passage sur cet éditeur avant de passer à autre chose.*

- **Aperçu intégré à l'éditeur, panneau séparé supprimé** — `@uiw/react-md-editor` a un mode aperçu natif, pas besoin du panneau construit en Bloc 7. Configurer l'aperçu natif avec les mêmes plugins que le rendu public (`remark-gfm` + `rehype-sanitize`) pour ne pas perdre la cohérence exacte avec ce que voit le joueur — ne pas se contenter des réglages par défaut de la bibliothèque. Conséquence : l'éditeur peut prendre toute la largeur disponible.
- **Boutons Enregistrer/Publier + messages de confirmation en haut**, à côté du bouton retour (actuellement en bas de page).
- **Style des boutons à améliorer** — plus soignés, cohérents avec l'identité visuelle du reste du site.
- **Thème clair** pour l'éditeur (actuellement en mode sombre par défaut, thème natif de la bibliothèque) — cohérence avec le reste de l'admin.

### Bloc 8 — Admin : sécurité et accès ✅ **Terminé** (PR [#19](https://github.com/magicgg91/ML-Helper/pull/19))
*Bloc indépendant, ne bloque rien d'autre.*

- **Nouveau rôle admin "Lecture Seule"** *(point 27)* — accès en consultation uniquement à toutes les sections admin, aucune action de mutation possible nulle part (bloqué côté serveur). Cas d'usage : montrer l'envers du décor sans donner de droit d'édition. Détail en section 3.2 du cahier des charges (table des rôles, 5e ligne).
- **Retirer le lien vers l'administration du dashboard public** *(point 28)*.
- **Refonte de la page de connexion** *(point 29)* — mise en page plus soignée (centrée, cadrée), et sécurisation renforcée :
    - Limitation des tentatives (rate limiting) avec blocage temporaire après N échecs consécutifs
    - Messages d'erreur génériques (ne pas révéler si c'est le username ou le mot de passe qui est incorrect)
    - **2FA (TOTP)** — code à usage unique via une app d'authentification, génération de la clé secrète et QR code lors de l'activation, vérification à chaque connexion

### Bloc 9 — Petits ajustements ponctuels ✅ **Terminé** (PR [#21](https://github.com/magicgg91/ML-Helper/pull/21))
*Rapides, glissables n'importe où — "pendant qu'on y est" plutôt qu'une tâche dédiée.*

- **Coût de Ville — contrainte niveau cible > niveau de départ** *(point 22)* — le niveau cible doit toujours être strictement supérieur au niveau de départ (minimum +1), avec ajustement automatique dans les deux sens.
- **Aucune ligue sélectionnée par défaut, partout** *(point 23, périmètre étendu)* — Paramètres du joueur, Classement, Gemmes (Optimisation + Budget), Simulateur de Stuff, Comparateur de stuff, Troupes attaque démo, Level Up, **Villes (Coût de Ville, Niveau Max, Production — nouveau sélecteur à construire, cdc section 7.1)** : tous les sélecteurs de ligue doivent démarrer vides (placeholder "— Choisir —"), avec repli propre côté calcul tant qu'aucune ligue n'est choisie. **Exception (Classement, Troupes attaque démo, Level Up, Villes)** : ces sélecteurs s'alignent automatiquement sur la ligue du joueur dès qu'elle est définie — **y compris au chargement initial si déjà en cache (localStorage)**. Si le sélecteur dépendant a déjà une valeur choisie manuellement, elle n'est pas écrasée. **Raison d'être pour Villes, à noter pour Codex** : permettre de tester les valeurs d'une autre ligue que la sienne (ex: simuler pour quelqu'un d'autre), pas juste refléter son propre profil — contrairement à l'implémentation actuelle qui lit `player-league` directement sans sélecteur dédié (voir prototype avant mise à jour). **Placement du sélecteur : toujours en première position (le plus à gauche) dans la grille d'inputs**, avant Nombre de villes/Niveau de départ/etc. — cohérent sur les 3 calculateurs Villes, voir prototype à jour.
- **🚨 Nettoyage — champs de traduction obsolètes en admin** *(nouveau, trouvé en vérifiant l'admin après le Bloc 2b)* — le cdc a explicitement retiré 3 champs du modèle de données au profit des fichiers de traduction statiques next-intl (section 6, cdc) : `name` d'un Calculateur/Outil, `label` d'une Formule, `label` d'une Table de référence. Chacun garde son `slug`/`key` technique comme clé de traduction. **Cette bascule n'a jamais été suivie d'un nettoyage de l'admin** : les champs de saisie de traduction par enregistrement (nom FR/EN d'un outil, etc.) sont toujours visibles dans l'édition admin de plusieurs outils (Troupes attaque démo, Simulateur de Stuff, au moins) alors qu'ils n'ont plus d'effet ou n'auraient jamais dû survivre à la migration i18n. **À faire** : supprimer ces champs de saisie de l'UI admin partout où ils traînent encore (probablement tous les outils, pas seulement les 2 repérés), confirmer qu'aucun champ Prisma correspondant ne subsiste non plus si le Bloc 2b/2d ne l'avait pas déjà fait au niveau du schéma.

### Bloc 11 — Refonte compacte de l'UI admin (shadcn/ui) + lien site public ✅ **Terminé** (PR [#25](https://github.com/magicgg91/ML-Helper/pull/25), 4 commits — 254 tests verts, e2e à confirmer en CI réelle)
*Nouveau, retour joueur après le Bloc 6. Indépendant du reste.*

- **Vérifier si `shadcn/ui` est déjà partiellement utilisé** dans l'admin (`package.json`/imports) — si oui, étendre son usage plutôt que réinstaller. Si non présent du tout, l'installer (décision actée, voir cdc section 8).
- **Compacter tableaux et boutons via `shadcn/ui`** — trop volumineux et mal alignés actuellement (retour direct du joueur), sur l'ensemble de l'admin (Outils, Guides, Utilisateurs, Logs), pas un écran en particulier. Composants `Table`/`Button`/`Card` de `shadcn/ui` comme base.
- **Lien vers le site public dans la barre du haut**, à côté des boutons utilisateur/thème déjà en place, ouverture dans un nouvel onglet.
- **Navigation principale en sidebar gauche**, plus en barre du haut (pattern `shadcn/ui`) — barre du haut réduite aux contrôles utilitaires (utilisateur, thème, lien site public), sidebar gauche pour les liens principaux (Dashboard, Outils, Guides, Utilisateurs, Logs).

### Bloc 11bis — Retour de la navigation admin en barre du haut ✅ **Terminé** (PR [#26](https://github.com/magicgg91/ML-Helper/pull/26), 4 commits — 258 tests verts)
*Correction rapide, revient sur un choix du Bloc 11 (sidebar) — trop de place prise sur le contenu.*

- **Ramener la navigation principale (Dashboard, Outils, Guides, Utilisateurs, Logs) dans la barre du haut**, aux côtés des contrôles déjà présents (utilisateur, thème, lien site public). Retirer la sidebar gauche introduite au Bloc 11.
- Garder tout le reste du Bloc 11 (composants shadcn/ui compacts sur les tableaux/boutons) — seule la position de la navigation change, pas la densité visuelle obtenue.
- **Boutons d'action des tableaux encore trop volumineux** (Éditer/Activer/Supprimer) — les compacter, **sans passer par un menu déroulant** (refusé) : boutons icône-seule avec tooltip, ou tout autre traitement gardant les actions visibles et cliquables directement.
- **Sélecteur de langue de la barre du haut — pas de menu déroulant non plus** (même retour que ci-dessus) : garder des boutons/toggle visibles directement (ex: "FR | EN" cliquables), pas un menu à ouvrir.
- **🐛 Bug — éditeur markdown illisible en thème sombre** : le fond de l'éditeur reste correctement forcé en clair, mais le texte hérite de la couleur claire du thème sombre du site (texte clair sur fond clair). Verrouiller aussi la couleur du texte en sombre dans l'éditeur, indépendamment du thème actif du site (cdc section 3.1, note ajoutée).

### Bloc 12 — Filtres admin (Logs, Guides) + navigation publique ✅ **Terminé** (détails de validation non communiqués)
*Nouveau, retour joueur après le Bloc 11. Indépendant du reste.*

- **Filtres sur `/admin/logs`** — par utilisateur, par mot dans le message affiché (généré dynamiquement, pas un champ stocké — filtrer sur le texte affiché), par plage de date.
- **Filtre par Type sur `/admin/guides`** — bouton de filtre Guide/Référentiel, pas un menu déroulant (cohérent avec le Bloc 11bis).
- **Sélecteur de langue public aligné sur l'admin** — même pattern `AdminLocaleToggle` (FR/EN cliquables, pas de dropdown), à généraliser plutôt que dupliquer un composant équivalent.
- **Navigation publique mise en avant** — jugée trop discrète actuellement. Piste proposée : boutons plutôt que simples liens texte, pas une contrainte stricte.

### Bloc 13 — Refonte visuelle des cartes de la section Guides ✅ **Terminé** (PR [#28](https://github.com/magicgg91/ML-Helper/pull/28), 4 commits — 277 tests verts)
*Nouveau, isolé du Bloc 12. Indépendant du reste.*

- **Refonte visuelle des cartes de la section Guides** — jugées trop plates. Image de couverture pleine largeur en haut (plus à gauche), badge de catégorie visible sur la carte, hover state (élévation/ombre ou léger zoom), filtres en pills/chips cliquables (pas de dropdown). Référence : pattern "responsive card grid" Tailwind classique. Latitude large sur l'implémentation, pas de contrainte à garder la structure actuelle.

### Bloc 14 — Barre du haut publique : débordement mobile ✅ **Terminé** (PR [#29](https://github.com/magicgg91/ML-Helper/pull/29), 1 commit — 280 tests verts)
*Nouveau, discussion suite au Bloc 12. Indépendant du reste.*

- **Menu hamburger pour les liens de navigation uniquement** (Outils/Guides/etc.), qui passent actuellement sur 2 lignes sur mobile faute de place.
- **Thème et langue restent hors du hamburger**, visibles à côté de l'icône ☰ — déjà en icône-seule (pas de texte), donc pas la source du débordement. Les garder à un clic direct plutôt que de les enfouir dans le menu (réglages consultés à la volée, pas des choix ponctuels).

### Bloc 15 — Nouvelle palette de couleurs (violet accent, doré réservé Légendaire) ✅ **Terminé** (PR [#30](https://github.com/magicgg91/ML-Helper/pull/30), 4 commits — 284 tests verts)
*Nouveau, discussion suite au Bloc 12. Indépendant du reste. Impacte public ET admin — un seul système de design.*

- **Violet (couleur Mythique déjà utilisée pour les raretés) comme accent principal de l'UI** — boutons, liens actifs, focus. Remplace le doré utilisé actuellement.
- **Doré réservé exclusivement aux données de jeu réellement Légendaire** (badges de rareté, mise en avant d'objets légendaires) — ne plus l'utiliser comme couleur d'interface générique, pour préserver son signal.
- **Mode sombre** : fond bleu-nuit/anthracite — jamais noir pur, jamais de teinte brune.
- **Mode clair** : fond légèrement teinté (pas de blanc pur), même famille de couleur que le mode sombre.
- **Un seul système de design** — mêmes couleurs sur le site public et l'admin, pas deux palettes distinctes.
- **⚠️ Ne pas oublier** : la bordure dorée ajoutée au hover des cartes Guides (Bloc 13, PR #28) doit passer au violet avec le reste — vérifier tout hover/accent ajouté depuis l'ancienne palette.

### Bloc 16 — Recherche globale + retrait des pills sur Référentiels ✅ **Terminé** (PR [#32](https://github.com/magicgg91/ML-Helper/pull/32), 2 commits — 303 tests verts)
*Nouveau, retour joueur post-Bloc 13. Indépendant du reste.*

- **Recherche globale sur tout le site** — remplace la recherche actuelle limitée à la section Guides. Doit chercher dans les guides, les référentiels ET les outils/simulateurs, avec résultats routés vers le bon endroit selon le type de contenu trouvé. Accessible depuis n'importe quelle page (probablement dans la barre de nav, cohérente avec sa mise en avant au Bloc 14) plutôt que limitée à la page Guides.
- **Retirer les pills de filtre par catégorie sur la page Référentiels** — pas de notion de catégorie à filtrer pour les référentiels (ce sont des items individuels, peu nombreux), contrairement aux Guides. Simple liste/grille sans filtre de premier niveau. Les filtres internes de chaque référentiel (rareté/famille/emplacement/compétence) restent inchangés.

### Bloc 14bis — Bug menu mobile caché derrière le contenu de l'accueil ✅ **Terminé** (PR [#31](https://github.com/magicgg91/ML-Helper/pull/31), 1 commit)
*Correction rapide, bug trouvé après le Bloc 14 (hamburger).*

- **Le menu hamburger déplié se retrouve masqué derrière la première tuile de la page d'accueil sur mobile** — problème de z-index/empilement, le menu doit toujours passer au-dessus du contenu de la page, quelle que soit la page.

### Bloc 17 — Audit des plafonds de compétences (vérification, pas nouvelle donnée) ✅ **Terminé** (PR [#33](https://github.com/magicgg91/ML-Helper/pull/33), avec Bloc 16bis — 316 tests verts)
*Nouveau, doute soulevé après le résumé joueur du Bloc 6 suite (PR #24) qui ne mentionnait que le plafond Bravoure/Intrépide.*

- **Vérifier que tous les plafonds de compétence du cdc (section 7.1, table des 10 compétences) sont bien appliqués partout où une valeur totale de compétence est calculée/affichée** — pas seulement dans le résumé joueur replié. Plafonds à respecter : **Récupération (Cautious) max 50%**, **Intrépide/Bravoure max 90% (75% en Légende)**, aucun plafond pour les 7 autres compétences.
- Concerne au minimum : le résumé joueur replié (Bloc 6 suite), le champ de saisie "Statistiques données par l'équipement", et tout calculateur utilisant `getPersonalSkill()`.
- Corriger tout endroit où le plafond Récupération (50%) ou Bravoure/Intrépide (90%/75%) ne serait pas appliqué.
- **Résultat** : `skillPercent()` déjà correct partout. Résumé joueur replié + champ équipement avaient Récupération totalement absente ET Bravoure/Intrépide en 90% fixe au lieu de 75% en Légende — corrigés, unifiés dans `skillCapForLeague()`.

### Bloc 16bis — Recherche globale : fermeture au clic extérieur ✅ **Terminé** (PR [#33](https://github.com/magicgg91/ML-Helper/pull/33), avec Bloc 17)
*Correction rapide, suite au Bloc 16.*

- **Cliquer en dehors du champ de recherche doit fermer la recherche** (le dropdown de résultats et/ou le champ lui-même, selon ce qui est actuellement ouvert).

### Bloc 18 — Récompenses de production : calculateur autonome ✅ **Terminé** (PR [#34](https://github.com/magicgg91/ML-Helper/pull/34), 2 commits — 322 tests verts)
*Nouveau, sorti du calculateur Production (retour joueur). Indépendant du reste.*

- **Extraire "Récompenses" du calculateur Production** en un calculateur autonome ("Récompenses de production"), nouvel onglet dans la catégorie Villes. Production perd sa sous-section Récompenses, garde Par ville + Total.
- **2 blocs séparés (Or / Troupes)**, chacun avec : production de base (brute, sans bonus, saisie directe avec sélecteur d'unité ×1/k/M/G/T, paliers 0,1) et heures reçues (paliers 0,5) → bonus obtenu.
- Formule inchangée : `bonus = production_base × heures` (cdc section 7.1, Calculateur 4bis).
- **Déjà porté dans le prototype** — reproduis fidèlement (2 panneaux séparés, pas un formulaire à 4 champs mélangés).

### Bloc 19 — Nav active, formulaire de contact, nettoyage admin ✅ **Terminé** (1re partie : PR [#35](https://github.com/magicgg91/ML-Helper/pull/35), 6 commits — 339 tests verts ; 2e partie : PR [#36](https://github.com/magicgg91/ML-Helper/pull/36) et PR [#37](https://github.com/magicgg91/ML-Helper/pull/37), détails de validation non communiqués)
*Nouveau, retour joueur. Sujets indépendants entre eux, groupés parce que rapides individuellement.*

- ✅ **État actif sur les boutons de navigation publique** — le bouton de la page actuellement affichée doit être visuellement distinct des autres.
- ✅ **Formulaire de contact** (`/contact`, route déjà prévue, jamais construite) : email (obligatoire), objet (liste déroulante — *Signaler une erreur de donnée* / *Suggestion d'amélioration* / *Problème technique / bug* / *Autre*, à ajuster si besoin), message (texte libre). Envoi par email via SMTP, **paramètres (URL/compte/mot de passe) en variables d'environnement dans le `docker-compose`**, jamais en base ni dans l'admin.
- ✅ **Mettre à jour le texte des mentions légales déjà en base** (chargé au Bloc 4) — la section "Données personnelles" doit mentionner ce que collecte le formulaire de contact (email, objet, message — non conservés en base, envoyés par email uniquement). Texte exact dans le cdc section 6 bis.
- ✅ **Compteur de référentiels sur le dashboard admin** — actuellement seuls guides et outils sont comptés (actifs/total) ; ajouter référentiels (activés/total) à côté.
- ⏳ **Pas de titre de page redondant en admin** — le bouton actif de la nav suffit à indiquer où on est, retirer les titres de page qui le répètent.
- ⏳ **Utilisateurs — activer/désactiver un compte** (sans le supprimer), en plus de créer/modifier/supprimer déjà existant. Compte désactivé ne peut plus se connecter, message dédié.
- ⏳ **Compteur utilisateurs sur le dashboard admin** (total/actifs).
- ⏳ **Édition d'un Outil alignée sur l'édition d'un Guide** — actuellement différente (bouton retour différent, Enregistrer + confirmation en bas). Aligner sur le pattern du Bloc 7ter.
- ⏳ **Renommer "Contenu statique" → "Conditions d'utilisation"** en admin.
- ⏳ **Pagination de l'historique par lot de 20** (`/admin/logs`).
- ⏳ **Nettoyage de texte parasite** : *"Un outil inactif reste annoncé au public, mais il est grisé et impossible à ouvrir."* (admin Outils), *"Crée, traduis et soumets les guides à validation."* (admin Guides), *"Texte des mentions légales (Markdown)"* (admin Conditions d'utilisation).
- ⏳ **Page `/contact` à rendre plus soignée visuellement, contenu centré** (retour joueur post-Bloc 19 1re partie).
- ⏳ **Bug — compteur "guides publiés" du dashboard trompeur** : compte tous les guides `published` sans tenir compte de `is_active`, alors qu'un guide publié mais désactivé est invisible côté public. Corriger le numérateur pour ne compter que `published ET is_active=true`. Ne pas fusionner `is_active` avec le statut de publication (décision volontaire, cdc section 5).

### Bloc 20 — Titre d'onglet, recherche, Paramètres du joueur (nettoyage + temple + résumé) ✅ **Terminé** (PR [#39](https://github.com/magicgg91/ML-Helper/pull/39), 8 points + migration localStorage pour compatibilité des données existantes)
*Sujets groupés, plusieurs liés au même panneau Paramètres du joueur. Indépendant du reste.*

- **Jamais "Admin" dans le titre d'onglet des pages publiques.** Accueil = "ML Helper" seul. Autres pages = nom de la page visitée (Guides, Outils, Contact) — pas de préfixe/suffixe répétitif.
- **Paramètres du joueur (Outils) — espace manquant avant le résumé** : trop collé actuellement, ajouter un espacement.
- **Barre de recherche — texte du placeholder** : mécanisme de traduction déjà fonctionnel, juste le texte à changer pour "Rechercher" (FR) / "Search" (EN).
- **Retirer 2 phrases parasites** (jamais spécifiées) : *"Outil de planification uniquement : il ne modifie jamais les compétences avec équipement."* et *"Valeurs réellement utilisées par les outils. Elles restent indépendantes de la distribution des points."*
- **Renommer "Templiers personnels" → "Templiers"**, et **"Bonus de temple du clan" → "Bonus de temple (clan)"** (clan entre parenthèses).
- **Simplifier la saisie du Bonus de temple (clan)** — le joueur saisit désormais uniquement la **contribution des Templiers du clan** (ex: 260% pour Vitesse, lisible directement sur l'écran de temple en jeu), plus le total. La base du temple (déjà connue par stat, cdc section 7.1) s'ajoute automatiquement, calculée par l'outil : `Bonus_total = base_temple + Templiers_clan_saisi`.
- **Résumé replié enrichi** — pour les 5 compétences concernées par le temple (Attaque/Défense/Prospérité/Recruteur/Vitesse), afficher le total suivi du détail entre parenthèses : `Atq 600 (400 + 120 + 80)` où 400 = Équipement, 120 = Points, 80 = Temple (clan). Les 5 autres compétences (sans bonus de temple) restent en 2 composantes, comme avant. Plafonds (90%/75%/50%) appliqués sur le total final.
- **Code couleur cohérent** entre les 3 blocs de saisie (Équipement / Points / Temple clan) et le résumé replié — même couleur pour la même composante aux deux endroits, pour repérer visuellement d'où vient chaque chiffre.

### Bloc 21 — Admin Outils : traductions manquantes, édition Villes partagée, colonne catégorie ✅ **Terminé** (PR [#40](https://github.com/magicgg91/ML-Helper/pull/40), 361 tests verts — audit a trouvé 2/5 points déjà corrects : seul `ranking.name` mistraduit, édition Villes déjà bien partagée)
*Nouveau, retour joueur. Indépendant du reste.*

- **🚨 Supprimer le bloc "Textes multilingues" de l'édition de chaque outil** — a survécu au nettoyage du Bloc 9 (qui avait retiré la gestion de traduction par enregistrement, décision cdc section 6). Le composant lui-même doit disparaître de l'écran d'édition, pas juste être vidé de contenu. Concerne tous les outils, y compris ceux listés au point suivant.
- **Traductions de noms d'outils incomplètes dans le tableau admin (colonne Nom)** — au moins Taux de gain d'XP, Simulateur de Stuff, Comparaison de stuff, **Ranking (doit afficher "Classement" en FR)**, Gemmes, Troupes en attaque démo, Récompenses de Production. Auditer tout le tableau, corriger via next-intl.
- **Un outil sans aucun paramètre numérique éditable n'a pas de bouton "Modifier"** — seule l'action activer/désactiver reste disponible. Comportement normal, pas une anomalie à corriger.
- **Revérifier le point d'édition partagé Villes** (déjà décidé, cdc section 8) — Coût de Ville et Niveau Max Atteignable semblent avoir des points d'édition séparés en pratique. Le bouton "Modifier" des 3 simulateurs Villes (Coût de Ville, Niveau Max, Production) doit mener au même endroit, pas 3 formulaires indépendants.
- **Ajouter une colonne "Catégorie"** au tableau admin Outils (Villes/Combat/Classement/Compétences), à côté de Nom/Statut/Actions.

### Bloc 22 — Corrections résumé Paramètres joueur (retour de test post-Bloc 20) ✅ **Terminé** (PR [#41](https://github.com/magicgg91/ML-Helper/pull/41), 5 commits — 6/8 points réglés, 2 points partiels → voir Bloc 24)
*8 bugs isolés trouvés en testant le Bloc 20. Indépendant du reste.*

- **Ligne 2 du résumé trop longue** — déborde en 1 ligne au lieu de se répartir sur 2 lignes de longueur équilibrée (~5/5 compétences). Corriger le point de repli.
- **Couleur du total identique à la couleur de la composante Équipement** — les deux sont indiscernables. Le total doit avoir sa propre couleur, distincte des 3 composantes (Équipement/Points/Temple clan).
- **Contraste des couleurs insuffisant en thème clair** — lisibles en thème sombre, pas en thème clair. Les 4 couleurs (total + 3 composantes) doivent rester distinctement lisibles sur les 2 thèmes.
- **Champs "Bonus de temple (clan)" doivent accepter des décimales avec le bon pas par stat** — un templier unique donne un bonus fractionnaire (Attaque/Défense : pas 0,25% ; Or/Recruteur : pas 0,5% ; Vitesse : pas 1%, table cdc section 7.1). Actuellement probablement limité aux entiers.
- **Titres d'onglet des pages individuelles, précisés** (suite du Bloc 20) :
  - Page d'un outil : `"Outils — [Catégorie]"` — la catégorie, pas le nom précis du simulateur (ex: "Outils — Classement", "Outils — Villes" pour Coût de Ville/Niveau Max/Production).
  - Page d'un guide : `"Guides — [Titre du guide]"` — le titre précis cette fois (ex: "Guides — Bien choisir et rejoindre un clan").
- **Page d'accueil Outils, grille mobile à 2 colonnes** — sur mobile, actuellement pas organisé en grille régulière. À corriger : **2 catégories par ligne**, et à l'intérieur d'une catégorie, **2 outils par ligne**.
- **Menu de navigation collé en haut sur mobile** — ajouter un petit espace (quelques px) au-dessus.
- **Créer la structure de dossiers pour les images équipements/gemmes** (préparation Bloc 10) — cohérente avec les conventions de nommage déjà actées (cdc sections 11-12 : `{famille}-{rareté}-{emplacement}.webp` pour les équipements, manifeste des 60 fichiers gemmes en section 11). **Rapporter le chemin exact créé dans la réponse** — les fichiers seront déposés manuellement ensuite, pas par cette tâche.

### Bloc 23 — Éditeurs admin manquants (Taux de gain d'XP, Troupes attaque démo) + audit ✅ **Terminé** (PR [#43](https://github.com/magicgg91/ML-Helper/pull/43), 376 tests verts — audit a trouvé 2 vrais bugs de câblage : Stuff lisait un import statique bypassant la DB admin, Gemmes n'avait aucune valeur stockée du tout)
*Trouvé pendant l'audit du Bloc 21. Plus lourd que le Bloc 22 (vraie UI à construire), séparé pour ça. Indépendant du reste.*

- **🚨 Éditeurs admin manquants — Taux de gain d'XP et Troupes attaque démo** : ces 2 outils ont des paramètres de formule réellement stockés (seuils/paliers pour l'un, % par ligue pour l'autre — cdc section 7.1) mais **aucun éditeur admin fonctionnel n'a jamais existé** pour les modifier — l'ancien écran "traductions" ne touchait que des champs inutilisés. Pas une régression, un manque préexistant révélé en nettoyant. Construire un éditeur dédié pour chacun, même pattern que `CityParametersEditor`/`TemplarParametersEditor`.
- **Audit plus large : tout outil avec des valeurs qui devraient être éditables mais n'apparaissent nulle part en admin** — vérifier qu'aucun autre outil n'a le même genre de trou (paramètres stockés mais jamais exposés à l'édition). Construire l'éditeur manquant partout où c'est trouvé, pas seulement les 2 déjà identifiés. **Liste précise à vérifier un par un (aucun des 6 n'a actuellement de bouton "Modifier")** : Récompenses de Production, Troupes en attaque démo, Gemmes, Comparaison de stuff, Simulateur de Stuff, Taux de gain d'XP. **Hypothèse à confirmer, pas à supposer vraie** : Comparaison de stuff et Simulateur de Stuff n'auraient rien à éditer eux-mêmes, puisqu'ils lisent uniquement le référentiel Équipements de Combat (déjà éditable ailleurs, admin Guides) — mais vérifier réellement plutôt que de l'assumer. **Gemmes en particulier mérite un vrai examen** : ce simulateur a des valeurs de base par compétence/ligue et des prix d'achat qui ressemblent à de vraies données de jeu stockées (cdc section 7.1/11), pas juste une lecture d'un référentiel externe comme Stuff — à vérifier si un éditeur manque réellement ici. Pour chaque outil de la liste, rapporter explicitement : "rien à éditer, correct" ou "éditeur manquant, construit".

### Bloc 24 — Résumé Paramètres joueur : contraste clair + split 5/5 en desktop (2e retour post-Bloc 22) ✅ **Terminé** (PR [#42](https://github.com/magicgg91/ML-Helper/pull/42), 3 commits — 366 tests verts)
*2 points pas complètement réglés par le Bloc 22. Indépendant du reste.*

- **Contraste thème clair toujours insuffisant** malgré la 1re correction — garder les mêmes teintes de base qu'en thème sombre (orange/bleu/vert/violet), ajuster seulement luminosité/saturation pour atteindre le contraste WCAG AA (4,5:1) sur fond clair, pas une palette différente.
- **Split 5/5 des compétences ne s'applique qu'en dessous d'un certain seuil de largeur** — en desktop, tout reste sur 1 seule ligne. Doit s'appliquer partout, y compris desktop, indépendamment de la largeur d'écran disponible.

### Bloc 25 — Refonte du calculateur Templiers (plage partagée, plus de sélecteur de compétence) ✅ **Terminé** (PR [#46](https://github.com/magicgg91/ML-Helper/pull/46), 4 commits — 382 tests verts)
*Nouveau, retour joueur. Indépendant du reste.*

- **Remplacer le sélecteur de compétence + 5 champs indépendants par une plage de niveau partagée** : un seul champ Niveau de départ, un seul champ Niveau cible, appliqués aux 5 compétences en même temps.
- **Coût affiché une seule fois** (formule universelle `Coût(n) = arrondi(150 × 1,3^(n−1))`, indépendante de la compétence — pas besoin de le répéter 5 fois).
- **5 lignes détaillées en dessous, une par compétence (Attaque/Défense/Or/Recruteur/Vitesse), avec 3 valeurs chacune** :
  - **Bonus par Templier** — le taux fixe de cette compétence (ex: "0,25%/Templier" pour Attaque)
  - **Total au niveau cible** — `cible × taux`, le bonus total si le joueur a "cible" Templiers de cette compétence
  - **Gain (départ → cible)** — `(cible − départ) × taux`, ce qu'apporte spécifiquement cette montée en niveau
  Taux déjà confirmés : Attaque/Défense 0,25%, Or/Recruteur 0,5%, Vitesse 1% (par niveau, cdc section 7.1).
- Simplification assumée : l'outil ne modélise plus "combien j'ai actuellement par compétence" (potentiellement différent pour chacune), il répond à "si je monte un templier de X à Y, ça coûte combien et ça rapporte combien par compétence".
- **Nouveau référentiel "Coût des Templiers"** (`/guides/referentiels/templiers`) — la table complète niveaux 1-20 (déjà dans le cdc section 7.1), consultable indépendamment du calculateur. **4ᵉ référentiel réellement construit** (Combat, Expédition, Level Up existent déjà ; Consommables reclassé dans les docs mais pas encore construit, données pas collectées).
- **Liens croisés réciproques** entre le calculateur Templiers (`/tools`) et ce nouveau référentiel — même pattern que Simulateur de Stuff ↔ référentiel Équipements de Combat (Bloc 0) : le calculateur pointe vers "Voir la table complète", le référentiel pointe vers "Utiliser le simulateur".
- **Boutons de sélection des catégories Outils, mobile — tailles à uniformiser** : actuellement Villes/Combat/Classement tiennent sur 1 ligne mais Compétences (plus long) se retrouve seul sur la ligne suivante. Uniformiser la taille des boutons pour un vrai découpage 2 par ligne, cohérent avec la décision déjà prise au Bloc 22 pour la grille de cartes de la même page.
- **🚨 3e tentative — résumé Paramètres joueur toujours pas assez lisible/coloré en thème clair** (malgré les corrections des Blocs 22 et 24, qui avaient déjà validé le contraste WCAG AA à 8:1 mesuré) : passer sur des **variantes flashy/vives** des couleurs déjà utilisées plutôt que de continuer à ajuster finement la luminosité — priorité au ressenti visuel du joueur plutôt qu'à la seule mesure de contraste, qui ne suffit visiblement pas à elle seule.

### Bloc 26 — Migration Combat vers l'anglais (fichiers + code) + doc déploiement ✅ **Terminé** (PR [#48](https://github.com/magicgg91/ML-Helper/pull/48), commit d03739e)
*Décidé mais pas prioritaire — Expédition déjà basculée (script fourni), Combat a suivi. Complété avec un audit de la doc de déploiement dans la même PR.*

- **144 fichiers Équipement de Combat renommés en anglais** (mapping : familles `attaque/defense/or/troupes-vitesse` → `attack/defense/gold/troops-speed`, raretés `commun/rare/epique/mythique/legendaire` → `common/rare/epic/mythic/legendary`, emplacements `arme/bouclier/ceinture/anneau/bracelet/amulette/casque/gantelet/bottes` → `weapon/shield/belt/ring/bracelet/amulet/helmet/gauntlet/boots`) — 143 renommages physiques (1 fichier déjà conforme, no-op).
- **Références code mises à jour** (`equipmentImagePath`, tests simulateur/référentiel) — Expédition non touché.
- **Doc de déploiement auditée et complétée** : variables réellement utilisées documentées (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, 5 réglages SMTP host/port séparés — pas une URL SMTP unique comme envisagé initialement, `ML_HELPER_IMAGE` pour sélectionner le tag Docker). ⚠️ **Divergences à trancher/documenter** : fichier SQLite nommé `database.db` (cdc mentionnait `db.sqlite`) ; format SMTP en host/port séparés plutôt qu'URL — Guillaume a choisi de ne pas trancher dans l'immédiat ("on verra, pas grave pour le moment, j'alignerai"), cdc pas encore mis à jour sur ces 2 points. Confirmé : aucune variable de bootstrap Super Admin résiduelle (flux `/admin/setup` uniquement).

### Bloc 27 — i18n restant : admin en anglais, mentions légales EN, Classement traduit + bug CSS ✅ **Terminé** (PR #47 — 4/4 points validés)
*Nouveau, retour joueur. Sujets indépendants, groupés. Indépendant du reste.*

- ✅ **Noms d'Outils/Guides/Référentiels en admin suivent désormais la langue admin sélectionnée** — statut initialement ambigu à la livraison (rapporté comme "sauté selon décision du porteur de projet", jamais communiquée de ce côté) : **clarifié, c'était une erreur de rapport — le point est bien implémenté et fonctionnel, suit correctement la locale admin.**
- **Mentions légales en anglais** — texte complet rédigé, cdc section 6 bis (juste après la version française). À charger comme second contenu localisé, même mécanisme JSON par locale déjà en place.
- **Classement — Ligue cible et Récompenses traduites** — actuellement en français uniquement ("Montée Or", "100 saphirs, 7 accélérations de troupes, 6 gemmes"). Passer par une structure de données (type de mouvement + ligue en enum ; récompenses en liste `{type, quantité}` avec type en enum) rendue via next-intl, pas une chaîne de caractères french-only stockée telle quelle.
- **Bug cascade CSS `.tool-category-grid`** (trouvé au Bloc 25, hors scope à l'époque) — même bug que celui corrigé sur la grille mobile Outils au Bloc 25, confirmé présent ici aussi. Même traitement.

### Bloc 28 — Classement (arrondi) + Simulateur de Stuff (5 points) ✅ **Terminé** (PR [#49](https://github.com/magicgg91/ML-Helper/pull/49), 424 tests verts)
*Nouveau, retour joueur. Sujets indépendants, groupés. Indépendant du reste.*

- **Classement — bug d'arrondi des rangs de seuil** : `rankStart`/`rankEnd` arrondis au plus proche (`Math.round`) pouvaient afficher un rang supérieur à la réalité, induisant le joueur en erreur sur son maintien/sa relégation (ex: 94,5 places → n'affiche jamais 95, le 95e joueur redescend réellement). Corrigé en arrondi strictement vers le bas (`Math.floor`), prototype mis à jour en cohérence.
- **Simulateur de Stuff, 5 points** :
  1. Badge/texte de rareté retiré des cases de la grille 3×3 (couleur de la case suffit, redondant depuis l'intégration des vraies images) — le sélecteur d'équipement du panneau de configuration ("Rareté — Nom du set (Famille)") reste inchangé.
  2. Mise en évidence de la case sélectionnée renforcée, avec bordure d'accent reliant visuellement le panneau de configuration ouvert à la case correspondante.
  3. "Récapitulatif — toutes familles confondues" renommé en "Récapitulatif des compétences d'équipement".
  4. Compétences plafonnées (Récupération max 50% ; Intrépide/Bravoure max 90%/75% selon la ligue des Paramètres du joueur) : affichage du plafond suivi de la valeur réelle entre parenthèses quand elle dépasse le plafond (ex: "50% (51,5%)").
  5. **Nouveau : bouton de transfert vers les Paramètres du joueur** — copie les valeurs obtenues dans le bloc "Statistiques données par l'équipement" uniquement (jamais Points de compétence ni Bonus de temple), avec confirmation visuelle après clic.

### Bloc 29 — Simulateur d'Équipement d'Expédition + renommage Stuff → Équipement de Combat ✅ **Terminé** (PR [#50](https://github.com/magicgg91/ML-Helper/pull/50), 424 tests verts)
*Nouveau, retour joueur + données de jeu collectées. Indépendant du reste.*

- **A — Référentiel Équipement d'Expédition enrichi** : les 10 stats sur 10 ont désormais un incrément par étoile confirmé (était 2/10) — valeurs par défaut éditables en admin, l'extrapolation aux raretés non-Légendaire n'étant pas elle-même confirmée. Coût de fusion en Terradust chargé comme 5 constantes indépendantes, confirmées (Commun 600, Rare 1100, Épique 2000, Mythique 4000, Légendaire 8000 — pas de doublement uniforme par palier contrairement au Combat). Confirmé : aucun emplacement de gemme sur l'équipement d'expédition, à aucune rareté.
- **B — Helper `valueAtStar()` extrait et partagé** entre Combat et Expédition (élimine la duplication de `equipmentValueAtStar()`).
- **C — Nouveau calculateur : Simulateur d'Équipement d'Expédition** (catégorie Compétences, `/tools`) — grille 2×3 (Cape/Longue-vue/Bourse en ligne 1, Boussole/Torche/Pioche en ligne 2), sans gemmes, sans plafond, résumé agrégé, localStorage indépendant, lien croisé vers le référentiel.
- **D — Renommage** : "Simulateur de Stuff" → "Simulateur d'Équipement de Combat" ; "Comparaison/Comparateur de stuff" → "Comparateur d'Équipement de Combat" — libellé uniquement (next-intl), slug technique inchangé.
- **E — Panneau de config Combat compacté** : en-tête "Gemmes (N emplacements)" retiré entièrement ; chaque ligne de gemme simplifiée en un seul libellé "Gemme N" (plus de titres séparés compétence/étoile/ligue par ligne).


### Bloc 30 — Admin Guides : point d'édition manquant sur le référentiel Templiers ✅ **Terminé** (PR [#51](https://github.com/magicgg91/ML-Helper/pull/51))
*Retour joueur. Indépendant du reste.*

- Le référentiel Templiers (tableau admin Guides) n'avait pas de bouton "Modifier" — sa donnée sous-jacente (2 paramètres de formule `base`/`ratio`) n'a pas la forme `lookup_table` attendue par le pattern d'édition standard des référentiels.
- Corrigé en pointant ce bouton vers `TemplarParametersEditor` (`/admin/tools/templars`), déjà utilisé par le calculateur Templiers — un seul point d'édition partagé, `requireCapability`/`authorizedSession` étendus pour accepter une liste de capacités (sémantique OR) afin qu'un `guides_manager` y accède sans `calculators.write`.
- Bug connexe corrigé au passage : la route d'activation/désactivation avait une liste blanche codée en dur qui aurait renvoyé 404 pour Templiers aussi.
- Audit confirmé : Combat/Expédition/Level Up restent de vraies `lookup_table` (pas le même trou) ; "Consommables" n'est pas un référentiel séparé (nom de stat d'Expédition), cohérent avec le fait qu'il n'a jamais été construit.

### Bloc 31 — Renommages, suppression Comparateur, réordonnancement, Équipement d'Expédition, compacité Équipement de Combat, chevauchement Classement ✅ **Terminé** (PR [#52](https://github.com/magicgg91/ML-Helper/pull/52), 5 commits, A-J)
*Nouveau, retour joueur. Indépendant du reste.*

- **A** — Renommage libellé (next-intl, slug inchangé) : "Simulateur d'Équipement de Combat" → "Équipement de Combat" ; "Simulateur d'Équipement d'Expédition" → "Équipement d'Expédition".
- **B** — Suppression complète du Comparateur d'Équipement de Combat (route, entrée admin, composants, tests — pas juste désactivé).
- **C** — Nouvel ordre des outils, catégorie Compétences : Équipement de Combat, Équipement d'Expédition, Gemmes, Templiers.
- **D** — "Récapitulatif des statistiques d'expédition" → "Récapitulatif des compétences d'expédition".
- **E** — Équipement d'Expédition, 6 évolutions : boutons de filtre par famille (Personnalisé/Or/Équipement combat/Consommables/Troupes) avec **persistance indépendante par filtre** (5 configurations distinctes en localStorage) ; ordre des 10 compétences revu ; les 10 toujours affichées y compris à 0% ; disposition desktop 2×5 ; contribution de l'emplacement sélectionné entre parenthèses (même pattern que Combat).
- **F** — Équipement de Combat : colonne récapitulatif réduite à ~50% de largeur.
- **G** — Équipement de Combat : grille élargie, disposition de case en 2 colonnes internes (image+étoiles à gauche, gemmes empilées à droite).
- **H** — Boutons de filtre compacts sur une seule ligne + couleurs sémantiques (famille/compétence), sur 4 écrans : Équipement de Combat, référentiels Équipements de Combat/Expédition, Gemmes.
- **I** — Bouton de transfert de compétences (Bloc 28) déplacé sur la ligne de titre "Récapitulatif des compétences d'équipement".
- **J** — Classement : correction du chevauchement de rang entre deux plages adjacentes — chaînage des plages (borne de départ = borne de fin de la plage précédente + 1), pour ne plus jamais partager un rang entre deux plages.

### Bloc 32 — Admin Guides (3 corrections) + mentions légales + placeholders dashboard + refonte Équipement de Combat ✅ **Terminé** (PR [#53](https://github.com/magicgg91/ML-Helper/pull/53), 4 commits)
*Retour joueur + testeur. Indépendant du reste.*

- **A** — Admin Guides : bouton activer/désactiver Templiers restauré (routé via `/admin/tools`, `calculators.toggle` — pas la route référentiels, pour ne pas casser le correctif anti-escalade de privilèges du Bloc 30) ; boutons de filtre violets ; "Nouveau" déplacé sur la ligne de filtre.
- **B** — Mentions légales : sélecteur de langue déplacé dans la barre d'actions.
- **C** — Dashboard public : 2 placeholders "bientôt disponible" (Combat, Troupes ennemies), avant les 2 outils fonctionnels, dans l'ordre requis.
- **D/E** — Refonte écran Équipement de Combat : cases en ligne unique restaurées, une seule famille affichée à la fois (structure de données inchangée — les 4 restent équipées/agrégées en parallèle), résumés par famille supprimés, résumé global toujours les 10 compétences par ordre alphabétique avec parenthèses sur la même ligne pour l'emplacement sélectionné, boutons de famille + bouton de transfert repositionnés sous le résumé ; ligne de filtre et parenthèses Expédition alignées sur le même modèle.

### Bloc 33 — Retours testeur : accueil, thème, Coût de Ville, page Outils, bug Templiers ✅ **Terminé** (PR [#54](https://github.com/magicgg91/ML-Helper/pull/54), 10 commits, +938/-370, A-N)
*Nouveau, retour testeur. Indépendant du reste.*

- **A** — Accueil : catégories d'outils affichées directement (1 clic), section Guides/Référentiels en dessous. `/tools` et `/guides` restent inchangés et accessibles via la nav.
- **B** — Thème : détection automatique de la préférence système (`prefers-color-scheme`) au lieu de sombre forcé par défaut ; bouton de bascule manuel inchangé.
- **C** — Coût de Ville : fusion des 2 blocs de résultats en un seul bloc "Total" complet (Coût/VP/Production multipliés par le nombre de villes, Remparts non multiplié) — corrige une 1re version de la décision qui supprimait à tort des informations (Remparts) au lieu de fusionner.
- **D** — Coût de Ville : sélection automatique au focus sur le champ niveau cible (prérempli à 2, actuellement il faut l'effacer manuellement) — vérifier et corriger aussi les autres champs numériques préremplis du site si le même problème existe.
- **E** — Page Outils : texte "Ouvrir la catégorie" retiré des tuiles (toute la tuile est cliquable).
- **F** — Page Outils : titre "Outils" retiré, sous-titre "Choisis ton domaine" → "Choisis ton outil", sur une seule ligne.
- **G** — 🐛 Bug : activation de l'outil Templiers et du référentiel Templiers pas indépendantes (désactiver l'un désactive l'autre) — à corriger en gardant le partage des paramètres de formule et du point d'édition, mais avec 2 statuts actif/inactif distincts.
- **H** — Équipement de Combat : bouton de transfert vers les Paramètres (repositionné au Bloc 32 sur la ligne des boutons de famille) affiné — aligné à droite sur cette ligne, couleur distincte en accent violet (au lieu du même style que les boutons de famille), surbrillance au clic.
- **I** — Équipement de Combat : disposition du récapitulatif global — les 10 compétences occupent tout l'espace disponible, 2 lignes de 5 par défaut sur desktop (même principe qu'Équipement d'Expédition, Bloc 31 E.4), responsive selon la largeur d'écran.
- **J** — Équipement d'Expédition : le bouton "Personnalisé" doit avoir une couleur distincte des 4 boutons de famille (Or, Équipement combat, Consommables, Troupes), puisqu'il ne correspond à aucune famille en particulier.
- **K** — Équipement de Combat : le message de confirmation du bouton de transfert (Bloc 28) doit disparaître automatiquement après 5 secondes maximum, au lieu de rester affiché indéfiniment.
- **L** — Niveau Max Atteignable : même traitement que Coût de Ville (point C) — fusionner les 2 blocs de résultats en un seul bloc "Total" complet, sans perte d'info. Vérifier contre le code réel (le cdc peut être incomplet sur la structure actuelle des outputs, comme ça l'était pour Coût de Ville).
- **M** — Admin Guides : vérifier que "Tous" est bien sélectionné par défaut (censé être livré au Bloc 32, pas confirmé explicitement dans le résumé de PR).
- **N** — Tous les outils désactivés/pas encore implémentés déjà visibles dans l'UI : le simple grisé ne suffit pas (retour testeur — clic sans effet, confusion). Ajouter un texte "Bientôt disponible" affiché en permanence, pas seulement au survol (invisible sur mobile). S'applique partout, pas seulement aux 2 placeholders Combat du Bloc 32.


### Bloc 34 — Corrections mobile + accueil + thème ✅ **Terminé** (PR #55, branche `claude/ml-helper-bloc-34-mobile-home-theme`, 4 commits)
*Nouveau, retour testeur. Indépendant du reste.*

- **A** — Équipement de Combat, mobile : récapitulatif passe en 2 colonnes (5 lignes de 2), même comportement que le récapitulatif Équipement d'Expédition sur mobile (pas cohérent entre les deux outils actuellement). *(Vérifié en PR #55 : déjà correct depuis le Bloc 33, aucun changement nécessaire.)*
- **B** — Équipement de Combat + Équipement d'Expédition, mobile : les boutons de sélection de famille passent sur 2 lignes au lieu de rester sur une seule ligne avec scroll horizontal (le scroll horizontal est indésirable sur ces 2 écrans).
- **C** — 🐛 Bug introduit par le Bloc 33 (D) : la validation min/max en temps réel (à chaque frappe) sur le champ niveau cible empêche de taper un nombre à plusieurs chiffres commençant par un chiffre inférieur au minimum (ex: taper "100" quand le minimum est 2 — le "1" tapé en premier réinitialise le champ avant d'avoir pu continuer). Corriger en ne validant qu'au blur/à la soumission, jamais à chaque frappe. Vérifier tous les champs numériques avec contrainte similaire.
- **D** — Accueil : le bloc hero (image défilante/carrousel + accroche "Prépare ta prochaine progression.") reste trop imposant, contradictoire avec l'objectif de rapidité de la refonte Bloc 33. Remplacé par une phrase d'introduction courte, sans carrousel, au-dessus de la grille de catégories.
- **E** — Accueil : contenu précis de la section Guides/Référentiels — les 3 guides les plus récents (tri par date, pas de sélection éditoriale manuelle) + les 4 référentiels réellement construits (Combat, Expédition, Level Up, Templiers), même logique d'accès direct qu'avec les outils.
- **F** — Thème sombre légèrement éclairci (2e retour dans ce sens) — ajustement léger de luminosité sur le fond bleu-nuit/anthracite déjà en place, pas un changement de teinte ni de palette.

### Bloc 35 — Refonte des pages référentiels (public + admin) + alignement style admin transverse ✅ **Terminé** (PR #57, 525 tests, 90 fichiers)
*Nouveau, retour testeur. Indépendant du reste. Regroupé par élément concerné (10 sections), chaque section précise son périmètre exact.*

**Section 1 — [Tous les référentiels, public] :** 1.1 retrait "Consulter le référentiel" (tuile déjà cliquable) ; 1.2 bandeau de bascule entre référentiels ; 1.3 titre de page sur une seule ligne.

**Section 2 — [Référentiel Combat + Expédition, public] :** 2.1 colonne image en 1ère position puis rareté, noms des sets traduits ; 2.2 retrait colonnes Pouciel/Terradust du tableau principal → tableau séparé par rareté.

**Section 3 — [Référentiel Combat uniquement, public] :** 3.1 ordre des boutons de famille corrigé (Attaque, Défense, Or, Vitesse).

**Section 4 — [Référentiel Expédition uniquement, public] :** 4.1 boutons de famille sans scroll horizontal (zone élargie) ; 4.2 coquille "Équipement d'expédition" → "Équipements d'expédition".

**Section 5 — [Référentiel Expédition, admin] :** 5.1 grille pour les incréments (évite scroll horizontal) ; 5.2 nouvelle table Terradust au démantèlement (1 champ/rareté) ; 5.3 colonnes % réduites ; 5.4 ordre des colonnes (Famille, Rareté, Nom du set, Emplacement, Valeur stat primaire, Stat secondaire, Valeur stat secondaire) ; 5.5 titres dédiés pour les 3 tableaux.

**Section 6 — [Référentiel Combat, admin] :** 6.1 retrait Pouciel/Gemmes → 2 tableaux dédiés par rareté ; 6.2 ordre des colonnes (Famille, Rareté, Nom du set, Emplacement, Compétence 1-4 + Valeur 1-4) ; 6.3 colonnes de valeur réduites.

**Section 7 — [Référentiel Templiers, admin] :** 7.1 🐛 bug retour contextuel manquant sur `TemplarParametersEditor` (ramène toujours vers Outils, même depuis Guides).

**Section 8 — [Outil Gemmes, admin] :** 8.1 colonnes réduites ; 8.2 tableau "prix d'achat" occupant la largeur disponible ; 8.3 en-têtes = nom de ligue seul ; 8.4 renommage "Prix d'achat des gemmes par ligue (en saphirs)".

**Section 9 — [Outil Classement, admin] :** 9.1 largeur des colonnes numériques à ajuster.

**Section 10 — [Tous les outils et référentiels, admin, transverse] :** 10.1 boutons d'enregistrement visibles partout ; 10.2 un seul bouton d'enregistrement dans un bandeau (retour/enregistrer/confirmation) ; 10.3 alignement global du style sur la référence Templiers ; 10.4 centrage des champs select/saisie.

### Bloc 36 — Nouveau référentiel Gemmes + intégration des images de catégorie d'outils ✅ **Terminé** (PR [#58](https://github.com/magicgg91/ML-Helper/pull/58), 547 tests)
*Nouveau. Indépendant du reste.*

**A — Nouveau référentiel Gemmes**
- Nouveau référentiel `/guides/referentiels/gems`, 5ᵉ référentiel réellement construit.
- 1 tableau, 6 colonnes (Bronze/Argent/Or/Platine/Diamant/Légende), 11 lignes : coût en saphirs (ligne 1, Bronze non applicable) + 10 compétences par ordre alphabétique avec valeurs `y` déjà verrouillées.
- Image de gemme par cellule (60 images déjà en place dans `public/gems`, 1 par compétence × ligue).
- Lien croisé avec le calculateur Gemmes.
- Point d'édition admin partagé avec le calculateur Gemmes (même principe que Templiers) — construit correctement dès le départ : statuts actif/inactif indépendants, retour contextuel (Guides→Guides, Outils→Outils) — pour éviter les 2 bugs déjà rencontrés sur ce pattern côté Templiers (Blocs 30 et 35).

**B — Intégration des 4 images de catégorie d'outils**
- 4 images générées par IA, validées par le joueur, déposées dans `public/tools/` (**cities.webp, fight.webp, ranking.webp, skills.webp** — noms en anglais, cohérent avec AGENTS.md).
- Remplacent le placeholder/icône actuel des tuiles de catégorie, sur l'accueil ET sur `/tools` (un seul point de résolution du chemin, pas de duplication).
- Repli propre si un fichier manque (même principe qu'équipements/gemmes, cdc section 11).
- **Décision structurelle associée** : `public/tools/` et `public/guides/` comme 2 dossiers racine distincts pour les assets images — `public/guides/` réservé pour les futures illustrations de guides (structure exacte pas encore définie).

### Bloc 37 — Retours de test sur le Bloc 35 (admin + public) ✅ **Terminé** (PR [#59](https://github.com/magicgg91/ML-Helper/pull/59), 562 tests, 3 commits)
*Nouveau, retour de test. Indépendant du reste.*

- **A** — [Tous les outils et référentiels, admin] Colonnes de valeurs numériques encore trop larges malgré le correctif Bloc 35 — réduction insuffisante, à resserrer davantage.
- **B** — [Référentiel Expédition uniquement, admin/public] Le correctif "zone élargie" du Bloc 35 a suréagi — les filtres (select box) s'étirent sur toute la largeur disponible. Les dimensionner à leur contenu, pas en largeur 100%.
- **C** — [Référentiel Expédition uniquement, admin] La grille des incréments par étoile (Bloc 35) provoque un chevauchement des cases. Basculer sur 2 lignes plutôt que la grille actuelle. Terradust et coût de fusion (2 autres tableaux du même écran) sont corrects, ne pas y toucher.
- **D** — [Référentiel Combat uniquement, admin] Même symptôme que B : filtres de famille en select box trop longues, à dimensionner à leur contenu.
- **E** — [Référentiel Combat + Expédition, admin] Le bandeau unique retour/enregistrer (Bloc 35) n'est pas encore correct sur ces 2 écrans, qui ont plusieurs tableaux par page (Combat : principal + Pouciel + Gemmes ; Expédition : incréments + Terradust + coût de fusion). Le bandeau doit être en haut de page, avec un seul bouton qui enregistre l'ensemble des tableaux en une seule action.
- **F** — [Outil Gemmes uniquement, admin] Cases trop petites après la réduction du Bloc 35 (scroll horizontal bien résolu). Augmenter la taille des cases d'environ 50%.
- **G** — [Référentiel Combat uniquement, public + admin] Affichage trompeur "À compléter en admin" pour les équipements à moins de 4 compétences. Ajouter un choix "Rien" dans le sélecteur admin (distinct de "non renseigné") → affichage public "—" au lieu de "À compléter en admin".
- **H** — [Référentiels Combat + Expédition, public] Compétence/valeur sur la même ligne (au lieu de nom puis valeur en dessous).
- **I** — [Référentiels Combat + Expédition, public] Retrait de la barre de recherche ; filtres redimensionnés : Famille 1/3, Rareté 1/3, niveau d'étoile 20% aligné à droite ; hauteur du sélecteur d'étoile alignée avec Famille/Rareté.
- **K** — [Page d'un référentiel, public] Style du bandeau de bascule entre référentiels aligné exactement sur le bandeau de boutons de famille utilisé à l'intérieur d'un outil (ex: Équipement de Combat/Expédition) — pas sur les tuiles de catégorie de la page Outils/Accueil.

### Bloc 38 — Retours de test Gemmes/référentiels + accueil/Outils + cohérence images + admin ✅ **Terminé** (PR [#60](https://github.com/magicgg91/ML-Helper/pull/60), 584 tests, 6 commits)
*Découverte pendant le travail : R n'était pas un bug (déjà correctement stylé, confirmé par capture avant/après) ; L (titres tronqués) avait pour vraie cause une règle CSS générique `.public-main > h1` écrasant la taille de police des titres par spécificité, sur Outils ET tous les référentiels — corrigée.*
*Nouveau, retour de test. Indépendant du reste.*

- **A à F** — [Référentiel Gemmes uniquement, public] 6 corrections retour de test : largeur des colonnes de ligue strictement identique ; image de gemme agrandie à 3rem (au lieu de 2,2rem) ; % affiché à côté de l'image, pas en dessous ; titre et contenu des colonnes centrés ; 🐛 ne pas simplifier le coût en k/M pour ce référentiel (afficher "3000", pas "3K") ; 🐛 bug de traduction anglais des compétences — mapping exact déjà verrouillé dans le cdc (Attaque=Striker, Défense=Guardian, Bravoure=Brave, Prospérité=Prosperous, Vitesse=Rusher, Récupération=Cautious, Intrépide=Fearless, Recruteur=Recruiter, Charognard=Scavenger, Recycleur=Salvager) à respecter exactement.
- **G** — [Référentiels Combat + Expédition, public] Uniformiser la taille des images d'équipement à 3rem, même taille que l'image de gemme (point B) — cohérence visuelle entre les 3 référentiels.
- **H** — [Page Outils/Accueil, public] Div conteneur de l'image de catégorie (`.tool-category-image`) en `aspect-ratio: 1` (carré strict).
- **I** — [Accueil, public] Espacement excessif entre la phrase d'intro et la grille d'outils — classe `.home-tools`, `margin-top` à diminuer de moitié.
- **J** — [Accueil, public] La phrase d'intro Guides se casse avec "sereinement" isolé sur la 2e ligne — à corriger (largeur, reformulation ou césure choisie).
- **K** — [Page Outils, public] Unifier avec l'accueil : "Choisis ton outil" → "Décide avec les bons chiffres" ; ajouter la même phrase d'intro que l'accueil ("Explore les coûts, la production, le classement, les compétences et les équipements grâce à des outils conçus pour préparer chaque décision.").
- **L** — [Tous les référentiels, public] Titres de page tronqués — réduire la taille de police du titre et/ou élargir la largeur du bloc conteneur.
- **M** — [Référentiel Level Up uniquement, public] Tableau à aligner sur le style déjà utilisé par Coût des Templiers et Gemmes (qui partagent déjà un style cohérent entre eux) — pas une amélioration isolée. Points à répliquer : alternance de couleur de ligne (blanc/gris clair), encadrement (bordure), séparation visuelle claire entre les 2 colonnes de tableaux (disposition en 2 paires Niveau/Valeur côte à côte).
- **N** — [Accueil/Guides, public] Grille de référentiels : préciser 4 colonnes maximum par ligne (pas de nombre de colonnes variable) — avec 5 référentiels, 4 sur la 1ère ligne + 1 sur la 2ᵉ.
- **O** — [Accueil/Guides + page Outils, public] Intégrer les 5 images de vignette référentiel déposées dans `public/referentials/` (remplacent les placeholders), avec `aspect-ratio: 1` comme les images de catégorie. ⚠️ Corriger `referentials-temples.webp` → `referential-temples.webp` (incohérence de pluriel) avant intégration.
- **P** — [Tous les outils et référentiels, admin] Retirer les flèches d'incrément/décrément sur les champs de saisie numériques — saisie clavier uniquement.
- **Q** — [Référentiels Combat + Expédition uniquement, admin] Doubler la largeur des blocs de saisie numériques (~2× la largeur actuelle) — les champs eux-mêmes, pas les colonnes déjà resserrées.
- **R** — [Page d'un référentiel, public] 🐛 Régression : le correctif du Bloc 37 point K (style du bandeau de bascule aligné sur le bandeau de famille des outils) ne produit aucun changement visible, testé avec cache vidé. Investiguer concrètement (vérifier le bon sélecteur/composant ciblé) plutôt que réappliquer aveuglément — capture avant/après à l'appui dans le rapport de PR.

### Bloc 39 — Référentiels Combat/Expédition : passage du tableau aux tuiles ✅ **Terminé** (PR #61)
*Notes de livraison : nombre de gemmes par tuile lu depuis `gemSlotsBase` (admin-editable), pas le champ statique `row.gem_slots` — cohérent avec le tableau récap en dessous. Accessibilité : `aria-label` complet par tuile (famille + rareté + set + emplacement) et indice pour lecteur d'écran sur les blocs estompés, sans badge visible — le codage couleur-seule (rareté/famille) était le choix de design assumé du bloc, pas un oubli d'accessibilité à corriger visuellement.*

- Une tuile par équipement, 6 de large, blocs complets par set (3×3 Combat, 3×2 Expédition), même ordre d'emplacements que les simulateurs.
- Tuile : fond/bordure couleur rareté, image à gauche, nom d'emplacement en haut en couleur de famille, compétences+% empilées à droite (4 lignes Combat, 2 lignes Expédition, valeurs base 1★), nombre de gemmes sur Combat uniquement (si applicable).
- Famille et rareté : filtrables + indiqués sur la tuile. Filtre étoile retiré (+ calculs associés). Pas de filtre gemmes. Pas de recherche pour l'instant.
- Mobile : à tester empiriquement, démarrer à 1 colonne, tenter 2 si lisible.


### Bloc 40 — Correctifs référentiels : bandeau, admin Expédition, tuiles Combat/Expédition ✅ **Terminé** (PR #62, 601 tests, 4 commits)
*Notes de livraison : A — bandeau réutilise `category-nav`/`category-btn`, pleine largeur au lieu de pills. B — tables Expédition passées en grille fluide. C — `.reference-admin-narrow` 3,25rem → 6,5rem. D/E/F — filtres cumulatifs, tout sélectionné par défaut, masquage réel au DOM. G — texte centré. H — `.reference-tile-skills` → 0,69em.*
*Nouveau, retour de test. Indépendant du reste.*

- **A** — [Page d'un référentiel, public] 🐛 Le bandeau de bascule référentiels s'affiche en rangée de boutons individuels, pas en bandeau pleine largeur comme le bandeau outils depuis la page d'un outil — corriger structurellement (conteneur/layout, pas juste les classes de bouton). Réouvre une conclusion "déjà correct" du Bloc 38, incomplète.
- **B** — [Référentiel Expédition uniquement, admin] Scroll horizontal toujours présent sur le tableau coût de fusion ET le tableau Terradust au démantèlement — doivent occuper toute la largeur disponible, sans scroll.
- **C** — [Référentiels Combat + Expédition, admin] Doubler à nouveau la largeur des champs numériques de valeurs de stats/compétences — le doublement du Bloc 38 ne suffit pas encore pour ces champs précis.
- **D** — [Tuiles référentiels Combat/Expédition, public] Toutes les tuiles affichées par défaut, couleur de rareté normale (pas de surbrillance/ombrage par défaut).
- **E** — [Tuiles référentiels Combat/Expédition, public] Toutes les familles sélectionnées par défaut. Rareté cumulative comme famille (multi-sélection).
- **F** — [Tuiles référentiels Combat/Expédition, public] Désélectionner un filtre (rareté ou famille) masque complètement les tuiles correspondantes — annule le comportement "surbrillance/ombrage" livré au Bloc 39.
- **G** — [Tuiles référentiels Combat/Expédition, public] Le texte des compétences doit être centré sur sa colonne au sein de la tuile.
- **H** — [Tuiles référentiel Expédition uniquement, public] 🐛 "Consommables" et son % doivent tenir sur la même ligne (actuellement retour à la ligne). Correctif fourni : classe CSS `.reference-tile-skills` à `0,69em`. Pas de souci côté Combat.

### Bloc 41 — Ordre des familles, correctifs grille tuiles, admin Combat ✅ **Terminé** (PR #63, 608 tests, 5 commits)

- Ordre familles Combat : Attaque, Défense, Or, Vitesse (déjà l'ordre acté ailleurs sur le site).
- Ordre familles Expédition : Or, Équipement combat, Consommables, Troupes (déjà l'ordre des boutons de filtre acté au Bloc 31).
- S'applique à la fois à l'ordre des boutons de filtre ET à l'ordre d'affichage des blocs de set dans la grille de tuiles.
- 🐛 Un set isolé en fin de grille (après filtrage, nombre de sets impair) s'étire sur toute la largeur au lieu de garder sa taille normale (50% de la grille, 3 colonnes sur 6). Corriger via une grille à colonnes fixes, pas de flex-grow sur le dernier élément.
- ✅ Bandeau de bascule référentiels confirmé bon par test réel (Bloc 40). Petit ajustement : ajouter un espace vertical entre ce bandeau et les tableaux/tuiles de données qui suivent.
- [Référentiel Combat uniquement, admin] Réordonner les tableaux : Pouciel et nombre de gemmes (Bloc 35, point 6.1) en premier, avant le tableau principal des compétences.
- [Référentiel Combat uniquement, admin] Limiter la largeur des champs numériques sur ces 2 tableaux (Pouciel, Gemmes) — actuellement trop larges, provoquent un retour à la ligne par rangée et un scroll vertical excessif de la page.


*Dès que des fichiers sont fournis, indépendamment du reste.*

- **🚨 Prérequis — séparer `public/equipment/` en 2 sous-dossiers** (retour joueur, structure créée au Bloc 22 à corriger) : `public/equipment/combat/` et `public/equipment/expedition/`, plus `public/gems/` déjà correct (cdc section 12). Mettre à jour toute référence code déjà écrite vers l'ancien chemin sans sous-dossier. **✅ Les 120 fichiers Expédition sont déjà déposés dans `public/equipment/expedition/`** — vérifier que ce chemin correspond bien à la structure attendue une fois la séparation faite.
- **Images réelles à intégrer (gemmes + équipements)** *(point 34)* — remplaceront à terme les couleurs/badges texte dans Simulateur de Stuff, Comparateur de stuff, référentiels Équipements, et le calculateur Gemmes. **✅ Gemmes : 60/60 reçues, complet** (convention révisée — clés techniques anglaises, `.webp`, exception `legendary` pour la ligue Légende sur ce seul manifeste, voir cdc section 11 pour le détail et le point d'implémentation à ne pas rater). **Équipements : convention actée** (`{famille}-{rareté}-{emplacement}.webp`), manifeste des 300 fichiers en section 12 — 144/180 Combat reçus (36 manquants, motif connu), 120/120 Expédition complet. Pas bloquant, la palette de couleurs actuelle reste la référence tant que les images ne sont pas toutes intégrées.

---

### Vérifications de données restantes (non bloquantes, pas des tâches Codex)
- **9 lignes de valeurs manquantes** *(point 16, révisé — 9 sets sur 10 confirmés)* — Équipements de Combat, 3 sets restants Rare/Épique (section 7.1).
- **8 stats sur 10 encore à confirmer** *(point 17)* — Équipement d'Expédition (seules Équipement +0,2/★ et Vitalité +2,5/★ le sont).
- **Rappel pour le futur calculateur Expédition** — sa formule de progression par étoile est déjà confirmée additive, identique au Combat (cahier des charges section 7.1). Ne pas dupliquer `equipmentValueAtStar()` : extraire un helper partagé (`valueAtStar(base, increment, star)`) au moment de construire ce calculateur, voir "Rappels transverses" ci-dessus.

### Gros chantiers en attente de cadrage (pas prêts pour Codex)
- **Combat — Fight, Enemy Troops** *(reste du point 18)* — non spécifiés, à cadrer avec toi avant de coder.
- **Contenu des guides** *(point 19)* — modèle et éditeur prêts, rédaction en cours (via ChatGPT) — voir `docs/cahier-des-charges-ml-helper.md` section 10 (56 guides, 8 catégories, suivi ✅/⬜).
- **Référentiel Consommables** *(point 20, reclassé — n'est plus un simulateur)* — structure connue : photo/nom/description/**catégorie (Expédition/Stuff/Jeu)**/coût en saphirs, prix fixes (pas de variation par ligue), tri par catégorie puis alphabétique (cdc section 6.2). Liste des objets à collecter.
- **ES/DE/PL/TR** *(point 21)* — prévu dans l'architecture i18n, pas prioritaire.

### Résolu (gardé pour traçabilité)
- ~~Renommage de la catégorie "Classement"~~ *(point 33)* → **✅ Résolu : on garde "Classement"**, pas de renommage prévu.

---

## Bonnes pratiques, conventions de nommage et règles produit non négociables

**→ Voir `AGENTS.md` à la racine du repo** — lu automatiquement par Codex à chaque tâche, pas besoin de le rappeler ici. Le committer dès la création du repo, avant la première tâche de setup.
