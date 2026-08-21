# Brief de démarrage — ML-Helper (pour Codex)

Ce document est le point d'entrée pour démarrer le développement. Il résume le plan de travail phasé et le setup technique à mettre en place en tout premier. **Le détail complet des spécifications (formules, modèles de données, décisions produit) est dans `docs/cahier-des-charges-ml-helper.md`, à consulter systématiquement avant d'implémenter chaque brique.**

Domaine cible : `ml-helper.com`.

**📍 État d'avancement (à mettre à jour au fil des tâches) :** Phase 0 (setup) ✅ validée et poussée. Phase 1 (fondations : schéma Prisma, auth, back-office minimal) ✅ validée et mergée. **Phase 2 (site public + tous les simulateurs déjà spécifiés) ✅ entièrement validée et mergée** — Villes, Classement, Compétences (Gemmes/Templiers/Simulateur de Stuff/Comparateur), Référentiels sont tous fonctionnels **(⚠️ mais leur emplacement dans la navigation a changé depuis — voir "Restructuration navigation" en tête de la liste unifiée, section 4)**. Actuellement en phase de polish/corrections (voir "Liste unifiée", section 4) avant d'attaquer la Phase 3 (Combat, contenu des guides, consommables).

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
- **Simulateur d'achat de consommables** — pas encore spécifié
- **ES/DE/PL/TR** — prévu dans l'architecture i18n mais pas prioritaire

---

## Rappels transverses à respecter partout

- **Jamais de formule libre éditable en admin** — uniquement des paramètres numériques nommés (décision actée, voir section 6 du cahier des charges)
- **Formatage des grands nombres** : compact par palier (k/M/G/T/P), seuils précis en section 3.3
- **Arrondi** : entier pour les quantités absolues (or, troupes, coûts), décimales conservées pour les pourcentages
- **Formules jamais exposées côté public** — uniquement les résultats, jamais `VP = 20 × 1.115^(n-1)` visible pour un joueur
- Toute donnée encore marquée "non confirmé"/"hypothèse" dans le cahier des charges doit rester **éditable en admin** avec sa valeur actuelle par défaut, pas bloquante pour livrer la fonctionnalité

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

