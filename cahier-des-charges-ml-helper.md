# Cahier des charges — ML-Helper (site outils & guides Million Lords)

Statut : brouillon en cours de construction
Dernière mise à jour : 13/08/2026

---

## 1. Objectif du projet

**✅ Nommage public — décidé :** la fonctionnalité "calculateurs" s'appelle **"Simulateurs"** côté interface publique (menu, page `/tools`, titres). Le terme technique "calculateur" reste utilisé dans ce document et dans le modèle de données (entités, types), qui sont des détails d'implémentation invisibles pour le joueur — pas besoin de tout renommer côté code/architecture, seulement ce qui est affiché.

Créer un site communautaire pour le jeu **Million Lords**, proposant :
- Une suite de **simulateurs** de jeu (villes, combat, production, classement, gemmes, équipements, compétences/reskill)
- Une **section guides** (débutants, expéditions, stuff, combat, défense, événements)
- Une **interface d'administration** permettant de gérer tout le contenu sans redéploiement
- Un site **multilingue**, lancé en **EN/FR**, avec **espagnol et allemand prévus en cible** (ajout futur, sans refonte technique grâce à next-intl)

Inspiration de départ : lordstrategist.com/en/million-lords/tools (simulateurs équivalents à reprendre et étendre)

---

## 2. Stack technique retenue

| Élément | Choix |
|---|---|
| Framework | Next.js (React + TypeScript) |
| Base de données | **SQLite** (fichier unique, pas de serveur de BDD à gérer) |
| ORM | Prisma (compatible SQLite nativement) |
| Auth admin | NextAuth.js |
| i18n | next-intl (switch dynamique EN/FR au lancement ; ES et DE prévus en cible, sans refonte) |
| Moteur de formules | **Paramètres numériques nommés, toujours éditables individuellement en admin** — pas d'expression libre éditable (décision révisée, voir section 6). `mathjs` reste utilisé côté code pour les calculs internes complexes (ex: Fight), mais jamais exposé comme formule brute modifiable par l'admin — seuls les paramètres qu'il utilise le sont |
| Traductions | Champ JSON `{en, fr, es, de, ...}` sur chaque contenu traduisible (guides, calculateurs, formules) plutôt que des colonnes fixes par langue — permet d'ajouter une langue sans modifier le schéma |
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
- `prod` — branche protégée, **PR obligatoire pour merger** (garde-fou CI avant mise en prod), même en solo (toi seul review/merge)

**Tests automatisés (écrits par Codex dès le départ, pas ajoutés après coup) :**
- **Unitaires** : Vitest
- **Composants/Frontend** : React Testing Library
- **E2E** : Playwright

**Pipeline GitHub Actions :**
| Déclencheur | Actions |
|---|---|
| Push/PR vers `dev` | Lint + tests unitaires + composants + e2e, **puis build + push de l'image Docker taguée `:dev`** sur ghcr.io — permet de tirer et tester l'image avant de décider de merger |
| PR vers `prod` (ouverture/mise à jour) | Suite de tests complète en garde-fou obligatoire avant que le merge soit autorisé |
| Merge vers `prod` | Build + push de l'image Docker taguée `:latest` (ou `:prod`) sur ghcr.io — c'est cette image que tu déploies réellement |

