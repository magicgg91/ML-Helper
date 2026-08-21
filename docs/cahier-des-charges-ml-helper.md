# Cahier des charges — ML-Helper (site outils & guides Million Lords)

Statut : brouillon en cours de construction
Dernière mise à jour : 20/08/2026 (passe de cohérence backlog ↔ cdc — voir corrections signalées par "✅ Révisé" ajoutées à cette date en sections 3.2/4/6bis/7.1/8)

---

## 1. Objectif du projet

**✅ Nommage — décidé, révisé une 3e fois (périmètre resserré depuis).** "Outils" est le terme public/admin pour la section qui regroupe les simulateurs — **🚨 ne regroupe plus les référentiels depuis la décision de navigation révisée** (les référentiels ont rejoint "Guides", voir section 3.1). "Simulateur" reste le terme juste pour un calculateur individuel (Coût de Ville, Gemmes...), "Référentiel" reste le terme juste pour une table de données consultable individuelle (Équipements de Combat...). "Calculateur" reste abandonné comme terme visible utilisateur ; ne subsiste que dans ce document et le modèle de données technique (entités Prisma, noms de variables internes).

Créer un site communautaire pour le jeu **Million Lords**, proposant :
- Une suite de **simulateurs** de jeu (villes, combat, production, classement, gemmes, équipements, compétences/reskill)
- Une **section guides** (Débuter & progresser, Combat & conquête, Défense & territoire, Compétences & builds, Équipement & Templiers, Expéditions, Événements & classement, Clan & stratégie collective — voir section 10 pour le plan complet)
- Une **interface d'administration** permettant de gérer tout le contenu sans redéploiement
- Un site **multilingue**, lancé en **EN/FR**, avec **espagnol, allemand, polonais et turc envisagés en cible** (ajout futur, sans refonte technique grâce à next-intl)

Inspiration de départ : lordstrategist.com/en/million-lords/tools (simulateurs équivalents à reprendre et étendre)

### 1.1 Philosophie générale — gratuité, compte optionnel, monétisation discrète

**✅ Décidé — principes fondateurs du projet, à respecter dans toutes les décisions futures :**

- **ML-Helper doit rester utilisable gratuitement et sans compte.** Le fonctionnement actuel (paramètres joueur en localStorage, aucun compte requis — voir section 3.3) reste la référence pour la V1 et au-delà. Un compte (V2, voir section 13) est une **fonctionnalité de confort supplémentaire**, jamais une condition d'accès aux outils/guides/référentiels.
- **La monétisation (voir section 14) ne doit jamais dégrader l'usage ni transformer une fonctionnalité actuellement gratuite en fonctionnalité payante.** Dons volontaires d'abord, publicité discrète ensuite si le trafic le justifie — jamais l'inverse (pas de fonctionnalité bridée puis "débridée" contre paiement).

**Ordre de mise en œuvre envisagé (roadmap, pas un engagement de date) :**

| Étape | Contenu |
|---|---|
| **V1** | Sans compte obligatoire, paramètres locaux, outils/guides gratuits, dons volontaires, **pas de publicité au lancement** |
| **Une fois assez de contenu/trafic** | Activation éventuelle de Google AdSense, 1-2 emplacements maximum, pages appropriées uniquement |
| **V2 — sans deadline** | Compte joueur optionnel, sauvegarde serveur des paramètres, synchronisation entre appareils, statut Supporter associable au compte (évolution possible, non engagée) |

---

## 2. Stack technique retenue

| Élément | Choix |
|---|---|
| Framework | Next.js (React + TypeScript) |
| Base de données | **SQLite** (fichier unique, pas de serveur de BDD à gérer) |
| ORM | Prisma (compatible SQLite nativement) |
| Auth admin | NextAuth.js |
| i18n | next-intl (switch dynamique EN/FR au lancement ; ES, DE, PL, TR envisagés en cible, sans refonte) |
| Moteur de formules | **Paramètres numériques nommés, toujours éditables individuellement en admin** — pas d'expression libre éditable (décision révisée, voir section 6). `mathjs` reste utilisé côté code pour les calculs internes complexes (ex: Fight), mais jamais exposé comme formule brute modifiable par l'admin — seuls les paramètres qu'il utilise le sont |
| Traductions | Champ JSON par locale pour le contenu éditorial dynamique uniquement (guides, mentions légales : `{en, fr, es, de, ...}`). Tout le texte fixe — y compris les labels admin — passe par les fichiers de traduction statiques, un seul mécanisme pour tout le reste (voir section 3.3). Repli sur l'anglais si une traduction manque. |
| Implémentation | Codex (hors périmètre de cette réflexion) |
| Repo GitHub | **Privé**, aucune licence pour l'instant (à réévaluer si le repo devient public un jour) |

**Pourquoi SQLite convient bien ici :** pas de trafic massif attendu, volumétrie faible (quelques dizaines/centaines de guides, une quinzaine de calculateurs), pas besoin de serveur de base de données séparé à administrer ni de scaling horizontal. Le fichier `.db` peut être sauvegardé simplement (copie de fichier).

**Point de vigilance à garder en tête pour Codex :** avec SQLite, l'hébergement doit permettre un stockage de fichier persistant. **Confirmé : hébergement sur le serveur personnel de l'utilisateur** (compatible, pas de contrainte serverless à gérer).

**Décision de format transverse — arrondi :** toutes les valeurs numériques de gameplay **exprimées en quantités absolues** (or, troupes/production, coûts, VP...) sont **arrondies à l'entier le plus proche** dans les tables de référence — pas de valeurs flottantes/décimales, cohérent avec la façon dont le jeu affiche ces nombres.

**⚠️ Exception — pourcentages de compétences/gemmes non concernés :** les stats exprimées en **pourcentage** (bonus de compétences, bonus de gemmes) **ne sont pas arrondies à l'entier** — elles gardent leur précision décimale (ex: 27,5%, 2,5%, 7,5%). L'arrondi à l'entier ne s'applique qu'aux grandes quantités de jeu (or, troupes, points), jamais aux pourcentages.

---

## 2 bis. Architecture d'hébergement

**✅ Nom de domaine décidé : `ml-helper.com`** — cohérent avec le nom déjà utilisé partout (prototype, document). Le joueur évalue aussi une extension `.gg` en complément/alternative, à trancher plus tard. **Point de vigilance à écarter d'office : le TLD `.ml` (Mali)**, bien que visuellement tentant pour "ML-Helper", a une mauvaise réputation (très utilisé pour le phishing, souvent bloqué par défaut par les navigateurs/antivirus) — à ne jamais utiliser pour ce projet.

Hébergement et reverse proxy déjà en place côté utilisateur (hors périmètre de cette réflexion — le reverse proxy existant routera vers ce conteneur).

**Conteneur unique**, `node:alpine` (léger), build multi-stage (une étape dépendances + build, puis une image finale minimale avec juste le build compilé Next.js en mode `standalone`) :

```
┌───────────────────────────────┐
│   Reverse proxy existant        │  (hors périmètre)
│   (déjà en place sur l'infra)   │
└──────────────┬──────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Conteneur App (node:alpine)   │
│   Next.js standalone            │
└──────────────┬──────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Dossier hôte (bind mount)     │
│   - db.sqlite                    │
│   - /uploads                     │
└───────────────────────────────┘
```