### Bloc 3 — Fondation : restructuration admin
*Un seul gros bloc cohérent, nécessaire avant le chargement de contenu qui en dépend (bloc 4). Suppose le Bloc 0 déjà fait (l'organisation Guides+Référentiels doit être en place avant de construire les tableaux admin).*

- **Nommage "Outils" partout, y compris admin** *(point 8)* — "Calculateur"/"Simulateurs" (comme terme englobant) ne doivent plus apparaître nulle part côté utilisateur — "Outils" est le terme final (rôle admin renommé "Gestion Outils"), à répercuter dans le code.
- **Tableau admin Outils (simulateurs uniquement)** *(point 9, révisé)* (`/admin/tools`) — colonnes Nom/Statut/Actions, bouton "Modifier" par ligne. **Les référentiels n'y sont plus** — ils rejoignent le tableau admin Guides (voir Bloc 0), même pattern (colonne Type : Guide / Référentiel).
- **Cas Villes — point d'édition partagé** *(point 10)* — les 3 simulateurs Villes doivent pointer vers la même pop-up d'édition des paramètres (VP/Remparts/Coût/multiplicateurs Army-Gold par ligue, toutes les valeurs sont maintenant connues, section 7.1) — pas de duplication.
- **Édition des référentiels à revoir** *(point 11)* — dropdowns pour rareté/famille/emplacement/compétence, pouciel et emplacements gemmes non éditables (auto-calculés), filtres en haut du tableau. **À construire dans le tableau admin Guides, pas Outils** (voir ci-dessus).
- **Templiers — remplacer la table de coût par la formule** *(point 12)* — 2 paramètres nommés (base=150, ratio=1,3) au lieu d'une `lookup_table` à 21 lignes.
- **Bouton retour manquant dans les pages d'édition admin** *(point 13)*.
- **Éditeur Classement dédié (jamais formellement numéroté avant, à ajouter)** — l'édition admin des seuils/récompenses par ligue du Classement se fait via un blob JSON brut, à remplacer par une UI dédiée par ligue (bouton "+" pour ajouter un rang/seuil, champs de saisie individuels par ligne). Généraliser en **composant de table éditable réutilisable** plutôt que de le refaire pour chaque `lookup_table` (Templiers, équipements) — cohérent avec le point 11 ci-dessus.

### Bloc 4 — Contenu à charger (dépend du bloc 3)
*Rapide une fois l'admin prêt.*

- **Contenu des mentions légales** *(point 14)* — texte français rédigé (section 6 bis du cahier des charges), à charger comme valeur par défaut si pas déjà fait.
- **Multiplicateurs Villes par ligue** *(point 15)* — toutes les valeurs sont maintenant confirmées (6 ligues), à charger en admin une fois le point d'édition partagé (bloc 3) construit.

### Bloc 5 — Nouveaux simulateurs Combat
*Entièrement spécifiés, faible risque, indépendants du reste — bon calage pour souffler après les blocs 2-3.*

- **Combat — Taux de gain d'XP** *(point 31)* — ✅ Résolu et prototypé (formule + seuils confirmés, UI construite dans `docs/prototype-ml-helper-unifie.html` : un champ VP, mode attaquant/cible, sortie en tableau des 5 paliers avec plage de VP adverse). Voir section 7.1 du cahier des charges. **Prêt à être envoyé comme tâche Codex, reproduire fidèlement le prototype.**
- **Combat — Troupes max envoyées en "attaque démo"** *(point 32)* — ✅ Résolu : formule confirmée (`TroupesMax = X% × Remparts(niveau_ville_visée)`, X selon la ligue de l'attaquant : Bronze 100%, Argent 50%, Or/Platine 40%, Diamant/Légende 30%). Vitesse d'attaque réduite = information seulement, **pas à intégrer au calcul**. **Prêt à être envoyé comme tâche Codex.**
- **Combat — Level Up (référentiel, pas calculateur)** *(inclus dans le point 18)* — formule troupes ✅ verrouillée pour **Légende, Diamant et Bronze (identique pour les trois)**, ✅ verrouillée séparément pour **Platine** (formule distincte), ✅ verrouillée séparément pour **Or** (formule distincte, ne pas confondre avec Légende malgré une ressemblance trompeuse aux petits niveaux — voir piège méthodologique en section 7.1 du cdc), ✅ **formule d'XP requis par niveau verrouillée** (universelle, identique sur les 6 ligues, régression exacte sur 110 points), cycle de coffres tous les 10 niveaux ✅ **confirmé universel sur les 6 ligues** (Coffre→Urne→Coffret à bijoux→Jarre→Caisse, boucle de 5, identique partout — seules les formules de troupes varient par ligue) — contenu exact des coffres couvert par le guide Level Up plutôt que la donnée structurée. **Reste : données troupes Argent, seule donnée manquante pour ce référentiel** (XP et cycle de coffres déjà universels, donc déjà connus pour Argent aussi) — **peut être envoyé dès maintenant pour 5 ligues sur 6** (Légende/Diamant/Bronze/Platine/Or, XP et coffres complets), Argent complété plus tard.

### Bloc 6 — UI/UX : alignement visuel Dev ↔ Prototype
*Maintenant que l'i18n et l'admin sont stabilisés, peaufiner le visuel sans devoir retoucher le texte une 2e fois.*

- **Alignement Dev ↔ Prototype** *(point 2)* — résumé des stats manquant par endroits, couleurs pas fidèles.
- **Paramètres du joueur — résumé manquant en repli** *(point 3)* — le résumé 2 lignes visible même replié dans le prototype n'apparaît pas en dev.
- **Simulateur de Stuff — rendu des emplacements** *(point 4)* — couleur de rareté sur la case, gemmes visibles avec ligue+étoiles+couleur de compétence (palette exacte en section 7.1 du cahier des charges).
- **Classement — barre visuelle** *(point 5)* — indicateur rouge de position exacte, libellés hors barre en quinconce, couleurs par catégorie (Descente/Maintien/Montée, clair→foncé).
- **Classement — nettoyage de titres** *(point 24, même écran que le point précédent)* — retirer le "(expérimental)", renommer "Rang correspondant à chaque seuil repère" en "Tableau de classement", et le graphique ne montre plus que le % et la ligue cible (pas la récompense, qui reste dans le tableau en dessous).
- **Calculateurs Villes — affichage des résultats** *(point 6)* — base ville seule en premier, détail Stuff/Temple séparé, total en évidence (reprendre le pattern déjà en place sur Production).
- **Page d'accueil simulateurs — carte pas assez cliquable** *(point 7)* — tout le cadre doit l'être, pas juste le compteur.
- **Page des guides — cartes entièrement cliquables** *(point 35)*.
- **Page des guides — 3 par ligne au lieu de 5** *(point 36)*.

### Bloc 7 — Guides : technique complémentaire
*Même écran d'édition à retoucher, logique de les grouper.*

- **Guides — éditeur markdown à améliorer** *(point 26)* — remplacer la zone de texte brute par **`@uiw/react-md-editor`** (coloration syntaxique, aperçu en direct côte à côte, toolbar optionnelle) — reste un éditeur markdown-natif, pas de blocs WYSIWYG. L'aperçu doit utiliser le même moteur que le rendu public (`react-markdown`+`remark-gfm`, bloc 1) pour cohérence exacte.
- **Éditeur de guides — sélecteur de catégories multiples** *(point 30)* — un guide peut appartenir à plusieurs catégories à la fois (champ `category` passé de enum simple à tableau). L'éditeur admin doit permettre de cocher/sélectionner une ou plusieurs des 8 catégories, pas un menu déroulant à choix unique. Impacte aussi l'affichage public.
- **Éditeur de guide — champ image représentative** *(point 37)* — le champ `cover_image` existe déjà dans le modèle de données (section 5) mais n'est pas encore exposé dans l'éditeur admin. Ajouter un sélecteur d'image, affichée à gauche de la carte sur la page de liste.

### Bloc 8 — Admin : sécurité et accès
*Bloc indépendant, ne bloque rien d'autre.*

- **Nouveau rôle admin "Lecture Seule"** *(point 27)* — accès en consultation uniquement à toutes les sections admin, aucune action de mutation possible nulle part (bloqué côté serveur). Cas d'usage : montrer l'envers du décor sans donner de droit d'édition. Détail en section 3.2 du cahier des charges (table des rôles, 5e ligne).
- **Retirer le lien vers l'administration du dashboard public** *(point 28)*.
- **Refonte de la page de connexion** *(point 29)* — mise en page plus soignée (centrée, cadrée), et sécurisation renforcée :
    - Limitation des tentatives (rate limiting) avec blocage temporaire après N échecs consécutifs
    - Messages d'erreur génériques (ne pas révéler si c'est le username ou le mot de passe qui est incorrect)
    - **2FA (TOTP)** — code à usage unique via une app d'authentification, génération de la clé secrète et QR code lors de l'activation, vérification à chaque connexion

### Bloc 9 — Petits ajustements ponctuels
*Rapides, glissables n'importe où — "pendant qu'on y est" plutôt qu'une tâche dédiée.*

- **Coût de Ville — contrainte niveau cible > niveau de départ** *(point 22)* — le niveau cible doit toujours être strictement supérieur au niveau de départ (minimum +1), avec ajustement automatique dans les deux sens.
- **Aucune ligue sélectionnée par défaut, partout** *(point 23, périmètre étendu)* — Paramètres du joueur, Classement, Gemmes (Optimisation + Budget), Simulateur de Stuff, Comparateur de stuff, Troupes attaque démo, Level Up, **Villes (Coût de Ville, Niveau Max, Production — nouveau sélecteur à construire, cdc section 7.1)** : tous les sélecteurs de ligue doivent démarrer vides (placeholder "— Choisir —"), avec repli propre côté calcul tant qu'aucune ligue n'est choisie. **Exception (Classement, Troupes attaque démo, Level Up, Villes)** : ces sélecteurs s'alignent automatiquement sur la ligue du joueur dès qu'elle est définie — **y compris au chargement initial si déjà en cache (localStorage)**. Si le sélecteur dépendant a déjà une valeur choisie manuellement, elle n'est pas écrasée. **Raison d'être pour Villes, à noter pour Codex** : permettre de tester les valeurs d'une autre ligue que la sienne (ex: simuler pour quelqu'un d'autre), pas juste refléter son propre profil — contrairement à l'implémentation actuelle qui lit `player-league` directement sans sélecteur dédié (voir prototype avant mise à jour). **Placement du sélecteur : toujours en première position (le plus à gauche) dans la grille d'inputs**, avant Nombre de villes/Niveau de départ/etc. — cohérent sur les 3 calculateurs Villes, voir prototype à jour.

### Bloc 10 — Assets : images
*Dès que des fichiers sont fournis, indépendamment du reste.*

- **Images réelles à intégrer (gemmes + équipements)** *(point 34)* — remplaceront à terme les couleurs/badges texte dans Simulateur de Stuff, Comparateur de stuff, référentiels Équipements, et le calculateur Gemmes. **Gemmes : convention actée**, manifeste des 60 fichiers dans `docs/cahier-des-charges-ml-helper.md` section 11. **Équipements : convention actée aussi** (`{famille}-{rareté}-{emplacement}.png`), manifeste des 300 fichiers en section 12. Pas bloquant, la palette de couleurs actuelle reste la référence tant que les images ne sont pas fournies.

---

### Vérifications de données restantes (non bloquantes, pas des tâches Codex)
- **15 lignes de valeurs manquantes** *(point 16, révisé — 7 sets sur 10 confirmés)* — Équipements de Combat, 5 sets restants Rare/Épique (section 7.1).
- **8 stats sur 10 encore à confirmer** *(point 17)* — Équipement d'Expédition (seules Équipement +0,2/★ et Vitalité +2,5/★ le sont).

### Gros chantiers en attente de cadrage (pas prêts pour Codex)
- **Combat — Fight, Enemy Troops** *(reste du point 18)* — non spécifiés, à cadrer avec toi avant de coder.
- **Contenu des guides** *(point 19)* — modèle et éditeur prêts, rédaction en cours (via ChatGPT) — voir `docs/cahier-des-charges-ml-helper.md` section 10 (56 guides, 8 catégories, suivi ✅/⬜).
- **Simulateur d'achat de consommables** *(point 20)* — liste d'objets/prix à collecter, catégorie d'accueil à trancher.
- **ES/DE/PL/TR** *(point 21)* — prévu dans l'architecture i18n, pas prioritaire.

### Résolu (gardé pour traçabilité)
- ~~Renommage de la catégorie "Classement"~~ *(point 33)* → **✅ Résolu : on garde "Classement"**, pas de renommage prévu.

---

## Bonnes pratiques, conventions de nommage et règles produit non négociables

**→ Voir `AGENTS.md` à la racine du repo** — lu automatiquement par Codex à chaque tâche, pas besoin de le rappeler ici. Le committer dès la création du repo, avant la première tâche de setup.