**Déploiement** : reste **manuel** — le lancement/redémarrage du conteneur sur le serveur (pull de l'image `:latest` + relance) est fait par toi, pas d'outil d'auto-déploiement (Watchtower/SSH/webhook) à mettre en place pour l'instant.

---

## 3. Vue d'ensemble fonctionnelle

Le projet se compose de deux univers distincts :
- **Site public** — ce que voient les joueurs (calculateurs + guides)
- **Back-office admin** — interface de gestion du contenu

### 3.1 Site public

**Accueil**
- Présentation du site, mise en avant de calculateurs/guides populaires ou récents

**Calculateurs**
- Regroupés par catégorie : **Villes** (inclut désormais Production, Récompenses), Combat, Classement, **Compétences** (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers), **Référentiels** (données consultables : Équipements de Combat, Équipement d'Expédition — pas des calculateurs à proprement parler, plutôt des tableaux de données filtrables)
- Chaque calculateur : formulaire de saisie → résultat instantané + texte d'astuce/explication
- Page liste filtrable par catégorie

**Guides**
- Liste filtrable par catégorie (débutants, expéditions, stuff, combat, défense, événements)
- Page de guide individuelle (contenu riche, images, éventuellement liens vers calculateurs pertinents)
- **Recherche** — confirmée dès la V1

**Transverse**
- Switch de langue EN/FR dynamique, sans rechargement
- Navigation cohérente (menu Simulateurs + menu guides)
- Formulaire de contact (page dédiée, pas de commentaires sur les guides)

### 3.2 Back-office admin

**Gestion des guides**
- CRUD complet (créer / éditer / supprimer)
- Publier / dépublier
- Éditeur **WYSIWYG type Ghost** (édition visuelle par blocs, stockage en markdown propre)
- Gestion des images
- Gestion des traductions EN/FR (contenu séparé par langue)
- Badge de notification pour Admin/Super Admin quand un guide passe en `pending_review`

**Gestion des calculateurs**
- Activer / désactiver chaque calculateur côté public — **✅ Décidé : comportement visuel en cas de désactivation.** Le calculateur désactivé reste **visible mais grisé/non cliquable** dans la navigation publique (bouton d'onglet ou de catégorie), plutôt que d'être complètement retiré de la liste. Cohérent avec le pattern déjà utilisé dans le prototype pour les éléments "à venir" (ex: ligues non encore disponibles, catégorie Combat grisée) — le joueur voit que la fonctionnalité existe/est prévue, sans pouvoir y accéder tant qu'elle n'est pas activée.
- Éditer les paramètres numériques nommés de chaque calculateur (taux, plafonds, coefficients, bases...) — jamais de formule libre, voir section 6
- Éditer les textes (nom, description, astuces) en EN/FR

**Comptes & rôles**
- Système de rôles prévu dès la conception, avec 4 niveaux définis :

| Rôle | Droits |
|---|---|
| **Super Admin** (toi) | Tous les droits, y compris la gestion des comptes utilisateurs (créer/modifier/supprimer des comptes admin) |
| **Admin** | Tous les droits fonctionnels (guides, calculateurs, formules...) **sauf** la création/gestion des comptes utilisateurs |
| **Gestion Guides** | Peut écrire et mettre à jour (éditer) des guides, **mais ne peut ni les publier/dépublier ni les supprimer** — nécessite une validation par un rôle Admin ou Super Admin. **Aucun droit sur les calculateurs** (pas d'accès, même en lecture) |
| **Gestion Calculateurs** | Peut activer/désactiver un calculateur, modifier les valeurs de formules/paramètres, et éditer les textes du calculateur (nom, description, astuces en EN/FR). **Aucun droit sur les guides** (pas d'accès, même en lecture) |

**Conséquence sur le modèle de données guides (section 5) :** il faudra un statut intermédiaire type `draft` → `pending_review` (soumis par Gestion Guides) → `published` (validé par Admin/Super Admin), plutôt qu'un simple `draft`/`published` binaire.

**Autres briques à considérer**
- ~~Historique des modifications~~ → confirmé, voir section 6 bis
- Tableau de bord (nb guides publiés, calculateurs actifs, etc.)

### 3.3 Exigences UI transverses (à noter pour le développement complet)

*(Ces exigences s'appliquent à toute l'interface publique. Elles sont documentées ici pour la phase de développement avec Codex — pas reflétées dans le prototype exploratoire de la section 7, qui a servi uniquement à valider le fond des calculateurs.)*

- **Mode clair / sombre** — toggle disponible pour l'utilisateur, à prévoir dès la conception des composants (variables de couleur type CSS custom properties, pas de couleurs codées en dur)
- **Responsive** — le site doit être utilisable correctement sur mobile, tablette et desktop
- **Formules non exposées aux utilisateurs** — l'interface publique affiche les résultats des calculateurs, jamais les formules ou paramètres sous-jacents (ex: pas de `VP = 20 × 1.115^(n−1)` visible pour un joueur). Les formules ne sont visibles/éditables qu'en admin (rôles Gestion Calculateurs / Admin / Super Admin)
- **Formatage des grands nombres** — affichage compact par unité, conversion automatique aux seuils :

| Plage | Format affiché |
|---|---|
| 0 – 999 | valeur brute (ex: `847`) |
| 1 000 – 999 990 | `X.XXk` (ex: `12.4k`) |
| 1 000 000 – 999 990 000 | `X.XXM` (ex: `3.45M`) |
| 1 000 000 000 – 999 990 000 000 | `X.XXG` (ex: `7.12G`) |
| 1 000 000 000 000+ | `X.XXT`, puis `X.XXP` au palier suivant |

Bascule au palier supérieur dès que la valeur atteint l'équivalent de 999,99 dans l'unité courante (ex: 999,99k → passe en M).

- **✅ Sélecteur d'unité en saisie (pas seulement en affichage)** — pour les champs numériques représentant de grandes quantités (VP du joueur, or/budget disponible dans les calculateurs...), le champ de saisie est accompagné d'un **sélecteur d'unité** (×1 / k / M / G / T) à côté du nombre. Le joueur tape "2" et choisit "G" plutôt que de taper "2000000000" — évite les erreurs de saisie et accélère l'usage. Prototypé dans le prototype unifié (champs VP joueur, Or disponible, Budget gemmes).

- **Cohérence linguistique** — chaque texte visible dans l'UI (labels de champs, noms de calculateurs, noms de stats/unités) doit passer par le système de traduction (next-intl), jamais de terme codé en dur dans une langue différente de celle affichée. *(Le prototype exploratoire de la section 7 a depuis été nettoyé de tout mélange FR/EN — sert de référence de cohérence pour le développement réel, pas juste d'exception tolérée.)*

- **✅ Décidé — Paramètres du joueur en localStorage** : le panneau "Paramètres du joueur" (niveau, ligue, stats de compétences — voir prototype) est stocké **côté client dans le localStorage du navigateur**, pas en base de données. Conséquence : **aucun compte joueur/visiteur n'est nécessaire** pour utiliser les calculateurs — seuls les comptes admin existent (voir section 6 bis). Les paramètres restent propres à l'appareil/navigateur utilisé, pas de synchronisation entre appareils prévue pour l'instant.

---

## 4. Architecture des pages — validée

### Pages publiques
- `/` — Accueil
- `/tools` — Liste des simulateurs *(nommé "Simulateurs" côté public, plutôt que "Calculateurs")*
- `/tools/[slug]` — Page d'un simulateur
- `/guides` — Liste des guides (filtrable par catégorie) — **recherche incluse dès la V1**
- `/guides/[slug]` — Page d'un guide
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

**✅ Décidé — édition en admin :** le texte des conditions d'utilisation est **éditable depuis l'interface admin**, réservé aux rôles **Admin et Super Admin** (pas accessible aux rôles Gestion Guides / Gestion Calculateurs, cohérent avec leur périmètre restreint). Nécessite une nouvelle entité de contenu statique :

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| key | string | Identifiant technique (ex: `terms_of_use`) |
| content | JSON `{en, fr, es, de}` | Texte des conditions, par langue |
| updated_at | datetime | Dernière modification |
| updated_by | UUID | Utilisateur ayant fait la dernière modification (lien vers Logs) |

Cette entité "contenu statique" pourra aussi servir plus tard pour d'autres pages fixes du site (ex: "À propos") sans redévelopper un système dédié.

### Pages admin (protégées par login)
- `/admin` — Dashboard
- `/admin/guides` — Liste/CRUD des guides
- `/admin/guides/new` / `/admin/guides/[id]` — Édition d'un guide
- `/admin/calculators` — Liste des calculateurs (activer/désactiver, éditer formules et paramètres)
- `/admin/calculators/[id]` — Édition d'un calculateur
- `/admin/users` — Gestion des utilisateurs admin (créer/modifier/supprimer des comptes, assigner un rôle) — **réservé au rôle Super Admin**
- `/admin/logs` — Historique des modifications (qui a fait quoi, quand, sur quel élément), avec purge manuelle par plage de dates (Super Admin uniquement)

---

## 5. Modèle de données — Guides

*(brouillon à valider)*

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| slug | string | URL du guide |
| category | enum | débutants / expéditions / stuff / combat / défense / événements |
| status | enum | draft / pending_review / published |
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

> ✅ **Décidé** : structure de traductions en **champ JSON** `{en, fr, es, de, ...}` plutôt que des champs fixes par langue (`title_en`, `title_fr`...) — approche la plus évolutive si d'autres langues s'ajoutent au-delà de EN/FR/ES/DE. Toutes les tables du document utilisent désormais un seul nom de champ par donnée traduisible (`title`, `content`, `name`, `description`, `tips`, `label`...), de type JSON `{en, fr, es, de}`.

### Calculateur (entité parente)

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| slug | string | URL du calculateur |
| category | enum | villes / combat / classement / compétences — les référentiels (Équipements Combat/Expédition) sont une entité distincte, pas des calculateurs (voir note ci-dessous) |
| name | JSON `{en, fr, es, de}` | Nom affiché |
| description | JSON `{en, fr, es, de}` | Texte d'intro |
| active | boolean | Activé/désactivé côté public |
| inputs | JSON | Définition des champs de saisie communs (nom, type, unité, min/max) |
| outputs | JSON | Définition des résultats affichés (nom, unité, format) |
| tips | JSON `{en, fr, es, de}` | Texte d'astuce affiché sous le résultat |

### Formule (entité enfant, plusieurs par calculateur)

**🚨 Décision révisée — plus d'édition de formule libre en admin.** On avait initialement prévu un type `advanced` permettant d'éditer une expression mathjs brute directement en admin. **Abandonné** : trop risqué pour un admin non-développeur (erreur de syntaxe = calculateur cassé, pas de validation possible côté interface, complexité de dev inutile pour l'éditeur de formule lui-même). **Décidé : toujours des paramètres numériques nommés éditables, jamais d'expression libre.** Pour les calculateurs dont la logique est plus complexe qu'un simple `base × ratio^n` (ex: Fight, City Max Level), Codex écrit la **mécanique** en dur dans le code de l'application, et expose seulement les **valeurs numériques qu'elle utilise** (coefficients, multiplicateurs, plafonds...) comme champs éditables — jamais la logique de calcul elle-même. Si un patch du jeu change une valeur, l'admin corrige un champ ; si un patch change la logique, ça nécessite de toute façon un déploiement Codex.

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| calculator_id | UUID | Lien vers le calculateur parent |
| key | string | Identifiant technique de la formule (ex: `attacker_losses`, `gold_gain`) |
| label | JSON `{en, fr, es, de}` | Nom lisible de la formule (utile en admin) |
| formula_params | JSON | Liste de paramètres numériques nommés, éditables individuellement en admin — remplace l'ancienne distinction `simple`/`advanced` |

**Conséquence :** les entités `lookup_table` (tables de référence brutes, ex: coût Templiers) restent inchangées et complémentaires — utilisées quand aucune formule mathématique propre n'est identifiable, sans rapport avec la question de l'édition de formule libre.

**✅ Résolu :** pas besoin d'un type de calculateur "composite" séparé — le champ `outputs` (JSON, déjà défini comme flexible dans l'entité Calculateur) supporte nativement des résultats multi-lignes ou à double sens, sans changement de modèle. Confirmé en pratique par le prototype : Ranking (tableau multi-lignes par seuil), Gemmes (3 modes de résultat différents) et Templiers fonctionnent déjà avec le modèle actuel, sans notion de type "composite".

### Principe transverse — formules avec paramètres par ligue (révisé)

**✅ Décidé (révision) :** pour les données qui varient par niveau ET suivent une formule mathématique identifiable (croissance géométrique, par exemple), on privilégie le **stockage de paramètres de formule éditables** plutôt qu'une table de valeurs complète — beaucoup plus compact (quelques paramètres au lieu de centaines de lignes), s'étend automatiquement à n'importe quel niveau, et un seul endroit à corriger si le jeu change une valeur.

**Cas concret validé :** la catégorie Villes (VP, mur, coût, production) se réduit à **7 paramètres de formule** par ligue plutôt qu'une table de 200 lignes — voir section 7.1 pour le détail.

**La table de référence brute (option `lookup_table`, un jeu de valeurs par ligne) reste disponible en secours** pour les cas où aucune formule mathématique propre n'est identifiable (paliers irréguliers, valeurs arbitraires...) — probablement pertinent pour équipements/gemmes selon ce qu'on découvrira.

**Cas particulier — variations par ligue :** certaines stats (production, mur, coût...) varient selon la ligue du joueur (Bronze/Argent/Or/Platine/Diamant/Légende), confirmé par les notes de patch officielles du jeu. **Décidé : chaque ligue a son propre jeu de paramètres de formule** (pas juste un multiplicateur global) — voir le modèle "Paramètres de référence Niveaux de ville" en section 7.1 pour le détail concret.

**Conséquence sur le modèle de données :** en plus des types `simple`/`advanced` déjà définis pour l'entité Formule, on prévoit une entité séparée **Table de référence** pour les cas nécessitant des valeurs brutes plutôt qu'une formule :

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| key | string | Identifiant technique (ex: `equipment_tiers`) |
| label | JSON `{en, fr, es, de}` | Nom lisible (utile en admin) |
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
| role | enum | `super_admin` / `admin` / `guides_manager` / `calculators_manager` |
| created_at | datetime | Date de création du compte |
| last_login_at | datetime (nullable) | Dernière connexion |

**Gestion des mots de passe et rôles — décidé :**
- Chaque utilisateur peut **changer son propre mot de passe** (self-service, depuis son profil admin)
- Le **Super Admin peut changer le mot de passe de n'importe quel utilisateur**, ainsi que **modifier les rôles**

Accès à la page `/admin/users` (création/suppression de comptes, gestion globale) : **Super Admin uniquement**. Le changement de son propre mot de passe reste accessible à tous les rôles admin, ailleurs dans l'interface (profil personnel).

**⚠️ Point technique pour Codex :** NextAuth est habituellement pensé autour d'un identifiant email — utiliser un `username` à la place est tout à fait faisable (Credentials Provider avec username), juste à configurer explicitement plutôt que la configuration par défaut.

### Logs / Historique (`/admin/logs`)

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Qui a fait l'action (lien vers Utilisateurs) |
| action | enum | `create` / `update` / `delete` / `publish` / `unpublish` / `activate` / `deactivate` |
| entity_type | enum | `guide` / `calculator` / `user` |
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
| Mur | `base × ratio^(niveau−1)` | 70 | 1.2 |
| Coût d'upgrade | niveau 1 = 0, niveau 2 = base, niveau≥3 = `base × ratio^(niveau−2)` | 10 | 1.2 |
| Army/h | dérivé : `multiplicateur × VP(niveau)` | — | multiplicateur = 3 |
| Gold/h | dérivé : `multiplicateur × VP(niveau)` | — | multiplicateur = 10 |

Toutes vérifiées niveau par niveau contre les observations en jeu (erreur < 2% sur toute la plage 1-100 testée, souvent proche de 0%).

**✅ Décidé : un jeu de paramètres par ligue.** Plutôt qu'une seule table de base + multiplicateurs globaux (ancienne approche), chaque ligue (Bronze/Argent/Or/Platine/Diamant/Légende) a son **propre jeu de paramètres** (base + ratio, éventuellement différents par ligue) — plus flexible si la croissance elle-même change par ligue, pas seulement une valeur de départ. Seule la ligue Légende est confirmée à ce stade ; les autres seront complétées au fur et à mesure (Argent bientôt, Diamant dans ~15 jours).

**✅ Décidé : ces paramètres sont éditables dans l'admin** (rôle Gestion Calculateurs) — si un patch change un ratio ou une base, pas besoin de Codex, juste une modification de valeur en admin.

**Modèle de données (remplace la table de référence CSV pour l'usage runtime) :**

| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| league | enum | bronze / silver / gold / platinum / diamond / legend |
| stat_key | string | `vp`, `wall`, `upgrade_cost`, `army_per_hour`, `gold_per_hour` |
| base | decimal (nullable) | Valeur de départ (niveau 1), si applicable |
| ratio | decimal (nullable) | Taux de croissance géométrique, si applicable |
| derived_from | string (nullable) | Pour Army/h et Gold/h : `vp` (stat dont ils dérivent) |
| multiplier | decimal (nullable) | Pour les stats dérivées : facteur multiplicateur |

Le fichier `reference-data-city-levels.csv` construit aujourd'hui **reste utile comme preuve de validation** (historique de comment on a trouvé/vérifié ces formules), mais n'est plus la source de données à l'exécution — c'est juste un artefact de travail.

#### Villes — Calculateur 1 : City Cost

**Objectif :** estimer le coût pour upgrader une ou plusieurs villes d'un niveau A à un niveau B.

**Inputs :**
- Nombre de villes
- Niveau de départ (A)
- Niveau cible (B)
- *(à ajouter suite à la décision multi-ligues)* Ligue du joueur

**Outputs — en deux parties :**

*Pour 1 ville (avant/après) :*
- Coût (pour upgrader une seule ville de A à B)
- Mur de la ville — niveau source A et niveau cible B
- VP — niveau source A et niveau cible B
- Production gold et troupes (Gold/h, Army/h) — niveau source A et niveau cible B

*Pour le nombre de villes défini (agrégé) :*
- Coût total (pour l'ensemble des villes)
- VP total gagné (pour l'ensemble des villes upgradées)
- Production gold et troupes totale — niveau source A et niveau cible B (× nombre de villes)

**Calculs du calculateur :**
```
--- Pour 1 ville ---
Coût = CoûtCumulé(B) − CoûtCumulé(A)
Mur A = Mur(A)          Mur B = Mur(B)
VP A = VP(A)             VP B = VP(B)
Gold/h A = Gold(A)       Gold/h B = Gold(B)
Army/h A = Army(A)       Army/h B = Army(B)

--- Pour le nombre de villes ---
Coût total = Coût × nombre_de_villes
VP total gagné = [VP(B) − VP(A)] × nombre_de_villes
Gold/h total A = Gold(A) × nombre_de_villes    Gold/h total B = Gold(B) × nombre_de_villes
Army/h total A = Army(A) × nombre_de_villes    Army/h total B = Army(B) × nombre_de_villes
```
Où `CoûtCumulé`, `VP`, `Mur`, `Gold` et `Army` sont calculés via les formules/paramètres de la table "Niveaux de ville" ci-dessus, selon la ligue du joueur.

**Paramètres numériques :** utilise les paramètres de la table "Niveaux de ville" comme variables (calcul interne via `mathjs`, non exposé à l'admin — voir section 6) — plus `lookup_table`

**Statut des données :** ✅ **Calculateur entièrement validé pour la ligue Légende** — VP, Mur, Army/h, Gold/h et Coût d'upgrade tous confirmés en jeu et réduits à 7 paramètres de formule. ⏳ Paramètres des autres ligues à mesurer.

#### Villes — Calculateur 2 : City Max Level (niveau atteignable avec un budget)

**Objectif :** à partir d'un budget d'or, déterminer le niveau maximum atteignable pour un groupe de villes parties du même niveau de base.

**Inputs :**
- Nombre de villes
- Niveau de départ (toutes les villes au même niveau de base)
- Quantité d'or disponible
- *(à ajouter suite à la décision multi-ligues)* Ligue du joueur

**Outputs :**
- Niveau cible atteignable
- Or restant après upgrade
- VP gagnée (pour l'ensemble des villes)
- Production troupes et gold (Army/h, Gold/h) — niveau source A et niveau cible B (pour l'ensemble des villes)

**Logique de calcul :** on cherche le plus grand niveau B tel que `[CoûtCumulé(B) − CoûtCumulé(A)] × nombre_de_villes ≤ or_disponible`, en calculant `CoûtCumulé` via les mêmes paramètres de formule que le Calculateur 1. Ce n'est pas un calcul direct mais une recherche itérative (on teste les niveaux B successifs jusqu'à dépasser le budget, puis on recule d'un cran).

**⚠️ Point d'architecture — décidé :** ce calculateur ne rentre pas proprement dans le modèle `simple`/`advanced`/`lookup_table` tel que défini, puisqu'il nécessite une **boucle/recherche**. **Décision : Option B — codé "en dur" par Codex.** La logique de recherche sera écrite directement dans le code de l'application, pas éditable dynamiquement en admin. Le rôle Gestion Calculateurs garde la main sur l'activation/désactivation et sur les paramètres de formule sous-jacents, mais pas sur la mécanique de recherche elle-même.

**Outputs dérivés une fois B trouvé :**
```
Or restant = or_disponible - [CoûtCumulé(B) - CoûtCumulé(A)] × nombre_de_villes
VP gagnée = [VP(B) - VP(A)] × nombre_de_villes
Army/h total A = Army(A) × nombre_de_villes    Army/h total B = Army(B) × nombre_de_villes
Gold/h total A = Gold(A) × nombre_de_villes    Gold/h total B = Gold(B) × nombre_de_villes
```

#### Villes — Calculateur 3 : City Production

**Objectif :** afficher directement les stats de production d'une ou plusieurs villes à un niveau donné.

**Inputs :** niveau de la ville, ligue du joueur, nombre de villes
**Outputs :** Army/h, Gold/h, VP, Mur (pour 1 ville, et totaux si nombre de villes > 1)
**Paramètres numériques :** calcul direct via les paramètres de formule (interne via `mathjs`, non exposé à l'admin), plus de table à consulter
**Statut des données :** ✅ Formules validées pour Légende. ⏳ Autres ligues à mesurer.

#### Villes — Autres sous-outils identifiés sur MLCLord (à spécifier plus tard)
- *Max Troops Demo* — calcul des troupes max pour les attaques de démonstration (Diamant League)

#### Notes générales — multiplicateurs par ligue

| Ligue | Multiplicateur coût | Multiplicateur défense/mur |
|---|---|---|
| Bronze | ×0.704 | ×0.76 |
| Argent | ×0.76 | ×0.806 |
| Or (base) | ×1.0 | ×1.0 |
| Platine | ×0.88 | ×0.915 |
| Diamant | ×1.25 | ×1.18 |
| Legends | ×1.45 | ×1.30 |

> ✅ **Confirmé** : une note de patch officielle du jeu mentionne explicitement des ajustements de production **par ligue** ("Gold league: Troops/Armies production increased"), ainsi qu'un changement des valeurs de mur. Ce n'est donc pas une divergence entre sources obsolètes : **les stats varient bien selon la ligue du joueur.**
>
> **Décision d'architecture :** on adopte l'**Option B** — la table de référence actuelle (`reference-data-city-levels.csv`) devient la **base pour la ligue Légende** (celle confirmée par le joueur), complétée par une **table de multiplicateurs par ligue** (Bronze/Argent/Or/Platine/Diamant/Légende) appliqués aux stats concernées (production, mur — coût et VP à confirmer aussi). Valeur finale = `valeur_de_base(niveau) × multiplicateur(ligue, stat)`.
>
> **Reste à faire :** déterminer les multiplicateurs exacts par ligue pour chaque stat concernée (production army/gold en priorité, à étendre si mur/coût/VP s'avèrent aussi concernés). Tâche de collecte de données à part, pas bloquante pour la structure du calculateur.

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
- **Nouvelle entrée dans les Paramètres du joueur : "Bonus de Temple du Clan"**, saisie **directement par le joueur** (pas calculable depuis ses seuls Templiers, puisque ça dépend de tout le clan) — 5 champs (Attaque/Défense/Or/Recruteur/Vitesse), avec un **minimum = base du temple sans aucun templier investi** :

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
- *(implicite, lu depuis les Paramètres du joueur en localStorage)* Compétences perso (Prosperous %, Recruiter %) et Bonus de Temple du Clan (Or %, Recruteur %), séparément
- Heures de production Or reçues, heures de production Troupes reçues (pour la sous-section Récompenses)

**Outputs :**
- *Par ville* : VP, Mur, Gold/h, Army/h (base, sans bonus)
- *Total* : VP total, Production d'or (Total / dont Base / dont Stuff / dont Temple), Production de troupes (idem)
- *Récompenses* : bonus Or obtenu, bonus Troupes obtenu

**Calculs :**
```
--- Par ville ---
VP = VP(niveau_moyen)   Mur = Mur(niveau_moyen)
Gold/h = Gold(niveau_moyen)   Army/h = Army(niveau_moyen)

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

**🚨 Correction importante — les seuils repères dépendent de la ligue, pas un tableau universel fixe :**

| Ligue | Seuils repères (%) |
|---|---|
| Argent (Silver) | 1, 6, 15, 50, 75, 100 |
| Platine | 1, 6, 15, 50, 100 |
| Diamant | 1, 6, 25, 60, 100 |
| Légende | 1, 6, 25, 50, 60, 100 |
| Bronze | ⏳ non confirmé |
| Or (Gold) | ⏳ non confirmé |

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

**Statut : ✅ Calculateur spécifié**, seuils Bronze/Or encore à confirmer (non bloquant, les 4 autres ligues sont prêtes).

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

**✅ Données Argent confirmées par le joueur** (seule ligue avec plusieurs types de récompenses simultanées : saphirs + speedup + gemmes) :

| Seuil | Ligue cible | Récompense |
|---|---|---|
| 1% | Montée Or | 100 saphirs, 7 speedup, 6 gemmes |
| 6% | Montée Or | 50 saphirs, 6 speedup, 4 gemmes |
| 15% | Montée Or | 25 saphirs, 5 speedup, 2 gemmes |
| 50% | Maintien Argent | 20 saphirs, 4 speedup, 2 gemmes |
| 75% | Maintien Argent | 15 saphirs, 3 speedup, 1 gemme |
| 100% | Maintien Argent | 10 saphirs, 2 speedup, 1 gemme |

**📋 État des lieux complet par ligue (6 ligues au total) :**

| Ligue | Seuils repères | Récompenses |
|---|---|---|
| Bronze | ⏳ non confirmé | ⏳ non confirmé |
| Argent | ✅ 1,6,15,50,75,100 | ✅ confirmées |
| Or | ⏳ non confirmé | ⏳ non confirmé |
| Platine | ✅ 1,6,15,50,100 | ⏳ non confirmé |
| Diamant | ✅ 1,6,25,60,100 | ✅ confirmées |
| Légende | ✅ 1,6,25,50,60,100 | ✅ confirmées |

**Reste à définir : Bronze et Or entièrement (seuils + récompenses), Platine (récompenses seulement).**

**⚠️ Note :** la formule ne fonctionne pas si pourcentage = 0% (division par zéro) — cas limite à gérer si jamais rencontré.

#### Autres calculateurs existants à traiter ensuite
- **Combat** : Level Up, Fight, Enemy Troops
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

#### 💡 Idée majeure — Configuration du "stuff" du joueur, réutilisable partout

**Vision proposée par le joueur :** permettre au joueur de configurer entièrement son équipement (les 9 pièces, leurs gemmes assignées par emplacement) une seule fois, et que cette configuration soit **automatiquement réutilisée dans tous les calculateurs qui en ont besoin** — pas besoin de ressaisir ses gemmes à chaque calculateur.

**Éléments déjà tranchés qui s'appliquent :**
- Stockage en **localStorage** (cohérent avec la décision déjà prise pour les paramètres du joueur — section 3.3), pas de compte joueur nécessaire
- Concerne à la fois les **Paramètres du joueur** (niveau, ligue, stats) et potentiellement une nouvelle section dédiée **"Mon stuff"** (équipements + gemmes assignées)

**Cas d'usage concrets qui en découlent :**
- Le calculateur Gemmes pourrait **visualiser les gemmes déjà possédées** par le joueur sur la grille d'emplacements (pas juste simuler un objectif dans le vide)
- D'autres calculateurs (Villes, Combat plus tard) pourraient lire directement les bonus de compétences du joueur (déjà amplifiés par ses gemmes) sans qu'il ait à ressaisir ses stats à chaque fois

**⏳ À détailler plus précisément quand on traitera Équipements** (structure des 4 types fonctionnels, quelles gemmes vont sur quel type) — pour l'instant, c'est une **décision de principe actée**, pas encore une spec technique complète.

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

**⚠️ Hypothèse à vérifier :** on suppose que la **même table de coût** (150, 195, 254...) s'applique aux 5 types de Templiers indifféremment — à confirmer si le coût varie selon le type (Attaque vs Or, etc.).

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

✅ **Points de compétence par niveau — confirmé par le joueur :**
```
Bronze / Argent / Or   → +1 point par niveau de Lord
Diamant / Légende         → +2 points par niveau de Lord
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

1. **"Compétences avec équipement"** — % directement saisi par le joueur, représentant sa stat totale réelle (points + bonus gemmes/équipement). C'est **cette valeur qui est utilisée par tous les calculateurs** (Production, City Cost...) via `getPersonalSkill()`. Min 0% / max 90% pour Intrépide et Bravoure (cohérent avec leur plafond confirmé) ; pas de plafond pour les autres sauf Récupération (max 50%, déjà établi).
2. **"Distribution des points"** — outil de **planification indépendant**, qui ne modifie pas les valeurs du bloc 1. Le joueur y saisit combien de points il investit dans chaque compétence, et voit le % calculé en résultat (base par ligue + points × taux, plafonné). Sert à préparer une répartition avant de la reporter manuellement dans "Compétences avec équipement" si besoin.

**Règles de calcul du bloc "Distribution des points" :**
```
Points_disponibles = (niveau − 1) × points_par_niveau(ligue)
%(compétence) = base_par_ligue(compétence) + points_investis × taux_par_point(compétence), plafonné si applicable
```

**✅ Contraintes de saisie confirmées et implémentées :**
- **Plafond global** : impossible d'allouer plus de points que le total disponible (la saisie se plafonne automatiquement au champ en cours de modification)
- **Auto-remplissage des prérequis** : investir un point dans une compétence à prérequis (ex: Charognard nécessite 5 points Attaque) remplit automatiquement la compétence prérequise au minimum requis
- **Cas limite** : si le budget de points restant ne suffit pas à satisfaire le prérequis, tous les points disponibles vont dans la compétence prérequise et **aucun point n'est alloué** à la compétence visée
- Un **bouton "Réinitialiser"** remet les 10 champs à 0 d'un coup

**Résumé visuel (bandeau replié) :** 2 lignes toujours visibles — ligne 1 : ligue/niveau/VP/templiers (avec couleurs distinctes par info) ; ligne 2 : les 10 compétences abrégées (Atq/Bra/Cha/Def/Int/Pro/Rec/Rup/Rcy/Vit) avec leur **valeur "Compétences avec équipement" additionnée au "Distribution des points"** (plafonnée à 90% pour Bravoure/Intrépide même si la somme dépasse). Reste sur 2 lignes fixes (retour à la ligne autorisé sous 640px, sinon défilement horizontal discret).

#### Équipements — données complètes récupérées (source enrichie fournie par le joueur)

**⚠️ Statut global : donnée non vérifiée en jeu.** Le joueur ne connaît pas le mécanisme de bonus par palier (3/6/9 pièces) et demande à le vérifier avant qu'on le considère comme acquis.

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

**⚠️ Anomalie à vérifier en priorité — sets Légendaires suspects :** pour les 4 sets Légendaires (Spirit Fulgur, Spirit Zephyr, Spirit Vanna, Spirit Fyra), les 9 emplacements affichent des valeurs **identiques** entre eux, contrairement aux autres raretés. Sauf pour Spirit Zephyr où l'Amulette diffère (valeur identique à Spirit Fulgur, probablement une erreur de copier-coller de la source). **Cette uniformité en Légendaire est suspecte** : soit une erreur de la source, soit une vraie particularité du palier le plus élevé — à vérifier en priorité.

**⚠️ 30 lignes encore manquantes (10 sets Épique/Rare/Commun)** — leur groupe Casque/Gantelet/Bottes n'a aucune valeur connue :

| Rareté | Sets concernés |
|---|---|
| Commun | Bard (Troupes/Vitesse), Journeyman (Défense), Thief (Or) |
| Rare | Adventurer (Défense), Smuggler (Or), Soldier (Attaque) |
| Épique | Knight (Défense), Royal Archer (Troupes/Vitesse), Royal Guard (Attaque), Shopkeeper (Or) |

**Prochaine étape concrète — à vérifier en jeu :**
1. Les noms des sets (Spirit Fulgur, Shark, Shopkeeper...) correspondent-ils à ce que tu vois dans ton inventaire ?
2. Le mécanisme de bonus 3/6/9 pièces existe-t-il vraiment, avec ces valeurs ?
3. L'uniformité suspecte des sets Légendaires — est-ce bien le cas en jeu ?
4. Les 30 lignes manquantes (tableau ci-dessus), si tu croises ces équipements

#### 💡 Vision du joueur — Configurateur de "stuff" complet

**Objectif :** le joueur configure ce qu'il possède réellement (par emplacement physique), et le site calcule automatiquement ses stats totales, résumées dans un tableau récapitulatif par famille de compétence.

**Structure d'interface suggérée, maintenant que les 9 emplacements sont identifiés :**
- Une grille de 9 emplacements nommés (Arme, Bouclier, Ceinture, Anneau, Bracelet, Amulette, Casque, Gantelet, Bottes) — même principe visuel que la grille de gemmes déjà prototypée
- Pour chaque emplacement : sélecteur "Famille" (Or/Troupes-Vitesse/Défense/Attaque) + "Rareté" (Commun→Légendaire)
- Un tableau récapitulatif en dessous, une ligne par compétence (les 10), montrant le total cumulé donné par le stuff configuré
- Sauvegarde en localStorage (cohérent avec l'architecture déjà actée), réutilisable dans tous les calculateurs

**Reste à confirmer :** un emplacement est-il libre de recevoir n'importe quelle famille (ex: mettre un objet "Attaque" dans l'emplacement Bottes), ou chaque emplacement est-il contraint à une famille précise ?

#### ✅ Système de fusion des équipements — confirmé par le joueur

Les équipements suivent le **même principe de fusion binaire par étoiles que les gemmes** : 2 équipements 1★ identiques → 1 équipement 2★ (probablement même règle que les gemmes : même set, même rareté requis pour fusionner — à confirmer).

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
| Gantelet du Barbare | Commun | Intrépide | 1★=4% → 2★=6% | +2 |
| Bottes du Barbare | Commun | Intrépide | 1★=2% → 2★=4% | +2 |
| Gantelet du Chasseur | Rare | Intrépide | 1★=4% → 2★=6% | +2 |
| Gantelet du Chasseur | Rare | Recruteur | 1★=3% → 2★=6% | +3 |
| Amulette (Spirit Fyra) | Légendaire | Attaque/Charognard/Intrépide | 1★=10% → 5★=18% | +2 |
| Équipement (Spirit Zephyr) | Légendaire | Vitesse/Intrépide/Bravoure/Recruteur | 5★→6★ : 45→50 / 18→20 / 18→20 / 27→30% | +5 / +2 / +2 / +3 |
| Équipement (Spirit Fulgur) | Légendaire | Prospérité/Recycleur/Charognard/Récupération | 5★→6★ : 27→30 / 9→10 / 18→20 / 9→10% | +3 / +1 / +2 / +1 |
| **Équipement (Spirit Vanna)** | **Légendaire** | **Défense/Bravoure/Recycleur** | **1★=15/10/5% → 5★=27/18/9%** | **+3 / +2 / +1** |

Chaque nouvel exemple reconfirme des incréments déjà déduits (Bravoure et Recycleur revérifiés une nouvelle fois) tout en complétant les compétences manquantes — **les 10 compétences ont maintenant chacune au moins une confirmation indépendante.**

**⏳ Reste à vérifier (non bloquant, la formule est fiable) :**
- Le coût en gemmes de base double-t-il aussi à chaque étoile (`2^(n−1)`) comme pour les gemmes, ou le coût de fusion des équipements est-il différent (ressources différentes, montants différents) ?
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

**Précision sur les catégories d'équipement :** les équipements se répartissent en **4 types fonctionnels** (probablement liés à des rôles de combat — attaque/défense/or/troupes, à confirmer précisément quand on traitera Équipements), qui déterminent quels types de gemmes peuvent y être socketés (cohérent avec la restriction déjà notée : gemmes Striker sur gear offensif, Salvager sur gear défensif...). Mais le **total reste 9 équipements × 3 emplacements = 27 gemmes max** — les 4 types ne réduisent pas ce total, ils catégorisent juste quels gemmes vont où.

**✅ Objectif du calculateur confirmé (révisé) :** à partir d'une **stat cible totale** souhaitée sur une compétence donnée et d'un **nombre d'emplacements disponibles** (jusqu'à 27), déterminer **le niveau d'étoile par gemme** nécessaire (en répartissant équitablement sur les emplacements disponibles) pour atteindre la cible, ainsi que le **nombre total de gemmes de base et le coût total en saphirs**.

**✅ Coût d'une gemme de base — confirmé par le joueur (corrigé) :**
```
Prix(ligue) = 3000 + 1000 × (rang_ligue − 2)
```
où `rang_ligue` = 2 pour Argent (première ligue où l'achat est possible, pas d'achat en Bronze), 3 pour Or, 4 pour Platine, 5 pour Diamant, 6 pour Légende. Soit : **Bronze — pas d'achat possible** · Argent 3000 · Or 4000 · Platine 5000 · Diamant 6000 · Légende 7000 saphirs par gemme de base (1★).

**⚠️ Nuance à retenir :** "pas d'achat possible en Bronze" concerne uniquement le calculateur Gemmes (simulation d'un **achat**). Dans le Simulateur de Stuff, la ligue Bronze **reste sélectionnable** pour les gemmes déjà **possédées** par le joueur (héritées d'une ligue passée, obtenues autrement qu'à l'achat) — les valeurs `y` de Bronze existent bel et bien (voir tableau plus bas), seul l'achat direct est bloqué.

**✅ Décidé — trois modes de calcul, au choix de l'utilisateur :**
1. **Répartition égale** — l'utilisateur choisit un nombre d'emplacements à utiliser, la stat cible est divisée équitablement entre eux
2. **Optimisation coût** — le calculateur cherche automatiquement la répartition la moins chère pour atteindre la cible, dans la limite du nombre d'emplacements disponibles (jusqu'à 27)
3. **Budget disponible** — à partir d'un budget en saphirs et d'un nombre d'emplacements disponibles, détermine combien de gemmes acheter et comment les fusionner pour **maximiser la stat obtenue** (problème inverse du mode 2 : au lieu de partir d'une cible, on part d'un budget et on maximise le résultat). Affiche aussi le budget restant non dépensé.

**Logique de calcul complète du calculateur (mode Répartition égale) :**
```
1. Bonus nécessaire par emplacement : bonus_par_gemme = stat_cible / nb_emplacements
2. Étoile minimale par gemme : n = plafond_supérieur(bonus_par_gemme / y(compétence, ligue))
3. Gemmes de base requises TOTAL : nb_emplacements × 2^(n−1)
4. Coût total = GemmesRequisesTotal × Prix(ligue)
5. Stat réellement obtenue = nb_emplacements × n × y(compétence, ligue)
```

**Logique de calcul complète du calculateur (mode Optimisation coût) :**
```
1. Nombre de gemmes 1★ nécessaires si emplacements illimités : base_needed = plafond_supérieur(stat_cible / y)
2. Si base_needed ≤ emplacements_max : utiliser base_needed emplacements à 1★ chacun (solution la moins chère possible)
3. Sinon (cible trop élevée pour le nombre d'emplacements) : répartir sur emplacements_max emplacements avec le niveau d'étoile minimal commun n tel que emplacements_max × n × y ≥ stat_cible
4. Coût total = (nb emplacements utilisés) × 2^(n−1) × Prix(ligue)
```
*(Justification mathématique : le coût croît de façon convexe/exponentielle par étoile alors que le bonus croît linéairement — utiliser un maximum d'emplacements à faible niveau est donc toujours plus économique que peu d'emplacements à haut niveau, tant que le nombre d'emplacements disponibles le permet.)*

**✅ Précision confirmée par le joueur — objectif révisé et algorithme d'optimisation final :**
- L'objectif est de **se rapprocher au maximum de la stat cible, sans besoin de la dépasser** (résultat le plus proche possible, au-dessus ou en dessous)
- La solution optimale peut **mixer plusieurs niveaux d'étoiles différents** (ex: 10 gemmes 3★ + 10 gemmes 2★), pas uniquement un seul niveau uniforme

**Algorithme d'optimisation coût — version finale :**
```
1. Nombre d'unités de bonus nécessaires (arrondi au plus proche) : U = arrondi(stat_cible / y)
2. Si U ≤ emplacements_disponibles :
   → U gemmes à 1★ chacune (solution la plus simple et la moins chère, aucun besoin de fusionner)
3. Sinon (U > emplacements_disponibles) :
   → Répartir U unités le plus uniformément possible sur emplacements_disponibles gemmes :
      base = partie_entière(U / emplacements_disponibles)
      reste = U modulo emplacements_disponibles
   → "reste" gemmes au niveau (base+1)★, et (emplacements_disponibles − reste) gemmes au niveau base★
   → Cette répartition est mathématiquement optimale (le coût par étoile étant convexe/exponentiel, répartir le plus uniformément possible entre tous les emplacements disponibles minimise toujours le coût total)
```
*(C'est la solution rigoureusement optimale : pour un nombre d'emplacements donné, répartir la charge le plus également possible entre eux minimise toujours le coût total, quitte à mélanger deux niveaux d'étoiles adjacents quand la division n'est pas exacte.)*

**Logique de calcul complète du calculateur (mode Budget disponible) :**
```
1. Gemmes de base achetables avec le budget : G = partie_entière(budget / Prix(ligue))
2. Si G ≤ emplacements_disponibles : utiliser G emplacements à 1★ chacun (pas de fusion nécessaire)
3. Sinon : répartir les G gemmes le plus uniformément possible sur emplacements_disponibles emplacements —
   chaque emplacement doit recevoir un compte de gemmes en puissance de 2 (1, 2, 4, 8...), correspondant à un niveau d'étoile entier,
   ce qui donne un mix de deux niveaux d'étoiles adjacents (comme pour le mode Optimisation coût)
4. Coût réel = gemmes effectivement utilisées × Prix(ligue) ; budget restant = budget − coût réel
```
*(Approche jumelle du mode Optimisation coût : au lieu de partir d'une stat cible et calculer le coût minimal, on part d'un budget fixe et on cherche la répartition qui maximise la stat obtenue avec ce budget.)*

**Inputs (mode Budget) :** compétence, ligue, emplacements disponibles, budget en saphirs
**Outputs (mode Budget) :** nombre de gemmes de base à acheter, détail de fusion (combien à chaque niveau d'étoile), stat obtenue, budget restant non dépensé

**Inputs :** compétence, ligue, stat cible (%)
**Outputs :** niveau d'étoile minimal nécessaire, nombre de gemmes de base requises, coût total en saphirs, stat réellement obtenue (peut légèrement dépasser la cible si le palier d'étoile ne tombe pas exactement dessus)

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

## 8. Administration — Fonctionnalités attendues (checklist synthèse)

*(reprend en checklist ce qui est détaillé en section 3.2)*

- [ ] CRUD guides (créer, éditer, supprimer)
- [ ] Publier / dépublier un guide
- [ ] Éditeur WYSIWYG type Ghost pour le contenu des guides
- [ ] Activer / désactiver un calculateur
- [ ] Éditer les paramètres numériques d'un calculateur (pas de formule libre)
- [ ] Gestion des traductions EN/FR pour guides et calculateurs
- [x] Système de rôles admin — 4 niveaux définis : Super Admin, Admin, Gestion Guides, Gestion Calculateurs (voir section 3.2)
- [x] Historique des modifications (qui, quoi, quand — voir section 6 bis)
- [x] Page de gestion des utilisateurs admin (voir section 6 bis)
- [ ] *(optionnel)* Tableau de bord synthétique

---

## 9. Prochaines étapes

**Points ouverts par sujet (état au dernier échange) :**

1. **Équipements de combat** — formule de progression par étoile ✅ résolue (10/10 compétences). Reste : vérifier en jeu le mécanisme de bonus 3/6/9 pièces, l'uniformité suspecte des sets Légendaires, le coût de fusion en gemmes (double comme les gemmes ou différent ?), et les 30 lignes de valeurs encore manquantes (10 sets)
2. **Équipement d'Expédition** — 2 stats sur 10 confirmées (Équipement +0,2/★, Vitalité +2,5/★). Reste : les 8 stats restantes, coût de fusion en Terradust, pattern "même valeur sur les 6 emplacements" (prudence, une hypothèse similaire s'était révélée fausse côté combat)
3. **Classement (Ranking)** — récupérer les seuils et récompenses pour Bronze, Or, et les récompenses pour Platine
4. **Combat** (Level Up, Fight, Enemy Troops) — catégorie pas encore commencée, c'est le plus gros trou restant
5. **Simulateur d'achat de consommables** — liste des objets et prix en saphirs à collecter, catégorie d'accueil à trancher
6. **Guides** — modèle de données prêt, aucun guide concret rédigé pour l'instant
7. **Cohérence de nommage** — les noms de calculateurs Villes ont été traduits en français dans le prototype (Coût de Ville, Niveau Max Atteignable, Production, Classement) ; ce document garde les noms techniques anglais (City Cost, City Max Level, Ranking) par choix — à confirmer si ça doit aussi être traduit ici

**✅ Résolu récemment :**
- **Reskill full-prod** — implémenté comme case dédiée dans le calculateur Production
- **Système de répartition des points de compétence** — implémenté (2 blocs séparés : "Compétences avec équipement" et "Distribution des points", avec plafond global et auto-remplissage des prérequis)
- **Nom de domaine** — `ml-helper.com` décidé (option `.gg` encore à l'étude par le joueur)

**Changements structurels récents à retenir :**
- La catégorie **"Production" a été retirée** — tout fusionné dans **Villes**, qui a maintenant 3 calculateurs : Coût de Ville, Niveau Max Atteignable, et **Production** (qui regroupe elle-même Production de Ville + Production totale + Récompenses, auparavant 3 calculateurs séparés)
- Une nouvelle catégorie **"Référentiels"** regroupe les données consultables (Équipements Combat/Expédition), distincte de "Compétences" qui ne contient plus que les vrais outils de calcul (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers)
- Les **Templiers personnels ne contribuent plus automatiquement à la production du joueur** — ils alimentent un pool de clan séparé ("Bonus de Temple du Clan"), saisi directement par le joueur
- Les **Paramètres du joueur** distinguent maintenant "Compétences avec équipement" (valeur réellement utilisée par les calculateurs) et "Distribution des points" (outil de planification indépendant)
- **Ergonomie transverse** : tous les champs numériques ont un stepper −/+ personnalisé (au lieu des flèches natives du navigateur), y compris les champs générés dynamiquement

**Rappel de méthode (acté suite à plusieurs corrections) :** ne jamais présenter une valeur extrapolée/devinée comme confirmée — marquer explicitement "non vérifié" et demander confirmation plutôt que d'assumer un pattern à partir d'exemples partiels.