**Persistance des données** via **bind mount** (dossier sur l'hôte monté dans le conteneur), plutôt qu'un volume Docker nommé — permet un accès direct aux fichiers depuis l'hôte pour les sauvegardes (rsync, tar, ou tout autre outil de backup déjà en place), sans dépendre des commandes Docker :

```
Hôte : /chemin/vers/ml-helper-data/
  ├── db.sqlite
  └── uploads/

Conteneur : /app/data  (monté depuis le dossier hôte ci-dessus)
```

Contenu du dossier :
- `db.sqlite` — survit aux redéploiements/rebuilds du conteneur
- `/uploads` — images des guides uploadées via l'admin

**Sauvegarde** : copie régulière (manuelle ou cron) de l'ensemble du dossier `/chemin/vers/ml-helper-data/` — décidé, plus besoin de solution de backup dédiée au conteneur.

**⚠️ Point de vigilance pour Codex :** Alpine utilise musl (libc) au lieu de glibc — Prisma doit être configuré avec le bon `binaryTargets` (ex: `linux-musl-openssl-3.0.x`) dans son schéma, sinon le build/runtime plante avec une erreur peu explicite. **Décision : on garde Alpine et on configure `binaryTargets` correctement dès la mise en place du Dockerfile** (correctif simple et bien documenté, préserve la légèreté de l'image).

**Workflow Git & CI/CD — décidé :**

**Branches :**
- `dev` — branche de travail active de Codex, tout le développement s'y passe
- `main` — branche par défaut du repo (créée automatiquement par GitHub), joue le rôle de branche de production : **protégée, PR obligatoire pour merger** (garde-fou CI avant mise en prod), même en solo (toi seul review/merge)

**Tests automatisés (écrits par Codex dès le départ, pas ajoutés après coup) :**
- **Unitaires** : Vitest
- **Composants/Frontend** : React Testing Library
- **E2E** : Playwright

**Pipeline GitHub Actions :**
| Déclencheur | Actions |
|---|---|
| Push/PR vers `dev` | Lint + tests unitaires + composants + e2e, **puis build + push de l'image Docker taguée `:dev`** sur ghcr.io — permet de tirer et tester l'image avant de décider de merger |
| PR vers `main` (ouverture/mise à jour) | Suite de tests complète en garde-fou obligatoire avant que le merge soit autorisé |
| Merge vers `main` | Build + push de l'image Docker taguée `:latest` sur ghcr.io — c'est cette image que tu déploies réellement |

**Déploiement** : reste **manuel** — le lancement/redémarrage du conteneur sur le serveur (pull de l'image `:latest` + relance) est fait par toi, pas d'outil d'auto-déploiement (Watchtower/SSH/webhook) à mettre en place pour l'instant.

---

## 3. Vue d'ensemble fonctionnelle

Le projet se compose de deux univers distincts :
- **Site public** — ce que voient les joueurs (calculateurs + guides)
- **Back-office admin** — interface de gestion du contenu

### 3.1 Site public

**Accueil**
- Présentation du site, mise en avant de calculateurs/guides populaires ou récents

**Outils**
- **🚨 Révisé — les Référentiels en sortent, réservé aux vrais calculateurs.** Regroupés par catégorie : **Villes** (inclut désormais Production, Récompenses), Combat, Classement, **Compétences** (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers). "Outils" = formulaire de saisie → résultat calculé, exclusivement.
- Chaque simulateur : formulaire de saisie → résultat instantané, **sans titre ni texte d'explication** (décision révisée, voir "Sobriété du texte sur les pages de simulateurs" plus bas) — le nom déjà visible dans la navigation suffit
- Page liste filtrable par catégorie (une carte illustrée par catégorie, avec le nombre de simulateurs qu'elle contient, toute la carte cliquable)

**Guides — 🚨 révisé, accueille désormais aussi les Référentiels**
- **Une seule entrée de menu "Guides"**, mais **2 sections distinctes à l'intérieur de la page** : "Guides" (contenu texte/narratif) et "Référentiels" (tables de données consultables — Équipements de Combat, Équipement d'Expédition). Chaque section garde ses propres cartes de catégorie, son propre système de filtrage — elles ne se mélangent pas, juste co-localisées sous la même entrée de navigation.
- **Section Guides** : liste filtrable par catégorie (Débuter & progresser, Combat & conquête, Défense & territoire, Compétences & builds, Équipement & Templiers, Expéditions, Événements & classement, Clan & stratégie collective — voir section 10), page individuelle (contenu riche, images), recherche dès la V1.
- **Section Référentiels** : les tableaux filtrables déjà spécifiés (rareté/famille/emplacement/compétence), inchangés dans leur fonctionnement — seul leur emplacement dans la navigation change.
- **✅ Décidé — liens croisés obligatoires** : puisque les référentiels ne sont plus dans la même zone de navigation que les simulateurs qui les utilisent (ex: Simulateur de Stuff ↔ Référentiel Équipements de Combat), chaque simulateur concerné doit avoir un **lien direct** ("Voir le référentiel complet") vers la section/le référentiel pertinent, pour compenser la perte d'adjacence de navigation. Concerne au minimum : Simulateur de Stuff et Comparaison de stuff → Référentiel Équipements de Combat ; tout calculateur d'Expédition futur → Référentiel Équipement d'Expédition.

**✅ Décidé — organisation admin résolue.** L'admin Référentiels rejoint l'admin Guides (option (b)) : le rôle "Gestion Guides" édite désormais aussi les référentiels, structure admin alignée avec la structure de navigation publique. Voir table des rôles et section 3.2 pour le détail complet.

**Transverse**
- Switch de langue EN/FR dynamique, sans rechargement
- Navigation cohérente (menu Outils + menu Guides — **2 entrées seulement**, pas 3, malgré l'ajout des référentiels)
- Formulaire de contact (page dédiée, pas de commentaires sur les guides)

### 3.2 Back-office admin

**Gestion des guides et référentiels — ✅ décidé, question ouverte résolue.** Les référentiels rejoignent l'admin Guides (cohérent avec la navigation publique — voir section 3.1), pas l'admin Outils. **Un seul tableau, colonnes Nom, Type (Guide / Référentiel), Statut, Actions** — même pattern que celui déjà retenu pour l'admin Outils.

- CRUD complet (créer / éditer / supprimer) — pour les guides ; pour les référentiels, pas de création/suppression de table (structure fixe), juste édition des valeurs
- Publier / dépublier — concerne les guides uniquement (workflow éditorial `draft`→`pending_review`→`published`) ; les référentiels n'ont pas ce workflow, juste actif/inactif
- **🚨 Décision révisée une 2e fois — éditeur markdown natif avec aperçu, pas un textarea nu (concerne les guides uniquement).** L'éditeur "type Ghost" par blocs visuels (WYSIWYG) reste écarté — trop complexe. Mais le simple textarea brut a été jugé trop austère à l'usage. **Décidé : bibliothèque `@uiw/react-md-editor`** (coloration syntaxique du markdown pendant la frappe, aperçu en direct côte à côte, toolbar de raccourcis optionnelle) — reste fondamentalement un éditeur markdown-natif (l'auteur tape sa syntaxe lui-même, pas de blocs visuels imposés), juste avec plus de confort qu'un textarea nu. Toujours 3 champs : Titre, Résumé, zone markdown. Le contenu stocké reste du markdown propre, inchangé. **Le rendu public utilise `react-markdown` + `remark-gfm`** (décision séparée, voir bug corrigé plus haut) — cohérent avec l'aperçu de l'éditeur qui doit refléter fidèlement ce que verra le joueur.
- Pour les référentiels (Équipements de Combat / Équipement d'Expédition) : rareté et famille en liste déroulante, pouciel et emplacements gemmes **non éditables** (déduits automatiquement de la rareté), type d'emplacement et compétence en liste déroulante, seule la valeur (%) reste un champ de saisie libre. Filtres en haut du tableau (rareté, famille, emplacement, compétence).
- Gestion des images (guides), et champ image représentative (`cover_image`) exposé dans l'éditeur
- Gestion des traductions EN/FR (contenu séparé par langue)
- Badge de notification pour Admin/Super Admin quand un guide passe en `pending_review`
- Bouton de retour vers la liste depuis n'importe quelle page d'édition détaillée

**Gestion des outils (simulateurs uniquement) — ✅ décidé, question de la section précédente résolue**

Les référentiels ne sont plus gérés ici — voir "Gestion des guides et référentiels" ci-dessus. Cette section ne couvre plus que les vrais simulateurs (Villes, Combat, Classement, Compétences).

**✅ Décidé : un seul tableau**, colonnes Nom, Statut, Actions.

- Activer / désactiver chaque simulateur côté public — **✅ Décidé : comportement visuel en cas de désactivation.** Le simulateur désactivé reste **visible mais grisé/non cliquable** dans la navigation publique (bouton d'onglet ou de catégorie), plutôt que d'être complètement retiré de la liste. Cohérent avec le pattern déjà utilisé dans le prototype pour les éléments "à venir" (ex: ligues non encore disponibles, catégorie Combat grisée) — le joueur voit que la fonctionnalité existe/est prévue, sans pouvoir y accéder tant qu'elle n'est pas activée.
- Bouton "Modifier" par ligne, ouvrant une pop-up/page d'édition — paramètres numériques nommés (jamais de formule libre, voir section 6) et traductions au même endroit (champ par langue)
- **⚠️ Cas particulier Villes — pas de duplication d'édition.** Coût de Ville, Niveau Max Atteignable et Production sont **3 simulateurs distincts** (chacun garde son propre statut actif/inactif) mais **partagent le même jeu de paramètres sous-jacent** (VP/Remparts/Coût d'upgrade — universels entre les 3 — et multiplicateurs Army/Gold par ligue, voir section 7.1). Le bouton "Modifier" de ces 3 simulateurs doit pointer vers **le même point d'édition partagé** ("Paramètres Villes"), pas 3 pop-up séparées avec risque de désynchronisation entre elles.
- Bouton de retour vers la liste depuis n'importe quelle page d'édition détaillée

**Comptes & rôles**
- Système de rôles prévu dès la conception, avec **5 niveaux définis** (4 initiaux + 1 ajouté a posteriori) :

| Rôle | Droits |
|---|---|
| **Super Admin** (toi) | Tous les droits, y compris la gestion des comptes utilisateurs (créer/modifier/supprimer des comptes admin, changer le mot de passe de n'importe quel utilisateur), et l'édition des mentions légales |
| **Admin** | Tous les droits fonctionnels (guides, simulateurs, référentiels...) **sauf** la création/gestion des comptes utilisateurs et l'édition des mentions légales |
| **Gestion Guides** | **✅ Révisé — couvre désormais aussi les référentiels** (cohérent avec leur rattachement à l'admin Guides, voir plus haut). Peut créer, éditer, **activer/désactiver** des guides ET modifier les valeurs des référentiels. **Ne peut ni valider la review pour publier un guide, ni supprimer** (guide ou référentiel) — ces deux actions restent réservées à Admin/Super Admin. **Aucun droit sur les simulateurs** (pas d'accès, même en lecture) |
| **Gestion Outils** *(anciennement "Gestion Calculateurs", puis "Gestion Simulateurs" — nom final aligné sur le terme englobant "Outils", voir décision de nommage plus haut)* | **✅ Révisé — ne couvre plus que les simulateurs**, les référentiels sont partis vers "Gestion Guides" (voir ligne au-dessus). Peut activer/désactiver un simulateur, modifier les valeurs/paramètres, et éditer les textes/traductions. **Aucun droit sur les guides ni les référentiels** (pas d'accès, même en lecture) |
| **✅ Lecture Seule** *(nouveau rôle, ajouté a posteriori — cas d'usage : montrer l'envers du décor à quelqu'un sans lui donner de droit d'édition)* | Accès en **consultation uniquement** à toutes les sections admin (dashboard, guides, outils, référentiels, logs, liste des utilisateurs) — **aucune action de création/édition/suppression/activation nulle part**, y compris pas d'accès à `/admin/setup` ni à la gestion des comptes. Peut changer son propre mot de passe (ça reste une action sur son propre compte, pas sur le contenu). **Vérification stricte côté serveur** : toute tentative d'action de mutation (POST/PUT/DELETE) doit être bloquée pour ce rôle, pas seulement les boutons masqués côté client. |

**Conséquence sur le modèle de données guides (section 5) :** il faudra un statut intermédiaire type `draft` → `pending_review` (soumis par Gestion Guides) → `published` (validé par Admin/Super Admin), plutôt qu'un simple `draft`/`published` binaire.

**Autres briques à considérer**
- ~~Historique des modifications~~ → confirmé, voir section 6 bis
- Tableau de bord (nb guides publiés, calculateurs actifs, etc.)

### 3.3 Exigences UI transverses (à noter pour le développement complet)

*(Ces exigences s'appliquent à toute l'interface publique. Elles sont documentées ici pour la phase de développement avec Codex — pas reflétées dans le prototype exploratoire de la section 7, qui a servi uniquement à valider le fond des calculateurs.)*

- **Mode clair / sombre** — toggle disponible pour l'utilisateur, à prévoir dès la conception des composants (variables de couleur type CSS custom properties, pas de couleurs codées en dur)
- **Responsive** — le site doit être utilisable correctement sur mobile, tablette et desktop
- **Formules non exposées aux utilisateurs** — l'interface publique affiche les résultats des simulateurs, jamais les formules ou paramètres sous-jacents (ex: pas de `VP = 20 × 1.115^(n−1)` visible pour un joueur). Les formules ne sont visibles/éditables qu'en admin (rôles Gestion Outils / Admin / Super Admin)
- **Formatage des grands nombres** — affichage compact par unité, conversion automatique aux seuils :

| Plage | Format affiché |
|---|---|
| 0 – 999 | valeur brute (ex: `847`) |
| 1 000 – 999 990 | `X.XXk` (ex: `12.4k`) |
| 1 000 000 – 999 990 000 | `X.XXM` (ex: `3.45M`) |
| 1 000 000 000 – 999 990 000 000 | `X.XXG` (ex: `7.12G`) |
| 1 000 000 000 000+ | `X.XXT`, puis `X.XXP` au palier suivant |

Bascule au palier supérieur dès que la valeur atteint l'équivalent de 999,99 dans l'unité courante (ex: 999,99k → passe en M).

- **✅ Sélecteur d'unité en saisie (pas seulement en affichage)** — pour les champs numériques représentant de grandes quantités issues de la production/progression du jeu (VP du joueur, or disponible dans les calculateurs...), le champ de saisie est accompagné d'un **sélecteur d'unité** (×1 / k / M / G / T) à côté du nombre. Le joueur tape "2" et choisit "G" plutôt que de taper "2000000000". **Exception explicite : le budget en saphirs (calculateur Gemmes, mode Budget disponible) n'a pas de sélecteur d'unité** — les saphirs s'achètent avec de l'argent réel, les montants réalistes restent petits, la saisie directe suffit.

- **✅ Stepper −/+ personnalisé sur tous les champs numériques** — les flèches natives du navigateur (haut/bas, minuscules, peu lisibles) sont masquées et remplacées par deux boutons **−** (gauche) et **+** (droite) encadrant chaque champ, respectant `min`/`max`/`step`. S'applique uniformément, y compris aux champs générés dynamiquement (lignes de gemmes, gemmes du Simulateur de Stuff...) via un `MutationObserver` qui enveloppe automatiquement tout nouveau champ nombre ajouté au DOM. Seuls les champs à sélecteur d'unité (ci-dessus) en sont exemptés, pour ne pas surcharger la ligne avec un 3e élément.

- **✅ Synchronisation des sélecteurs de ligue dépendants avec la ligue du joueur** — aucun sélecteur de ligue n'a de valeur par défaut nulle part (voir section 3.1). **Exception pour les sélecteurs de Classement, Troupes attaque démo et Level Up** : ils s'alignent automatiquement sur la ligue définie dans les Paramètres du joueur, **y compris au chargement initial de la page si cette ligue est déjà en cache (localStorage)** — pas seulement lors d'un changement futur. Si le sélecteur dépendant a déjà une valeur choisie manuellement par l'utilisateur, elle n'est jamais écrasée par un changement ultérieur de la ligue du joueur (logique "seulement si rien n'est configuré").

- **🚨 Cohérence linguistique — architecture précisée, exigence renforcée.** Chaque texte visible dans l'UI, **sans aucune exception, public ET admin**, doit être référencé par une **clé de traduction**, jamais de texte codé en dur dans une langue quelconque. Deux mécanismes distincts, chacun devant permettre d'ajouter une langue **sans aucune modification de code** :
  - **Texte d'interface statique** (labels, boutons, menus, messages d'erreur/confirmation, tout `/admin/*` inclus) → fichiers de traduction **JSON**, un fichier par langue (ex: `en.json`, `fr.json`, `es.json`...), structure de clés identique entre tous les fichiers. Ajouter une langue = ajouter un nouveau fichier JSON traduit, zéro ligne de code à toucher.
  - **Contenu dynamique** (noms/descriptions de simulateurs, contenu de guides, libellés de référentiels) → déjà un objet JSON par enregistrement en base (`{en, fr, es, de, pl, tr}`, voir section 6), même principe : ajouter une langue = ajouter une clé dans l'objet JSON de chaque enregistrement (via l'admin, formulaire par langue déjà décidé), pas de modification de schéma ni de code. **Nuance pour le contenu des guides spécifiquement** : ce n'est pas une "traduction via clé" au sens strict (recherche d'une clé identique entre langues) mais du **contenu rédigé directement par langue** (l'auteur écrit son texte dans chaque langue, pas de correspondance mot-à-mot attendue) — stocké dans la même structure JSON par souci de cohérence technique, mais conceptuellement distinct des libellés d'interface.
  
  *(Le prototype exploratoire de la section 7 a depuis été nettoyé de tout mélange FR/EN — sert de référence de cohérence pour le développement réel, pas juste d'exception tolérée.)*
- **🚨 Sobriété du texte sur les pages de simulateurs — écart volontaire avec le prototype :** le prototype affiche un titre (`<h2>`) et une phrase descriptive (`.desc`) en haut de chaque carte de calculateur (ex: "Planifie tes upgrades et mesure précisément ta production en ligue Légende."). **Décidé : retirer ce texte sur le vrai site.** Pas de titre, pas de phrase d'explication — seuls les champs de saisie, labels de champs, et résultats restent affichés. Le nom du calculateur déjà visible dans la navigation (onglet) suffit, pas besoin de le répéter en gros titre sur la page elle-même.

- **✅ Décidé — Paramètres du joueur en localStorage** : le panneau "Paramètres du joueur" (niveau, ligue, stats de compétences — voir prototype) est stocké **côté client dans le localStorage du navigateur**, pas en base de données, **pour la V1**. Conséquence : **aucun compte joueur/visiteur n'est nécessaire** pour utiliser les calculateurs — seuls les comptes admin existent (voir section 6 bis). Les paramètres restent propres à l'appareil/navigateur utilisé. **✅ Synchronisation entre appareils prévue en V2** (compte joueur optionnel, voir section 13) — non prévue pour la V1, qui reste 100% localStorage. **✅ Périmètre d'affichage confirmé : le panneau n'apparaît que sur les pages de simulateurs** (`/tools`, `/tools/[slug]`), pas sur les pages sans calculateur (accueil, guides, contact, mentions légales, login) — inutile de l'afficher là où aucun calculateur n'en a besoin.

---

## 4. Architecture des pages — validée

### Pages publiques
- `/` — Accueil
- `/tools` — Liste des outils *(nommé "Outils" côté public — **🚨 réservé aux vrais simulateurs, plus les référentiels**, voir décision de nommage révisée section 3.1)*
- `/tools/[slug]` — Page d'un simulateur
- `/guides` — **🚨 Révisé — 2 sections distinctes sur la même page** : Guides (contenu texte, filtrable par catégorie) et Référentiels (tables de données, filtrables par rareté/famille/emplacement/compétence) — **recherche incluse dès la V1** (pour la section Guides)
- `/guides/[slug]` — Page d'un guide
- `/guides/referentiels/[slug]` — Page d'un référentiel *(chemin exact à confirmer avec Codex selon convention de routing choisie)*
- `/contact` — Formulaire de contact
- `/legal` — Conditions d'utilisation / mentions légales — **page dédiée**, lien accessible depuis le footer du site
- `/login` — Connexion admin, **page personnalisée** (cohérente avec le design/thème du site, pas la page par défaut générique de NextAuth)

**Contenu de la page légale — décidé et à compléter :**

*Points explicitement demandés :*
- Déni d'affiliation : le site n'est ni édité, ni affilié, ni approuvé par Million Victories (éditeur du jeu) ni par Million Lords
- Clause de non-responsabilité : les calculs fournis sont **à titre indicatif uniquement** ; le site ne saurait être tenu responsable d'une erreur de calcul ou d'une mauvaise interprétation par les joueurs

*Éléments habituels à prévoir (liste informative, pas un avis juridique — à faire relire par un professionnel avant publication, en particulier pour la conformité RGPD vu le site multilingue européen) :*
- Mentions légales : identité de l'éditeur du site, hébergeur, contact
- Propriété intellectuelle : contenu du site (guides, code) vs marques/assets du jeu (non revendiqués)
- Politique de confidentialité (RGPD) : quelles données sont collectées (formulaire de contact, comptes admin, éventuels cookies/analytics) et comment
- Politique de cookies, si des cookies non-essentiels sont utilisés (analytics, préférences)
- Limitation de responsabilité générale (disponibilité du site, exactitude du contenu des guides)
- Droit applicable et juridiction compétente
- Modalités de modification des conditions

**✅ Décidé :** page dédiée `/legal`, avec un lien dans le footer du site. Rédaction du texte légal final assurée par le Super Admin (toi).

**✅ Décidé — édition en admin :** le texte des mentions légales est **éditable depuis l'interface admin**, réservé **au rôle Super Admin uniquement** (ni Admin, ni Gestion Guides/Outils — restriction plus stricte que le reste du contenu statique, cohérent avec la sensibilité légale de cette page). **Éditeur simple** : un seul champ de texte markdown brut (même principe que l'éditeur de guides simplifié — pas de WYSIWYG), interprété en HTML à l'affichage côté public.

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| key | string | Identifiant technique (ex: `legal_notice`) |
| content | JSON `{en, fr, es, de}` | Texte des mentions légales, par langue |
| updated_at | datetime | Dernière modification |
| updated_by | UUID | Utilisateur ayant fait la dernière modification (lien vers Logs) |

Cette entité "contenu statique" pourra aussi servir plus tard pour d'autres pages fixes du site (ex: "À propos") sans redévelopper un système dédié.

**✅ Contenu initial rédigé (français, à charger comme valeur par défaut du champ `content.fr`) — avec placeholders explicites à remplacer par le joueur depuis l'admin, sans redéploiement nécessaire :**

```markdown
# Mentions légales

## Éditeur du site
Le site ML-Helper (ml-helper.com) est édité à titre personnel et non commercial par :
**[NOM DE L'ÉDITEUR — À COMPLÉTER]**
Contact : [ADRESSE EMAIL DE CONTACT — À COMPLÉTER]

## Directeur de la publication
[NOM DE L'ÉDITEUR — À COMPLÉTER]

## Hébergement
**[NOM DE L'HÉBERGEUR — À COMPLÉTER]**
[ADRESSE DE L'HÉBERGEUR — À COMPLÉTER]
[CONTACT DE L'HÉBERGEUR — À COMPLÉTER]

## Propriété intellectuelle
Le contenu original de ce site (guides, textes, code source, interface) est la propriété de son éditeur, sauf mention contraire.

*Million Lords* et l'ensemble des noms, images, marques et éléments visuels associés au jeu sont la propriété de leurs ayants droit respectifs. ML-Helper est un site communautaire non officiel, non affilié à l'éditeur du jeu, créé à des fins d'entraide entre joueurs.

## Développement et fiabilité des données
Ce site a été développé avec l'assistance d'outils d'intelligence artificielle. Les formules, valeurs de jeu et contenus proposés dans les simulateurs ont été **vérifiés par observation directe en jeu** par l'équipe éditoriale, dans la mesure du possible — ils restent toutefois issus d'une démarche communautaire et non officielle, susceptibles de comporter des approximations ou des écarts avec des mises à jour récentes du jeu. En cas de doute, se référer en priorité à ce que vous observez vous-même en jeu.

## Données personnelles
Les paramètres de simulation (niveau, ligue, statistiques du joueur) que vous saisissez sur ce site sont stockés **uniquement dans votre navigateur** (localStorage), jamais transmis ni conservés sur nos serveurs.

Seuls les comptes d'administration du site (réservés à l'équipe éditoriale) sont enregistrés en base de données, avec un mot de passe stocké de façon chiffrée.

[SI FORMULAIRE DE CONTACT / ANALYTICS AJOUTÉS PLUS TARD : compléter cette section en conséquence.]

## Cookies
Ce site n'utilise pas de cookies de suivi publicitaire ou d'analyse tierce. [À AJUSTER SI DES COOKIES SONT AJOUTÉS ULTÉRIEUREMENT.]

## Limitation de responsabilité
Les informations et simulateurs proposés sur ce site sont fournis à titre indicatif, établis à partir d'observations communautaires du jeu *Million Lords*. L'éditeur ne garantit pas l'exactitude absolue de ces données et ne saurait être tenu responsable des décisions prises par les joueurs sur cette base.

## Droit applicable
Les présentes mentions légales sont soumises au droit français.

## Contact
Pour toute question relative à ces mentions légales : [ADRESSE EMAIL DE CONTACT — À COMPLÉTER]

*Dernière mise à jour : [DATE]*
```

### Pages admin (protégées par login)
- `/admin` — Dashboard (résumé : simulateurs actifs/total, guides publiés/total, dernières actions des logs)
- `/admin/setup` — Création du Super Admin au tout premier lancement (uniquement si aucun Super Admin n'existe en base, redirection vers `/login` sinon)
- `/admin/guides` — **🚨 Révisé (suite à la restructuration de navigation, voir section 3.1/3.2) — tableau unique fusionné "Guides"** listant guides ET référentiels (colonne Type : Guide / Référentiel), CRUD complet pour les guides (créer/éditer/activer-désactiver/supprimer), édition des valeurs uniquement pour les référentiels (pas de création/suppression de table)
- `/admin/guides/new` / `/admin/guides/[id]` — Édition d'un guide (Titre + Résumé + éditeur markdown `@uiw/react-md-editor` avec aperçu en direct, pas de WYSIWYG par blocs) ou d'un référentiel (dropdowns rareté/famille/emplacement/compétence, valeur en saisie libre — voir section 3.2)
- `/admin/tools` — **🚨 Révisé — ne liste plus que les simulateurs** (Villes/Combat/Classement/Compétences), les référentiels n'y sont plus (voir ci-dessus) — voir "Gestion des outils" ci-dessus
- `/admin/tools/[id]` — Édition détaillée d'un simulateur (bouton retour vers la liste)
- `/admin/users` — Gestion des utilisateurs admin (créer/modifier/supprimer des comptes, assigner un rôle, changer le mot de passe de n'importe quel utilisateur) — **réservé au rôle Super Admin**
- `/admin/logs` — Historique des modifications en langage naturel (ex: "admin a désactivé le calculateur Coût de Ville"), avec purge manuelle par plage de dates (Super Admin uniquement)
- Changement de son propre mot de passe accessible depuis n'importe quelle page admin (menu de profil dans le header), pour tous les rôles
- Bouton de déconnexion accessible depuis n'importe quelle page admin
- Toggle mode clair/sombre également disponible dans l'admin (pas seulement le site public)

---

## 5. Modèle de données — Guides

*(brouillon à valider)*

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| slug | string | URL du guide |
| category | **array d'enum** (multi-catégories, révisé) | **✅ Un guide peut appartenir à plusieurs catégories** (ex: "Bien choisir et rejoindre un clan" appartient à la fois à Débuter & progresser et Clan & stratégie collective) — champ passé de enum simple à tableau. 8 valeurs possibles : debuter / combat / defense / competences / equipement / expeditions / evenements / clan — voir section 10 pour le plan complet (56 guides distincts) |
| status | enum | draft / pending_review / published |
| is_active | boolean | **✅ Décidé — distinct du statut.** Permet de masquer temporairement un guide publié côté public (ex: le temps de corriger une erreur) sans repasser par tout le workflow de validation. Un guide `published` mais `is_active=false` reste invisible côté public. Éditable par **Gestion Guides** (contrairement au statut `published`, réservé à Admin/Super Admin) |
| title | JSON `{en, fr, es, de}` | Titre traduit |
| content | JSON `{en, fr, es, de}` (markdown/richtext) | Contenu traduit |
| excerpt | JSON `{en, fr, es, de}` | Résumé court (SEO/liste) |
| cover_image | string (url) | Image d'illustration |
| author | string | Auteur |
| created_at / updated_at | datetime | Horodatage |
| published_at | datetime (nullable) | Date de publication |

**Questions ouvertes :**
- ~~Système de tags~~ → **Non**, pas de tags pour le moment (peut être réintroduit plus tard si besoin, sans impact sur le reste du modèle)
- ~~Commentaires/retours des joueurs sur les guides~~ → **Non**, pas de commentaires. Un formulaire de contact générique sera prévu à la place (page séparée, hors périmètre "guides")
- ~~Notification Admin/Super Admin quand un guide passe en pending_review~~ → **Oui**, badge de notification dans le back-office

---

## 6. Modèle de données — Calculateurs

*(brouillon à valider)*

Un calculateur peut contenir **plusieurs formules** (ex: Fight = formule pertes attaquant + formule pertes défenseur + formule gain d'or). On sépare donc en deux entités liées.

> ✅ **Décidé** : structure de traductions en **champ JSON** `{en, fr, es, de, pl, tr}` plutôt que des champs fixes par langue (`title_en`, `title_fr`...) — approche la plus évolutive si d'autres langues s'ajoutent. Toutes les tables du document utilisent désormais un seul nom de champ par donnée traduisible (`title`, `content`, `name`, `description`, `tips`, `label`...), de type JSON.
>
> **🚨 Précision UI admin — le JSON reste un format de stockage, jamais une expérience d'édition.** Éditer du JSON brut en admin est explicitement écarté (même principe que la décision déjà actée pour les `lookup_table`, section 6). **Deux canaux d'édition distincts selon le type de texte :**
> - **Contenu dynamique** (nom/description/astuces d'un calculateur, contenu d'un guide, libellés de tables de référence) — stocké en JSON par locale en base, mais **présenté en admin comme un formulaire avec un champ de saisie distinct par langue** (onglets ou accordéon par langue, jamais le JSON brut affiché à l'utilisateur admin)
> - **Texte d'interface statique** (labels de navigation, boutons génériques, messages d'erreur) — fichiers de traduction next-intl (un fichier par langue), **édités directement dans le repo via GitHub** par un développeur/traducteur technique, pas d'interface admin dédiée pour ce niveau-là (volume trop faible et trop structurel pour justifier une UI)

> **🚨 Exigence renforcée et sans ambiguïté (décision explicite du porteur de projet) : absolument tout texte d'interface — public ET admin — doit passer par une clé de traduction, sans exception, sauf le contenu des guides.** Objectif concret : ajouter une nouvelle langue doit se faire **uniquement en ajoutant un nouveau fichier JSON de traduction**, sans toucher au code. Ce qui est concerné :
> - **Interface publique** : navigation, boutons, labels de champs, messages d'erreur/validation, placeholders, tooltips — déjà acté
> - **✅ Interface admin également concernée, explicitement** (levée d'ambiguïté) : dashboard, tableaux, formulaires, boutons d'action, messages de confirmation/erreur, tout ce qui est visible dans `/admin/*` doit aussi passer par des clés next-intl, pas de texte français codé en dur "parce que c'est juste pour moi en admin"
> - **Seule exception : le contenu des guides** (titre/résumé/corps de texte) — rédigé directement dans la langue choisie par l'auteur, stocké en JSON `{en, fr, ...}` par locale comme déjà décidé, pas un système de clé de traduction (ce n'est pas de l'interface, c'est du contenu éditorial)
> - **✅ Décidé — répartition finale des champs multi-langue (simplifiée, un seul mécanisme pour tout le texte fixe) :**
>   - **Texte fixe, y compris l'admin** (nom des simulateurs/référentiels, `label` de Formule et de Table de référence, tous les libellés d'interface) → **fichiers de traduction statiques uniquement**, un fichier JSON par langue, pas de traitement spécial pour l'admin. Le `key`/`slug` technique de chaque enregistrement sert de clé de traduction.
>   - **Contenu éditorial réellement destiné aux joueurs** (guides, mentions légales) → seuls cas gardant un objet JSON par enregistrement en base (`{en, fr, es, de, pl, tr}`), puisque c'est du contenu créé dynamiquement, pas fixe.
> - **✅ Règle de repli (fallback) — décidée :** si une traduction n'est pas renseignée pour une langue donnée (fichier statique ou contenu éditorial), **le texte anglais s'affiche par défaut** plutôt qu'un vide ou une erreur. S'applique aux deux mécanismes ci-dessus.
> - Le contenu dynamique des simulateurs/référentiels (noms, valeurs) reste couvert par le mécanisme JSON par locale déjà décrit ci-dessus (formulaire par langue en admin) — ce n'est pas non plus une "clé de traduction" statique, mais c'est bien traduit et hors du périmètre "texte d'interface" de cette exigence


### Calculateur (entité parente)

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| slug | string | URL du simulateur/référentiel |
| category | enum | villes / combat / classement / compétences — les référentiels (Équipements Combat/Expédition) sont une entité distincte (voir note ci-dessous) |
| name | **✅ Révisé — retiré du modèle de données, bascule vers les fichiers de traduction statiques next-intl** (contenu fixe, rare à changer, cohérent avec le reste du texte d'interface — voir section 3.3). Le simulateur/référentiel garde son `slug` technique comme clé de traduction. |
| active | boolean | Activé/désactivé côté public |
| inputs | JSON | Définition des champs de saisie communs (nom, type, unité, min/max) |
| outputs | JSON | Définition des résultats affichés (nom, unité, format) |

**🚨 Champs retirés du modèle (décision révisée) :** `description` (texte d'intro) et `tips` (astuce sous le résultat) — supprimés du modèle, contraires à la décision de sobriété actée plus haut : les pages de simulateurs n'affichent ni titre ni texte explicatif, uniquement les champs de saisie et les résultats.

### Formule (entité enfant, plusieurs par calculateur)

**🚨 Décision révisée — plus d'édition de formule libre en admin.** On avait initialement prévu un type `advanced` permettant d'éditer une expression mathjs brute directement en admin. **Abandonné** : trop risqué pour un admin non-développeur (erreur de syntaxe = calculateur cassé, pas de validation possible côté interface, complexité de dev inutile pour l'éditeur de formule lui-même). **Décidé : toujours des paramètres numériques nommés éditables, jamais d'expression libre.** Pour les calculateurs dont la logique est plus complexe qu'un simple `base × ratio^n` (ex: Fight, City Max Level), Codex écrit la **mécanique** en dur dans le code de l'application, et expose seulement les **valeurs numériques qu'elle utilise** (coefficients, multiplicateurs, plafonds...) comme champs éditables — jamais la logique de calcul elle-même. Si un patch du jeu change une valeur, l'admin corrige un champ ; si un patch change la logique, ça nécessite de toute façon un déploiement Codex.

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| calculator_id | UUID | Lien vers le calculateur parent |
| key | string | Identifiant technique de la formule (ex: `attacker_losses`, `gold_gain`) |
| label | **✅ Révisé — retiré du modèle de données, bascule vers les fichiers de traduction statiques** (même traitement que le nom des simulateurs/référentiels — pas de mécanisme spécial pour l'admin). Le `key` technique de la formule sert de clé de traduction. |
| formula_params | JSON | Liste de paramètres numériques nommés, éditables individuellement en admin — remplace l'ancienne distinction `simple`/`advanced` |

**Conséquence :** les entités `lookup_table` (tables de référence brutes, ex: coût Templiers) restent inchangées et complémentaires — utilisées quand aucune formule mathématique propre n'est identifiable, sans rapport avec la question de l'édition de formule libre.

**✅ Résolu :** pas besoin d'un type de calculateur "composite" séparé — le champ `outputs` (JSON, déjà défini comme flexible dans l'entité Calculateur) supporte nativement des résultats multi-lignes ou à double sens, sans changement de modèle. Confirmé en pratique par le prototype : Ranking (tableau multi-lignes par seuil), Gemmes (2 modes de résultat différents, dont un multi-lignes) et Templiers fonctionnent déjà avec le modèle actuel, sans notion de type "composite".

### Principe transverse — formules avec paramètres par ligue (révisé)

**✅ Décidé (révision) :** pour les données qui varient par niveau ET suivent une formule mathématique identifiable (croissance géométrique, par exemple), on privilégie le **stockage de paramètres de formule éditables** plutôt qu'une table de valeurs complète — beaucoup plus compact (quelques paramètres au lieu de centaines de lignes), s'étend automatiquement à n'importe quel niveau, et un seul endroit à corriger si le jeu change une valeur.

**Cas concret validé :** la catégorie Villes (VP, remparts, coût, production) se réduit à **7 paramètres de formule** par ligue plutôt qu'une table de 200 lignes — voir section 7.1 pour le détail.

**La table de référence brute (option `lookup_table`, un jeu de valeurs par ligne) reste disponible en secours** pour les cas où aucune formule mathématique propre n'est identifiable (paliers irréguliers, valeurs arbitraires...) — probablement pertinent pour équipements/gemmes selon ce qu'on découvrira.

**Cas particulier — variations par ligue :** certaines stats (production, remparts, coût...) varient selon la ligue du joueur (Bronze/Argent/Or/Platine/Diamant/Légende), confirmé par les notes de patch officielles du jeu. **Décidé : chaque ligue a son propre jeu de paramètres de formule** (pas juste un multiplicateur global) — voir le modèle "Paramètres de référence Niveaux de ville" en section 7.1 pour le détail concret.

**Conséquence sur le modèle de données :** en plus des types `simple`/`advanced` déjà définis pour l'entité Formule, on prévoit une entité séparée **Table de référence** pour les cas nécessitant des valeurs brutes plutôt qu'une formule :

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| key | string | Identifiant technique (ex: `equipment_tiers`) |
| label | **✅ Révisé — retiré du modèle de données, bascule vers les fichiers de traduction statiques** (même traitement que le nom des simulateurs/référentiels et le label de Formule). Le `key` technique sert de clé de traduction. |
| columns | JSON | Définition des colonnes |
| rows | JSON ou table dédiée | Les valeurs elles-mêmes, éditables ligne par ligne en admin |

Un calculateur peut référencer une ou plusieurs tables de référence (via `reference_table_id`) et/ou des paramètres de formule, selon ce qui convient le mieux à ses données.

---

## 6 bis. Modèle de données — Utilisateurs & Logs

### Utilisateurs (`/admin/users`)

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| username | string | Identifiant de connexion **et** nom affiché — pas d'email, pas de champ "name" séparé |
| password_hash | string | Mot de passe hashé (géré par NextAuth) |
| role | enum | **✅ Révisé — 5 valeurs** (5ᵉ rôle ajouté a posteriori, voir section 3.2) : `super_admin` / `admin` / `guides_manager` / `calculators_manager` / `read_only` |
| created_at | datetime | Date de création du compte |
| last_login_at | datetime (nullable) | Dernière connexion |

**Gestion des mots de passe et rôles — décidé :**
- Chaque utilisateur peut **changer son propre mot de passe** (self-service, depuis son profil admin)
- Le **Super Admin peut changer le mot de passe de n'importe quel utilisateur**, ainsi que **modifier les rôles**

Accès à la page `/admin/users` (création/suppression de comptes, gestion globale) : **Super Admin uniquement**. Le changement de son propre mot de passe reste accessible à tous les rôles admin, ailleurs dans l'interface (profil personnel).

**⚠️ Point technique pour Codex :** NextAuth est habituellement pensé autour d'un identifiant email — utiliser un `username` à la place est tout à fait faisable (Credentials Provider avec username), juste à configurer explicitement plutôt que la configuration par défaut.

**🚨 Correction de sécurité — bootstrap du Super Admin, décision révisée :** on avait d'abord envisagé de fixer le username/password du Super Admin via des **variables d'environnement**. **Abandonné pour raison de sécurité** (identifiants en clair dans la config de déploiement, les logs, l'historique docker-compose...). **Décidé à la place : flux de configuration au premier lancement.** Quand l'instance démarre et qu'aucun Super Admin n'existe en base, toute tentative d'accès à l'admin (ou à la racine) redirige vers une page `/admin/setup` où l'utilisateur choisit lui-même son username et son mot de passe pour créer le compte Super Admin. Cette page devient inaccessible (redirection vers `/login`) dès qu'un Super Admin existe déjà — pas de second bootstrap possible par ce biais.

### Logs / Historique (`/admin/logs`)

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Qui a fait l'action (lien vers Utilisateurs) |
| action | enum | `create` / `update` / `delete` / `publish` / `unpublish` / `activate` / `deactivate` |
| entity_type | enum | **✅ Révisé — ajout de `reference_table`** (les référentiels partagent le tableau admin des guides mais restent une entité distincte, voir section 6) : `guide` / `reference_table` / `calculator` / `user` |
| entity_id | UUID | Sur quel élément |
| diff | JSON (nullable) | Avant/après pour les modifications de valeurs (ex: formule modifiée), pour permettre un rollback manuel |
| created_at | datetime | Horodatage |

**Questions ouvertes :**
- ~~Rollback en un clic~~ → **Non**, le log sert uniquement à la consultation/traçabilité, pas de rollback automatique
- ~~Durée de rétention~~ → **Illimitée par défaut**, avec une fonctionnalité de **purge manuelle** réservée au Super Admin, permettant de supprimer les logs sur une plage de dates donnée (ex: "purger tous les logs entre le [date début] et [date fin]")

---

## 7. Calculateurs — État des lieux

### 7.1 Repris du site existant — en cours de documentation

**Sources croisées :** **mlclord.com** est la référence principale pour extraire les vraies valeurs/formules (31 outils, données précises basées sur les mécaniques du jeu, mises à jour après chaque patch, disponible en 5 langues). **lordstrategist.com** sert uniquement de point de comparaison pour vérifier la cohérence des données, pas de référence pour l'UI — le design/UX du site sera traité séparément, plus tard dans le projet.

#### Villes — Paramètres de référence "Niveaux de ville" (formules, pas de table stockée)

**Décision d'architecture :** on ne stocke pas de table de 200 lignes en base. Les stats de ville sont **entièrement calculées à la demande** à partir d'un petit jeu de **paramètres de formule éditables en admin** — beaucoup plus simple à maintenir qu'une table complète, et ça s'étend automatiquement à n'importe quel niveau sans limite.

**Paramètres de base confirmés (ligue Légende), niveau par niveau via formule géométrique :**

| Stat | Formule | Base | Ratio |
|---|---|---|---|
| VP | `base × ratio^(niveau−1)` | 20 | 1.115 |
| Remparts | `base × ratio^(niveau−1)` | 70 | 1.2 |
| Coût d'upgrade | niveau 1 = 0, niveau 2 = base, niveau≥3 = `base × ratio^(niveau−2)` | 10 | 1.2 |
| Production d'armée | dérivé : `multiplicateur × VP(niveau)` | — | multiplicateur = 3 |
| Production d'or | dérivé : `multiplicateur × VP(niveau)` | — | multiplicateur = 10 |

Toutes vérifiées niveau par niveau contre les observations en jeu (erreur < 2% sur toute la plage 1-100 testée, souvent proche de 0%).

**✅ Ligue Bronze confirmée — VP et Remparts sont universels (même base/ratio que Légende), seuls les multiplicateurs Army/Gold changent :**

| Stat | Formule | Base | Ratio |
|---|---|---|---|
| VP | `base × ratio^(niveau−1)` | 20 | 1.115 *(identique à Légende)* |
| Remparts | `base × ratio^(niveau−1)` | 70 | 1.2 *(identique à Légende)* |
| Production d'armée | `multiplicateur × VP(niveau)` | — | multiplicateur = **2** *(vs 3 en Légende)* |
| Production d'or | `multiplicateur × VP(niveau)` | — | multiplicateur = **5** *(vs 10 en Légende)* |

Vérifié sur 2 points de données (niveau 1 et 2) : VP(1)=20 exact, Remparts(1)=70 exact, Remparts(2)=84 exact, Army(1)/VP(1)=2,000 exact, Gold(1)/VP(1)=5,000 exact, ratios niveau 2 cohérents à l'arrondi d'affichage près. **Coût d'upgrade Bronze ✅ confirmé — identique à Légende** (base=10, ratio=1,2) : vérifié niveau 2 (10 or exact), niveau 3 (12 or exact), niveau 22 (383,38 calculé vs 383 réel, exact à l'arrondi). **Coût d'upgrade est donc probablement universel, indépendant de la ligue, comme VP et Remparts** — confirmé sur 3 ligues distinctes (Bronze, Diamant via un test au niveau 143, Légende), voir section suivante pour le détail complet.

**✅ Décidé : un jeu de paramètres par ligue.** Plutôt qu'une seule table de base + multiplicateurs globaux (ancienne approche), chaque ligue (Bronze/Argent/Or/Platine/Diamant/Légende) a son **propre jeu de paramètres** (base + ratio, éventuellement différents par ligue) — plus flexible si la croissance elle-même change par ligue, pas seulement une valeur de départ. **✅ Les 6 ligues sont désormais toutes confirmées** pour Production d'armée/d'or (voir tableau récapitulatif ci-dessous) ; VP/Remparts/Coût d'upgrade confirmés universels sur 3 ligues testées directement, avec VP re-vérifié sur 2 ligues supplémentaires (Or, Platine) via les données de production.

**✅ Décidé : ces paramètres sont éditables dans l'admin** (rôle Gestion Outils) — si un patch change un ratio ou une base, pas besoin de Codex, juste une modification de valeur en admin.

**Modèle de données (remplace la table de référence CSV pour l'usage runtime) :**

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| league | enum | bronze / silver / gold / platinum / diamond / legend |
| stat_key | string | `vp`, `wall`, `upgrade_cost`, `army_per_hour`, `gold_per_hour` |
| base | decimal (nullable) | Valeur de départ (niveau 1), si applicable |
| ratio | decimal (nullable) | Taux de croissance géométrique, si applicable |
| derived_from | string (nullable) | Pour Production d'armée et Production d'or : `vp` (stat dont ils dérivent) |
| multiplier | decimal (nullable) | Pour les stats dérivées : facteur multiplicateur |

**✅ Décidé : `reference-data-city-levels.csv` supprimé du repo.** Les formules VP/Remparts/Coût sont désormais 100% verrouillées (base + ratio, aucune exception trouvée sur 200 niveaux testés) — la table brute ne sert plus à rien à l'exécution ni comme preuve de validation, la formule fait foi. **Les CSV Équipements/Expédition sont conservés** (contrairement à celui-ci) : leurs valeurs de base par objet restent des données brutes irréductibles, pas une formule, même si elles sont déjà dupliquées dans le prototype (`COMBAT_DATA`/`EXPEDITION_DATA`).

#### Villes — Calculateur 1 : City Cost

**Objectif :** estimer le coût pour upgrader une ou plusieurs villes d'un niveau A à un niveau B.

**Inputs :**
- Nombre de villes
- Niveau de départ (A)
- Niveau cible (B)
- **Ligue** — sélecteur dédié, vide par défaut, aligné automatiquement sur la ligue des Paramètres du joueur si définie (même comportement que Classement/Troupes attaque démo/Level Up, y compris au chargement initial — voir section 3.3 point 23)

**Outputs — en deux parties :**

*Pour 1 ville (avant/après) :*
- Coût (pour upgrader une seule ville de A à B)
- Remparts de la ville — niveau source A et niveau cible B
- VP — niveau source A et niveau cible B
- Production gold et troupes (Production d'or, Production d'armée) — niveau source A et niveau cible B

*Pour le nombre de villes défini (agrégé) :*
- Coût total (pour l'ensemble des villes)
- VP total gagné (pour l'ensemble des villes upgradées)
- Production gold et troupes totale — niveau source A et niveau cible B (× nombre de villes)

**Calculs du calculateur :**
```
--- Pour 1 ville ---
Coût = CoûtCumulé(B) − CoûtCumulé(A)
Remparts A = Remparts(A)          Remparts B = Remparts(B)
VP A = VP(A)             VP B = VP(B)
Production d'or A = Gold(A)       Production d'or B = Gold(B)
Production d'armée A = Army(A)       Production d'armée B = Army(B)

--- Pour le nombre de villes ---
Coût total = Coût × nombre_de_villes
VP total gagné = [VP(B) − VP(A)] × nombre_de_villes
Production d'or total A = Gold(A) × nombre_de_villes    Production d'or total B = Gold(B) × nombre_de_villes
Production d'armée total A = Army(A) × nombre_de_villes    Production d'armée total B = Army(B) × nombre_de_villes
```
Où `CoûtCumulé`, `VP`, `Remparts`, `Gold` et `Army` sont calculés via les formules/paramètres de la table "Niveaux de ville" ci-dessus, selon la ligue du joueur.

**Paramètres numériques :** utilise les paramètres de la table "Niveaux de ville" comme variables (calcul interne via `mathjs`, non exposé à l'admin — voir section 6) — plus `lookup_table`

**Statut des données :** ✅ **Calculateur entièrement validé, les 6 ligues confirmées** — VP/Remparts/Coût d'upgrade universels (vérifiés sur plusieurs ligues, voir tableau récapitulatif plus bas), Production d'armée et Production d'or avec leurs multiplicateurs propres à chaque ligue, tous réduits à des paramètres de formule.

#### Villes — Calculateur 2 : City Max Level (niveau atteignable avec un budget)

**Objectif :** à partir d'un budget d'or, déterminer le niveau maximum atteignable pour un groupe de villes parties du même niveau de base.

**Inputs :**
- Nombre de villes
- Niveau de départ (toutes les villes au même niveau de base)
- Quantité d'or disponible
- **Ligue** — sélecteur dédié, vide par défaut, aligné automatiquement sur la ligue des Paramètres du joueur si définie (même comportement que Classement/Troupes attaque démo/Level Up, y compris au chargement initial — voir section 3.3 point 23)

**Outputs :**
- Niveau cible atteignable
- Or restant après upgrade
- VP gagnée (pour l'ensemble des villes)
- Production troupes et gold (Production d'armée, Production d'or) — niveau source A et niveau cible B (pour l'ensemble des villes)

**Logique de calcul :** on cherche le plus grand niveau B tel que `[CoûtCumulé(B) − CoûtCumulé(A)] × nombre_de_villes ≤ or_disponible`, en calculant `CoûtCumulé` via les mêmes paramètres de formule que le Calculateur 1. Ce n'est pas un calcul direct mais une recherche itérative (on teste les niveaux B successifs jusqu'à dépasser le budget, puis on recule d'un cran).

**⚠️ Point d'architecture — décidé :** ce calculateur ne rentre pas proprement dans le modèle `simple`/`advanced`/`lookup_table` tel que défini, puisqu'il nécessite une **boucle/recherche**. **Décision : Option B — codé "en dur" par Codex.** La logique de recherche sera écrite directement dans le code de l'application, pas éditable dynamiquement en admin. Le rôle Gestion Outils garde la main sur l'activation/désactivation et sur les paramètres de formule sous-jacents, mais pas sur la mécanique de recherche elle-même.

**Outputs dérivés une fois B trouvé :**
```
Or restant = or_disponible - [CoûtCumulé(B) - CoûtCumulé(A)] × nombre_de_villes
VP gagnée = [VP(B) - VP(A)] × nombre_de_villes
Production d'armée total A = Army(A) × nombre_de_villes    Production d'armée total B = Army(B) × nombre_de_villes
Production d'or total A = Gold(A) × nombre_de_villes    Production d'or total B = Gold(B) × nombre_de_villes
```

#### Villes — Calculateur 3 : City Production

**Objectif :** afficher directement les stats de production d'une ou plusieurs villes à un niveau donné.

**Inputs :** niveau de la ville, ligue du joueur, nombre de villes
**Outputs :** Production d'armée, Production d'or, VP, Remparts (pour 1 ville, et totaux si nombre de villes > 1)
**Paramètres numériques :** calcul direct via les paramètres de formule (interne via `mathjs`, non exposé à l'admin), plus de table à consulter
**Statut des données :** ✅ **Les 6 ligues confirmées** (voir tableau récapitulatif plus bas).

#### Villes — Autres sous-outils identifiés sur MLCLord

~~*Max Troops Demo — calcul des troupes max pour les attaques de démonstration (Diamant League)*~~ → **✅ Résolu et déplacé sous la catégorie Combat** (pas Villes) : voir "Troupes maximum envoyées en attaque démo", section 7.1 Combat. Formule confirmée pour les 6 ligues.

#### Notes générales — multiplicateurs par ligue

**🚨 Ancienne hypothèse invalidée par observation directe en jeu.** Une table de multiplicateurs Coût/Remparts par ligue avait été extraite d'une source externe (non vérifiée) — elle donnait par exemple Bronze à ×0,704 (coût) et ×0,76 (remparts). **Ces valeurs sont fausses** : les observations en jeu du joueur montrent que VP, Remparts et Coût d'upgrade sont **identiques entre Bronze et Légende** (donc multiplicateur ×1, pas ×0,704/×0,76). Cohérent avec le principe déjà établi : les sources externes cèdent le pas face à l'observation directe en jeu.

**✅ État réel confirmé, par stat — nombre de ligues effectivement vérifiées, précisément :**

| Stat | Varie selon la ligue ? | Détail |
|---|---|---|
| VP | ❌ Non — universelle | Base=20, ratio=1,115 — **vérifiée sur les 6 ligues** (Bronze, Argent, Or, Platine, Diamant, Légende), toutes cohérentes à <1% |
| Remparts | ❌ Non — universelle | Base=70, ratio=1,2 — vérifiée sur **3 ligues** (Bronze, Diamant, Légende), dont un test à un niveau élevé (143, écart <1%) |
| Coût d'upgrade | ❌ Non — universelle | Base=10, ratio=1,2 — vérifiée sur **2 ligues** (Bronze, Légende) |
| Production d'armée | ✅ Oui — varie | Multiplicateur × VP, **confirmé sur les 6 ligues** (voir tableau ci-dessous) |
| Production d'or | ✅ Oui — varie | Multiplicateur × VP, **confirmé sur les 6 ligues** (voir tableau ci-dessous) |

**⚠️ Prudence méthodologique nuancée :** VP est solidement confirmée universelle (6/6 ligues, écart maximal <1% même à un niveau élevé comme 143). Remparts et Coût d'upgrade sont testés sur moins de ligues (respectivement 3 et 2) — l'hypothèse qu'ils suivent le même schéma universel que VP est **raisonnable mais pas prouvée avec la même exhaustivité**. Si l'occasion se présente de vérifier Remparts ou Coût sur Argent/Or/Platine, ça finirait de verrouiller complètement ces 2 stats.

**Multiplicateurs Army/Gold — ✅ table complète, les 6 ligues confirmées :**

| Ligue | Multiplicateur Army (×VP) | Multiplicateur Gold (×VP) |
|---|---|---|
| Bronze | 2 | 5 |
| Argent | **2,25** *(9/4)* | **6,25** *(25/4)* |
| Or | 2,75 *(11/4)* | 8,75 *(35/4)* |
| Platine | 2,75 *(11/4)* | 8,75 *(35/4)* |
| Diamant | 3 | 10 |
| Légende | 3 | 10 |

**✅ Argent confirmé sur 2 points de données (niveaux 1 et 20), cohérents entre eux** — Army/VP = 2,250 et 2,247 ; Gold/VP = 6,250 et 6,253. Argent a ses **propres valeurs distinctes de Bronze** (infirme l'hypothèse de regroupement Bronze+Argent évoquée précédemment) — le vrai motif de regroupement observé est **Or+Platine ensemble** et **Diamant+Légende ensemble**, Bronze et Argent restant chacun isolés avec leurs propres valeurs.

**Toutes des fractions simples en quarts** : 2=8/4, 2,25=9/4, 2,75=11/4, 3=12/4 pour Army ; 5=20/4, 6,25=25/4, 8,75=35/4, 10=40/4 pour Gold — cohérent avec un système de jeu qui progresse par paliers de 0,25.

**✅ VP re-confirmé une nouvelle fois (5e/6e ligue testée)** — universel sur toutes les ligues observées à ce stade.

**💡 Observation notable :** Diamant et Légende partagent exactement les mêmes multiplicateurs (Army ×3, Gold ×10) — peut-être que les ligues hautes (Diamant/Légende) sont regroupées, tandis que les ligues basses (Bronze/Argent/Or/Platine) auraient leurs propres valeurs, potentiellement aussi partagées entre elles. **Hypothèse à vérifier, pas à assumer** — il faudra au moins une ligue basse supplémentaire (Argent/Or/Platine) pour savoir si elles se regroupent aussi entre elles ou si chacune est unique.

> ✅ **Confirmé** (déjà établi) : une note de patch officielle du jeu mentionne explicitement des ajustements de production **par ligue** ("Gold league: Troops/Armies production increased"), cohérent avec Army/Gold qui varient réellement — la partie "ajustement de remparts" mentionnée dans cette même note reste par contre à concilier avec l'observation "Remparts universel" ci-dessus (peut-être un ajustement historique depuis corrigé, ou concernant une autre mécanique que le remparts de base).
>
> **Décision d'architecture confirmée :** un jeu de paramètres par ligue reste le bon modèle (flexible si une future ligue s'avère différente sur VP/Remparts/Coût), mais **dans les faits actuels, Bronze et Légende partagent les mêmes valeurs pour 3 des 5 stats** — seuls Army et Gold ont vraiment besoin d'un multiplicateur distinct par ligue à ce stade.

**Conséquence sur le modèle de données :** confirmation du besoin de distinguer deux modes de stockage — paramètres numériques nommés (le cas général, voir section 6) vs `lookup_table` pour les tables de valeurs brutes quand aucune formule propre n'est identifiable :

```
data_type: 'formula_params' | 'lookup_table'
```

Pour `lookup_table`, l'admin éditerait directement la table de valeurs (import/édition ligne par ligne), avec en complément des `formula_params` classiques pour d'éventuels multiplicateurs de ligue.

#### Villes — Calculateur 4 : Production (fusion Production de Ville + Production totale + Récompenses)

**✅ Fusion actée par le joueur :** ce qui était initialement 3 calculateurs séparés (Production d'une ville, Production totale, Récompenses) a été regroupé en **un seul calculateur "Production"**, plus compact — les 3 sujets partagent le même besoin de base (nombre de villes, niveau) et sont fortement liés.

**Objectif :** afficher, à partir d'un même jeu d'inputs, la production **par ville**, la production **totale détaillée** (base / stuff / temple), et le **bonus de récompenses** reçues en heures de production.

**🚨 Révision majeure — séparation Compétences personnelles / Temple du clan :** on avait d'abord fait contribuer automatiquement le nombre de Templiers du joueur à sa propre production. **C'est faux** : les Templiers d'un joueur alimentent un **bonus de temple partagé par tout le clan** (base du temple + somme des Templiers de tous les membres), pas directement la production du joueur qui les possède. Exemple donné par le joueur : 15 Templiers Vitesse personnels contribuent 15% au temple Vitesse du clan, qui a par exemple une base de 50% + les contributions de tous les membres = 325% au total, appliqué à **tout le clan**.

**Conséquences :**
- Les **Templiers personnels** (section Paramètres du joueur) ne contribuent plus automatiquement à la production affichée — ils restent utiles uniquement pour le calculateur Templiers lui-même (coût d'upgrade, contribution qu'ils apportent au pool du clan)
- **Nouvelle entrée dans les Paramètres du joueur : "Bonus de temple"**, saisie **directement par le joueur** (pas calculable depuis ses seuls Templiers, puisque ça dépend de tout le clan) — 5 champs (Attaque/Défense/Or/Recruteur/Vitesse), avec un **minimum = base du temple sans aucun templier investi** :

| Stat | Bonus de base du temple (minimum) | Pas d'incrément (aligné sur le taux Templier) |
|---|---|---|
| Attaque | 20% | 0,25 |
| Défense | 30% | 0,25 |
| Or (Prospérité) | 30% | 0,5 |
| Recruteur | 30% | 0,5 |
| Vitesse | 50% | 1 |

**✅ Affichage compact et hiérarchique (révisé)** : plutôt que 3 colonnes au même niveau (Base / +Perso / +Temple), affichage type "dont" — le total en gros, puis le détail des contributions en dessous, sans signe "+" ni mention "perso"/"clan" redondante (juste "Stuff" et "Temple") :
```
💰 Or — Production totale : [total]
   Base : [base]   Stuff : [delta perso]   Temple : [delta temple]
⚔️ Troupes — Production totale : [total]
   Base : [base]   Stuff : [delta perso]   Temple : [delta temple]
VP total : [vp]
```

**Inputs (partagés par les 3 sous-sections) :**
- Nombre de villes
- Niveau moyen des villes
- **Ligue** — sélecteur dédié, vide par défaut, aligné automatiquement sur la ligue des Paramètres du joueur si définie (même comportement que Classement/Troupes attaque démo/Level Up, y compris au chargement initial — voir section 3.3 point 23)
- *(implicite, lu depuis les Paramètres du joueur en localStorage)* Compétences perso (Prosperous %, Recruiter %) et Bonus de temple (Or %, Recruteur %), séparément
- Heures de production Or reçues, heures de production Troupes reçues (pour la sous-section Récompenses)

**Outputs :**
- *Par ville* : VP, Remparts, Production d'or, Production d'armée (base, sans bonus)
- *Total* : VP total, Production d'or (Total / dont Base / dont Stuff / dont Temple), Production de troupes (idem)
- *Récompenses* : bonus Or obtenu, bonus Troupes obtenu

**Calculs :**
```
--- Par ville ---
VP = VP(niveau_moyen)   Remparts = Remparts(niveau_moyen)
Production d'or = Gold(niveau_moyen)   Production d'armée = Army(niveau_moyen)

--- Total ---
VP_total = nombre_de_villes × VP(niveau_moyen)

Prod_or_base = nombre_de_villes × Gold(niveau_moyen)
Delta_or_stuff = Prod_or_base × (Prosperous_perso% / 100)
Delta_or_temple = Prod_or_base × (Prosperous_temple% / 100)
Prod_or_total = Prod_or_base + Delta_or_stuff + Delta_or_temple

Prod_troupes_base = nombre_de_villes × Army(niveau_moyen)
Delta_troupes_stuff = Prod_troupes_base × (Recruiter_perso% / 100)
Delta_troupes_temple = Prod_troupes_base × (Recruiter_temple% / 100)
Prod_troupes_total = Prod_troupes_base + Delta_troupes_stuff + Delta_troupes_temple

--- Récompenses (basées sur la production de BASE, sans stuff ni temple) ---
Bonus_or = Prod_or_base × heures_recompense_or
Bonus_troupes = Prod_troupes_base × heures_recompense_troupes
```

**✅ Règle Récompenses confirmée par le joueur :** le calcul se base sur la **production de base totale des villes** (sans compétences perso ni temple) — pas la production boostée. Exemple donné : villes produisant un total de 1 or/h en troupes ; une récompense de 25h de production troupes donne 25 or de troupes supplémentaires (1 × 25).

**Paramètres numériques :** réutilise directement les formules/paramètres de la table "Niveaux de ville" (section 7.1 Villes), calcul interne via `mathjs` non exposé à l'admin.

**Statut : ✅ Calculateur entièrement spécifié.** Rien de nouveau à collecter pour la ligue Légende.

#### Classement — Calculateur 1 : Ranking

**✅ Objectif confirmé :** convertisseur position ↔ pourcentage de classement, avec un tableau de repères correspondant aux seuils de promotion/relégation de ligue.

**✅ Seuils repères par ligue — tous confirmés (pas un tableau universel fixe, chaque ligue a les siens) :**

| Ligue | Seuils repères (%) |
|---|---|
| Bronze | 1, 6, 25, 50, 75, 100 |
| Argent (Silver) | 1, 6, 15, 50, 75, 100 |
| Or (Gold) | 1, 6, 25, 50, 75, 100 |
| Platine | 1, 6, 15, 50, 75, 100 |
| Diamant | 1, 6, 25, 60, 100 |
| Légende | 1, 6, 25, 50, 60, 100 |

**Ordre d'affichage : croissant** (1% en premier, 100% en dernier) — pas décroissant comme documenté initialement.

**✅ Méthode confirmée par le joueur :** plutôt que de connaître le nombre total de joueurs par ligue (donnée non disponible), le joueur saisit **son pourcentage actuel ET son rang actuel** (deux valeurs corrélées connues), ce qui permet de déduire mathématiquement le nombre total de joueurs, puis de calculer le rang correspondant à chaque seuil repère **de sa ligue**.

**🚨 Correction de formule — le sens était inversé :** un petit pourcentage correspond à un "top X%" (peu de joueurs, près du rang 1), pas l'inverse. Confirmé par un exemple concret du joueur en Diamant : seuil 1% = 10 joueurs, seuil 6% = 65 joueurs (le nombre de joueurs augmente avec le pourcentage, donc plus le %age est grand, plus on descend dans le classement).

**Formules corrigées et vérifiées :**
```
Total_joueurs = Rang / (Pourcentage/100)

Pour chaque seuil repère P de la ligue sélectionnée :
Rang_au_seuil(P) = Total_joueurs × P/100
```

**Vérification avec l'exemple Diamant donné :** seuil 1% → Total déduit ≈ 1000 ; seuil 6% → Total déduit ≈ 1083 (cohérent, écart lié aux arrondis des valeurs entières données par le joueur).

**Inputs :** ligue (détermine les seuils affichés), pourcentage actuel du joueur, rang actuel du joueur
**Outputs :** nombre total de joueurs déduit, table des rangs correspondant à chaque seuil de pourcentage repère de la ligue choisie (ordre croissant), **colonnes affichées dans l'ordre Rang puis Seuil** (inversé par rapport à la première version)

**Paramètres numériques** pour le calcul (interne via `mathjs`, non exposé à l'admin), `lookup_table` pour les seuils par ligue (éditables en admin, cohérent avec le reste du site)

**Statut : ✅ Calculateur entièrement spécifié et complet — les 6 ligues ont leurs seuils et récompenses confirmés.**

**💡 Extension proposée par le joueur :** ajouter 2 colonnes au tableau — **Ligue cible** et **Récompenses obtenues** pour chaque seuil, puisque les seuils de classement déterminent les récompenses de fin de saison.

**✅ Données Légende confirmées par le joueur :**

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Maintien Légende | 7 gemmes |
| 6% | Maintien Légende | 5 gemmes |
| 25% | Maintien Légende | 4 gemmes |
| 50% | Maintien Légende | 4 gemmes |
| 60% | Maintien Légende | 3 gemmes |
| 100% | Descente Diamant | 3 gemmes |

**✅ Données Diamant confirmées par le joueur :**

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Légende | 6 gemmes |
| 6% | Montée Légende | 4 gemmes |
| 25% | Maintien Diamant | 2 gemmes |
| 60% | Maintien Diamant | 2 gemmes |
| 100% | Descente Platine | 1 gemme |

**✅ Données Argent confirmées par le joueur** (plusieurs types de récompenses simultanées : saphirs + accélérations de troupes + gemmes) :

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Or | 100 saphirs, 7 accélérations de troupes, 6 gemmes |
| 6% | Montée Or | 50 saphirs, 6 accélérations de troupes, 4 gemmes |
| 15% | Montée Or | 25 saphirs, 5 accélérations de troupes, 2 gemmes |
| 50% | Maintien Argent | 20 saphirs, 4 accélérations de troupes, 2 gemmes |
| 75% | Maintien Argent | 15 saphirs, 3 accélérations de troupes, 1 gemme |
| 100% | Maintien Argent | 10 saphirs, 2 accélérations de troupes, 1 gemme |

**✅ Données Bronze confirmées par le joueur** (particularité : **toujours "montée Argent" quel que soit le seuil** — cohérent, Bronze étant la ligue la plus basse, il n'y a pas de "descente" possible, seule la récompense varie selon le classement) :

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Argent | 50 saphirs, 6 accélérations de troupes, 6 gemmes |
| 6% | Montée Argent | 25 saphirs, 5 accélérations de troupes, 4 gemmes |
| 25% | Montée Argent | 20 saphirs, 4 accélérations de troupes, 2 gemmes |
| 50% | Montée Argent | 15 saphirs, 3 accélérations de troupes, 2 gemmes |
| 75% | Montée Argent | 10 saphirs, 2 accélérations de troupes, 1 gemme |
| 100% | Montée Argent | 5 saphirs, 1 accélération de troupes, 1 gemme |

**✅ Données Or confirmées par le joueur :**

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Platine | 6 gemmes |
| 6% | Montée Platine | 4 gemmes |
| 25% | Montée Platine | 2 gemmes |
| 50% | Maintien Or | 2 gemmes |
| 75% | Maintien Or | 1 gemme |
| 100% | Descente Argent | 1 gemme |

**✅ Données Platine confirmées par le joueur** — **🚨 correction du seuil manquant** : la liste des seuils Platine était incomplète, il manquait le seuil 75% (on avait 1,6,15,50,100 — c'est en réalité 1,6,15,50,**75**,100) :

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Diamant | 6 gemmes |
| 6% | Montée Diamant | 4 gemmes |
| 15% | Montée Diamant | 2 gemmes |
| 50% | Maintien Platine | 2 gemmes |
| 75% | Maintien Platine | 1 gemme |
| 100% | Descente Or | 1 gemme |

**📋 État des lieux complet par ligue (6 ligues au total) — ✅ TOUTES CONFIRMÉES, calculateur Classement entièrement complet :**

| Ligue | Seuils repères | Récompenses |
|---|---|---|
| Bronze | ✅ 1,6,25,50,75,100 | ✅ confirmées |
| Argent | ✅ 1,6,15,50,75,100 | ✅ confirmées |
| Or | ✅ 1,6,25,50,75,100 | ✅ confirmées |
| Platine | ✅ 1,6,15,50,75,100 | ✅ confirmées |
| Diamant | ✅ 1,6,25,60,100 | ✅ confirmées |
| Légende | ✅ 1,6,25,50,60,100 | ✅ confirmées |

**⚠️ Note :** la formule ne fonctionne pas si pourcentage = 0% (division par zéro) — cas limite à gérer si jamais rencontré.

#### 💡 Idée de nouveau référentiel — Level Up (progression par niveau de joueur, par ligue)

**Concept confirmé par le joueur — c'est un référentiel (table de données consultable), pas un calculateur avec input/output**, cohérent avec le pattern déjà utilisé pour Équipements de Combat/Expédition.

**Structure — XP et cycle de coffres sont universels, seules les troupes varient par ligue :**
- **Niveau** — XP nécessaire pour l'atteindre — **✅ formule confirmée, universelle** (identique sur les 6 ligues, voir plus bas)
- **Points de compétence gagnés** — 1 ou 2 selon la ligue — ✅ réutilise la règle déjà établie (voir juste en dessous)
- **Troupes gagnées** — ✅ formule verrouillée pour Légende, Diamant et Bronze (identique), ✅ verrouillée séparément pour Platine, ✅ verrouillée séparément pour Or — reste à vérifier pour Argent (voir plus bas)
- **Coffre/urne/jarre** — tous les 10 niveaux — ✅ cycle de récompenses confirmé universel sur les 6 ligues (voir plus bas), leur contenu exact ne sera pas structuré en donnée (couvert par le guide dédié, section 10)

**✅ Confirmé — "Level Up" = "niveau de Lord", même mécanique, pas de doublon.** Les points de compétence gagnés par niveau suivent exactement la règle déjà établie (section Compétences) : `Bronze/Argent/Or/Platine → +1 point/niveau`, `Diamant/Légende → +2 points/niveau`. Une seule table à maintenir pour cette donnée, réutilisée ici.

**✅ Formule verrouillée pour Légende, Diamant et Bronze (identique pour les trois) — régression sur 21 points de données (niveaux 1 à 160) pour Légende, écart maximal <0,4% ; confirmé sur 6 points supplémentaires (niveaux 101-106) pour Diamant, écart maximal 0,16% ; confirmé sur 17 points supplémentaires (niveaux 2-150) pour Bronze, écart maximal 0,81% (niveau 4, imputable à l'arrondi d'affichage sur les petites valeurs) :**

```
Troupes(n) = 32,2 × 1,245^n   (pour n ≥ 2) — Légende, Diamant ET Bronze, formule identique
Niveau 1 = 200 troupes (valeur de départ spéciale, hors progression géométrique — universelle, confirmée valable pour toutes les ligues)
```

**✅ Platine a sa propre formule, distincte — régression sur 6 points de données (niveaux 98-103) :**

```
Troupes(n) ≈ 35,88 × 1,237^n   (pour n ≥ 2) — Platine uniquement
```
Vérifié : forcer la formule Légende/Diamant sur les données Platine donne un écart de 70-78% (largement hors marge d'erreur) — confirme que ce n'est pas juste du bruit d'arrondi, Platine a réellement sa propre progression.

**✅ Or a lui aussi sa propre formule, distincte — régression sur 17 points de données (niveaux 2-108), écart maximal 0,26% (niveau 5) :**

```
Troupes(n) ≈ 32,49 × 1,24^n   (pour n ≥ 2) — Or uniquement
```

**🚨 Piège méthodologique identifié en validant ces données — à garder en tête pour toute future vérification de formule sur peu de points :** aux niveaux 2-6, la formule Or (32,49 × 1,24^n) donne des valeurs quasi identiques à la formule Légende/Diamant/Bronze (écart <2%, ex. niveau 6 : 118 réel vs 120 calculé avec la formule Légende) — un échantillon limité aux petits niveaux aurait donc pu laisser croire, à tort, qu'Or suit la même formule que Bronze/Diamant/Légende. L'écart ne devient flagrant qu'à partir de n≈50 (21% d'écart) et atteint 53% à n=108. **Le K et le ratio étant proches (32,2 vs 32,49 ; 1,245 vs 1,24), l'effet de composition exponentielle n'écarte les deux courbes qu'à mesure que n grandit** — ne jamais conclure à une formule identique entre deux ligues sur la seule base de niveaux bas.

**Table de vérification (échantillon, Légende/Diamant/Bronze — valeurs identiques sur les 3 ligues) :**

| Niveau | Troupes (réel, Légende/Diamant/Bronze) | Coffre/urne/jarre |
|---|---|---|
| 1 | 200 (valeur de départ) | — |
| 2 | 50 | — |
| 3 | 62 | — |
| 4 | 78 | — |
| 5 | 96 | — |
| 6 | 120 | — |
| 7 | 149 | — |
| 8 | 186 | — |
| 9 | 231 | — |
| 10 | 288 | Coffre |
| 20 | 2 580 | Urne |
| 30 | 23 100 | Coffret à bijoux |
| 40 | 206 000 | Jarre |
| 50 | 1,84M | Caisse |
| 60 | 16,5M | Coffre |
| 70 | 148M | Urne |
| 80 | 1,32G | Coffret à bijoux |
| 90 | 11,8G | Jarre |
| 100 | 106G | Caisse |
| 110 | 948G | Coffre |
| 120 | 8,49T | Urne |
| 130 | 75,9T | Coffret à bijoux |
| 140 | 679T | Jarre |
| 150 | 6,08P | Caisse |
| 160 | 54,4P | Coffre |

**Points de vérification Diamant (niveaux 101-106) :** 132G, 164G, 204G, 254G, 317G, 394G — cohérents avec la même formule que Légende.

**Points de vérification Platine (niveaux 98-103) :** 39,8G, 49,3G, 61G, 75,5G, 93,5G, 115G — formule propre à cette ligue.

**✅ Points de vérification Bronze (niveaux 2-150, 17 points) — confirmés par le joueur, identiques à la table Légende/Diamant ci-dessus** (niveaux 2 à 9 nouvellement obtenus : 50/62/78/96/120/149/186/231 ; niveaux 10-150 déjà connus via Légende, revérifiés cohérents pour Bronze).

**✅ Points de vérification Or (niveaux 2-6, 50-55, 103-108, 17 points) — formule propre, distincte :**
- Niveaux 2-6 : 50, 62, 77, 95, 118 (très proches de Légende à ce stade — voir piège méthodologique ci-dessus)
- Niveaux 50-55 : 1,52M / 1,89M / 2,34M / 2,9M / 3,60M / 4,47M
- Niveaux 103-108 : 136G / 169G / 209G / 259G / 322G / 399G

**✅ Formule d'XP requis par niveau — verrouillée, universelle (identique sur les 6 ligues) — régression sur 110 points de données consécutifs (niveaux 1 à 110), correspondance exacte 110/110 après arrondi entier, aucun écart résiduel :**

```
XP(n→n+1) = 50 × 1,3^(n-1)   (XP nécessaire pour passer du niveau n au niveau n+1)
```

Contrairement aux formules de troupes, cette formule **ne varie pas selon la ligue du joueur** — confirmé explicitement par le joueur. C'est la formule la plus propre confirmée sur ce projet à ce jour (aucune approximation, contrairement aux formules de troupes Or/Platine qui gardent un écart résiduel <0,3-0,4%).

**✅ Cycle des récompenses tous les 10 niveaux — confirmé universel, identique sur les 6 ligues.** Cycle de 5 se répétant tous les 50 niveaux :
```
Coffre → Urne → Coffret à bijoux → Jarre → Caisse → (répète)
```
Palier 10=Coffre, 20=Urne, 30=Coffret à bijoux, 40=Jarre, 50=Caisse, 60=Coffre, ... — motif exact sur les 16 paliers reçus (10 à 160) pour Légende, confirmé identique pour toutes les ligues (Bronze/Argent/Or/Platine/Diamant/Légende) par le joueur, aucune exception. **Seules les formules de troupes varient par ligue, pas le cycle de coffres.**

**💡 Motif de regroupement — 3 groupes de formules désormais confirmés, plus aucun ne suit le motif Villes.** Légende+Diamant+Bronze partagent une formule ; Platine et Or ont chacun la leur, proches en apparence mais distinctes (voir piège méthodologique ci-dessus). Aucun de ces regroupements ne correspond au motif observé sur Army/Gold des Villes (Or+Platine ensemble, Diamant+Légende ensemble, Bronze et Argent isolés) — **les deux mécaniques ont des logiques de regroupement indépendantes, ne pas présumer de l'une à partir de l'autre.** Reste à voir où se situe Argent — 4ᵉ groupe potentiel, ou rattaché à l'un des trois déjà connus, aucune hypothèse à faire avant d'avoir des données.

**⚠️ Reste à obtenir :**
- Argent — aucune donnée de troupes Level Up reçue pour l'instant (seule donnée manquante pour ce référentiel : XP et cycle de coffres sont déjà universels, donc déjà connus pour Argent aussi)

**✅ Décidé : le contenu exact des coffres/urnes/jarres/coffrets/caisses ne sera pas structuré comme donnée de calculateur/référentiel** — couvert plutôt dans le contenu du guide Level Up (rédaction via ChatGPT), pas dans cette table.


#### 🚨 Taux de gain d'XP et Troupes attaque démo — catégorie Combat, pas Classement

**Décidé (question posée par le joueur, tranchée) :** ces deux calculateurs ci-dessous appartiennent à la catégorie **Combat**, pas Classement — ce sont fondamentalement des mécaniques d'attaque, pas de position au classement. Combat n'était jusque-là qu'une catégorie vide (Level Up, Fight, Enemy Troops non spécifiés) — ces deux simulateurs en sont désormais le premier contenu concret.

#### ✅ Taux de gain d'XP en combat — formule et seuils confirmés

**Formule confirmée par le joueur :** le taux de gain d'XP dépend du **ratio VP de la cible / VP de l'attaquant**, exprimé en pourcentage.

```
ratio = VP_cible / VP_attaquant × 100
```

| Ratio (VP cible / VP attaquant) | Taux de gain d'XP |
|---|---|
| < 40% | 0% |
| 40% – 50% | 50% |
| 50% – 150% | 100% (normal) |
| 150% – 200% | 150% |
| > 200% | 200% |

*(Seuils vérifiés cohérents : aucun trou ni chevauchement entre les paliers.)*

**✅ UI implémentée dans le prototype — un seul champ de saisie, sortie en tableau (pas un calcul ponctuel à 2 champs) :**
- Sélecteur de mode "Je suis l'attaquant" / "Je suis la cible"
- **Un seul champ : "Ma VP"** (avec sélecteur d'unité ×1/k/M/G/T)
- **Résultat : un tableau des 5 paliers fixes** (0/50/100/150/200%), affichant pour chacun la **plage de VP de l'adversaire** qui déclenche ce palier — pas un calcul ponctuel entre 2 VP saisies. Le joueur voit d'un coup d'œil toutes les tranches adverses possibles, plutôt que de tester une VP adverse à la fois.
- **Mode "Je suis l'attaquant"** : plage = `[palier_bas% × ma_VP, palier_haut% × ma_VP)`, calcul direct
- **Mode "Je suis la cible"** : relation **inversée** (mathématiquement : `VP_attaquant = ma_VP / (ratio/100)`), donc les plages affichées sont décroissantes quand le taux augmente (plus l'adversaire qui m'attaque est faible que moi, plus SON taux de gain est élevé) — vérifié par calcul, cohérent
- Pas de titre de section au-dessus du tableau (cohérent avec la décision de sobriété du texte)

Les deux modes réutilisent exactement la même table de paliers (`XP_RATE_TIERS`), seule la formule de conversion VP↔plage change selon le mode.

**Lien avec la mécanique "attaque démo" (voir aussi ci-dessous) :** une attaque contre un joueur **beaucoup plus faible en VP** est qualifiée d'"attaque démo" par le joueur — cohérent avec le palier "< 40% → 0% XP" ci-dessus (pas d'intérêt à XP-farmer un adversaire faible). **Reste à confirmer : le seuil de déclenchement de l'attaque démo est-il exactement ce même seuil de 40%, ou un seuil différent** propre à cette mécanique (plafond de troupes, vitesse réduite) ? Les deux mécaniques semblent liées conceptuellement mais leurs seuils ne sont pas encore prouvés identiques.

**Statut : formule/seuils du taux de gain d'XP ✅ verrouillés, UI ✅ prototypée.** Reste ouvert : les détails de l'attaque démo elle-même (voir section suivante), et la confirmation que son seuil de déclenchement correspond bien à ce même 40%.

#### ✅ Troupes maximum envoyées en "attaque démo" — formule confirmée

**Concept confirmé par le joueur :** une "attaque démo" (attaque contre un adversaire beaucoup plus faible en VP — probablement liée au seuil <40% du taux de gain d'XP ci-dessus, lien à confirmer) plafonne le nombre de troupes envoyées, **calculé à partir des Remparts de la ville visée** (voir formule Remparts déjà verrouillée, section 7.1 Villes : `Remparts(n) = 70 × 1,2^(n−1)`, universelle entre les ligues) et d'un **pourcentage qui dépend de la ligue de l'attaquant**.

**Formule confirmée :**
```
TroupesMax = (X% / 100) × Remparts(niveau_ville_visée)
```

**Pourcentage X selon la ligue de l'attaquant :**

| Ligue de l'attaquant | X (% des remparts) |
|---|---|
| Bronze | 100% |
| Argent | 50% |
| Or | 40% |
| Platine | 40% |
| Diamant | 30% |
| Légende | 30% |

**🚨 Hors périmètre du simulateur — vitesse d'attaque réduite.** Le joueur confirme que la vitesse d'attaque est aussi réduite lors d'une attaque démo, mais précise que c'est **une simple information, pas à intégrer dans le calcul du simulateur** — pas de valeur à chiffrer ni d'input/output prévu pour ça.

**Statut : formule ✅ verrouillée, prête à être spécifiée comme simulateur.** Seule zone d'ombre restante : confirmer si le seuil de déclenchement de l'attaque démo (VP cible < X% de la VP attaquant) correspond exactement au seuil <40% du taux de gain d'XP, ou s'il s'agit d'un seuil distinct — non bloquant pour construire ce calculateur, qui ne dépend que du niveau de ville visée et de la ligue de l'attaquant.

**✅ Décidé — on garde "Classement" comme nom de catégorie**, question de renommage tranchée, pas de renommage prévu. **⚠️ Précision (corrige une ambiguïté antérieure) : ce nom concerne uniquement Ranking.** Taux de gain d'XP et Troupes en attaque démo appartiennent à la catégorie **Combat** (voir décision explicite en tête de cette section), pas à Classement — Classement ne s'élargit pas avec eux.

#### Autres calculateurs existants à traiter ensuite
- **Combat** : Level Up, Fight, Enemy Troops (toujours non spécifiés) — **✅ mais Taux de gain d'XP et Troupes attaque démo sont désormais spécifiés et prototypés dans cette catégorie** (voir section 7.1, sous-section dédiée)
- **Classement** : Enemy Gain Factor, XP Given Rate

### 6.2 Nouveaux calculateurs à spécifier

#### 💡 Idée — Simulateur d'achat de consommables (mini-boutique)

**Objectif :** permettre au joueur de savoir combien de saphirs sont nécessaires pour acheter un ensemble de consommables souhaités.

**Concept d'interface :**
- Une liste d'objets disponibles à l'achat, chacun avec son **coût unitaire en saphirs**
- Un bouton "ajouter au panier" par objet, avec une **quantité** modifiable
- Pour chaque objet dans le panier : coût unitaire, coût total pour cet objet (unitaire × quantité)
- Un **total général du panier** en bas

**Catégorie :** pas encore assignée — ne rentre pas proprement dans Villes/Combat/Classement/Compétences/Référentiels tel quel. À trancher (peut-être une nouvelle catégorie "Boutique"/"Ressources", ou à rattacher à Villes comme Production/Récompenses).

**Reste à définir :**
- Liste des objets consommables disponibles et leurs coûts en saphirs (aucune donnée collectée pour l'instant)
- Est-ce que les prix varient selon la ligue (comme pour les gemmes) ?
- Faut-il gérer des réductions/paliers de quantité (ex: acheter en lot moins cher à l'unité) ?

### Catégorie "Compétences" — Compétences, Équipements, Gemmes, Templiers

*(Regroupées en une seule catégorie de calculateurs : gemmes socketées dans les équipements, les deux alimentant les mêmes stats de combat que les compétences — cohérent de les traiter ensemble.)*

#### 💡 Idée d'origine — Configuration du "stuff" du joueur (état final : résultat plus modeste que la vision initiale)

**Vision proposée initialement :** permettre au joueur de configurer entièrement son équipement une seule fois, et que cette configuration soit automatiquement réutilisée dans tous les calculateurs qui en ont besoin.

**✅ Ce qui a été réellement implémenté (voir "Simulateur de Stuff" plus bas pour le détail complet) :** un calculateur **dédié et autonome** (Simulateur de Stuff), pas un mécanisme transverse à tous les calculateurs. Il reste dans sa propre catégorie (Compétences), stocké en localStorage, mais **n'alimente pas automatiquement** les autres calculateurs (Production, City Cost...) — ceux-ci continuent de lire les valeurs saisies manuellement dans "Statistiques données par l'équipement" (Paramètres du joueur), qui reste indépendant. Le joueur reporte manuellement s'il le souhaite.

**Raison de cet écart avec la vision initiale :** au fil des itérations, le Simulateur de Stuff est devenu un outil substantiel avec sa propre complexité (4 blocs, catalogues mixtes, liste blanche de compétences par famille) — le relier automatiquement à "Statistiques données par l'équipement" aurait ajouté une couche de synchronisation complexe non demandée explicitement. Le lien reste possible comme évolution future si besoin.

#### Templiers — Calculateur (déplacé depuis Production, concerne les stats du joueur)

**✅ Table de coût exacte — confirmée par le joueur, niveaux 0 à 20 (max), aucun arrondi (table brute plutôt que formule approximative) :**

| Niveau | Coût pour ce niveau | Coût cumulé | Niveau | Coût pour ce niveau | Coût cumulé |
|---|---|---|---|---|---|
| 0 | 150 | 150 | 11 | 2 688 | 11 150 |
| 1 | 195 | 345 | 12 | 3 495 | 14 645 |
| 2 | 254 | 599 | 13 | 4 543 | 19 188 |
| 3 | 330 | 929 | 14 | 5 907 | 25 095 |
| 4 | 428 | 1 357 | 15 | 7 678 | 32 773 |
| 5 | 557 | 1 914 | 16 | 9 981 | 42 754 |
| 6 | 724 | 2 638 | 17 | 12 976 | 55 730 |
| 7 | 941 | 3 579 | 18 | 16 868 | 72 598 |
| 8 | 1 224 | 4 803 | 19 | 21 929 | 94 527 |
| 9 | 1 591 | 6 394 | 20 | 28 507 | 123 034 |
| 10 | 2 068 | 8 462 | | | |

**Type de calculateur : `lookup_table`** (pas `advanced`/formule) — le joueur veut la précision exacte de la table plutôt qu'une formule approximative (`150 × 1.3^niveau` colle à moins de 1 unité près, mais la table brute est préférée ici puisque le nombre de niveaux est limité — max 20).

**✅ Correction structurelle importante — confirmée par le joueur :** il n'y a **pas un seul "niveau de Templier" partagé**, mais **5 types de Templiers indépendants**, un par stat (Attaque, Def, Recruteur, Speed, Or) — chacun avec son propre **nombre** (pas "niveau"), de 0 à 20. Le joueur peut par exemple avoir 10 Templiers Attaque, 5 Or, 15 Speed, indépendamment les uns des autres.

**✅ Nombre de Templiers maximum confirmé : 20 (par type).**

**✅ Nom de la ressource — confirmé par le joueur :** "**Skydust**" en anglais, "**Pouciel**" en français.

**✅ Bonus par Templier — confirmé par le joueur, linéaire, 5 stats concernées :**

| Stat | Bonus par Templier de ce type |
|---|---|
| Attaque (Striker) | +0,25% |
| Def (Guardian) | +0,25% |
| Recruteur (Recruiter) | +0,5% |
| Speed (Rusher) | +1% |
| Or (Prosperous) | +0,5% |

**🔗 Point de cohérence important :** ces 5 stats sont **exactement les mêmes** que celles qu'on avait provisoirement appelées "bonus de temple (clan)" dans les Paramètres du joueur du prototype — il s'agit bien du **même mécanisme : les Templiers**, pas d'un bâtiment de clan séparé. **Confirmé par le joueur : les Templiers concernent les stats du joueur, pas la production de villes** — d'où le déplacement de ce calculateur vers la catégorie Compétences plutôt que Production. **✅ Décidé : dans le prototype, 5 champs indépendants "Nombre de Templiers [Attaque/Def/Recruteur/Speed/Or]" (0-20 chacun)**, chaque bonus se calculant via `nombre_de_ce_type × taux_de_cette_stat`.

**✅ Formule confirmée — remplace la table de coût comme donnée officielle du calculateur (simplification actée par le joueur) :**
```
Coût(n) = arrondi(150 × 1,3^(n−1))
```
où `n` = niveau/nombre du Templier concerné (1 à 20). Base = 150 Pouciel pour le 1er Templier, multiplicateur = ×1,3 par palier — **2 paramètres nommés** (`base`, `ratio`) au lieu d'une table à 21 lignes, cohérent avec le modèle admin "paramètres numériques nommés" déjà acté (section 6).

**Vérifiée par le joueur contre la table exacte : correspond sur 20 des 21 valeurs, un seul écart d'arrondi d'1 unité au niveau 15 (5906 calculé vs 5907 réel)** — écart jugé négligeable, la formule est adoptée.

**Table complète conservée ci-dessous pour référence/vérification** (valeurs réellement observées en jeu, servent aussi de jeu de test pour valider l'implémentation de la formule) :

| Niveau | Coût (Pouciel) | Niveau | Coût (Pouciel) |
|---|---|---|---|
| 1 | 150 | 12 | 2688 |
| 2 | 195 | 13 | 3495 |
| 3 | 254 | 14 | 4543 |
| 4 | 330 | 15 | 5907 |
| 5 | 428 | 16 | 7678 |
| 6 | 557 | 17 | 9981 |
| 7 | 724 | 18 | 12976 |
| 8 | 941 | 19 | 16868 |
| 9 | 1224 | 20 | 21929 |
| 10 | 1591 | 21 | 28507 |
| 11 | 2068 | | |

**✅ Confirmé par le joueur : la même formule (base 150, ratio 1,3) s'applique aux 5 types de Templiers indifféremment** (Attaque, Défense, Or, Recruteur, Vitesse) — un seul jeu de paramètres suffit, pas besoin de 5 formules distinctes en admin.

**Inputs (calculateur Templar) :** type de Templier (Attaque/Def/Recruteur/Speed/Or), nombre de départ, nombre cible
**Outputs :** coût total en Skydust/Pouciel, bonus gagné pour la stat concernée

**💡 Idée à trancher :** une table de référence globale des infos Templier (comme celle ci-dessus) pourrait être affichée directement sur la page du calculateur (donnée de consultation à côté du calcul), plutôt que dans un guide narratif — recommandation à valider avec toi, mais pas bloquant.

**Statut : ✅ Calculateur entièrement spécifié.**

#### Compétences (Skill Points) — confirmé via wiki officiel
Source : million-lords.fandom.com/wiki/Skill_Points

10 compétences (confirmées par le joueur — noms FR entre parenthèses) :

| Compétence | Base | Bonus / point | Plafond | Prérequis | Effet |
|---|---|---|---|---|---|
| Prosperous (Prospérité) | 0% (toutes ligues) | +3% | pas de max | aucun | Production d'or |
| Cautious (Récup) | 0% (toutes ligues) | +1% | 50% | 10 points Prosperous (Prospérité) | Récupère % de l'or investi dans une ville perdue |
| Scavenger (Charognard) | 0% (toutes ligues) | +2% | pas de max | 5 points Striker (Attaque) | Or généré par troupe ennemie tuée en attaque |
| Salvager (Salva / Recycleur) | 0% (toutes ligues) | +1% | pas de max | 5 points Guardian (Def) | Or généré par troupe ennemie tuée en défense |
| Recruiter (Recruteur) | 0% (toutes ligues) | +3% | pas de max | aucun | Production de troupes |
| Rusher (Speed) | 0% (toutes ligues) | +5% | pas de max | 10 points Recruiter (Recruteur) | Bonus de vitesse des armées |
| Fearless (Intrépide) | Bronze/Argent : 50% · Or : 33% · Platine/Diamant/Légende : 1% | +1% | 75% (Légende) / 90% (Bronze→Diamant) | 5 points Recruiter (Recruteur) **OU** 5 points Striker (Attaque) | Survie des troupes en attaque |
| Brave (Bravoure) | Bronze/Argent : 50% · Or : 33% · Platine/Diamant/Légende : 1% | +1% | 75% (Légende) / 90% (Bronze→Diamant) | 5 points Guardian (Def) **OU** 5 points Recruiter (Recruteur) | Survie des troupes en défense |
| Striker (Attaque) | 0% (toutes ligues) | +2% | pas de max | aucun | Bonus combat en attaque |
| Guardian (Def) | 0% (toutes ligues) | +3% | pas de max | aucun | Bonus combat en défense |

**Tous les taux, plafonds et prérequis ci-dessus sont confirmés par le joueur, valables dans toutes les ligues (sauf la colonne Base, spécifique par ligue pour Fearless/Brave).**

**Points confirmés :**
- Points obtenus en montant de niveau (Lord level) **ou en équipant des objets** ayant l'effet correspondant (bonus additionnel via équipement, séparé des points "purs")
- Exemple officiel donné pour Cautious : `Or récupéré = (Cautious% / 100) × Or investi`
- Exemple officiel donné pour Fearless : sur 40 000 troupes qui auraient dû être perdues, à 50% Fearless → 20 000 reviennent, 10 000 à l'hôpital (rachetables en saphirs), 10 000 perdues définitivement

✅ **Points de compétence par niveau — confirmé par le joueur (Platine confirmé également) :**
```
Bronze / Argent / Or / Platine   → +1 point par niveau de Lord
Diamant / Légende                 → +2 points par niveau de Lord
```
Le joueur commence au niveau 1 avec 0 point — le premier point est donc gagné en passant au **niveau 2**. Formule : `points_totaux(niveau, ligue) = (niveau − 1) × points_par_niveau(ligue)`.

✅ **Pas de plafond total de points sur une saison** — confirmé.

Pas de prérequis mentionné pour Prosperous, Recruiter, Striker, Guardian — probablement les compétences "racines" de l'arbre.

**Coût du reskill — hors périmètre du site, confirmé par le joueur** (pas besoin de le modéliser dans un calculateur), mais noté pour référence/contexte : 1 reskill gratuit par saison, puis 50 saphirs pour le suivant, +50 saphirs à chaque reskill supplémentaire dans la même saison (progression arithmétique) — alternative possible via un objet "réinitialisation de compétences".

#### Reskill full-prod — ✅ implémenté dans le calculateur Production (Villes)
Source : million-lords.fandom.com/wiki/Troops_Production

**✅ Résolu :** ajouté comme case dédiée dans le calculateur Production (catégorie Villes) — affiche la production d'or/troupes obtenue **si tous les points de compétence actuels du joueur** (déduits de son niveau et de sa ligue) étaient investis intégralement dans Prospérité (pour l'or) ou Recruteur (pour les troupes), sans plafond puisque ni l'un ni l'autre n'a de cap.

**Calcul :**
```
Points_totaux = (niveau − 1) × points_par_niveau(ligue)   [2 pour Diamant/Légende, 1 pour Bronze/Argent/Or]
Bonus_Prospérité_full = Points_totaux × 3%   (taux Prospérité, pas de plafond)
Bonus_Recruteur_full = Points_totaux × 3%    (taux Recruteur, pas de plafond)

Or_si_full_prosperité = Prod_or_base × (1 + Bonus_Prospérité_full / 100)
Troupes_si_full_recruteur = Prod_troupes_base × (1 + Bonus_Recruteur_full / 100)
```
Calculé à partir de la **production de base** des villes (pas perso/temple), cohérent avec la logique déjà établie pour les Récompenses.

#### Système de répartition des points de compétence — ✅ implémenté dans les Paramètres du joueur

**✅ Décision d'architecture (révisée après plusieurs itérations) :** les Paramètres du joueur distinguent maintenant **2 blocs indépendants et séparés** pour les compétences, plutôt qu'un seul bloc fusionné :

1. **"Statistiques données par l'équipement"** — % directement saisi par le joueur, représentant sa stat totale réelle (points + bonus gemmes/équipement). C'est **cette valeur qui est utilisée par tous les calculateurs** (Production, City Cost...) via `getPersonalSkill()`. Min 0% / max 90% pour Intrépide et Bravoure (cohérent avec leur plafond confirmé) ; pas de plafond pour les autres sauf Récupération (max 50%, déjà établi).
2. **"Points de compétence"** — outil de **planification indépendant**, qui ne modifie pas les valeurs du bloc 1. Le joueur y saisit combien de points il investit dans chaque compétence, et voit le % calculé en résultat (base par ligue + points × taux, plafonné). Sert à préparer une répartition avant de la reporter manuellement dans "Statistiques données par l'équipement" si besoin.

**Règles de calcul du bloc "Points de compétence" :**
```
Points_disponibles = (niveau − 1) × points_par_niveau(ligue)
%(compétence) = base_par_ligue(compétence) + points_investis × taux_par_point(compétence), plafonné si applicable
```

**✅ Contraintes de saisie confirmées et implémentées :**
- **Plafond global** : impossible d'allouer plus de points que le total disponible (la saisie se plafonne automatiquement au champ en cours de modification)
- **Auto-remplissage des prérequis** : investir un point dans une compétence à prérequis (ex: Charognard nécessite 5 points Attaque) remplit automatiquement la compétence prérequise au minimum requis
- **Cas limite** : si le budget de points restant ne suffit pas à satisfaire le prérequis, tous les points disponibles vont dans la compétence prérequise et **aucun point n'est alloué** à la compétence visée
- Un **bouton "Réinitialiser"** remet les 10 champs à 0 d'un coup

**Résumé visuel (bandeau replié) :** 2 lignes toujours visibles — ligne 1 : ligue/niveau/VP/templiers (avec couleurs distinctes par info) ; ligne 2 : les 10 compétences abrégées (Atq/Bra/Cha/Def/Int/Pro/Rec/Rup/Rcy/Vit) avec leur **valeur "Statistiques données par l'équipement" additionnée au "Points de compétence"** (plafonnée à 90% pour Bravoure/Intrépide même si la somme dépasse). Reste sur 2 lignes fixes (retour à la ligne autorisé sous 640px, sinon défilement horizontal discret).

#### Équipements — données complètes récupérées (source enrichie fournie par le joueur)

**✅ Résolu — pas de mécanisme de bonus par palier.** Le joueur confirme n'avoir jamais observé de bonus 3/6/9 pièces en jeu. **Ce mécanisme n'existe pas** — chaque pièce d'équipement apporte ses bonus indépendamment, pas d'effet de set supplémentaire à atteindre un certain nombre de pièces portées.

**5 raretés confirmées :**

| Rareté | Couleur | Emplacements gemmes | Pouciel à la destruction |
|---|---|---|---|
| Commun | Gris | 0 | 3 |
| Rare | Vert | 0 | 10 |
| Épique | Bleu | 1 | 30 |
| Mythique | Violet | 2 | 120 |
| Légendaire | Or | 3 | 160 |

**✅ 9 emplacements physiques d'équipement — confirmés :** Arme (type variable selon le set : marteau, arc, lance, hache, sabre, épée...), Bouclier, Ceinture, Anneau, Bracelet, Amulette, Casque, Gantelet, Bottes. Le "seulement 6 emplacements" observé initialement pour Épique/Rare/Commun était une donnée incomplète à la source, pas une vraie limitation du jeu (confirmé par des exemples concrets — Gantelet du Barbare en Commun, Gantelet du Chasseur en Rare).

**4 familles**, portant le nom de la compétence associée (confirmé par 2 sources indépendantes) : **Or** (Prosperous Set), **Troupes/Vitesse** (Recruiter Set), **Défense** (Guardian Set), **Attaque** (Striker Set).

**Données complètes (180 lignes : 5 raretés × 4 familles × 9 emplacements) sauvegardées dans `reference-data-equipment-sets.csv`** plutôt que reproduites intégralement ici — colonnes : rareté, nom du set, famille, pouciel à la destruction, emplacements gemmes autorisés, type d'emplacement (Arme/Bouclier/.../Bottes), nom de l'objet (rempli seulement pour les armes, ex: "Marteau"), et jusqu'à 4 compétences avec leur % associé. **10 sets (30 lignes) ont leurs valeurs encore explicitement vides** (`skill_1: "Inconnu"`) — voir tableau plus bas, pas de données inventées.

**⚠️ Fiabilité des sources externes (MLCLord, wiki)** : plusieurs désaccords ont été observés entre ces sources et les observations en jeu du joueur au fil de la collecte de données (ex: valeurs par emplacement différentes de ce qui était initialement extrait). **Les observations directes du joueur priment systématiquement sur les sources externes en cas de désaccord** (cohérent avec le principe déjà établi pour les données Villes).

**✅ Confirmé — sets Légendaires bien uniformes.** Le joueur confirme en jeu : pour les 4 sets Légendaires (Spirit Fulgur, Spirit Zephyr, Spirit Vanna, Spirit Fyra), les 9 emplacements donnent effectivement des valeurs identiques entre eux. Ce n'est pas une erreur de source — c'est une vraie particularité du palier Légendaire, à l'inverse des autres raretés où chaque emplacement varie individuellement.

**✅ 7 sets nouvellement confirmés par le joueur (Casque/Gantelet/Bottes partagent les mêmes valeurs au sein d'un même set — motif à part, différent du reste de la table où chaque emplacement varie individuellement) :**

| Rareté | Set (famille) | Casque = Gantelet = Bottes |
|---|---|---|
| Commun | Barbarian (Attaque) *(déjà connu, reconfirmé)* | Attaque 2% |
| Commun | Bard (Troupes/Vitesse) | Bravoure 2% |
| Commun | Journeyman (Défense) | Bravoure 2% |
| Commun | Thief (Or) | Récupération 2% |
| Rare | Adventurer (Défense) | Bravoure 4%, Défense 3% |
| Rare | Hunter (Troupes/Vitesse) *(déjà connu, reconfirmé)* | Bravoure 4%, Recruteur 3% |
| Épique | Knight (Défense) | Bravoure 6%, Défense 6%, Recycleur 1% |

*(Barbarian et Hunter n'étaient pas dans la liste des 30 lignes manquantes — leurs stats étaient déjà connues, le joueur les a redonnées en même temps, ça reconfirme les valeurs existantes.)*

**⚠️ 15 lignes encore manquantes (5 sets Rare/Épique)** — leur groupe Casque/Gantelet/Bottes n'a aucune valeur connue :

| Rareté | Sets concernés |
|---|---|
| Rare | Smuggler (Or), Soldier (Attaque) |
| Épique | Royal Archer (Troupes/Vitesse), Royal Guard (Attaque), Shopkeeper (Or) |

**🚨 À reporter manuellement dans `reference-data-equipment-sets.csv`** — ce fichier CSV externe n'est pas dans le contexte de cette session, les 7 lignes confirmées ci-dessus doivent y être recopiées séparément (21 lignes au total : 7 sets × 3 emplacements).

**✅ Formule confirmée, motif propre découvert — remplace les estimations précédentes.**

**Formule :**
```
Coût_Pouciel(rareté, n) = K(rareté) × 2^(n−1)
```
où `n` = niveau d'étoile **de départ** de l'objet à améliorer.

**K(rareté) suit un simple doublement à chaque palier de rareté — ✅ formule entièrement confirmée, 5 raretés sur 5 :**

| Rareté | K (Pouciel) | Statut |
|---|---|---|
| Commun | **20** | ✅ Exact (donnée joueur, transition 1★→2★) |
| Rare | **40** | ✅ Exact (donnée joueur, transition 1★→2★) |
| Épique | **80** | ✅ Exact (donnée joueur, transition 1★→2★) |
| Mythique | **160** | ✅ Exact (donnée joueur, transition 1★→2★) |
| Légendaire | **320** | ✅ Exact (donnée joueur, transition 1★→2★) |

**Formule finale, entièrement verrouillée :**
```
Coût_Pouciel(rareté, n) = K(rareté) × 2^(n−1)
K(rareté) = 20 × 2^index_rareté   [Commun=0, Rare=1, Épique=2, Mythique=3, Légendaire=4]
```

**🚨 Rappel — les anciennes estimations Mythique/Légendaire (issues des paliers 5★/6★, explicitement qualifiées d'approximatives par le joueur) sont invalidées et ne doivent plus être utilisées.** Elles donnaient K(Mythique)≈320 et K(Légendaire)≈637,5 — systématiquement le double des vraies valeurs, désormais toutes confirmées exactes ci-dessus.

**Prochaine étape concrète — à vérifier en jeu :**
1. Les noms des sets (Spirit Fulgur, Shark, Shopkeeper...) correspondent-ils à ce que tu vois dans ton inventaire ?
2. Les 30 lignes manquantes (tableau ci-dessus), si tu croises ces équipements

#### ✅ Simulateur de Stuff — implémenté, structure finale

**4 blocs affichés côte à côte sur PC / empilés sur mobile**, dans l'ordre : **Attaque, Défense, Or, Vitesse.** Chaque bloc a 3 colonnes toujours visibles (pas de repli/dépli) : grille 3×3 d'emplacements à gauche, panneau de configuration au centre (se remplit au clic sur un emplacement, un 2e clic sur le même emplacement le referme), résumé de stats à droite (encarts empilés, 2 colonnes).

**Grille 3×3, ordre des emplacements :**
```
Amulette   Casque    Bracelet
Anneau     Ceinture  Gantelet
Arme       Bottes    Bouclier
```

**Catalogues d'équipement mixtes par bloc (confirmé par le joueur) :**

| Bloc | Familles d'équipement sélectionnables |
|---|---|
| Attaque | Attaque uniquement |
| Défense | **Défense + Or** (mixte) |
| Or | **Or + Troupes/Vitesse** (mixte) |
| Vitesse | Troupes/Vitesse uniquement |

Les équipements du sélecteur sont triés par rareté décroissante (Légendaire → Commun), libellé `Rareté — Nom du set (Famille)` pour lever toute ambiguïté sur les catalogues mixtes.

**🚨 Liste blanche des compétences réellement comptabilisées — la question ouverte "un emplacement est-il libre de recevoir n'importe quelle famille" est résolue : non, seules certaines compétences comptent selon le bloc ET la famille réelle de l'objet équipé, même pour les objets de la famille "native" du bloc :**

| Bloc | Compétences comptabilisées, par famille d'origine de l'objet |
|---|---|
| Attaque | Attaque (natif) : Attaque, Charognard, Intrépide — tout compte |
| Défense | Défense (natif) : Bravoure, Défense, Recycleur — tout compte · Or (secondaire) : **seulement** Recycleur, Récupération |
| **Or** | Or (natif) : **seulement Prospérité** · Troupes/Vitesse (secondaire) : **seulement Recruteur** |
| Vitesse | Troupes/Vitesse (natif, seule famille du bloc) : **seulement Vitesse** |

Cette liste blanche s'applique de façon identique à 3 endroits : le calcul des totaux par bloc, le calcul des stats d'un emplacement individuel, et les options proposées dans le sélecteur de compétence des gemmes (pas d'option pour une compétence qui ne compterait pas de toute façon).

**Résumé par bloc :** encarts empilés (grille 2 colonnes), un par compétence avec valeur > 0, format `+1400%`. Si un emplacement est sélectionné, la contribution de cet emplacement seul s'affiche entre parenthèses en violet à côté du total : `+1400% (60%)`.

**Récapitulatif global** en haut de page, au-dessus des 4 blocs : agrège les contributions des 4 familles combinées (une compétence qui reçoit des contributions de plusieurs blocs — via les catalogues mixtes — voit ses valeurs s'additionner).

**Gemmes par emplacement :** nombre d'emplacements = selon la rareté de l'équipement choisi (0/1/2/3), chaque gemme avec sa propre compétence (restreinte à la liste blanche du bloc), son niveau d'étoile, et **sa propre ligue** (Bronze incluse ici — gemmes déjà possédées, pas un achat simulé, donc pas de restriction Bronze contrairement au calculateur Gemmes).

**Sauvegarde en localStorage**, cohérent avec l'architecture déjà actée pour les paramètres du joueur.

#### ✅ Comparateur de stuff — implémenté, même structure que le Simulateur

Compare 2 équipements (A et B) côte à côte : même famille/bloc et même emplacement obligatoires pour les deux, **catalogue mixte identique au Simulateur de Stuff** (mêmes 4 blocs, même liste blanche de compétences).

**Sélection d'un équipement précis, pas juste une rareté :** puisque plusieurs sets peuvent partager le même (bloc, emplacement, rareté) dans un catalogue mixte (ex: Casque Épique = "Shopkeeper" en Or OU "Royal Archer" en Troupes/Vitesse), chaque côté a un sélecteur explicite **"Rareté — Nom du set (Famille)"**, pas juste un sélecteur de rareté — lève toute ambiguïté sur quel set exact est comparé.

**Par côté (A et B) :** sélecteur d'équipement (set exact), niveau d'étoile, gemmes selon la rareté de l'objet choisi (compétence restreinte à la liste blanche du bloc, niveau d'étoile, ligue par gemme).

**Résultat :** tableau compétence par compétence (uniquement celles de la liste blanche du bloc), valeur A, valeur B, différence colorée (vert si B > A, rouge si B < A).

#### ✅ Système de fusion des équipements — confirmé par le joueur

Les équipements suivent le **même principe de fusion binaire par étoiles que les gemmes** : 2 équipements 1★ identiques → 1 équipement 2★. **✅ Conditions de fusion confirmées explicitement** : les 2 exemplaires doivent être **identiques** — même rareté, même set, même emplacement, même niveau d'étoile.

**Cohérent avec la table déjà donnée** (5%/5%/15%/10% pour Spirit Fulgur, etc.) : ces valeurs correspondent vraisemblablement au palier **1★** de chaque équipement, avec un potentiel de montée en étoiles ensuite.

**✅ Confirmé par le joueur :** à chaque upgrade (fusion), les stats de base de l'équipement s'améliorent — donc bien les mêmes % de compétence qu'on suit déjà (pas un système de bonus séparé).

**❌ Infirmé par le joueur : la formule linéaire des gemmes (`Bonus(n★) = n × valeur_1★`, multiplicative) ne s'applique PAS aux équipements.**

**✅ Formule additive confirmée pour les 10 compétences — vérifiée sur 12 exemples indépendants, 3 raretés différentes. Complète.**
```
Valeur(n★) = Valeur(1★) + incrément(compétence) × (n − 1)
```
où l'incrément est une **constante propre à chaque compétence**, indépendante de l'équipement, de la rareté ou de l'emplacement :

| Compétence | Incrément par étoile |
|---|---|
| Attaque | +2 |
| Charognard | +2 |
| Intrépide | +2 |
| Bravoure | +2 |
| Recruteur | +3 |
| Prospérité | +3 |
| Défense | +3 |
| Vitesse | +5 |
| Recycleur | +1 |
| Récupération | +1 |

**Preuve de cohérence (12 points de données, 3 raretés) :**

| Équipement | Rareté | Compétence(s) | Détail | Incrément déduit |
|---|---|---|---|---|
| Bague du Barbare | Commun | Charognard | 1★=2% → 2★=4% | +2 |
| Casque/Gantelet/Bottes du Barbare | Commun | Intrépide *(2ᵉ correction — 1ʳᵉ correction "Attaque" elle-même erronée, Intrépide reconfirmé directement en jeu)* | 1★=2%, identique sur les 3 emplacements | — |
| Gantelet du Chasseur | Rare | **~~Intrépide~~ → Bravoure** *(corrigé, voir note ci-dessous)* | 1★=4% → 2★=6% | +2 |
| Bottes du Chasseur | Rare | Bravoure + Recruteur | 4% + 3% *(revérifié directement en jeu)* | — |
| Gantelet du Chasseur | Rare | Recruteur | 1★=3% → 2★=6% | +3 |
| Amulette (Spirit Fyra) | Légendaire | Attaque/Charognard/Intrépide | 1★=10% → 5★=18% | +2 |
| Équipement (Spirit Zephyr) | Légendaire | Vitesse/Intrépide/Bravoure/Recruteur | 5★→6★ : 45→50 / 18→20 / 18→20 / 27→30% | +5 / +2 / +2 / +3 |
| Équipement (Spirit Fulgur) | Légendaire | Prospérité/Recycleur/Charognard/Récupération | 5★→6★ : 27→30 / 9→10 / 18→20 / 9→10% | +3 / +1 / +2 / +1 |
| **Équipement (Spirit Vanna)** | **Légendaire** | **Défense/Bravoure/Recycleur** | **1★=15/10/5% → 5★=27/18/9%** | **+3 / +2 / +1** |

**🚨 Correction de données historiques — deux allers-retours sur le Barbare, une seule correction pour le Chasseur, tous deux désormais stabilisés après revérification directe en jeu.**

**✅ Nouvelle règle confirmée — nombre de compétences par pièce dépend de la rareté :** Commun = 1 compétence, Rare = 2 compétences, Épique = 3 compétences (Mythique/Légendaire non génériquement vérifiés sur ce point précis — les exemples Légendaire ci-dessus montrent 3 ou 4 compétences selon la pièce, donc pas une règle aussi stricte à ce palier, ou alors une exception à creuser). Casque/Gantelet/Bottes du Barbare (Commun) n'ont qu'**une seule** compétence chacun (**Intrépide 2%**, valeur finale) ; Gantelet/Bottes du Chasseur (Rare) en ont **deux** chacun (Bravoure 4% + Recruteur 3%).

Chaque nouvel exemple reconfirme des incréments déjà déduits (Bravoure et Recycleur revérifiés une nouvelle fois) tout en complétant les compétences manquantes — **les 10 compétences ont maintenant chacune au moins une confirmation indépendante.**

**⏳ Reste à vérifier (non bloquant, la formule est fiable) :**
- ~~Le coût en gemmes de base double-t-il aussi à chaque étoile (`2^(n−1)`) comme pour les gemmes~~ → **✅ Confirmé : oui**, le coût de fusion en Pouciel suit exactement ce même principe (`Coût = K(rareté) × 2^(n−1)`, formule entièrement verrouillée sur les 5 raretés, voir plus haut dans cette section).
- ~~Y a-t-il un palier d'étoile maximum pour les équipements~~ → **✅ Confirmé : oui, 8★ maximum, pour les équipements de combat ET d'expédition.**

**✅ Précision sur le catalogue du bloc Défense (Simulateur de Stuff) — confirmée par le joueur :** le bloc Défense doit aussi permettre de choisir des équipements de la famille **Or**, car ceux-ci donnent Recycleur (Salvager) et Récupération (Cautious), deux compétences thématiquement liées à la défense (Salvager = or généré par troupe ennemie tuée **en défense**). Même principe que le bloc Or qui accepte déjà Or+Troupes/Vitesse — **le bloc Défense accepte donc Défense+Or**, catalogue mixte comme le bloc Or.

**Conséquence sur le modèle de données :** la mécanique de fusion (2→1 par étoile) reste la même que les gemmes, mais la **formule de bonus est additive** (pas multiplicative) — le calculateur Équipements ne pourra pas réutiliser la logique du calculateur Gemmes, il faudra une formule dédiée par compétence (`base + incrément × (n−1)`), désormais entièrement connue.

#### Équipement d'Expédition — système distinct de l'équipement de combat

**⚠️ Important : c'est un système séparé**, avec ses propres emplacements, sa propre monnaie et ses propres stats — à ne pas mélanger avec l'équipement de combat déjà documenté ci-dessus, même si la structure générale (5 raretés, fusion par étoiles) est similaire.

**✅ 6 emplacements physiques confirmés :** Cape, Longue-vue, Sacoche (à herbes), Boussole, Torche, Pioche.

**✅ Monnaie confirmée : Terradust** (même nom en français, confirmé par le joueur), obtenue en détruisant de l'équipement d'expédition, utilisée pour l'upgrade.

**✅ Fusion par étoiles confirmée, même principe que gemmes/équipement de combat :** 2 équipements d'expédition 1★ → 1 équipement 2★, etc.

**4 familles de sets** (différentes des familles combat) : **Or**, **Équipement** *(stat "Battle Gear" — augmente la chance d'obtenir de l'équipement de rareté supérieure)*, **Consommables**, **Troupes**.

**⚠️ Collision de noms à anticiper pour l'UI :** certaines stats d'expédition portent des noms proches ou identiques à des compétences de combat déjà définies (ex: "Speed/Vitesse" existe des deux côtés, "Recovery/Récupération" aussi) **mais ce sont des systèmes totalement différents** — il faudra bien les distinguer visuellement dans l'interface (ex: badge "Expédition" vs "Combat", ou préfixes/couleurs différents) pour éviter toute confusion pour le joueur.

**Glossaire des stats d'expédition (10 stats, différentes des 10 compétences de combat) :**

| Stat | Effet |
|---|---|
| Vitalité | Augmente les PV max de l'explorateur |
| Récupération *(expédition)* | Augmente l'efficacité des potions |
| Esquive | Chance d'éviter les dégâts |
| Vitesse *(expédition)* | Augmente la fréquence des rencontres (jusqu'à 90%) |
| Chance | Augmente la chance d'obtenir du loot |
| Perception | Chance de dupliquer le dernier objet obtenu |
| Équipement | Augmente la chance d'obtenir de l'équipement de rareté supérieure |
| Consommables | Améliore les chances de trouver des consommables de valeur |
| Or | Augmente la chance d'obtenir de plus grosses récompenses Gold Hours |
| Troupes | Augmente la chance d'obtenir de plus grosses récompenses Troop Hours |

**Données complètes (120 lignes) sauvegardées dans `reference-data-expedition-equipment.csv`** : colonnes rareté, nom du set, famille, emplacement, % stat de type, stat secondaire + %.

**Pattern observé :**
- La stat de "type" (Or/Équipement/Consommables/Troupes) a la **même valeur sur les 6 emplacements** d'un même set — *(à vérifier en jeu ; côté équipement de combat, une hypothèse d'uniformité par groupe s'était d'abord révélée fausse avant qu'on trouve la vraie formule — donc prudence, ne pas supposer que ce pattern tient sans confirmation en jeu)*
- Or et Troupes partagent toujours la même valeur ; Équipement et Consommables partagent toujours une valeur plus faible
- La **stat secondaire disparaît en dessous d'Épique** (Rare et Commun n'ont que la stat de type, pas de stat secondaire liée à l'emplacement)

**✅ Première formule de progression par étoile confirmée pour l'expédition — additive, même principe que le combat :**

| Stat | Exemple | 1★ | 2★ | Incrément |
|---|---|---|---|---|
| Équipement (type) | Bouse d'herbe du Vagabond, Commun | 0,6% | 0,8% | +0,2 |
| Équipement (type) | Cape de l'Archéologue, Épique | 1,8% | 2% | +0,2 |
| Vitalité (secondaire) | Cape de l'Archéologue, Épique | 15% | 17,5% | +2,5 |

L'incrément Équipement (+0,2) est identique sur 2 raretés différentes (Commun et Épique) — même pattern que pour le combat où l'incrément dépend de la compétence, pas de la rareté/l'équipement. **Bonne indication que la même logique additive s'applique aux deux systèmes**, même si les 8 autres stats d'expédition restent à confirmer individuellement (Or, Consommables, Troupes en tant que stats de type ; Perception, Récupération, Vitesse, Esquive, Chance en tant que stats secondaires).

**Reste à définir :**
- Incréments des 8 stats d'expédition restantes (voir tableau ci-dessus pour les 2 déjà confirmées)
- Coût de fusion en Terradust par étoile
- Comment obtenir de l'équipement d'expédition (containers de conteneurs déjà mentionnés — Urne/Jarre — probablement un futur calculateur "valeur de conteneur" à envisager, cohérent avec ce que MLCLord propose déjà sous le nom "Chest Value")

#### 💡 Suggestion — Tableau dynamique Équipements (dimensions et filtres)

**✅ Emplacement confirmé (mis à jour) : catégorie "Référentiels"**, distincte de "Compétences" — les Référentiels regroupent les données consultables (Équipements de Combat, Équipement d'Expédition), séparées des vrais outils de calcul (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers) qui restent dans Compétences. Cette séparation a été actée après coup : au départ tout était mélangé dans une seule catégorie Compétences, le joueur a demandé à distinguer "outils de calcul" de "données de référence consultables".

**Filtres proposés :**
- **Rareté** (Commun / Rare / Épique / Mythique / Légendaire) — multi-sélection
- **Type** (Or / Troupes-Vitesse / Défense / Attaque) — multi-sélection
- Recherche libre par nom de set

**Colonnes du tableau :**
- Nom du set (+ rareté visuelle par couleur, cohérent avec le code couleur déjà établi Gris/Vert/Bleu/Violet/Or)
- Stats de base par compétence concernée
- Pouciel à la destruction
- Bonus de palier (3pc / 6pc / 9pc) — *(à vérifier en jeu, mécanisme pas encore confirmé — voir plus haut)*

**Fonctionnalité interactive suggérée (au-delà d'un simple tableau statique) :** un **sélecteur "pièces possédées" (0-9) par set**, qui met en surbrillance le palier de bonus actuellement actif (3/6/9) — ça transforme le tableau de référence en mini-calculateur, cohérent avec l'idée déjà actée de "configuration du stuff réutilisable" en localStorage. Simple à faire : pas besoin de filtre complexe, juste une colonne interactive en plus dans le même tableau.

#### 🎨 Palette de couleurs par compétence — décidée, à appliquer partout (UI Gemmes ET Compétences)

**🚨 Évolution prévue — remplacement progressif par de vraies images.** Le joueur va fournir des images réelles pour les gemmes (par compétence × ligue) et les équipements (Combat + Expédition), à terme utilisées à la place des couleurs/badges texte actuels dans : Simulateur de Stuff (cases d'emplacement), Comparateur de stuff, référentiels Équipements, et le calculateur Gemmes. **La palette de couleurs ci-dessous reste la référence tant que les images ne sont pas fournies/intégrées** — pas un remplacement immédiat.

**✅ Convention de nommage des fichiers gemmes, décidée :**
```
gemme-{competence-slug}-{ligue-slug}.png
```
Minuscules, sans accent, tirets. Exemple : `gemme-attaque-legendaire.png`. **Manifeste complet des 60 noms de fichiers attendus (10 compétences × 6 ligues) : voir section 11.**

**✅ Convention équipements — actée : `{famille-slug}-{rarete-slug}-{emplacement-slug}.webp`** (famille et rareté identifient un set de façon unique, pas besoin du nom exotique du set). Manifeste complet des 300 fichiers (180 Combat + 120 Expédition) généré : voir section 12.

**✅ Décidé :** chaque compétence a sa couleur propre, utilisée de façon cohérente partout où elle apparaît visuellement (gemmes sur le Simulateur de Stuff, badges de compétence, graphiques...) — distincte du code couleur de rareté (`--rarity-*`), qui reste réservé à l'équipement lui-même.

| Compétence | Couleur | Hex (référence) |
|---|---|---|
| Intrépide (Fearless) | Rose foncé / magenta | `#c2185b` |
| Bravoure (Brave) | Violet foncé | `#4a2c73` |
| Recycleur (Salvager) | Vert | `#2e7d32` |
| Prospérité (Prosperous) | Or | `#c9a04a` |
| Récupération (Cautious) | Or | `#c9a04a` |
| Charognard (Scavenger) | Orange cuivré | `#b5651d` |
| Recruteur (Recruiter) | Violet | `#7b4fa6` |
| Vitesse (Rusher) | Violet | `#9b59b6` *(nuance différente de Recruteur pour rester distinguable malgré la même famille de couleur)* |
| Attaque (Striker) | Rouge | `#c0392b` |
| Défense (Guardian) | Bleu | `#3a6ea8` |

**⚠️ Note :** Prospérité et Récupération partagent la même couleur (Or) — c'est voulu par le joueur, pas une erreur. Si ça pose un problème de lisibilité en pratique (ex: deux gemmes adjacentes de compétences différentes mais de même couleur), à remonter.

#### Gemmes — confirmé via wiki officiel
Source : million-lords.fandom.com/wiki/Gems

**Confirmé par le joueur — structure des types de gemmes :**
- **1 type de gemme par compétence** : les 10 compétences (Prosperous, Cautious, Scavenger, Salvager, Recruiter, Rusher, Fearless, Brave, Striker, Guardian) ont chacune leur gemme correspondante — confirme l'hypothèse précédente, plus besoin de vérifier
- **1 variante de gemme par ligue** : autant de types de gemmes que de ligues (Bronze/Argent/Or/Platine/Diamant/Légende), donc au total **10 compétences × 6 ligues = 60 types de gemmes de base** (avant fusion/étoiles)

**Confirmé (wiki officiel) :**
- Les gemmes s'équipent dans les emplacements (sockets) des équipements Bleu/Violet (Mythique)/Or (Légendaire)
- **Gemmes typées par restriction d'équipement** : ex. les gemmes Striker ne s'équipent que sur du gear offensif, les gemmes Salvager que sur du gear défensif
- **Gemmes liées à la ligue** : une gemme Bronze ne peut pas fusionner avec une gemme Argent — chaque ligue a son propre pool de gemmes avec bonus croissants
- **Système de fusion confirmé** : il faut **2 gemmes identiques** (même type, même niveau d'étoile, même ligue) pour en fusionner une plus forte prenant 1 seul emplacement (donc fusion binaire : 2→1, pas 3→1)
- **Acquisition** : achat en boutique (saphirs, dès Argent League, coût croissant avec la ligue), récompenses de fin de saison selon le rang, calendrier quotidien (dès Platine), événements

**Confirmé par le joueur — formule de bonus (linéaire) :**
```
Bonus(n★) = n × y%
```
où `n` = nombre d'étoiles de la gemme, et `y` = valeur de base en points de la gemme (différente par ligue).

**Confirmé par le joueur — coût en gemmes de base (exponentiel) :** chaque niveau d'étoile nécessite de fusionner 2 gemmes du niveau précédent (fusion binaire) :
```
GemmesRequises(n★) = 2^(n−1)
```
1★ = 1 gemme (pas de fusion) · 2★ = 2 gemmes · 3★ = 4 gemmes · 4★ = 8 gemmes · 5★ = 16 gemmes...

**Conséquence — rendement dégressif confirmé** : même si le bonus grandit linéairement (n×y%), le coût en gemmes de base double à chaque étoile. Le rendement par gemme investie (`Bonus(n★) / GemmesRequises(n★)`) diminue donc bien à mesure qu'on monte en étoiles — c'est cohérent avec l'intuition initiale de "gain dégressif à la fusion", simplement la dégressivité vient du **coût** plutôt que du bonus lui-même :

| Étoiles | Gemmes de base requises | Bonus | Rendement par gemme |
|---|---|---|---|
| 1★ | 1 | 1×y% | 1.000×y% |
| 2★ | 2 | 2×y% | 1.000×y% |
| 3★ | 4 | 3×y% | 0.750×y% |
| 4★ | 8 | 4×y% | 0.500×y% |
| 5★ | 16 | 5×y% | 0.312×y% |
| 6★ | 32 | 6×y% | 0.188×y% |

**Pas de plafond connu** au nombre d'étoiles/fusions — le joueur n'a pas connaissance d'un maximum.

**✅ Contrainte structurelle importante — confirmée par le joueur (corrige le modèle initial) :** la stat cible n'est **pas atteinte par une seule gemme**, mais répartie sur **plusieurs emplacements de gemmes** — un joueur peut équiper jusqu'à **9 équipements**, chacun avec **jusqu'à 3 emplacements de gemmes** (les meilleurs paliers uniquement), soit un maximum théorique de **27 gemmes dédiées à une même compétence**.

**✅ Catégories d'équipement — confirmées et entièrement spécifiées (résolu depuis).** Les équipements se répartissent en **4 familles** (Attaque, Défense, Or, Troupes/Vitesse), qui déterminent quels types de gemmes peuvent y être socketés — voir la **liste blanche complète par bloc/famille** (`SKILL_ALLOWLIST_BY_BLOCK`) dans la section Simulateur de Stuff. Le **total reste 9 équipements × 3 emplacements = 27 gemmes max** — les familles ne réduisent pas ce total, elles catégorisent juste quelles compétences de gemmes vont où.

**✅ Objectif du calculateur confirmé (révisé) :** à partir d'une **stat cible totale** souhaitée sur une compétence donnée et d'un **nombre d'emplacements disponibles** (jusqu'à 27), déterminer **le niveau d'étoile par gemme** nécessaire (en répartissant équitablement sur les emplacements disponibles) pour atteindre la cible, ainsi que le **nombre total de gemmes de base et le coût total en saphirs**.

**✅ Coût d'une gemme de base — confirmé par le joueur (corrigé) :**
```
Prix(ligue) = 3000 + 1000 × (rang_ligue − 2)
```
où `rang_ligue` = 2 pour Argent (première ligue où l'achat est possible, pas d'achat en Bronze), 3 pour Or, 4 pour Platine, 5 pour Diamant, 6 pour Légende. Soit : **Bronze — pas d'achat possible** · Argent 3000 · Or 4000 · Platine 5000 · Diamant 6000 · Légende 7000 saphirs par gemme de base (1★).

**⚠️ Nuance à retenir :** "pas d'achat possible en Bronze" concerne uniquement le calculateur Gemmes (simulation d'un **achat**). Dans le Simulateur de Stuff, la ligue Bronze **reste sélectionnable** pour les gemmes déjà **possédées** par le joueur (héritées d'une ligue passée, obtenues autrement qu'à l'achat) — les valeurs `y` de Bronze existent bel et bien (voir tableau plus bas), seul l'achat direct est bloqué.

**✅ Décidé — deux modes de calcul, au choix de l'utilisateur (le mode "Répartition égale" initialement envisagé a été abandonné — l'Optimisation le rend redondant) :**
1. **Optimisation** — le joueur choisit une famille (Attaque / Défense / Or / Vitesse — mêmes 4 regroupements que le Simulateur de Stuff, voir plus bas), peut **mixer plusieurs compétences sur les mêmes emplacements** (ex: répartir 27 emplacements entre Attaque et Charognard), avec pour chaque compétence : nombre d'emplacements alloués (saisi manuellement par le joueur, plafonné automatiquement pour que le total ne dépasse jamais le total disponible), stat cible (%), et **sa propre ligue** (chaque compétence peut avoir une ligue différente, gemmes accumulées au fil du temps)
2. **Budget disponible** — à partir d'un budget en **saphirs** (monnaie réelle, pas de sélecteur d'unité k/M/G) et d'un nombre d'emplacements disponibles, détermine combien de gemmes acheter et comment les fusionner pour **maximiser la stat obtenue**. Une seule compétence à la fois dans ce mode (pas de mix multi-stat), avec sa propre ligue. Affiche aussi le budget restant non dépensé, en gros et bien visible.

**Regroupement par famille (mode Optimisation) — identique au Simulateur de Stuff :**

| Bouton famille | Compétences disponibles pour le mix |
|---|---|
| Attaque | Attaque, Charognard, Intrépide |
| Défense | Bravoure, Défense, Recycleur, Récupération |
| Or | Prospérité, Recruteur |
| Vitesse | Vitesse |

*(Ce regroupement correspond aux compétences réellement comptabilisables par famille — voir la liste blanche `SKILL_ALLOWLIST_BY_BLOCK` documentée dans la section Simulateur de Stuff, réutilisée à l'identique ici pour rester cohérent.)*

**Algorithme d'optimisation par compétence — identique pour chaque ligne du mix (mode Optimisation) :**
```
1. Nombre d'unités de bonus nécessaires (arrondi au plus proche) : U = arrondi(stat_cible / y)
2. Si U ≤ emplacements_alloués_à_cette_compétence :
   → U gemmes à 1★ chacune (solution la plus simple et la moins chère, aucun besoin de fusionner)
3. Sinon (U > emplacements_alloués) :
   → Répartir U unités le plus uniformément possible sur les emplacements alloués à cette compétence :
      base = partie_entière(U / emplacements_alloués)
      reste = U modulo emplacements_alloués
   → "reste" gemmes au niveau (base+1)★, et (emplacements_alloués − reste) gemmes au niveau base★
```
*(Solution mathématiquement optimale : le coût par étoile étant convexe/exponentiel, répartir le plus uniformément possible entre les emplacements alloués à une compétence minimise toujours le coût total pour cette compétence — chaque ligne du mix est optimisée indépendamment sur son propre sous-budget d'emplacements.)*

**Résultat affiché (mode Optimisation) :** un tableau avec une ligne par compétence active (compétence, ligue, emplacements, répartition en étoiles, stat obtenue, coût), plus un **coût total** cumulé sur toutes les lignes.

**Logique de calcul complète du calculateur (mode Budget disponible) :**
```
1. Gemmes de base achetables avec le budget : G = partie_entière(budget / Prix(ligue))
2. Si G ≤ emplacements_disponibles : utiliser G emplacements à 1★ chacun (pas de fusion nécessaire)
3. Sinon : répartir les G gemmes le plus uniformément possible sur emplacements_disponibles emplacements —
   chaque emplacement doit recevoir un compte de gemmes en puissance de 2 (1, 2, 4, 8...), correspondant à un niveau d'étoile entier,
   ce qui donne un mix de deux niveaux d'étoiles adjacents (comme pour le mode Optimisation)
4. Coût réel = gemmes effectivement utilisées × Prix(ligue) ; budget restant = budget − coût réel
```

**Inputs (mode Budget) :** compétence, ligue, emplacements disponibles, budget en saphirs (sans sélecteur d'unité)
**Outputs (mode Budget) :** nombre de gemmes de base à acheter, détail de fusion (combien à chaque niveau d'étoile — **affiché en grand et en gras**, c'est le résultat principal attendu par le joueur), stat obtenue, budget restant non dépensé

**Valeurs de base `y` par ligue et par type de gemme — confirmées par le joueur :**

| Type de gemme | Bronze | Argent | Or | Platine | Diamant | Légende |
|---|---|---|---|---|---|---|
| Fearless (Intrépide) | 1% | 2% | 3% | 4% | 5% | 6% |
| Brave (Bravoure) | 1% | 2% | 3% | 4% | 5% | 6% |
| Salvager (Recycleur) | 0,5% | 1% | 1,5% | 2% | 2,5% | 3% |
| Prosperous (Prospérité) | 1,5% | 3% | 4,5% | 6% | 7,5% | 9% |
| Cautious (Récup) | 0,5% | 1% | 1,5% | 2% | 2,5% | 3% |
| Scavenger (Charognard) | 1% | 2% | 3% | 4% | 5% | 6% |
| Recruiter (Recruteur) | 1,5% | 3% | 4,5% | 6% | 7,5% | 9% |
| Rusher (Speed) | 2,5% | 5% | 7,5% | 10% | 12,5% | 15% |
| Striker (Attaque) | 1% | 2% | 3% | 4% | 5% | 6% |
| Guardian (Def) | 1,5% | 3% | 4,5% | 6% | 7,5% | 9% |

**🎉 Tableau des valeurs de base `y` par ligue désormais 100% complet pour les 10 types de gemmes.**

Pattern confirmé sur l'ensemble : progression linéaire de +1 palier fixe par ligue (Bronze → Légende), avec un palier propre à chaque type de gemme :

| Palier par ligue | Types de gemmes concernés |
|---|---|
| +0,5%/ligue | Salvager (Recycleur), Cautious (Récup) |
| +1%/ligue | Fearless (Intrépide), Brave (Bravoure), Scavenger (Charognard), Striker (Attaque) |
| +1,5%/ligue | Prosperous (Prospérité), Recruiter (Recruteur), Guardian (Def) |
| +2,5%/ligue | Rusher (Speed) |

**✅ Attente du joueur :** le mécanisme de gain devrait être des **formules simples**, faciles à identifier (comme pour Villes) — donc probablement le même modèle "paramètres de formule éditables, un jeu par ligue" plutôt qu'une table de valeurs brutes. À confirmer une fois les vraies valeurs en main.

**Note générale importante :** plusieurs valeurs trouvées datent d'une ancienne version du wiki (2019) ou ne sont pas confirmées comme à jour suite aux patchs récents. Comme convenu, les taux/formules doivent être **stockés comme paramètres éditables en admin** plutôt que codés en dur, ce qui permettra de corriger facilement si une valeur s'avère inexacte ou change avec un futur patch.

---

## 8. Administration — Fonctionnalités attendues

*(reprend en synthèse ce qui est détaillé en section 3.2)*

- CRUD guides (créer, éditer, activer/désactiver, supprimer)
- Workflow de publication guides (`draft` → `pending_review` → `published`, distinct du champ `is_active`)
- Éditeur markdown natif avec aperçu (`@uiw/react-md-editor`) pour le contenu des guides
- Activer / désactiver un simulateur ou référentiel
- Éditer les paramètres numériques d'un outil (pas de formule libre)
- Gestion des traductions EN/FR pour guides et outils, formulaire par langue (pas de JSON brut)
- Système de rôles admin — **✅ Révisé — 5 niveaux définis** : Super Admin, Admin, Gestion Guides (couvre aussi les référentiels), Gestion Outils (simulateurs uniquement), Lecture Seule (voir section 3.2)
- Historique des modifications en langage naturel (voir section 6 bis)
- Page de gestion des utilisateurs admin (voir section 6 bis)
- Tableau de bord synthétique (outils actifs/total, guides publiés/total, dernières actions des logs)

**📋 Pour le suivi précis de ce qui est réellement implémenté vs restant à faire, voir la "Liste unifiée" (section 4) de `docs/brief-demarrage-codex.md`** — c'est la source de vérité à jour, pour éviter de maintenir deux listes de suivi qui divergent entre elles.

---

## 9. Points ouverts restants (données de jeu)

**Pour le suivi complet de toutes les tâches restantes (UI/UX, admin, contenu), voir la "Liste unifiée" (section 4) de `docs/brief-demarrage-codex.md`** — cette section 9 ne garde que les points de données de jeu encore ouverts, propres à ce document.

1. **Équipement d'Expédition** — 2 stats sur 10 confirmées (Équipement +0,2/★, Vitalité +2,5/★). Reste : les 8 stats restantes, coût de fusion en Terradust, pattern "même valeur sur les 6 emplacements" (prudence, une hypothèse similaire s'était révélée fausse côté combat)
2. **Équipements de combat** — reste uniquement les 30 lignes de valeurs de compétences manquantes (10 sets Commun/Rare/Épique) ; tout le reste (formule par étoile, mécanisme de pièces, coût de fusion) est verrouillé
2 bis. ~~**Nouveaux simulateurs "Taux de gain d'XP" et "Troupes max en attaque démo"**~~ → **✅ Les deux sont désormais entièrement résolus** (formules confirmées, voir section 7.1). Prêts à être spécifiés comme tâches Codex.
3. **Combat** — Fight, Enemy Troops toujours non spécifiés. **3 éléments Combat désormais spécifiés/prototypés** : Taux de gain d'XP, Troupes max en attaque démo (simulateurs), et **Level Up** (référentiel — formule troupes ✅ verrouillée pour Légende `32,2 × 1,245^n`, cycle de coffres ✅ confirmé, contenu des coffres couvert par le guide plutôt que la donnée structurée, reste : les 5 autres ligues, formule XP requis par niveau). Voir section 7.1.
4. **Simulateur d'achat de consommables** — liste des objets et prix en saphirs à collecter, catégorie d'accueil à trancher
5. **Guides** — modèle de données et éditeur prêts, **5 guides publiés** sur 56 prévus (voir section 10 pour le plan complet et le suivi)
6. **Cohérence de nommage dans ce document** — les noms de simulateurs Villes ont été traduits en français dans le prototype (Coût de Ville, Niveau Max Atteignable, Production, Classement) ; ce document garde encore les noms techniques anglais (City Cost, City Max Level, Ranking) par choix assumé (jargon technique interne, voir section 6) — non bloquant

**Résolu depuis la dernière grosse session de données (Villes, Classement, fusion équipements) :** Or/Bronze/Argent pour Villes, les 6 ligues de Classement, la formule complète de fusion des équipements (5/5 raretés) — voir sections 7.1 correspondantes pour le détail.

**Changements structurels notables (historique, pour comprendre les choix actuels) :**
- La catégorie "Production" a été retirée — fusionnée dans **Villes** (3 simulateurs : Coût de Ville, Niveau Max Atteignable, Production)
- La catégorie **"Référentiels"** regroupe les données consultables (Équipements Combat/Expédition), distincte de "Compétences" (vrais outils de calcul)
- Les Templiers personnels n'alimentent plus automatiquement la production du joueur — pool de clan séparé ("Bonus de temple"), saisi directement
- Les Paramètres du joueur distinguent "Statistiques données par l'équipement" (valeur utilisée par les simulateurs) et "Points de compétence" (planification indépendante)
- Décision admin : plus de formule libre éditable, uniquement des paramètres numériques nommés (section 6)
- **`docs/prototype-ml-helper-unifie.html` fait référence** pour la Phase 2 du développement — en cas de divergence avec le texte de ce document, le comportement réel du prototype prime (voir `AGENTS.md`)

**Rappel de méthode (acté suite à plusieurs corrections) :** ne jamais présenter une valeur extrapolée/devinée comme confirmée — marquer explicitement "non vérifié" et demander confirmation plutôt que d'assumer un pattern à partir d'exemples partiels.

---

## 10. Plan des guides (56 guides, 8 catégories)

*(Intégré depuis l'ancien fichier séparé `plan-guides.md` — la rédaction du contenu se fait via ChatGPT, hors périmètre de cette conversation. Cette section sert de suivi structurel : quoi écrire, dans quel ordre, où en est-on.)*

**Légende** : ✅ rédigé · ⬜ pas encore rédigé

**⚠️ Relecture complète prévue avant mise en production** — les guides publiés (✅) n'ont pas encore été relus une dernière fois, à faire en une passe dédiée avant le lancement public du site.

### 🟢 1. Débuter & progresser (`debuter`)

1. Bien débuter dans Million Lords ✅
2. Comprendre et développer ses villes ✅
3. Comprendre les ligues et la progression ✅
4. Comprendre la production : or et troupes ✅
5. Bien choisir et rejoindre un clan ✅ *(catégories : Débuter & progresser + Clan & stratégie collective)*
6. 15 erreurs qui ralentissent votre progression ⬜
7. Comment progresser efficacement ⬜

### ⚔️ 2. Combat & conquête (`combat`)

8. Comprendre le fonctionnement des combats ⬜ *(→ voir aussi le guide 57 "Level Up : progression, troupes et coffres" ci-dessous)*
9. Comment choisir une bonne cible ⬜
10. Scout : analyser un adversaire avant d'attaquer ⬜
11. Attaquer efficacement et limiter ses pertes ⬜
12. XP vs pertes : mesurer la rentabilité d'une attaque ⬜
13. Gérer son armée et ses déplacements ⬜
14. Enchaîner ses conquêtes efficacement ⬜
15. Combattre un adversaire plus puissant ⬜
16. Anticiper et exploiter les mouvements adverses ⬜

### 🛡️ 3. Défense & territoire (`defense`)

17. Défendre efficacement ses villes ⬜
18. Comprendre les remparts et leurs bonus ⬜
19. Construire et organiser son territoire ⬜
20. Savoir quelle ville défendre… ou abandonner ⬜
21. Frontières et villes de front ⬜
22. Le bonus de Temple du clan expliqué ⬜
23. Défendre contre un joueur plus puissant ⬜
24. Gérer plusieurs fronts simultanément ⬜

### 🧙 4. Compétences & builds (`competences`)

25. Comprendre les 10 compétences et leurs effets ⬜
26. Où investir ses premiers points de compétence ? ⬜
27. Comment construire un build cohérent ⬜
28. Build offensif : attaque et vitesse ⬜
29. Build défensif ⬜
30. Build économie et production ⬜
31. Adapter son build à sa situation ⬜

### 🛡️ 5. Équipement & Templiers (`equipement`)

32. Comprendre l'équipement et ses bonus ⬜
33. Optimiser son équipement par bloc ⬜
34. Fusion d'équipement : quand est-ce rentable ? ⬜
35. Comment dépenser intelligemment ses gemmes ⬜
36. Templiers : comprendre leur fonctionnement ⬜
37. Templiers : où investir en priorité ⬜
38. Optimiser Stuff + Compétences + Templiers ⬜

### 🧭 6. Expéditions (`expeditions`)

39. Comprendre le système d'expédition ⬜
40. Comprendre l'équipement d'expédition ⬜
41. Préparer efficacement une expédition ⬜
42. Optimiser ses runs d'expédition ⬜

### 🏆 7. Événements & classement (`evenements`)

43. Comprendre les saisons de Million Lords ⬜
44. Calendrier des événements récurrents ⬜
45. Comprendre les différents types d'événements ⬜
46. Stratégies pour optimiser chaque événement ⬜
47. Préparer ses ressources avant un événement ⬜
48. Comprendre le classement ⬜
49. Optimiser son rang au classement ⬜
50. Stratégies de fin de saison ⬜

### 🤝 8. Clan & stratégie collective (`clan`)

51. ~~Bien choisir et rejoindre un clan~~ → **fusionné avec le guide 5**, qui porte maintenant les deux catégories
52. Comment être utile à son clan ⬜
53. Combattre efficacement avec ses alliés ⬜
54. Organiser et tenir un front ⬜
55. Coordonner une offensive de clan ⬜
56. Comment affronter un clan plus puissant ⬜

### ➕ Ajouté après coup

57. Level Up : progression, troupes et coffres ⬜ *(catégorie : Combat & conquête — explique la mécanique de montée de niveau, les troupes gagnées par palier, et le contenu de chaque type de coffre/urne/jarre/coffret/caisse tous les 10 niveaux — ce dernier point n'est volontairement pas structuré en donnée de référentiel sur le site, à couvrir uniquement ici)*

### Points à trancher

- **✅ Résolu — doublon guides 5/51** : fusionnés en un seul guide, catégorisé dans les deux catégories à la fois (un guide peut désormais appartenir à plusieurs catégories)
- **Guides liés aux simulateurs déjà existants** — plusieurs guides (4, 33, 35, 37, 41, 49...) gagneraient à inclure un lien direct vers le simulateur correspondant (Production, Simulateur de Stuff, Gemmes, Templiers, Classement) — prévu, ajouté au fil de la rédaction par ChatGPT quand pertinent
- **Catégorie Combat toujours pas cadrée techniquement** — les guides 8 à 16 peuvent être rédigés indépendamment du simulateur (contenu narratif, pas de calcul), donc pas besoin d'attendre que la catégorie Combat soit spécifiée côté simulateurs pour commencer à les écrire

---

## 11. Manifeste des images — Gemmes

*(Intégré depuis l'ancien fichier séparé `manifeste-images-gemmes.md`.)*

**10 compétences × 6 ligues = 60 fichiers attendus.**

**Convention de nommage :** `gemme-{competence}-{ligue}.png` (minuscules, sans accent, tirets).

**Format et dimensions recommandés :** à définir selon ce que le joueur a sous la main (PNG avec fond transparent conseillé, carré, ex: 128×128px ou 256×256px — cohérent entre tous les fichiers).

| Compétence | Bronze | Argent | Or | Platine | Diamant | Légende |
|---|---|---|---|---|---|---|
| Attaque | `gemme-attaque-bronze.png` | `gemme-attaque-argent.png` | `gemme-attaque-or.png` | `gemme-attaque-platine.png` | `gemme-attaque-diamant.png` | `gemme-attaque-legende.png` |
| Bravoure | `gemme-bravoure-bronze.png` | `gemme-bravoure-argent.png` | `gemme-bravoure-or.png` | `gemme-bravoure-platine.png` | `gemme-bravoure-diamant.png` | `gemme-bravoure-legende.png` |
| Charognard | `gemme-charognard-bronze.png` | `gemme-charognard-argent.png` | `gemme-charognard-or.png` | `gemme-charognard-platine.png` | `gemme-charognard-diamant.png` | `gemme-charognard-legende.png` |
| Défense | `gemme-defense-bronze.png` | `gemme-defense-argent.png` | `gemme-defense-or.png` | `gemme-defense-platine.png` | `gemme-defense-diamant.png` | `gemme-defense-legende.png` |
| Intrépide | `gemme-intrepide-bronze.png` | `gemme-intrepide-argent.png` | `gemme-intrepide-or.png` | `gemme-intrepide-platine.png` | `gemme-intrepide-diamant.png` | `gemme-intrepide-legende.png` |
| Prospérité | `gemme-prosperite-bronze.png` | `gemme-prosperite-argent.png` | `gemme-prosperite-or.png` | `gemme-prosperite-platine.png` | `gemme-prosperite-diamant.png` | `gemme-prosperite-legende.png` |
| Recruteur | `gemme-recruteur-bronze.png` | `gemme-recruteur-argent.png` | `gemme-recruteur-or.png` | `gemme-recruteur-platine.png` | `gemme-recruteur-diamant.png` | `gemme-recruteur-legende.png` |
| Récupération | `gemme-recuperation-bronze.png` | `gemme-recuperation-argent.png` | `gemme-recuperation-or.png` | `gemme-recuperation-platine.png` | `gemme-recuperation-diamant.png` | `gemme-recuperation-legende.png` |
| Recycleur | `gemme-recycleur-bronze.png` | `gemme-recycleur-argent.png` | `gemme-recycleur-or.png` | `gemme-recycleur-platine.png` | `gemme-recycleur-diamant.png` | `gemme-recycleur-legende.png` |
| Vitesse | `gemme-vitesse-bronze.png` | `gemme-vitesse-argent.png` | `gemme-vitesse-or.png` | `gemme-vitesse-platine.png` | `gemme-vitesse-diamant.png` | `gemme-vitesse-legende.png` |

**✅ Convention équipements (Combat + Expédition) actée — manifeste complet en section 12.**
## 12. Manifeste des images — Équipements (Combat + Expédition)

**Convention de nommage : `{famille-slug}-{rarete-slug}-{emplacement-slug}.webp`** (minuscules, sans accent, tirets, apostrophes retirées) — plutôt qu'à partir du nom du set, pour rester systématique et prévisible sans avoir à connaître les noms exotiques des sets (Spirit Fyra, Almaty, Shark...). Famille+rareté identifient un set de façon unique (vérifié : 300 combinaisons, zéro collision). Exemple : `attaque-legendaire-amulette.webp`.

### Équipements de Combat — 180 fichiers attendus (20 sets × 9 emplacements)

**🟡 Statut (fourni par le joueur, vérifié) : 144/180 reçus.** Manquants (36, motif systématique) : **Casque, Gantelet et Bottes pour les raretés Commun/Rare/Épique, sur les 4 familles** — Mythique et Légendaire sont complets sur les 9 emplacements. **✅ Confirmé en jeu par le joueur : ces 3 emplacements existent bien à toutes les raretés** (ex. bottes du Chasseur [Hunter, Rare], casque de l'Aventurier [Adventurer, Rare], gantelets du Barde [Bard, Commun], gantelets du Compagnon [Journeyman, Commun]) — ce n'est **pas** une restriction de jeu (contrairement à l'hypothèse initiale), uniquement des captures manquantes côté collecte. Reste à récupérer avant d'intégrer les images au site (Bloc 10) ; pas bloquant pour lancer Bloc 10 sur les 144 déjà disponibles + les 120 Expédition complets.

**Or**

- **Spirit Fulgur** (Légendaire) : `or-legendaire-arme.webp`, `or-legendaire-bouclier.webp`, `or-legendaire-ceinture.webp`, `or-legendaire-anneau.webp`, `or-legendaire-bracelet.webp`, `or-legendaire-amulette.webp`, `or-legendaire-casque.webp`, `or-legendaire-gantelet.webp`, `or-legendaire-bottes.webp`
- **Shark** (Mythique) : `or-mythique-arme.webp`, `or-mythique-bouclier.webp`, `or-mythique-ceinture.webp`, `or-mythique-anneau.webp`, `or-mythique-bracelet.webp`, `or-mythique-amulette.webp`, `or-mythique-casque.webp`, `or-mythique-gantelet.webp`, `or-mythique-bottes.webp`
- **Shopkeeper** (Épique) : `or-epique-arme.webp`, `or-epique-bouclier.webp`, `or-epique-ceinture.webp`, `or-epique-anneau.webp`, `or-epique-bracelet.webp`, `or-epique-amulette.webp`, `or-epique-casque.webp`, `or-epique-gantelet.webp`, `or-epique-bottes.webp`
- **Smuggler** (Rare) : `or-rare-arme.webp`, `or-rare-bouclier.webp`, `or-rare-ceinture.webp`, `or-rare-anneau.webp`, `or-rare-bracelet.webp`, `or-rare-amulette.webp`, `or-rare-casque.webp`, `or-rare-gantelet.webp`, `or-rare-bottes.webp`
- **Thief** (Commun) : `or-commun-arme.webp`, `or-commun-bouclier.webp`, `or-commun-ceinture.webp`, `or-commun-anneau.webp`, `or-commun-bracelet.webp`, `or-commun-amulette.webp`, `or-commun-casque.webp`, `or-commun-gantelet.webp`, `or-commun-bottes.webp`

**Troupes/Vitesse**

- **Spirit Zephyr** (Légendaire) : `troupes-vitesse-legendaire-arme.webp`, `troupes-vitesse-legendaire-bouclier.webp`, `troupes-vitesse-legendaire-ceinture.webp`, `troupes-vitesse-legendaire-anneau.webp`, `troupes-vitesse-legendaire-bracelet.webp`, `troupes-vitesse-legendaire-casque.webp`, `troupes-vitesse-legendaire-gantelet.webp`, `troupes-vitesse-legendaire-bottes.webp`, `troupes-vitesse-legendaire-amulette.webp`
- **Owl** (Mythique) : `troupes-vitesse-mythique-arme.webp`, `troupes-vitesse-mythique-bouclier.webp`, `troupes-vitesse-mythique-ceinture.webp`, `troupes-vitesse-mythique-anneau.webp`, `troupes-vitesse-mythique-bracelet.webp`, `troupes-vitesse-mythique-amulette.webp`, `troupes-vitesse-mythique-casque.webp`, `troupes-vitesse-mythique-gantelet.webp`, `troupes-vitesse-mythique-bottes.webp`
- **Royal Archer** (Épique) : `troupes-vitesse-epique-arme.webp`, `troupes-vitesse-epique-bouclier.webp`, `troupes-vitesse-epique-ceinture.webp`, `troupes-vitesse-epique-anneau.webp`, `troupes-vitesse-epique-bracelet.webp`, `troupes-vitesse-epique-amulette.webp`, `troupes-vitesse-epique-casque.webp`, `troupes-vitesse-epique-gantelet.webp`, `troupes-vitesse-epique-bottes.webp`
- **Hunter** (Rare) : `troupes-vitesse-rare-arme.webp`, `troupes-vitesse-rare-bouclier.webp`, `troupes-vitesse-rare-ceinture.webp`, `troupes-vitesse-rare-anneau.webp`, `troupes-vitesse-rare-bracelet.webp`, `troupes-vitesse-rare-amulette.webp`, `troupes-vitesse-rare-casque.webp`, `troupes-vitesse-rare-gantelet.webp`, `troupes-vitesse-rare-bottes.webp`
- **Bard** (Commun) : `troupes-vitesse-commun-arme.webp`, `troupes-vitesse-commun-bouclier.webp`, `troupes-vitesse-commun-ceinture.webp`, `troupes-vitesse-commun-anneau.webp`, `troupes-vitesse-commun-bracelet.webp`, `troupes-vitesse-commun-amulette.webp`, `troupes-vitesse-commun-casque.webp`, `troupes-vitesse-commun-gantelet.webp`, `troupes-vitesse-commun-bottes.webp`

**Défense**

- **Spirit Vanna** (Légendaire) : `defense-legendaire-arme.webp`, `defense-legendaire-bouclier.webp`, `defense-legendaire-ceinture.webp`, `defense-legendaire-anneau.webp`, `defense-legendaire-bracelet.webp`, `defense-legendaire-amulette.webp`, `defense-legendaire-casque.webp`, `defense-legendaire-gantelet.webp`, `defense-legendaire-bottes.webp`
- **Snake** (Mythique) : `defense-mythique-arme.webp`, `defense-mythique-bouclier.webp`, `defense-mythique-ceinture.webp`, `defense-mythique-anneau.webp`, `defense-mythique-bracelet.webp`, `defense-mythique-amulette.webp`, `defense-mythique-casque.webp`, `defense-mythique-gantelet.webp`, `defense-mythique-bottes.webp`
- **Knight** (Épique) : `defense-epique-arme.webp`, `defense-epique-bouclier.webp`, `defense-epique-ceinture.webp`, `defense-epique-anneau.webp`, `defense-epique-bracelet.webp`, `defense-epique-amulette.webp`, `defense-epique-casque.webp`, `defense-epique-gantelet.webp`, `defense-epique-bottes.webp`
- **Adventurer** (Rare) : `defense-rare-arme.webp`, `defense-rare-bouclier.webp`, `defense-rare-ceinture.webp`, `defense-rare-anneau.webp`, `defense-rare-bracelet.webp`, `defense-rare-amulette.webp`, `defense-rare-casque.webp`, `defense-rare-gantelet.webp`, `defense-rare-bottes.webp`
- **Journeyman** (Commun) : `defense-commun-arme.webp`, `defense-commun-bouclier.webp`, `defense-commun-ceinture.webp`, `defense-commun-anneau.webp`, `defense-commun-bracelet.webp`, `defense-commun-amulette.webp`, `defense-commun-casque.webp`, `defense-commun-gantelet.webp`, `defense-commun-bottes.webp`

**Attaque**

- **Spirit Fyra** (Légendaire) : `attaque-legendaire-arme.webp`, `attaque-legendaire-bouclier.webp`, `attaque-legendaire-ceinture.webp`, `attaque-legendaire-anneau.webp`, `attaque-legendaire-bracelet.webp`, `attaque-legendaire-amulette.webp`, `attaque-legendaire-casque.webp`, `attaque-legendaire-gantelet.webp`, `attaque-legendaire-bottes.webp`
- **Almaty** (Mythique) : `attaque-mythique-arme.webp`, `attaque-mythique-bouclier.webp`, `attaque-mythique-ceinture.webp`, `attaque-mythique-anneau.webp`, `attaque-mythique-bracelet.webp`, `attaque-mythique-amulette.webp`, `attaque-mythique-casque.webp`, `attaque-mythique-gantelet.webp`, `attaque-mythique-bottes.webp`
- **Royal Guard** (Épique) : `attaque-epique-arme.webp`, `attaque-epique-bouclier.webp`, `attaque-epique-ceinture.webp`, `attaque-epique-anneau.webp`, `attaque-epique-bracelet.webp`, `attaque-epique-amulette.webp`, `attaque-epique-casque.webp`, `attaque-epique-gantelet.webp`, `attaque-epique-bottes.webp`
- **Soldier** (Rare) : `attaque-rare-arme.webp`, `attaque-rare-bouclier.webp`, `attaque-rare-ceinture.webp`, `attaque-rare-anneau.webp`, `attaque-rare-bracelet.webp`, `attaque-rare-amulette.webp`, `attaque-rare-casque.webp`, `attaque-rare-gantelet.webp`, `attaque-rare-bottes.webp`
- **Barbarian** (Commun) : `attaque-commun-arme.webp`, `attaque-commun-bouclier.webp`, `attaque-commun-ceinture.webp`, `attaque-commun-anneau.webp`, `attaque-commun-bracelet.webp`, `attaque-commun-amulette.webp`, `attaque-commun-casque.webp`, `attaque-commun-gantelet.webp`, `attaque-commun-bottes.webp`

### Équipement d'Expédition — 120 fichiers attendus (20 sets × 6 emplacements)

**✅ Statut : 120/120 reçus, complet, aucun typo.**

**Or**

- **Vanna** (Légendaire) : `or-legendaire-cape.webp`, `or-legendaire-longue-vue.webp`, `or-legendaire-sacoche.webp`, `or-legendaire-boussole.webp`, `or-legendaire-torche.webp`, `or-legendaire-pioche.webp`
- **Safir** (Mythique) : `or-mythique-cape.webp`, `or-mythique-longue-vue.webp`, `or-mythique-sacoche.webp`, `or-mythique-boussole.webp`, `or-mythique-torche.webp`, `or-mythique-pioche.webp`
- **Auric** (Épique) : `or-epique-cape.webp`, `or-epique-longue-vue.webp`, `or-epique-sacoche.webp`, `or-epique-boussole.webp`, `or-epique-torche.webp`, `or-epique-pioche.webp`
- **Merchant** (Rare) : `or-rare-cape.webp`, `or-rare-longue-vue.webp`, `or-rare-sacoche.webp`, `or-rare-boussole.webp`, `or-rare-torche.webp`, `or-rare-pioche.webp`
- **Prospector** (Commun) : `or-commun-cape.webp`, `or-commun-longue-vue.webp`, `or-commun-sacoche.webp`, `or-commun-boussole.webp`, `or-commun-torche.webp`, `or-commun-pioche.webp`

**Équipement**

- **Fyra** (Légendaire) : `equipement-legendaire-cape.webp`, `equipement-legendaire-longue-vue.webp`, `equipement-legendaire-sacoche.webp`, `equipement-legendaire-boussole.webp`, `equipement-legendaire-torche.webp`, `equipement-legendaire-pioche.webp`
- **Sundira** (Mythique) : `equipement-mythique-cape.webp`, `equipement-mythique-longue-vue.webp`, `equipement-mythique-sacoche.webp`, `equipement-mythique-boussole.webp`, `equipement-mythique-torche.webp`, `equipement-mythique-pioche.webp`
- **Archaeologist** (Épique) : `equipement-epique-cape.webp`, `equipement-epique-longue-vue.webp`, `equipement-epique-sacoche.webp`, `equipement-epique-boussole.webp`, `equipement-epique-torche.webp`, `equipement-epique-pioche.webp`
- **Hunter** (Rare) : `equipement-rare-cape.webp`, `equipement-rare-longue-vue.webp`, `equipement-rare-sacoche.webp`, `equipement-rare-boussole.webp`, `equipement-rare-torche.webp`, `equipement-rare-pioche.webp`
- **Wanderer** (Commun) : `equipement-commun-cape.webp`, `equipement-commun-longue-vue.webp`, `equipement-commun-sacoche.webp`, `equipement-commun-boussole.webp`, `equipement-commun-torche.webp`, `equipement-commun-pioche.webp`

**Consommables**

- **Zephyr** (Légendaire) : `consommables-legendaire-cape.webp`, `consommables-legendaire-longue-vue.webp`, `consommables-legendaire-sacoche.webp`, `consommables-legendaire-boussole.webp`, `consommables-legendaire-torche.webp`, `consommables-legendaire-pioche.webp`
- **Loriel** (Mythique) : `consommables-mythique-cape.webp`, `consommables-mythique-longue-vue.webp`, `consommables-mythique-sacoche.webp`, `consommables-mythique-boussole.webp`, `consommables-mythique-torche.webp`, `consommables-mythique-pioche.webp`
- **Apothecary** (Épique) : `consommables-epique-cape.webp`, `consommables-epique-longue-vue.webp`, `consommables-epique-sacoche.webp`, `consommables-epique-boussole.webp`, `consommables-epique-torche.webp`, `consommables-epique-pioche.webp`
- **Seeker** (Rare) : `consommables-rare-cape.webp`, `consommables-rare-longue-vue.webp`, `consommables-rare-sacoche.webp`, `consommables-rare-boussole.webp`, `consommables-rare-torche.webp`, `consommables-rare-pioche.webp`
- **Gatherer** (Commun) : `consommables-commun-cape.webp`, `consommables-commun-longue-vue.webp`, `consommables-commun-sacoche.webp`, `consommables-commun-boussole.webp`, `consommables-commun-torche.webp`, `consommables-commun-pioche.webp`

**Troupes**

- **Fulgur** (Légendaire) : `troupes-legendaire-cape.webp`, `troupes-legendaire-longue-vue.webp`, `troupes-legendaire-sacoche.webp`, `troupes-legendaire-boussole.webp`, `troupes-legendaire-torche.webp`, `troupes-legendaire-pioche.webp`
- **Connord** (Mythique) : `troupes-mythique-cape.webp`, `troupes-mythique-longue-vue.webp`, `troupes-mythique-sacoche.webp`, `troupes-mythique-boussole.webp`, `troupes-mythique-torche.webp`, `troupes-mythique-pioche.webp`
- **Survivor** (Épique) : `troupes-epique-cape.webp`, `troupes-epique-longue-vue.webp`, `troupes-epique-sacoche.webp`, `troupes-epique-boussole.webp`, `troupes-epique-torche.webp`, `troupes-epique-pioche.webp`
- **Explorer** (Rare) : `troupes-rare-cape.webp`, `troupes-rare-longue-vue.webp`, `troupes-rare-sacoche.webp`, `troupes-rare-boussole.webp`, `troupes-rare-torche.webp`, `troupes-rare-pioche.webp`
- **Initiate** (Commun) : `troupes-commun-cape.webp`, `troupes-commun-longue-vue.webp`, `troupes-commun-sacoche.webp`, `troupes-commun-boussole.webp`, `troupes-commun-torche.webp`, `troupes-commun-pioche.webp`

---

## 13. Comptes joueurs — V2, sans deadline

**🚨 Hors périmètre de développement actuel — V2, aucune date engagée.** Cette section documente une évolution future, pas une tâche à envoyer à Codex maintenant. À ne pas confondre avec les comptes **admin** (Super Admin/Admin/Gestion Guides/Gestion Outils/Lecture Seule, section 6 bis) — système entièrement séparé, base d'utilisateurs différente, flux d'authentification différent.

### Objectif

ML-Helper doit **continuer à fonctionner sans compte** — le compte joueur est une fonctionnalité de confort, jamais une obligation. Son rôle principal : **sauvegarder côté serveur et synchroniser entre appareils** les paramètres personnels actuellement stockés en localStorage (section 3.3).

**Données concernées par la synchronisation :**
- Statistiques du joueur ("Statistiques données par l'équipement")
- Points de compétence / configuration ("Distribution des points")
- Templiers personnels
- Ligue
- VP
- Autres paramètres joueur pertinents déjà présents dans ML-Helper, si nécessaire

**Pour un utilisateur non connecté**, le fonctionnement V1 (localStorage) reste inchangé — le compte est additif, pas un remplacement forcé.

### Authentification — piste à étudier

**Solution simple et peu intrusive recherchée**, pas un système complexe. Piste à étudier en priorité : **authentification par e-mail avec magic link** (évite la gestion de mots de passe côté joueur), si pertinent pour l'architecture technique de ML-Helper (à valider avec Codex le moment venu — compatibilité NextAuth, complexité d'envoi d'e-mails transactionnels sur l'infra actuelle).

**Ne pas surdimensionner** : il s'agit d'identifier un joueur ML-Helper et synchroniser ses paramètres, pas de construire un réseau social.

### ⛔ Explicitement hors périmètre pour cette V2

- Comparaison entre joueurs
- Profils publics
- Classement ML-Helper (différent du calculateur "Classement" du jeu, section 7.1 — aucun rapport)
- Fonctions sociales
- Fonctions de clan
- Partage de configurations entre joueurs

### ❓ Décisions techniques restant à prendre (V2, pas maintenant)

- Magic link e-mail : quel service d'envoi transactionnel (Resend, Postmark, SMTP existant...) ?
- Modèle de données `Player` (distinct de `User` admin) : quels champs exactement, quelle table de "paramètres" (une par simulateur, ou un blob JSON unique synchronisé) ?
- Stratégie de fusion : que se passe-t-il si un joueur a des paramètres locaux existants (localStorage) au moment où il crée un compte — écrasement, fusion, choix proposé ?
- Limite de sécurité/anti-abus sur l'envoi de magic links (rate limiting, cohérent avec la décision déjà prise pour le login admin section 3.3)

---

## 14. Monétisation

**Principe directeur : discrète et non intrusive, ne dégrade jamais l'usage des outils.** Voir aussi "Philosophie générale" (section 1.1).

### Phase 1 (V1, au lancement) — Dons volontaires

ML-Helper reste **gratuit** au lancement. Ajout d'un moyen de **soutenir volontairement le projet** (frais d'hébergement, frais techniques, développement/maintenance).

- **Simple et clairement facultatif** — pas de pression, pas de rappel intrusif
- **✅ Décidé : aucun compte ML-Helper requis pour faire un don** — cohérent avec le principe "gratuit et sans compte" (section 1.1)
- **⏳ Solution de paiement/don exacte non choisie** — à décider ultérieurement (Ko-fi, Buy Me a Coffee, Stripe donation, PayPal.me... à évaluer le moment venu)

### Phase 2 (une fois assez de contenu/trafic) — Google AdSense

**🚨 Pas d'intégration immédiate** — conditionné à avoir "davantage de contenu et de trafic", pas de seuil chiffré précisé, à évaluer au jugé le moment venu.

**Objectif cible : 1 à 2 emplacements publicitaires maximum**, jamais plus, avec contrôle total sur leur positionnement.

**✅ Principes UX non négociables, décidés :**
- Pas de popup publicitaire
- Pas d'interstitiel
- Pas de vidéo automatique
- **Pas de publicité au milieu des formulaires ou contrôles d'un simulateur** — cohérent avec la sobriété déjà actée pour les pages de simulateurs (section 3.3, "aucun titre ni texte d'explication") : la pub ne doit pas ajouter du bruit là où on a justement retiré tout texte superflu
- Pas de multiplication automatique des emplacements
- Emplacements privilégiés : bas de page, entre grandes sections de contenu, éventuellement zone latérale desktop
- **Expérience propre conservée sur mobile**
- **Les pages de guides/contenu éditorial sont à privilégier pour la publicité, par rapport aux outils interactifs** — cohérent avec la distinction Outils (calcul) vs Guides (consultation) déjà actée section 3.1

### Évolution possible (non engagée) — Statut Supporter

**🚨 Documenté comme piste, aucun engagement de réalisation.** Envisageable une fois les comptes joueurs (section 13) disponibles.

Pourrait permettre :
- Suppression des publicités
- Reconnaissance du soutien apporté
- Éventuels avantages cosmétiques/de confort futurs (non définis à ce stade)

**✅ Garde-fous décidés dès maintenant, pour cadrer une éventuelle réalisation future :**
- **Aucune fonctionnalité essentielle réservée aux Supporters** — simulateurs, référentiels, guides et outils principaux restent gratuits pour tous
- **La sauvegarde/synchronisation des paramètres joueur (compte V2) ne doit pas être réservée aux Supporters** — le compte de base reste gratuit, le statut Supporter n'ajoute que des à-côtés (retrait pub, reconnaissance, cosmétique)
