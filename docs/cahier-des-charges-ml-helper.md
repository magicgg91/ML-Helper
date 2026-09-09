# Cahier des charges — ML-Helper (site outils & guides Million Lords)

Statut : brouillon en cours de construction
Dernière mise à jour : 29/08/2026 (audit complet de conformité repo↔cdc/brief, 4 sous-agents parallèles — voir constats "🚨 Constat d'audit" répartis dans le document, et résumé ci-dessous)

**📋 Résumé de l'audit du 29/08/2026** (lecture seule, 1 bug flagrant corrigé en direct — points de compétence/niveau Platine, était 2 au lieu de 1, commit `bdec46f`) :
- **Écarts d'implémentation trouvés** (formule/donnée verrouillée depuis longtemps, jamais construite) : coût de fusion en Pouciel (Combat) — voir section 7.1 ; champ admin Level Up Argent absent malgré la règle AGENTS.md — voir section 7.1 ; Simulateur d'Équipement d'Expédition sans indicateur Légendaire vs extrapolé — voir section 9.
- **Écarts mineurs de cohérence UI** : `--gold` (réservé au Légendaire par son propre commentaire de code) utilisé aussi pour le bouton de filtre famille "Or" — à corriger, remplacer par une couleur de famille distincte ; 1 clé de traduction orpheline (`Navigation.admin` présente en EN, absente en FR) — clé morte, sans usage en production, à nettoyer ou retirer.
- **Données à compléter, pas de bug de code** : Classement Bronze/Or renseignés depuis (fait à la main par le joueur en admin, 31/08/2026) — Platine reste à confirmer (5 seuils sur 6, palier 75% toujours absent) ; 21 lignes d'Équipement de Combat (7 sets : Bard, Journeyman, Thief, Adventurer, Knight, Shopkeeper, Soldier) confirmées dans ce document mais pas encore reportées dans `equipment-data.ts` — saisie manuelle en admin, pas une tâche Codex.

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
| Traductions | Champ JSON par locale pour le contenu éditorial dynamique uniquement (guides, mentions légales : `{en, fr, es, de, ...}`). Tout le texte fixe — y compris les labels admin — passe par les fichiers de traduction statiques, un seul mécanisme pour tout le reste (voir section 3.3). Repli sur l'anglais si une traduction manque. **✅ Livré (Bloc 42, PR #68, point F — décision initialement notée "Bloc 45", fusionnée avant envoi) — exception pour le contenu des guides : pas de repli silencieux, un message indicateur explicite à la place.** Les guides ne sont réellement rédigés qu'en français/anglais (contenu éditorial écrit à la main par le porteur de projet, pas traduit automatiquement comme le texte fixe). Si un guide n'a pas de contenu pour la langue active (n'importe quelle langue, y compris FR/EN entre eux si l'un des deux manque), **un message placeholder visible indique que ce guide n'est pas encore traduit dans cette langue** — plutôt que de basculer silencieusement vers une autre langue sans que le lecteur s'en rende compte. Cette exception concerne uniquement le **contenu des guides** (titre/résumé/corps de l'article) — le reste du site (texte fixe de l'interface, mentions légales) garde le repli silencieux sur l'anglais déjà en place. |
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

**✅ Décidé — palette de couleurs, commune aux deux univers** (retour joueur, l'accent doré jugé pas assez engageant) : **violet (couleur Mythique) comme accent principal de l'UI** (boutons, liens actifs, focus) — pas le doré, réservé exclusivement à la mise en avant des données de jeu réellement Légendaire (badges de rareté, éléments légendaires dans les référentiels/simulateurs). Cette séparation évite de diluer le signal "Légendaire" en l'utilisant aussi comme couleur d'interface générique. **Mode sombre** : fond bleu-nuit/anthracite, jamais noir pur ni teinte brune. **✅ Livré (Bloc 34, PR #55) — mode sombre légèrement éclairci** (2e retour dans ce sens, après un 1er retour testeur au Bloc 33 jugé alors insuffisant à lui seul pour trancher) : augmenter légèrement la luminosité du fond bleu-nuit/anthracite — ajustement léger, pas un changement de teinte ni un passage à un fond clair, juste un cran de luminosité en plus sur les mêmes couleurs déjà en place. **Mode clair** : fond légèrement teinté (pas de blanc pur), cohérent avec la même famille de couleur que le mode sombre plutôt que deux identités visuelles déconnectées. **Mêmes couleurs sur le site public et l'admin** — un seul système de design, pas deux.

**✅ Livré (Bloc 33, PR #54) — thème par défaut : détection automatique de la préférence système, plus de sombre forcé.** Suite à un retour testeur ("un peu trop sombre", jugé subjectif mais pas assez pour trancher sur un seul retour) : au lieu de démarrer systématiquement en mode sombre, détecter la préférence OS/navigateur de l'utilisateur (`prefers-color-scheme`) et l'appliquer par défaut à la première visite. Le bouton de bascule thème manuel (déjà en place) reste inchangé — l'utilisateur garde la main pour override ce choix automatique, mémorisé ensuite comme aujourd'hui.

### 3.1 Site public

**✅ Décidé — titre d'onglet du navigateur, site public** (nouveau, trouvé "Admin" dans le titre par erreur) : jamais "Admin" dans le titre d'onglet des pages publiques. **Accueil = "ML Helper"** seul, sans suffixe. **Pages listing = nom de la page visitée** (ex: "Guides", "Outils", "Contact") — pas de préfixe/suffixe répétitif type "ML Helper — Guides", juste le nom de la page.

**✅ Précisé — titre d'onglet des pages individuelles (retour joueur, après test)** :
- **Page d'un outil** (`/tools/[slug]`) : `"Outils — [Catégorie]"` — la **catégorie**, pas le nom du simulateur précis (ex: "Outils — Classement", "Outils — Villes" pour Coût de Ville/Niveau Max/Production, qui sont tous les trois en catégorie Villes).
- **Page d'un guide** (`/guides/[slug]`) : `"Guides — [Titre du guide]"` — le **titre précis** du guide cette fois, pas sa catégorie (ex: "Guides — Bien choisir et rejoindre un clan").

**✅ Décidé — barre de navigation publique à mettre en avant** (retour joueur post-Bloc 11) : jugée actuellement trop discrète, à traiter avec un style plus marqué (ex: boutons plutôt que simples liens texte — piste à explorer, pas une contrainte stricte). ~~**Sélecteur de langue public aligné sur le pattern admin** : mêmes boutons FR/EN directement cliquables (composant `AdminLocaleToggle` du Bloc 11bis, à généraliser/dé-scoper de l'admin plutôt que dupliqué), pas de `<select>`/menu déroulant côté public non plus.~~ **✅ Livré (Bloc 47, PR #70) — revirement : select box plutôt que boutons, maintenant que le site compte 5 langues (EN/FR/DE/ES/TR, Bloc 44).** 5 boutons distincts devient encombrant à cette échelle (c'était pensé pour 2 langues à l'origine). **Passage à un `<select>`, mais stylé pour matcher l'esthétique des boutons actuels — pas un select brut au rendu natif du navigateur.** Annule la règle "pas de select/menu déroulant" ci-dessus, qui ne tient plus à 5 langues.

**✅ Livré (Bloc 47, PR #70) — détection de la langue du navigateur au premier chargement, puis persistance en localStorage.** Même principe que la détection de thème clair/sombre déjà en place (Bloc 34, point B — `prefers-color-scheme`) : à la première visite, détecter la langue du navigateur (`navigator.language`/en-tête `Accept-Language`) et l'appliquer si elle fait partie des 5 langues supportées (repli sur `defaultLocale=fr` sinon). **Le choix — détecté ou modifié manuellement via le sélecteur — est ensuite mémorisé en localStorage**, cohérent avec le mécanisme déjà en place pour le thème.

**✅ Livré (Bloc 47, PR #70) — `AdminLocaleToggle` (langue de l'interface admin elle-même) restreint à EN/FR uniquement, revient en arrière sur l'extension à 5 langues du Bloc 44.** Distinction importante à bien garder : **2 sélecteurs de langue différents existent dans l'admin**, à ne pas confondre.
- **`AdminLocaleToggle`** (langue d'affichage de l'interface admin — menus, boutons, libellés `admin.*`) : **repasse à EN/FR uniquement**, simplification demandée — pas besoin de maintenir l'interface admin elle-même en 5 langues, seule l'équipe interne l'utilise.
- **Sélecteurs de langue par contenu éditorial** (guides, mentions légales, intro Consommables, futurs contenus dynamiques `{en, fr, es, de, tr}`) : **gardent bien les 5 langues** — ce sont eux qui déterminent le contenu vu par le public, aucun changement là-dessus.
Les traductions DE/ES/TR déjà faites pour le namespace `admin.*` (texte fixe de l'interface admin) restent dans les fichiers de traduction (harmless, pas besoin de les retirer) mais deviennent simplement inutilisées une fois `AdminLocaleToggle` limité à 2 options.

**✅ Livré (Bloc 47, PR #70) — 🐛 retour testeur : le repli anglais côté public affiche du français au lieu de l'anglais.** Contraire à la règle déjà établie "repli sur l'anglais si une traduction manque" (cdc section 2/3.3, confirmée et affinée au Bloc 44 avec le correctif fr→en pour DE/ES/TR côté admin) — sur le **site public**, quand une clé/un contenu manque pour la locale active, le comportement observé bascule vers le **français** plutôt que l'anglais. Cause probable : le mécanisme de repli confond `defaultLocale` (français, langue chargée par défaut pour un visiteur) avec le filet de sécurité universel (qui doit toujours être l'anglais, quelle que soit la langue par défaut du site) — exactement la même confusion déjà identifiée et corrigée pour un cas précis en admin au Bloc 44, mais visiblement pas généralisée à toute la partie publique. **Vérifier l'ensemble du mécanisme de repli côté public** (texte fixe next-intl ET contenu dynamique JSON par locale — guides, référentiels, mentions légales) et corriger pour que le filet de sécurité soit systématiquement l'anglais, jamais le français, indépendamment de `defaultLocale`.

**✅ Décidé — état actif sur les boutons de navigation** (nouveau, retour joueur) : le bouton correspondant à la page actuellement affichée doit être visuellement mis en évidence (style distinct des autres liens), cohérent avec le traitement déjà appliqué à la nav admin.

**✅ Décidé — débordement mobile de la barre du haut** : liens de nav + thème + langue passent actuellement sur 2 lignes sur mobile. **Menu hamburger pour les liens de navigation uniquement** (Outils/Guides/etc.) — thème et langue restent visibles hors du hamburger, à côté de l'icône ☰ (déjà en icône-seule, pas de texte, donc peu de largeur prise). Raison de garder thème/langue hors menu : réglages consultés "à la volée", ajouter un clic de menu introduit une friction inutile pour un besoin instantané (ex: basculer le thème en plein soleil).

**Accueil**
- Présentation du site, mise en avant de calculateurs/guides populaires ou récents

**Outils**
- **🚨 Révisé — les Référentiels en sortent, réservé aux vrais calculateurs.** Regroupés par catégorie : **Villes** (inclut désormais Production, Récompenses), Combat, Classement, **Compétences** (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers). "Outils" = formulaire de saisie → résultat calculé, exclusivement.
- Chaque simulateur : formulaire de saisie → résultat instantané, **sans titre ni texte d'explication** (décision révisée, voir "Sobriété du texte sur les pages de simulateurs" plus bas) — le nom déjà visible dans la navigation suffit
- Page liste filtrable par catégorie (une carte illustrée par catégorie, avec le nombre de simulateurs qu'elle contient, toute la carte cliquable). **✅ Grille mobile à 2 colonnes (retour joueur, après test)** : 2 catégories par ligne sur mobile, et à l'intérieur d'une catégorie ouverte, 2 outils par ligne également.

**Guides — ⚠️ historique : accueillait autrefois aussi les Référentiels, séparés depuis le Bloc 50**
- **✅ Livré (Bloc 50, PR #73) — 2 entrées de menu distinctes : "Guides" et "Référentiels"**, chacune sa propre racine d'URL (`/guides`, `/referentiels`) — ⚠️ **remplace la structure décrite ci-dessous, gardée pour traçabilité historique** : à l'origine, une seule entrée "Guides" contenait 2 sections internes (Guides + Référentiels : Équipements de Combat, Équipement d'Expédition, Level Up, Gemmes, Coût des Templiers, Boutique — 6 référentiels réels au final). Chaque section gardait déjà ses propres cartes de catégorie et son propre filtrage à l'époque — cette logique de séparation interne a simplement été promue en séparation de routing complète au Bloc 50.
- **Section Guides** : liste filtrable par catégorie (Débuter & progresser, Combat & conquête, Défense & territoire, Compétences & builds, Équipement & Templiers, Expéditions, Événements & classement, Clan & stratégie collective — voir section 10), page individuelle (contenu riche, images).

**🚨 Décision révisée — recherche globale, pas limitée aux guides** (retour joueur post-Bloc 13) : la recherche initialement scopée à la section Guides devient une **recherche unique pour tout le site** — guides, référentiels ET outils/simulateurs, avec résultats routés vers le bon endroit selon le type de contenu trouvé. Remplace la recherche locale à la page Guides.

**✅ Ajustement — texte du placeholder de la recherche** : le mécanisme de traduction fonctionne déjà correctement (pas un bug next-intl), juste le texte affiché à changer — "Rechercher" en FR, "Search" en EN.

**✅ Décidé — refonte visuelle des cartes de la section Guides** (jugées trop plates, retour joueur) : image de couverture **pleine largeur en haut de carte** (plus à gauche), **badge de catégorie visible directement sur la carte** (pas seulement dans le filtre), **hover state** (élévation/ombre ou léger zoom de l'image), **filtres en pills/chips cliquables** plutôt qu'en liste ou menu déroulant. Référence visuelle : pattern "responsive card grid" classique (Tailwind), carte = image en haut → titre → résumé, espacement généreux. **Latitude large sur l'implémentation** — pas de contrainte à préserver la structure actuelle si une meilleure approche se présente. **Concerne uniquement la section Guides** — voir note ci-dessous pour les Référentiels.
- **Section Référentiels** : les tableaux filtrables déjà spécifiés (rareté/famille/emplacement/compétence), inchangés dans leur fonctionnement — seul leur emplacement dans la navigation change. **🚨 Précision (retour joueur post-Bloc 13) : pas de filtre par pills au niveau de la page Référentiels elle-même** — contrairement aux Guides, les référentiels n'ont pas de notion de "catégorie" à filtrer (ce sont des items individuels : Équipements de Combat, Équipement d'Expédition, Level Up), et leur nombre reste faible. Simple liste/grille de cartes, sans filtre de premier niveau — les filtres internes (rareté/famille/emplacement/compétence) à l'intérieur de chaque référentiel restent inchangés.
- **✅ Décidé — liens croisés obligatoires** : puisque les référentiels ne sont plus dans la même zone de navigation que les simulateurs qui les utilisent (ex: Simulateur de Stuff ↔ Référentiel Équipements de Combat), chaque simulateur concerné doit avoir un **lien direct** ("Voir le référentiel complet") vers la section/le référentiel pertinent, pour compenser la perte d'adjacence de navigation. Concerne au minimum : Simulateur de Stuff et Comparaison de stuff → Référentiel Équipements de Combat ; tout calculateur d'Expédition futur → Référentiel Équipement d'Expédition.

**✅ Livré (Bloc 53, PR #75) — refonte visuelle des liens croisés outil↔référentiel, mix des options 2+3 discutées :** remplacer le lien texte brut actuel par un **bandeau centré "Aller plus loin en vérifiant le référentiel/outil"**, contenant une **mini-carte avec la miniature du référentiel** (réutilise les images du Bloc 51) — même esprit que les cadres déjà ajoutés pour Boutique (Bloc 52). Le libellé du bandeau s'adapte au sens du lien (ex: "Aller plus loin en vérifiant le référentiel" depuis un outil ; "Aller plus loin en utilisant l'outil" depuis un référentiel).

**✅ Livré (Bloc 54, PR #76) — lien croisé manquant dans le sens référentiel→outil pour Équipement de Combat et Équipement d'Expédition.** Le Bloc 53 a corrigé le bug de lien générique pour Gemmes/Templiers/Level Up, mais **le lien référentiel→outil est carrément absent** (pas juste mal ciblé) pour ces 2 référentiels — alors qu'il existe bien dans le sens outil→référentiel (Simulateur de Stuff → Référentiel Équipements de Combat, Simulateur d'Équipement d'Expédition → Référentiel Équipement d'Expédition). **Ajouter le lien manquant dans le sens inverse**, pour une réciprocité complète sur ces 2 paires, cohérente avec ce qui existe déjà pour Gemmes/Templiers/Level Up.

**✅ Livré (Bloc 54, PR #76) — refonte du rendu visuel du bandeau de lien croisé (Bloc 53), jugé trop petit.** Actuellement : phrase au-dessus, puis un bouton distinct en dessous (image + nom). **Nouveau rendu : un bouton plus grand, la phrase intégrée à l'intérieur du bouton lui-même** (pas au-dessus, séparée) — et **l'image (`.cross-reference-thumb`) passe à 5rem** (cohérent avec la taille déjà actée pour les images des tableaux référentiel Boutique/Combat/Expédition, Bloc 38/46).

**✅ Livré (Bloc 55, PR #77) — position du bandeau de lien croisé incorrecte sur les outils Compétences.** Le bandeau (Simulateur de Stuff, Simulateur d'Équipement d'Expédition, Gemmes, Templiers) est actuellement affiché **en haut de page** — il doit être **en bas, après le contenu de l'outil**. Corriger le positionnement sur les 4 outils de la catégorie Compétences.

**✅ Corrigé (Bloc 53, PR #75) — le lien référentiel→outil ne menait pas à l'outil précis, juste à la catégorie générique.** Exemple d'origine : depuis le référentiel Gemmes, cliquer pour aller vers l'outil amenait sur `/tools` catégorie Compétences (liste générique), pas directement sur le calculateur Gemmes. Cause : la spec initiale pointait vers "le calculateur (`/tools`, catégorie Compétences)" de façon générique plutôt que vers l'URL précise de l'outil. **Corrigé pour les 3 référentiels concernés : Gemmes, Templiers, et Level Up** (ce dernier trouvé par extension du périmètre pendant la vérification, pas explicitement demandé au départ) — chacun pointe désormais vers l'onglet exact du calculateur.

**✅ Livré (Bloc 39, PR #61) — [Référentiel Équipements de Combat + Référentiel Équipement d'Expédition uniquement, public] refonte complète : passage du tableau à un affichage en tuiles.** Motivation : les Blocs 35/37/38 ont dû corriger de façon répétée des problèmes de largeur de colonnes, scroll horizontal sur les filtres et troncature — symptômes révélateurs que le format tableau n'est pas adapté à ce contenu, surtout sur mobile. **Cette refonte annule et remplace les décisions de mise en forme tabulaire de ces 3 blocs pour ces 2 référentiels spécifiquement** (colonnes image/rareté, alternance de ligne, largeur de colonnes, etc. — obsolètes une fois passé en tuiles ; les décisions équivalentes pour Level Up, Templiers, Gemmes restent inchangées, elles gardent leur format tableau). **Notes de livraison :** le nombre de gemmes par tuile est lu depuis `gemSlotsBase` (admin-editable), pas le champ statique `row.gem_slots` — cohérent avec le tableau récapitulatif du référentiel. Accessibilité : `aria-label` complet par tuile (famille + rareté + set + emplacement) et indice pour lecteur d'écran sur les blocs estompés, sans badge visible — le codage couleur-seule (rareté/famille) est le choix de design assumé de ce bloc, pas un oubli d'accessibilité à corriger visuellement.

**✅ RÉGRESSION RÉSOLUE (Bloc 83, PR #100) — cause racine identifiée.** Le badge persistait après le merge de la PR #99, malgré la fermeture du Bloc 82 et un test de non-régression censé le couvrir. **Cause racine confirmée** : le test du Bloc 82 cherchait le texte littéral "Pouciel" — absent, test vert à tort. Le vrai badge visible était `.reference-tile-gems` ("X gemmes"), une donnée légitime mais affichée là où elle ne devait pas l'être, avec un libellé "gemmes" (jamais "Pouciel") — exactement ce que le joueur avait repéré sur sa capture. **Correctif : retrait complet** (valeur, libellé, prop, CSS morte, clé de traduction orpheline sur les 5 langues) — le vrai tableau "Pouciel & Gemmes" plus bas reste intact (vérifié : 320 pour la fusion Légendaire toujours affiché). **Vérification en Playwright réel** sur `/referentiels/combat-equipment` : 0 badge sur les 180 tuiles rendues, captures d'écran du set "Spirit Fyra" exact du rapport joueur (badge disparu) + du tableau dédié (toujours là). **Nouveau test de régression basé sur la structure DOM réelle**, pas juste une recherche de texte. Historique complet du feuilleton, gardé pour traçabilité :
1. Retour joueur initial (Bloc 82/C) : badge "coût en Pouciel" non demandé sur les tuiles Combat, à retirer.
2. Claude Code annonce en revue : "aucun badge Pouciel n'existe dans le code" (inspection directe), verrouille cette absence par un test de non-régression.
3. Capture d'écran fournie par le joueur (avant merge PR #99) : le badge **existe bel et bien**, affiche **"320 gemmes"** (valeur identique sur toutes les tuiles d'un set, libellé "gemmes" incorrect selon le joueur — ce serait en réalité un chiffre de Pouciel mal étiqueté).
4. PR #99 mergée.
5. **✅/❌ Vérification post-merge : le joueur confirme voir toujours le badge.** Le correctif n'a pas fonctionné, ou a corrigé autre chose que ce qui est réellement affiché.

**⚠️ À la lumière de ce qui précède, le diagnostic du point 2 (Claude Code) est à considérer comme faux ou incomplet** — ne pas repartir sur la même hypothèse ("le code ne contient pas ce badge") sans une vérification visuelle réelle en navigateur d'abord, capture d'écran à l'appui. **⚠️ Confirmé par le joueur (01/09/2026) : il s'agit bien du RÉFÉRENTIEL Équipements de Combat** (`/referentiels/combat-equipment`) — **pas le Simulateur de Stuff/outil de configuration joueur**. Vérifier précisément sur cette page-là, pas confondre les deux composants qui partagent une disposition de tuile visuellement proche. **Résolu au Bloc 83 (PR #100)**, voir note de résolution juste au-dessus.

**Principe général :** une tuile par équipement (au lieu d'une ligne de tableau).

**Disposition :**
- **6 tuiles de large**, organisées en **blocs complets par set** : 3×3 pour Combat (9 pièces), 3×2 pour Expédition (6 pièces) — deux sets tiennent exactement côte à côte sans ligne incomplète. **Pas de continuité entre sets sur une même ligne** (casserait la lisibilité du titre de section).
- **Nom du set en titre**, au-dessus de chaque bloc de tuiles.
- **✅ Livré (Bloc 41, PR #63) — ordre des familles à respecter, pour les blocs de set ET les boutons de filtre :** Combat = Attaque, Défense, Or, Vitesse (ordre déjà acté ailleurs sur le site, cdc section 3.2/3.3) ; Expédition = Or, Équipement combat, Consommables, Troupes (ordre déjà acté pour les boutons de filtre, Bloc 31 point E.1). Applique ce même ordre à l'affichage des blocs de set dans la grille de tuiles, pas seulement aux boutons de filtre.
- **✅ Livré (Bloc 41, PR #63) — un set isolé en fin de grille (après filtrage) s'étire sur toute la largeur au lieu de garder sa taille normale.** Quand un filtre réduit l'affichage à un nombre de sets impair, le dernier set se retrouve seul sur sa ligne et **ses tuiles s'agrandissent au double de la taille normale** pour occuper toute la largeur disponible — comportement non désiré. **Un bloc de set doit toujours occuper exactement 50% de la largeur de la grille** (3 colonnes sur les 6), qu'il soit seul sur sa ligne ou non — pas de comportement flexible/`flex-grow` qui étire le dernier élément. Corriger via une grille à colonnes fixes (`grid-template-columns` fixe, pas de croissance automatique des éléments isolés).
- **✅ Confirmé bon (Bloc 40, PR #62) — le bandeau de bascule entre référentiels est enfin correct** (pleine largeur, structure alignée sur le bandeau outils). **Petit ajustement en attente de test réel avant envoi (Bloc 41) : ajouter un espace vertical entre ce bandeau et les tableaux/tuiles de données qui suivent** — actuellement pas assez d'air entre les deux.
- **✅ Livré (Bloc 41, PR #63) — [Référentiel Équipements de Combat uniquement, admin] réordonner les tableaux : Pouciel et nombre de gemmes en premier.** Faire passer les tableaux **Pouciel** et **nombre de gemmes par rareté** (créés au Bloc 35, point 6.1) en tête de l'écran d'édition, avant le tableau principal des compétences.
- **✅ Livré (Bloc 41, PR #63) — [Référentiel Équipements de Combat uniquement, admin] limiter la largeur des champs numériques sur ces 2 tableaux (Pouciel, Gemmes) pour éviter le scroll vertical.** Contrairement aux autres correctifs de largeur du site (qui visaient à éviter le scroll horizontal), ici les champs trop larges provoquent un retour à la ligne dans chaque ligne du tableau, ce qui allonge excessivement la hauteur de la page et force un scroll vertical. Réduire la largeur des champs numériques sur ces 2 tableaux spécifiquement pour que chaque ligne reste compacte sur une seule ligne visuelle.
- **Ordre des emplacements à l'intérieur d'un bloc identique à celui déjà utilisé dans les simulateurs** — même grille 3×3 que le Simulateur d'Équipement de Combat, même agencement (Cape/Longue-vue/Bourse puis Boussole/Torche/Pioche) que le Simulateur d'Équipement d'Expédition.

**Contenu d'une tuile :**
- Fond/bordure = **couleur de la rareté** de l'objet.
- **Image de l'équipement à gauche.**
- **Nom de l'emplacement écrit en petit en haut de la tuile**, dans la **couleur de la famille** — pas d'icône de slot (texte plus lisible, sans ambiguïté visuelle entre emplacements proches type bracelet/ceinture). ⚠️ Point de vigilance au rendu : lisibilité de la couleur de famille sur les 5 fonds de rareté possibles.
- **Compétences + % à droite, superposées verticalement** (empilées, pas côte à côte) : 4 lignes pour Combat, 2 lignes pour Expédition. **Valeurs affichées : base 1★ systématiquement, sans mention explicite du "1★" sur la page** (pas de sélecteur d'étoile, voir plus bas — donc pas de nombre d'étoiles affiché sur la tuile non plus, ça n'aurait pas de sens si la valeur est toujours la même).
- **Nombre de gemmes affiché sur les tuiles Combat uniquement, et uniquement pour les objets qui en ont réellement** (rien pour les raretés sans gemme) — pas pertinent côté Expédition (jamais de gemmes).

**Filtres :**
- ~~Famille et rareté fonctionnent sur le même principe : indiqués visuellement sur la tuile ET disponibles comme filtre (le filtre aide à naviguer dans la grille complète, il ne masque pas le reste).~~ **✅ Livré (Bloc 40, PR #62) — comportement révisé, filtres masquants, pas juste visuels :**
  - **Toutes les tuiles affichées par défaut**, chacune dans sa couleur de rareté normale (pas de surbrillance/ombrage par défaut).
  - **Toutes les familles sélectionnées par défaut** dans le filtre famille.
  - **Boutons de rareté cumulatifs** (multi-sélection, comme la famille) — pas un choix exclusif.
  - **Désélectionner un filtre (rareté ou famille) masque complètement les tuiles correspondantes** de la grille — retire l'élément du DOM/de l'affichage, pas un simple ombrage/surbrillance conditionnelle. **Annule le comportement livré initialement au Bloc 39**, où sélectionner "Attaque" mettait les tuiles Attaque en surbrillance et les autres en ombre (shadow) plutôt que de les masquer.
  - **✅ Livré (Bloc 40, PR #62) — le texte des compétences doit être centré sur sa colonne** au sein de la tuile (actuellement pas centré).
  - **✅ Livré (Bloc 40, PR #62) — [Référentiel Expédition uniquement] "Consommables" et son % doivent tenir sur la même ligne.** Le libellé de la stat primaire "Consommables" est actuellement trop long et provoque un retour à la ligne dans sa colonne — casse l'alignement. **Ne concerne pas Équipements de Combat** (pas de souci constaté). **Correctif précis fourni par le joueur : réduire la classe CSS `.reference-tile-skills` à `0,69em`** — suffit à faire tenir "Consommables" et son % sur la même ligne. Pas de recherche de hauteur uniforme à faire indépendamment, ce correctif de taille de police résout le problème à la racine.
- **Le filtre niveau d'étoile est retiré, ainsi que les calculs associés** (plus de sens dès lors que seule la valeur de base 1★ est affichée).
- **Pas de filtre par nombre d'emplacements de gemmes** — confirmé redondant avec la rareté, le nombre de gemmes ne varie jamais à rareté égale.
- **Pas de barre de recherche pour l'instant** (cohérent avec son retrait déjà acté au Bloc 37).

**Mobile — à tester empiriquement, pas de décision figée à l'avance :** démarrer l'implémentation en **1 bloc de large** (tuiles toutes empilées verticalement) ; si la lisibilité le permet une fois en place, tenter un passage à **2 colonnes**. Le choix final se juge au rendu réel, pas en amont.

**✅ Décidé — organisation admin résolue.** L'admin Référentiels rejoint l'admin Guides (option (b)) : le rôle "Gestion Guides" édite désormais aussi les référentiels, structure admin alignée avec la structure de navigation publique. Voir table des rôles et section 3.2 pour le détail complet.

**Transverse**
- Switch de langue EN/FR dynamique, sans rechargement
- Navigation cohérente (menu Outils + menu Guides — **2 entrées seulement**, pas 3, malgré l'ajout des référentiels)
- Formulaire de contact (page dédiée, pas de commentaires sur les guides)

### 3.2 Back-office admin

**Gestion des guides et référentiels — ✅ décidé, question ouverte résolue.** Les référentiels rejoignent l'admin Guides (cohérent avec la navigation publique — voir section 3.1), pas l'admin Outils. **Un seul tableau, colonnes Nom, Type (Guide / Référentiel), Statut, Actions** — même pattern que celui déjà retenu pour l'admin Outils. **✅ Filtre par Type (Guide/Référentiel) sur ce tableau** (nouveau, retour joueur post-Bloc 11) — bouton de filtre, pas un menu déroulant (cohérent avec le refus de dropdown déjà acté au Bloc 11bis pour les autres contrôles admin).

- CRUD complet (créer / éditer / supprimer) — pour les guides ; pour les référentiels, pas de création/suppression de table (structure fixe), juste édition des valeurs
- Publier / dépublier — concerne les guides uniquement (workflow éditorial `draft`→`pending_review`→`published`) ; les référentiels n'ont pas ce workflow, juste actif/inactif
- **🚨 Décision révisée une 3e fois — aperçu intégré à `@uiw/react-md-editor`, pas de panneau séparé.** L'éditeur "type Ghost" par blocs visuels (WYSIWYG) reste écarté. **Décidé : bibliothèque `@uiw/react-md-editor`**, utilisée avec son **mode aperçu intégré** (bascule édition/aperçu ou aperçu superposé selon ce que propose la bibliothèque), **pas un panneau d'aperçu séparé construit à côté** (approche du Bloc 7, abandonnée — redondante avec la fonctionnalité native de l'éditeur). Conséquence : l'éditeur peut occuper toute la largeur disponible, plus besoin de réserver de l'espace pour un panneau externe. **🚨 Point technique à ne pas perdre en migrant vers l'aperçu intégré : le configurer avec les mêmes plugins que le rendu public** (`remark-gfm` + `rehype-sanitize`, la bibliothèque le permet via ses props `previewOptions`/`remarkPlugins`/`rehypePlugins`) — objectif inchangé de cohérence exacte avec ce que verra le joueur, ne pas se contenter de la configuration par défaut de la bibliothèque. Toujours 3 champs : Titre, Résumé, zone markdown. Le contenu stocké reste du markdown propre, inchangé.

  **🚨 Retour d'usage après implémentation (Bloc 7) — 3 ajustements de mise en page, ✅ traités au Bloc 7bis :**
  1. Sélecteur de catégories multiples trop encombrant → puces/chips repliables avec compteur.
  2. Sélecteur de langue trop encombrant → liste déroulante compacte (voir précision juste au-dessus, section 6).
  3. Proportions éditeur/aperçu → rééquilibrées à ~64/36 en faveur de la zone de saisie (640px de hauteur).

  **🚨 2e retour d'usage (après le Bloc 7bis) — ce qui amène à la révision "une 3e fois" ci-dessus :**
  1. **Boutons Enregistrer/Publier + messages de confirmation** déplacés en haut de l'écran, à côté du bouton retour — pas en bas de page.
  2. **Style des boutons à améliorer** — plus soignés visuellement, cohérents avec le reste de l'identité visuelle du site (voir prototype pour la palette/le style de référence).
  3. **Thème clair plutôt que sombre** — l'éditeur apparaît actuellement en mode sombre par défaut (thème natif de la bibliothèque), à passer en thème clair pour cohérence avec le reste de l'interface admin. **🚨 Bug trouvé après coup : le fond de l'éditeur reste bien clair en thème sombre (forcé), mais le texte du rendu markdown hérite de la couleur claire du thème sombre du site — texte clair sur fond clair, illisible.** Il ne suffit pas de forcer le fond, la couleur du texte doit aussi être verrouillée en clair dans l'éditeur, indépendamment du thème actif du site (voir tâche de correction, Bloc 11bis).
- Pour les référentiels (Équipements de Combat / Équipement d'Expédition) : rareté et famille en liste déroulante, pouciel et emplacements gemmes **non éditables** (déduits automatiquement de la rareté), type d'emplacement et compétence en liste déroulante, seule la valeur (%) reste un champ de saisie libre. Filtres en haut du tableau (rareté, famille, emplacement, compétence).
- Gestion des images (guides), et champ image représentative (`cover_image`) exposé dans l'éditeur
- Gestion des traductions EN/FR (contenu séparé par langue)
- Badge de notification pour Admin/Super Admin quand un guide passe en `pending_review`
- Bouton de retour vers la liste depuis n'importe quelle page d'édition détaillée

**Gestion des outils (simulateurs uniquement) — ✅ décidé, question de la section précédente résolue**

Les référentiels ne sont plus gérés ici — voir "Gestion des guides et référentiels" ci-dessus. Cette section ne couvre plus que les vrais simulateurs (Villes, Combat, Classement, Compétences).

**✅ Décidé : un seul tableau**, colonnes Nom, **Catégorie** (Villes/Combat/Classement/Compétences — nouveau, retour joueur), Statut, Actions.

- Activer / désactiver chaque simulateur côté public — **✅ Décidé : comportement visuel en cas de désactivation.** Le simulateur désactivé reste **visible mais grisé/non cliquable** dans la navigation publique (bouton d'onglet ou de catégorie), plutôt que d'être complètement retiré de la liste. Cohérent avec le pattern déjà utilisé dans le prototype pour les éléments "à venir" (ex: ligues non encore disponibles, catégorie Combat grisée) — le joueur voit que la fonctionnalité existe/est prévue, sans pouvoir y accéder tant qu'elle n'est pas activée. **✅ Livré (Bloc 33, PR #54) — insuffisant en pratique, retour testeur : le grisé seul ne suffit pas à comprendre que l'outil est indisponible.** L'utilisateur voit l'entrée, clique dessus, et rien ne se passe — confusion. **Ajouter un texte explicite "Bientôt disponible"** (ou équivalent), **affiché en permanence, pas seulement au survol** (le survol est invisible sur mobile, et pas forcément vu sur desktop non plus). S'applique à **tout outil désactivé ou pas encore implémenté déjà visible dans l'UI** — pas seulement aux 2 nouveaux placeholders Combat du Bloc 32 (Combat, Troupes ennemies), qui suivent déjà ce principe, mais toute entrée grisée existante ou future dans la navigation, le dashboard, `/tools`.
- Bouton "Modifier" par ligne, ouvrant une pop-up/page d'édition — **uniquement des paramètres numériques nommés** (jamais de formule libre, voir section 6). **Aucune gestion de traduction dans ce formulaire, sous quelque forme que ce soit** — le nom de l'outil vient exclusivement des fichiers de traduction statiques next-intl (décision section 6). **🚨 Régression trouvée (retour joueur) : un bloc "Textes multilingues" par outil a survécu au nettoyage du Bloc 9** — à supprimer entièrement, pas à vider/masquer, le composant lui-même ne doit plus exister sur cet écran.
- **Un outil sans aucun paramètre numérique éditable n'a pas de bouton "Modifier"** — seule l'action activer/désactiver reste disponible. Ce n'est pas un problème à corriger, c'est le comportement normal pour ce cas.
- **⚠️ Cas particulier Villes — pas de duplication d'édition.** Coût de Ville, Niveau Max Atteignable et Production sont **3 simulateurs distincts** (chacun garde son propre statut actif/inactif) mais **partagent le même jeu de paramètres sous-jacent** (VP/Remparts/Coût d'upgrade — universels entre les 3 — et multiplicateurs Army/Gold par ligue, voir section 7.1). Le bouton "Modifier" de ces 3 simulateurs doit pointer vers **le même point d'édition partagé** ("Paramètres Villes"), pas 3 pop-up séparées avec risque de désynchronisation entre elles. **🚨 À revérifier (retour joueur, régression possible)** : Coût de Ville et Niveau Max semblent actuellement avoir des points d'édition séparés en pratique — vérifier que le partage fonctionne réellement, pas juste dans la donnée mais dans l'UI (un seul bouton "Modifier" menant au même endroit, pas 3 formulaires indépendants qui se désynchronisent).

**✅ Livré (Bloc 68, PR #87) — étendre le sélecteur de ligue en boutons (au lieu de select box) aux 3 outils Villes : Coût de Ville, Niveau Max Atteignable, Production.** Même principe déjà appliqué à Level Up/Classement (Bloc 61) et étendu à Troupes attaque démo/Paramètres du joueur (mêmes points du Bloc 68). **⚠️ Pas une généralisation universelle, correction d'une formulation trop large — le pattern boutons ne s'applique QUE là où c'est explicitement indiqué**, pas partout où un sélecteur de ligue existe. **Exclusion explicite confirmée par le joueur : les sélecteurs de ligue liés aux Gemmes** (dans le Simulateur d'Équipement de Combat, ET dans l'outil Gemmes lui-même) **restent en select box** — select box toujours pertinent à certains endroits (probablement lié aux lignes multiples/indépendantes nécessitant chacune leur propre sélection dans ces contextes précis), à ne jamais convertir en boutons sans demande explicite.
- **🚨 Traductions de noms d'outils incomplètes (retour joueur)** : plusieurs noms d'outils dans ce tableau admin restent non traduits ou affichent la clé technique brute plutôt que le libellé — au moins Taux de gain d'XP, Simulateur de Stuff, Comparaison de stuff, **Ranking (doit afficher "Classement" en FR, pas "Ranking")**, Gemmes, Troupes en attaque démo, Récompenses de Production. À auditer sur l'ensemble du tableau, pas juste ces 7-là.
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
- Tableau de bord (nb guides publiés, calculateurs actifs, **référentiels activés/total**, **utilisateurs total/actifs** — nouveau, retour joueur, etc.)

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

- **✅ Sélecteur d'unité en saisie (pas seulement en affichage)** — pour les champs numériques représentant de grandes quantités issues de la production/progression du jeu (VP du joueur, or disponible dans les calculateurs...), le champ de saisie est accompagné d'un **sélecteur d'unité** (×1 / k / M / G / T) à côté du nombre. Le joueur tape "2" et choisit "G" plutôt que de taper "2000000000".

**✅ Règle générale confirmée par le joueur (29/08/2026) — aucun achat en saphirs n'est jamais compacté (k/M), ni en saisie ni en affichage.** Les saphirs s'achètent avec de l'argent réel, les montants restent toujours petits (quelques milliers maximum) — la saisie/l'affichage brut suffit systématiquement, la compaction n'apporte rien et nuit à la lisibilité d'un prix exact. **Ce n'est pas une exception ponctuelle propre aux Gemmes** (initialement documentée comme telle au Bloc 38) **mais une règle transverse à tout ce qui se paie en saphirs**, actuel et futur — s'applique déjà au calculateur Gemmes (mode Budget disponible, pas de sélecteur d'unité ; référentiel Gemmes, valeurs brutes affichées) et **s'appliquera au référentiel/simulateur Consommables** dès sa construction (achats également en saphirs, cdc section 9).

- **✅ Stepper −/+ personnalisé sur tous les champs numériques** — les flèches natives du navigateur (haut/bas, minuscules, peu lisibles) sont masquées et remplacées par deux boutons **−** (gauche) et **+** (droite) encadrant chaque champ, respectant `min`/`max`/`step`. S'applique uniformément, y compris aux champs générés dynamiquement (lignes de gemmes, gemmes du Simulateur de Stuff...) via un `MutationObserver` qui enveloppe automatiquement tout nouveau champ nombre ajouté au DOM. Seuls les champs à sélecteur d'unité (ci-dessus) en sont exemptés, pour ne pas surcharger la ligne avec un 3e élément.

- **✅ Synchronisation des sélecteurs de ligue dépendants avec la ligue du joueur** — aucun sélecteur de ligue n'a de valeur par défaut nulle part (voir section 3.1). **Exception pour les sélecteurs de Classement, Troupes attaque démo et Level Up** : ils s'alignent automatiquement sur la ligue définie dans les Paramètres du joueur, **y compris au chargement initial de la page si cette ligue est déjà en cache (localStorage)** — pas seulement lors d'un changement futur. Si le sélecteur dépendant a déjà une valeur choisie manuellement par l'utilisateur, elle n'est jamais écrasée par un changement ultérieur de la ligue du joueur (logique "seulement si rien n'est configuré").

**✅ Livré (Bloc 61, PR #80) — remplacer la select box de ligue par des boutons, pour le référentiel Level Up ET l'outil Classement.** Même principe que le sélecteur de famille déjà en place sur les outils Équipement de Combat/Expédition : boutons de sélection **unique** (pas cumulatif comme les filtres de référentiel), une seule ligue active à la fois. La logique de synchronisation avec la ligue du joueur (ci-dessus) reste inchangée, seul le composant visuel change (boutons au lieu de select). **Contrainte spécifique à l'outil Classement : garder l'ensemble sur une seule ligne** — boutons de ligue, puis le champ de saisie % (pourcentage actuel), puis le champ de saisie rang, tous alignés horizontalement sur la même ligne, pas de retour à la ligne entre les boutons et les champs de saisie.

**✅ Livré (Bloc 65, PR #84) — cette barre (boutons de ligue + % + rang) doit prendre toute la largeur du bloc**, pas rester plus étroite avec de l'espace vide autour. Complète la contrainte "une seule ligne" du Bloc 61 — désormais aussi "pleine largeur", pas juste "sur une ligne".

**✅ Livré (Bloc 62, PR #82) — retours de test post-Bloc 61 sur l'outil Classement, rendu de la barre filtre/saisie pas satisfaisant :**
- **✅ Livré (Bloc 64, PR #83) — option (b) retenue : label de chaque champ placé juste avant le champ lui-même (inline), sur les 3 champs (Ligue, %, rang), pas de label au-dessus.** Tranche l'ambiguïté laissée ouverte au Bloc 62 (2 options proposées, choix laissé à l'implémentation) — corrigé au Bloc 64 avec un correctif de largeur supplémentaire non anticipé (le stepper % héritait d'une largeur fixe `13rem` du Bloc 62, écrasée à 6px une fois le label passé inline — corrigé, 84px stable à toutes les largeurs testées). **⚠️ Précision de portée (Bloc 69) : cette décision (label inline, pas de titre au-dessus) reste le comportement DESKTOP, inchangé.** Le mobile reçoit un traitement différent, voir décision juste en dessous — les deux ne se contredisent pas, chacun scopé à sa largeur d'écran.

**✅ Livré (Bloc 69, PR #88) — [Mobile uniquement] refonte du bloc filtre/saisie de l'outil Classement, différente du desktop.**
- **Titre au-dessus de chaque section** : "Ligue", "Pourcentage actuel", "Rang actuel" — contrairement au desktop (label inline, décision ci-dessus inchangée).
- **Boutons de ligue en 2 lignes de 3**, prenant toute la largeur disponible (6 ligues = 3+3) — même pattern que les autres sélecteurs de ligue en mobile (Bloc 68/N, Bloc 69/E).
- **Champs de saisie (% et rang) en pleine largeur.**
- **✅ Livré (Bloc 64, PR #83) — revirement : "Nombre total de joueurs" → "Nombre estimé de joueurs".** Annule le renommage confirmé au Bloc 62 (qui avait retiré tout qualificatif) — le joueur revient sur sa décision, avec un qualificatif différent de celui d'origine ("estimé" plutôt que "(déduit)") mais qui réintroduit bien l'idée d'approximation, cohérent avec la marge d'erreur réelle déjà documentée juste en dessous (point G du Bloc 62).
- **✅ Badge conservé (décision finale, 01/09/2026) — mais intégré visuellement à l'échelle visuelle existante, plutôt que d'occuper un espace dédié séparé.** Objectif : éviter que ce chiffre ait sa propre place à lui tout seul sur la page — le fondre dans la zone d'échelle déjà présente (ex: en label à l'une des extrémités, ou intégré au tracé de l'échelle), pas de solution précise imposée, au choix de l'implémentation la plus naturelle visuellement.
- **✅ Décidé — retirer le titre "Échelle visuelle"** de cette zone (texte fixe, clé technique `visual-scale`) — la zone reste affichée, seul le titre disparaît.
- **🚨 Précision essentielle de la règle d'arrondi du tableau Classement (retour joueur, corrige le diagnostic initial du point ci-dessous) :**
  - **Toutes les lignes de palier intermédiaires (hors 100%) : arrondi vers le bas obligatoire** — règle déjà correcte, ne pas y toucher.
  - **Le rang de départ de la ligne suivante = rang de fin de la ligne précédente + 1** (règle sur les bornes déjà verrouillée au Bloc 31, inchangée).
  - **Seule la dernière ligne (100%, qui représente le nombre total de joueurs) doit être arrondie vers le haut** (`Math.ceil`), pas vers le bas comme les autres lignes.
- **🐛 Bug confirmé par test concret du joueur (01/09/2026) — la ligne 100% utilise actuellement le même arrondi vers le bas que les autres lignes, au lieu de l'arrondi vers le haut qui lui est propre.** Exemple exact : ligue Légende, rang 137, pourcentage saisi 86,71% → valeur brute calculée `137 ÷ 0,8671 = 157,998`. **Arrondi vers le haut attendu pour cette ligne : 158. Valeur actuellement affichée : 157** (arrondi vers le bas, incorrect pour cette ligne précise). **Corriger uniquement la ligne 100% pour utiliser `Math.ceil` au lieu de l'arrondi vers le bas** — ne pas toucher aux autres lignes du tableau, qui utilisent déjà la bonne règle. **Le badge "total calculé" doit utiliser la même règle (`Math.ceil`), pour rester cohérent avec la ligne 100% corrigée** — ⚠️ ne pas confondre `Math.ceil` avec un "arrondi normal" (`Math.round`) : les deux donnent 158 dans cet exemple précis par coïncidence (157,998 est très proche de 158), mais divergeraient sur d'autres valeurs (ex: 157,3 → `ceil`=158, `round`=157) — bien utiliser `Math.ceil` spécifiquement, pas un arrondi normal. ⚠️ **Limite inhérente à garder en tête, pas un bug en soi** : même corrigé, ce total reste une **estimation avec marge d'erreur réelle** — le vrai total en jeu pour cet exemple est 159, pas 158, l'écart provient du pourcentage d'entrée lui-même déjà arrondi/tronqué par le jeu avant saisie. Rien à corriger sur ce point précis, juste une limite connue de la méthode de déduction.

- **🚨 Cohérence linguistique — architecture précisée, exigence renforcée.** Chaque texte visible dans l'UI, **sans aucune exception, public ET admin**, doit être référencé par une **clé de traduction**, jamais de texte codé en dur dans une langue quelconque. Deux mécanismes distincts, chacun devant permettre d'ajouter une langue **sans aucune modification de code** :
  - **Texte d'interface statique** (labels, boutons, menus, messages d'erreur/confirmation, tout `/admin/*` inclus) → fichiers de traduction **JSON**, un fichier par langue (ex: `en.json`, `fr.json`, `es.json`...), structure de clés identique entre tous les fichiers. Ajouter une langue = ajouter un nouveau fichier JSON traduit, zéro ligne de code à toucher.
  - **Contenu dynamique** (noms/descriptions de simulateurs, contenu de guides, libellés de référentiels) → déjà un objet JSON par enregistrement en base (`{en, fr, es, de, pl, tr}`, voir section 6), même principe : ajouter une langue = ajouter une clé dans l'objet JSON de chaque enregistrement (via l'admin, formulaire par langue déjà décidé), pas de modification de schéma ni de code. **Nuance pour le contenu des guides spécifiquement** : ce n'est pas une "traduction via clé" au sens strict (recherche d'une clé identique entre langues) mais du **contenu rédigé directement par langue** (l'auteur écrit son texte dans chaque langue, pas de correspondance mot-à-mot attendue) — stocké dans la même structure JSON par souci de cohérence technique, mais conceptuellement distinct des libellés d'interface.
  
  *(Le prototype exploratoire de la section 7 a depuis été nettoyé de tout mélange FR/EN — sert de référence de cohérence pour le développement réel, pas juste d'exception tolérée.)*
- **🚨 Sobriété du texte sur les pages de simulateurs — écart volontaire avec le prototype :** le prototype affiche un titre (`<h2>`) et une phrase descriptive (`.desc`) en haut de chaque carte de calculateur (ex: "Planifie tes upgrades et mesure précisément ta production en ligue Légende."). **Décidé : retirer ce texte sur le vrai site.** Pas de titre, pas de phrase d'explication — seuls les champs de saisie, labels de champs, et résultats restent affichés. Le nom du calculateur déjà visible dans la navigation (onglet) suffit, pas besoin de le répéter en gros titre sur la page elle-même.

- **✅ Décidé — Paramètres du joueur en localStorage** : le panneau "Paramètres du joueur" (niveau, ligue, stats de compétences — voir prototype) est stocké **côté client dans le localStorage du navigateur**, pas en base de données, **pour la V1**. Conséquence : **aucun compte joueur/visiteur n'est nécessaire** pour utiliser les calculateurs — seuls les comptes admin existent (voir section 6 bis). Les paramètres restent propres à l'appareil/navigateur utilisé. **✅ Synchronisation entre appareils prévue en V2** (compte joueur optionnel, voir section 13) — non prévue pour la V1, qui reste 100% localStorage. **✅ Périmètre d'affichage confirmé : le panneau n'apparaît que sur les pages de simulateurs** (`/tools`, `/tools/[slug]`), pas sur les pages sans calculateur (accueil, guides, contact, mentions légales, login) — inutile de l'afficher là où aucun calculateur n'en a besoin.

**✅ Livré (Bloc 68, PR #87) — 5 ajustements sur le panneau Paramètres du joueur (retour testeur) :**
1. **Libellé quand aucune ligue n'est choisie : "Ligue non définie"** au lieu de "— Choisir —" (le placeholder générique du site).
2. **Sélecteur de ligue en boutons plutôt qu'en select box**, même principe que Classement/Level Up (Bloc 61) — cohérent d'étendre ce pattern ici aussi, aucune raison de garder ce panneau en select alors que le reste du site en boutons.
3. **[Mobile uniquement] Le résumé** (ligue · niveau · VP · nombre de templiers) **doit apparaître en dessous du titre "Paramètres"**, pas ailleurs.
4. **[Mobile uniquement] Les champs Niveau et VP/unité peuvent être sur la même ligne** (au lieu d'empilés).
5. **[Mobile uniquement] La saisie des compétences, points, templiers et bonus de temple peut passer en 2 colonnes** (2 compétences par ligne, au lieu d'1 seule).

**✅ Livré (Bloc 68, PR #87) — nouveaux affinages sur ce même panneau, suite aux boutons de ligue livrés au Bloc 68 :** ⚠️ **Correction d'étiquetage** : ce paragraphe était par erreur attribué au Bloc 69 dans une version antérieure de ce document — il s'agit bien du Bloc 68 (PR #87).
- **[Desktop]** **Ajouter le titre "Ligue" au-dessus des boutons** de sélection (absent à la livraison du Bloc 68).
- **[Desktop]** **✅ Révisé (Bloc 71) — Ligue, Niveau et VP passent sur la même ligne**, avec une répartition précise à 4 : **Ligue 50%, Niveau joueur 20%, VP 20%, unité VP 10%.** Remplace la répartition "25% chacun pour Niveau/VP" ci-dessus (qui ne prévoyait pas Ligue sur la même ligne) — même principe que la mise en ligne déjà actée pour Villes/Troupes attaque démo/Classement (Bloc 69/70/71). **🐛 Régression confirmée (Bloc 73) — le ratio 50% pour Ligue n'est pas correct en pratique**, malgré la livraison au Bloc 71. À corriger.
- **✅ Livré (Bloc 73, PR #92) — les champs Niveau et VP sont trop grands en hauteur**, doivent faire la même hauteur que les autres champs de saisie du panneau (référence : champs Compétences ou Points).
- **[Mobile]** **Réduire la taille du champ Niveau de 10%**, largeur libérée redistribuée au champ VP (les deux restent sur la même ligne, Bloc 68 point 4, mais avec un nouveau ratio de largeur entre les deux).
- **🚨 Nouvelle contrainte universelle** : **pas de scroll vertical pour les boutons de sélection de ligue** — s'applique ici, mais aussi à **tous les sélecteurs de ligue en boutons ajoutés dans les outils** (Level Up/Progression, Classement, Troupes attaque démo, les 3 outils Villes, Événement) — pas limité à 2 endroits précis, une règle transverse à tout le site.

**✅ Livré (Bloc 69, PR #88) — mêmes affinages de boutons de ligue pour l'outil Villes (Coût de Ville/Niveau Max/Production) ET l'outil Troupes en attaque démo (boutons livrés au Bloc 68) :** ⚠️ **Confirmé explicitement : Classement N'EST PAS concerné par ce point** — garde son style actuel (label inline avant chaque champ, décision Bloc 64 inchangée), ne pas y toucher malgré la ressemblance avec les autres outils à sélecteur de ligue.

**✅ Livré (Bloc 71, PR #90) — revirement : Classement rejoint finalement le traitement des outils Villes/Troupes attaque démo.** Annule l'exclusion explicite ci-dessus (Bloc 69) — le joueur revient sur sa décision : **les boutons de ligue de l'outil Classement sont désormais alignés sur le style Villes/Troupes attaque démo (Bloc 69/70)** — titre "Ligue" au-dessus, boutons occupant 50% de la largeur disponible. **Ne pas confondre avec le point mobile spécifique de Classement (Bloc 69/G, titres au-dessus en mobile)** — ce revirement concernait le **desktop**, qui gardait jusqu'ici le label inline (Bloc 64) ; le mobile reste inchangé, confirmé non-régressé à la livraison.

**🐛 Régression confirmée (Bloc 73) — le ratio 50% ci-dessus n'est pas correct en pratique**, malgré la livraison au Bloc 71. À corriger.

**✅ Livré (Bloc 71, PR #90) — le texte des boutons de sélection de ligue ne doit pas être en gras**, contrairement au rendu actuel. **Aligner le style sur les boutons déjà utilisés dans Paramètres du joueur** (référence de style correcte) — s'applique a priori à tous les boutons de ligue concernés par ce bloc (Classement desktop ci-dessus), à vérifier si le gras concerne aussi d'autres emplacements déjà livrés.
- **[Desktop]** **Ajouter le titre "Ligue" au-dessus des boutons**, et **positionner ce bloc sur la même ligne que les autres champs de saisie** de l'outil (pas isolé sur sa propre ligne).

**✅ Livré (Bloc 70, PR #89) — correctif de largeur : le bloc de sélection de ligue (titre + boutons) occupe 50% de la largeur de sa ligne partagée**, sur les outils Villes (Coût de Ville/Niveau Max/Production) et Troupes en attaque démo (livrés au Bloc 69). **✅ Périmètre confirmé par le joueur** : uniquement ces outils modifiés au Bloc 69, pas une généralisation à tous les sélecteurs de ligue en boutons du site (Paramètres joueur, Classement mobile, etc. gardent leurs propres décisions de largeur déjà actées séparément, inchangées).

**✅ Livré (Bloc 71, PR #90) — [Outil Niveau Max Atteignable, desktop uniquement] rééquilibrage de largeur des champs.** Réduire de **30% chacun** : le champ **Nombre de villes**, le champ **Niveau de départ**, et le **sélecteur d'unité** du champ Or disponible (×1/k/M/G/T). **L'espace ainsi libéré est donné au champ Or disponible lui-même** (le champ numérique, pas son sélecteur d'unité) — objectif : plus de place pour saisir une valeur d'or potentiellement grande, moins pour les 2 autres champs et le sélecteur d'unité qui n'en ont pas besoin.

**✅ Livré (Bloc 70, PR #89) — [Outil Templiers, contenu des tuiles] 2 libellés raccourcis :**
- **"Bonus total au niveau X" → "Bonus total"** (retire la mention du niveau cible dans le libellé).
- **"Gain départ-cible" → "Gain"** (raccourci).
- **🚨 Nouvelle contrainte universelle : pas de scroll vertical pour les boutons de sélection de ligue** — s'applique ici, aux Paramètres du joueur ci-dessus, et à tous les autres sélecteurs de ligue en boutons du site (voir liste complète ci-dessus, Classement inclus dans cette contrainte de scroll malgré son exclusion du reste de ce point).
- **[Mobile]** **Boutons de ligue en 2 lignes de 3 boutons**, prenant toute la largeur disponible (6 ligues = 3+3) — même pattern que celui déjà acté pour Événement/Progression (Bloc 68 point N).

---

## 4. Architecture des pages — validée

### Pages publiques
- `/` — Accueil — **✅ Livré (Bloc 33, PR #54) — refonte suite à un retour testeur.** L'accueil actuelle ne servait à personne en particulier : ni vitrine/pitch construite intentionnellement, ni accès direct aux outils. **Nouvelle structure décidée** : catégories d'outils affichées directement sur l'accueil (accès en 1 clic à un outil précis, pas de détour par `/tools`), **petite section Guides/Référentiels en dessous**. Les pages dédiées `/tools` et `/guides` restent inchangées et toujours accessibles (navigation principale) — l'accueil devient un point d'entrée plus direct, pas un remplacement de ces pages. **✅ Livré (Bloc 34, PR #55) — contenu précis de la section Guides/Référentiels :** **les 3 guides les plus récents** (tri par date de publication, cohérent avec le tri déjà utilisé sur `/guides`) — pas une sélection éditoriale manuelle — **ainsi que les référentiels** (⚠️ **6 réellement construits aujourd'hui**, pas 4 comme au moment de cette décision : Équipements de Combat, Équipement d'Expédition, Level Up, Coût des Templiers, Gemmes, Boutique — la dernière ligne "Consommables une fois ses données collectées" citée ici à l'origine est obsolète, Boutique/ex-Consommables est construit depuis le Bloc 43). Même logique d'accès direct qu'avec les outils : un clic depuis l'accueil, pas de détour par `/guides`. **✅ Précision discutée en amont du Bloc 36 (référentiel Gemmes, qui portera ce total à 5) : grille qui s'agrandit naturellement, pas de carrousel.** Réutiliser le même composant grille que celui déjà en place pour les catégories d'outils — cohérent avec l'objectif de rapidité qui a motivé toute la refonte de l'accueil (un carrousel réintroduirait une interaction superflue pour voir un référentiel). Scale naturellement avec le temps (5, 6, 7 référentiels à venir) sans retouche nécessaire. **✅ Livré (Bloc 38, PR #60) — précision : grille à 4 colonnes maximum par ligne**, pas un nombre de colonnes variable selon le nombre total de référentiels — avec 5 référentiels (dont Gemmes), ça donne 4 sur la 1ère ligne et 1 sur la 2ᵉ, pas 5 sur une seule ligne compressée. **✅ Livré (Bloc 34, PR #55) — le bloc hero (image défilante/carrousel + accroche "Prépare ta prochaine progression.") reste trop imposant, en contradiction avec l'objectif de rapidité qui a motivé toute la refonte.** Remplacé par **une phrase d'introduction courte** au-dessus de la grille de catégories, sans carrousel/image défilante — juste de quoi dire en une phrase ce que le site propose. Grille de catégories d'outils toujours le contenu principal, visible sans avoir à scroller. **✅ Titre et phrase réels (jamais consignés précisément jusqu'ici) : titre "Décide avec les bons chiffres", phrase d'intro "Explore les coûts, la production, le classement, les compétences et les équipements grâce à des outils conçus pour préparer chaque décision."** — ce couple titre/phrase est désormais aussi réutilisé sur `/tools` (voir décision juste au-dessus). **✅ Livré (Bloc 50, PR #73) — l'accueil éclate aussi en 3 sections distinctes, suite à la séparation Référentiels/Guides.** Remplace la section combinée "Guides/Référentiels" livrée au Bloc 34. **Ordre : Outils, puis Référentiels, puis Guides** (cohérent avec l'ordre de la nav publique décidé pour `/referentiels` vs `/guides`).
- **Référentiels** : grille à 4 colonnes max par ligne (règle déjà actée au Bloc 38, inchangée), **2 lignes maximum** — donc jusqu'à 8 référentiels affichés sur l'accueil (les 6 actuels tiennent en 4+2, pas de troncature nécessaire pour l'instant).
- **Guides** : grille à 3 colonnes par ligne, **2 lignes maximum** — donc jusqu'à 6 guides affichés (contre 3 précédemment décidé au Bloc 34), toujours les plus récents par date de publication, pas une sélection éditoriale manuelle.
- `/tools` — Liste des outils *(nommé "Outils" côté public — **🚨 réservé aux vrais simulateurs, plus les référentiels**, voir décision de nommage révisée section 3.1)* — **✅ Livré (Bloc 33, PR #54) — 3 corrections de libellés/mise en page (retour testeur) :** (1) chaque tuile de catégorie affiche titre + nombre d'outils, le texte "Ouvrir la catégorie" est retiré (toute la tuile est déjà cliquable, ce texte est redondant) ; (2) le titre "Outils" en tête de page est retiré ; (3) le sous-titre "Choisis ton domaine" est remplacé par **"Choisis ton outil"**, sur **une seule ligne** (actuellement passe sur 2 lignes selon la largeur d'écran — à corriger, que ce soit par la taille de police ou la largeur du conteneur). **✅ Livré (Bloc 38, PR #60) — unifier le titre et la phrase d'intro avec l'accueil :** "Choisis ton outil" → **"Décide avec les bons chiffres"** (même titre que l'accueil) ; ajouter la même phrase d'introduction que l'accueil sur cette page : **"Explore les coûts, la production, le classement, les compétences et les équipements grâce à des outils conçus pour préparer chaque décision."** **✅ Livré (Bloc 53, PR #75) — même traitement à répliquer sur `/referentiels` et `/guides` :**
  - **`/guides`** : réutiliser tel quel le couple titre/phrase déjà existant sur l'accueil pour la section Guides (`Home.guidesTitle`/`Home.guidesDescription`, déjà traduits dans les 5 langues) — pas de nouveau texte à écrire, juste le réutiliser sur cette page dédiée, même principe que ce qui a été fait pour `/tools` avec le couple Outils.
  - **`/referentiels`** : **réutiliser tel quel le couple titre/phrase déjà existant sur l'accueil pour la section Référentiels** (correction — il existait bien un couple, pas besoin d'en inventer un nouveau comme envisagé dans une 1ère version de cette décision) : **titre "Retrouve les données clés"**, **phrase "Retrouve les tableaux de référence pour connaître les coûts, statistiques et paliers exacts du jeu, aussi bien pour les équipements, les gemmes ou bien les templiers que pour les consommables de la boutique."**

**✅ Livré (Bloc 84, PR #102) — [Mobile uniquement] le titre est tronqué sur `/referentiels` ("Retrouve les données clés") ET sur `/tools` ("Décide avec les bons chiffres") — doit passer à la ligne au lieu d'être coupé.**

**✅ Livré (Bloc 68, PR #87) — retour testeur : incohérence de couleur entre `/tools`/`/referentiels` et l'accueil, sur ce même titre/phrase pourtant censé être identique (Bloc 38/53).** Sur `/tools` et `/referentiels`, le titre s'affiche en violet (couleur d'accent du site) ; sur l'accueil, la même phrase ne l'est pas. **Aligner la couleur de l'accueil sur celle des pages dédiées (violet)**, plutôt que l'inverse — cohérent avec la décision déjà actée de réutiliser exactement le même texte aux deux endroits.
- `/tools/[slug]` — Page d'un simulateur
- `/guides` — **✅ Livré (Bloc 50, PR #73) — page dédiée aux guides uniquement.** ⚠️ Décrit dans une version antérieure de ce document comme "2 sections sur la même page" (Guides + Référentiels) — **plus le cas depuis le Bloc 50** : Référentiels a sa propre racine `/referentiels` séparée (voir ci-dessous), `/guides` ne contient plus que la section Guides. Recherche incluse dès la V1.
- `/guides/[slug]` — Page d'un guide
- `/referentiels` — **✅ Livré (Bloc 50, PR #73) — page liste des référentiels**, racine séparée de `/guides` (ancienne racine `/guides/referentiels` abandonnée sans redirection). Titre "Référentiels" (Bloc 52). Grille de tuiles avec image par référentiel (Bloc 51), pas de bandeau de bascule sur cette page liste (Bloc 52, point B).
- `/referentiels/[slug]` — Page d'un référentiel — **✅ convention confirmée, 6 slugs tous en anglais depuis le Bloc 50** : `combat-equipment`, `expedition-equipment`, `level-up`, `shop` (ex-`consommables`, voir historique de renommage plus bas dans ce document — section 7.1, référentiel Boutique), `templars` (ex-`templiers`), `gems` (ex-`gemmes`). **✅ Corrigé (Bloc 38, PR #60) — titres de page tronqués, cause réelle identifiée.** Vraie cause trouvée en investiguant le bandeau de bascule (voir historique dans ce document) : une règle CSS générique `.public-main > h1` écrasait par spécificité la taille de police propre aux classes de titre de page, sur `/tools` ET tous les référentiels — pas juste un problème de largeur de bloc comme supposé initialement. Corrigée à la racine.

**✅ Livré (Bloc 50, PR #73) — SÉPARATION MAJEURE : Référentiels devient sa propre section, distincte de Guides, public ET admin.** Motivation : le contenu est passé de 0 à 6 référentiels réellement construits, avec sa propre logique (bandeau de bascule, formules, CRUD complet pour Boutique) — l'expérience d'édition admin a rendu la confusion évidente entre 2 types de contenu fondamentalement différents (guide = contenu narratif lu une fois ; référentiel = donnée structurée consultée en boucle). Décidé alors que le site n'a **aucun trafic public** — fenêtre la moins coûteuse pour ce type de refonte, pas de contrainte de redirection.

**Décisions précises tranchées :**
1. **Nouvelle racine d'URL : `/referentiels/*`**, indépendante de `/guides/*` (au lieu de `/guides/referentiels/*`). `/referentiels`, `/referentiels/[slug]` — **6 slugs, tous désormais en anglais** (retour testeur : `templiers`/`gemmes` détonnaient en français au milieu des 4 autres) : `combat-equipment`, `expedition-equipment`, `level-up`, `shop`, **`templars`** (renommé depuis `templiers`), **`gems`** (renommé depuis `gemmes`). Mêmes identifiants internes qu'avant (fichiers, routes API, clés DB) — seul le slug d'URL change, même principe que le renommage `shop` au Bloc 48.
2. **Nouveau rôle `references_manager`** ("Référentiels" en FR/EN comme libellé) — mêmes droits que `guides_manager`/`calculators_manager` mais scopés aux référentiels uniquement. `guides_manager` et `calculators_manager` **perdent les droits référentiels** (sauf pour les données partagées Templiers/Gemmes, éditables via leur entrée Outils par `calculators_manager` — accepté comme cohérent, c'est la même donnée). `admin`/`super_admin` gardent tout. `read_only` inchangé, lecture seule sur tout référentiels compris.
3. **Admin : 2 menus distincts** — Guides et Référentiels, chacun son propre tableau. **Colonne "Type" retirée** (plus de raison d'être, un seul type par écran). **Filtre "Guides/Référentiels/Tous" du Bloc 32 supprimé** (obsolète, plus rien à filtrer par type sur un écran mono-type).
4. **Navigation publique : 3 entrées de premier niveau** — **Outils, Référentiels, Guides**, dans cet ordre (Référentiels avant Guides, cohérent avec l'ordre déjà utilisé sur l'accueil). **✅ Livré (Bloc 52, PR #74) — titre de la page liste `/referentiels` : "Référentiels" tout court**, pas "Tous les référentiels" (retour testeur — titre actuellement livré trop long/redondant).
5. **Le bandeau de bascule entre référentiels (Bloc 35/37/40) devient la nav principale de la section `/referentiels`** — plus un simple widget secondaire dans le contexte Guides, mais la nav de tête de la section à part entière. **✅ Livré (Bloc 52, PR #74) — précision de portée manquée à la livraison : ce bandeau ne doit apparaître QUE sur la page d'un référentiel précis** (ex: `/referentiels/shop`), **jamais sur la page liste `/referentiels`** qui affiche déjà les 6 référentiels sous forme de tuiles avec image — le bandeau y serait redondant avec les tuiles elles-mêmes.

**✅ Livré (Bloc 69, PR #88) — retour testeur : mobile, bandeau de bascule référentiels, contenu de bouton mal centré verticalement.** Le bouton "Équipement d'Expédition" passe sur 2 lignes en mobile (pas un souci en soi) — mais devient de ce fait plus haut que ses voisins sur la même ligne de grille, et le bouton "Boutique" (sur la même ligne) hérite de cette hauteur sans que son contenu soit centré verticalement dedans. **Corriger : centrer le contenu de chaque bouton verticalement**, pas seulement horizontalement, dans les bandeaux — **généraliser à tous les bandeaux du site (référentiels ET outils)**, pas seulement au cas précis Boutique/Équipement d'Expédition qui l'a révélé.
6. **Migration des droits existants : aucune bascule automatique nécessaire** — pas encore de vrai utilisateur admin en dehors du porteur de projet lui-même, retrait direct des droits référentiels de `guides_manager` sans script de migration.

**✅ Livré (Bloc 35, PR #57) — 7 corrections/évolutions sur les référentiels (retour testeur) — périmètre précisé pour chaque point :**

1. **[Tous les référentiels]** Tuiles (accueil et page Guides) : retirer le texte "Consulter le référentiel" — toute la tuile est déjà cliquable, même logique que "Ouvrir la catégorie" déjà retiré sur `/tools` (Bloc 33 point E).
2. **[Tous les référentiels]** Bandeau de bascule entre référentiels — sur une page référentiel, ajouter un bandeau (même principe que les boutons de famille des outils) permettant de basculer directement d'un référentiel à un autre, sans repasser par `/guides`.
3. **[Référentiel Équipements de Combat + Référentiel Équipement d'Expédition uniquement]** Réorganisation du tableau : colonne **image en 1ère position**, puis colonne **rareté**. **Noms des sets traduits** (actuellement affichés dans leur langue d'origine indépendamment de la locale du site — à faire passer par next-intl comme le reste du texte fixe/éditorial, cohérent avec la règle "aucun texte codé en dur dans une langue", AGENTS.md).
4. **[Référentiel Équipements de Combat (Pouciel) + Référentiel Équipement d'Expédition (Terradust) uniquement]** Retrait des colonnes Pouciel/Terradust "à la destruction" du tableau principal (répétition de la même valeur sur toutes les lignes d'une même rareté — la donnée ne dépend que de la rareté, pas de l'objet). **Remplacé par un petit tableau séparé, plus simple, indexé par rareté uniquement** (5 lignes : Commun/Rare/Épique/Mythique/Légendaire → valeur), reprenant les données déjà verrouillées dans le cdc (tableau "Pouciel à la destruction" section 7.1 pour Combat, valeurs Terradust section 7.1 pour Expédition).
5. **[Tous les référentiels]** Titre de page sur une seule ligne — même correctif que pour la page Outils (Bloc 33 point F), appliqué ici aux pages référentiels.
6. **[Référentiel Équipements de Combat uniquement]** Ordre des boutons de famille non respecté — corriger pour respecter l'ordre déjà décidé ailleurs sur le site (Bloc 32/33) : **Attaque, Défense, Or, Vitesse**.
7. **[Référentiel Équipement d'Expédition uniquement]** Boutons de famille avec scroll horizontal indésirable — même symptôme que ce qui a été corrigé sur mobile pour Équipement de Combat/Expédition (Bloc 34 point B), mais ici sur la page référentiel elle-même. Corriger en **augmentant légèrement la largeur de la zone allouée** à ces boutons (au lieu du passage sur 2 lignes utilisé pour les outils — zone de référentiel différente, largeur disponible différente, à ajuster au cas par cas plutôt qu'appliquer mécaniquement le même correctif). **🐛 Retour de test (Bloc 37) : le correctif livré au Bloc 35 a suréagi** — les filtres (rendus en select box) s'étirent désormais sur toute la largeur disponible, ce qui donne des select box anormalement longues. **Les filtres ne doivent pas nécessairement occuper toute la largeur** — les dimensionner à leur contenu (ou une largeur raisonnable fixe), pas en `width: 100%` par défaut.

**✅ Livré (Bloc 35, PR #57) — [Référentiel Équipement d'Expédition uniquement] coquille dans le libellé : "Équipement d'expédition" → "Équipements d'expédition"** (S manquant à "Équipement"), partout où ce libellé apparaît (titre de page, navigation, tuiles, liens croisés) — cohérence avec "Équipements de Combat" qui a déjà son S.
- `/contact` — Formulaire de contact — **✅ Spécifié (nouveau, retour joueur)** :
  - **Email** (obligatoire, validé)
  - **Objet** — liste déroulante parmi quelques raisons prédéfinies. Proposition de liste par défaut, à ajuster : *Signaler une erreur de donnée*, *Suggestion d'amélioration*, *Problème technique / bug*, *Autre*
  - **Message** — zone de texte libre
  - **Envoi par email** — paramètres SMTP (URL, compte, mot de passe) en **variables d'environnement**, définies directement dans le `docker-compose` (pas en base, pas dans l'admin — secret d'infra, cohérent avec la règle AGENTS.md "secrets via variables d'environnement, jamais en dur")
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

**✅ Décidé — édition en admin :** le texte des mentions légales est **éditable depuis l'interface admin**, réservé **au rôle Super Admin uniquement** (ni Admin, ni Gestion Guides/Outils — restriction plus stricte que le reste du contenu statique, cohérent avec la sensibilité légale de cette page). **🚨 Éditeur révisé (suite au Bloc 7) — même éditeur que les guides**, `@uiw/react-md-editor` avec aperçu en direct (pas le simple textarea brut initialement prévu, obsolète depuis que les guides ont été enrichis) : cohérence d'expérience entre les deux écrans d'édition markdown du site, pas de raison de garder un éditeur au rabais ici. Toujours pas de WYSIWYG par blocs. Interprété en HTML à l'affichage côté public.

**✅ Livré (Bloc 32, PR #53) — sélecteur de langue déplacé dans la barre de boutons :** le sélecteur de langue de cet éditeur est désormais dans la même barre que retour/enregistrer.

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

Le formulaire de contact collecte votre adresse email, l'objet choisi et le message que vous rédigez, uniquement pour vous répondre — ces informations sont envoyées par email à l'équipe éditoriale et **ne sont pas conservées en base de données**.

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

**🚨 Décidé — version anglaise requise (retour joueur)** : le contenu ci-dessus n'existe qu'en français pour l'instant (chargé en base au Bloc 4, texte affiché quelle que soit la langue du site). À traduire et charger comme second contenu localisé (mécanisme JSON par locale déjà en place pour ce type de contenu, cdc section 3.3) :

```markdown
# Legal Notice

## Site publisher
The ML-Helper website (ml-helper.com) is published on a personal, non-commercial basis by:
**[PUBLISHER NAME — TO COMPLETE]**
Contact: [CONTACT EMAIL ADDRESS — TO COMPLETE]

## Publication director
[PUBLISHER NAME — TO COMPLETE]

## Hosting
**[HOST NAME — TO COMPLETE]**
[HOST ADDRESS — TO COMPLETE]
[HOST CONTACT — TO COMPLETE]

## Intellectual property
The original content of this site (guides, text, source code, interface) is the property of its publisher, unless otherwise stated.

*Million Lords* and all names, images, trademarks, and visual elements associated with the game are the property of their respective rights holders. ML-Helper is an unofficial community website, not affiliated with the game's publisher, created to help players support one another.

## Development and data reliability
This site was developed with the assistance of artificial intelligence tools. The formulas, game values, and content offered in the simulators have been **verified through direct in-game observation** by the editorial team wherever possible — they nonetheless remain the product of an unofficial, community-driven effort and may contain approximations or discrepancies following recent game updates. When in doubt, refer primarily to what you observe yourself in-game.

## Personal data
The simulation parameters (level, league, player statistics) you enter on this site are stored **only in your browser** (localStorage), never transmitted to or retained on our servers.

Only site administration accounts (reserved for the editorial team) are stored in the database, with a password stored in encrypted form.

The contact form collects your email address, the subject you selected, and the message you write, solely so we can reply to you — this information is sent by email to the editorial team and **is not retained in the database**.

## Cookies
This site does not use advertising-tracking or third-party analytics cookies. [TO BE UPDATED IF COOKIES ARE ADDED LATER.]

## Limitation of liability
The information and simulators provided on this site are for informational purposes only, based on community observations of the game *Million Lords*. The publisher does not guarantee the absolute accuracy of this data and cannot be held responsible for decisions made by players based on it.

## Governing law
This legal notice is governed by French law.

## Contact
For any question regarding this legal notice: [CONTACT EMAIL ADDRESS — TO COMPLETE]

*Last updated: [DATE]*
```

### Pages admin (protégées par login)
- `/admin` — Dashboard (résumé : simulateurs actifs/total, guides publiés/total, dernières actions des logs)
- `/admin/setup` — Création du Super Admin au tout premier lancement (uniquement si aucun Super Admin n'existe en base, redirection vers `/login` sinon)
- `/admin/guides` — **✅ Livré (Bloc 50, PR #73) — écran dédié aux guides uniquement**, la colonne Type et le tableau fusionné avec les référentiels ont disparu (référentiels désormais sur `/admin/referentiels`, écran distinct — voir section 3.1/3.2). CRUD complet pour les guides (créer/éditer/activer-désactiver/supprimer). **✅ Livré (Bloc 55, PR #77) — 2 affinages retour testeur :**
  1. **Bouton "Nouveau" repositionné à côté du titre "Contenu éditorial"** (au lieu de sur la ligne de filtre, position actée au Bloc 32 — nouvelle position suite à la refonte de l'écran post-Bloc 50).
  2. **Nouvelle colonne indiquant les langues dans lesquelles chaque guide est réellement écrit** (ex: badges/icônes FR/EN/ES/DE/TR, actifs seulement pour les langues où le contenu existe) — utile pour repérer d'un coup d'œil quels guides restent à traduire, maintenant que le site est en 5 langues (Bloc 44).
- `/admin/guides/new` / `/admin/guides/[id]` — Édition d'un guide (Titre + Résumé + éditeur markdown `@uiw/react-md-editor` avec aperçu en direct, pas de WYSIWYG par blocs) ou d'un référentiel (dropdowns rareté/famille/emplacement/compétence, valeur en saisie libre — voir section 3.2)
- `/admin/tools` — **🚨 Révisé — ne liste plus que les simulateurs** (Villes/Combat/Classement/Compétences), les référentiels n'y sont plus (voir ci-dessus) — voir "Gestion des outils" ci-dessus. **✅ Livré (Bloc 62, PR #82) — tri alphabétique des entrées, sur cet écran ET sur `/admin/referentiels`** (par nom affiché, dans la langue active de l'interface admin — EN/FR uniquement depuis le Bloc 47) — remplace l'ordre actuel (probablement l'ordre d'insertion/création), pour un repérage plus rapide dans les 2 tableaux admin.

**✅ Livré (Bloc 64, PR #83) — même tri alphabétique côté public, sur `/tools` ET `/referentiels`.** Complète le tri admin du Bloc 62 (limité aux 2 écrans admin) en l'étendant aux pages publiques équivalentes — mêmes tuiles, même principe de tri par nom affiché (langue active du site cette fois, pas juste EN/FR admin).

**✅ Livré (Bloc 64, PR #83) — admin référentiel Boutique : retirer l'aperçu rendu affiché sous les champs Nom/Description (support du gras, Bloc 62 point B).** Le joueur confirme être satisfait de la syntaxe `**gras**`, mais **ne veut pas d'aperçu rendu en-dessous de chaque champ de saisie** — prend de la place inutilement, la vérification visuelle se fait directement sur la page publique. Simplifie l'implémentation prévue au Bloc 62 (pas de rendu live en admin, juste le champ texte brut).

**✅ Livré (Bloc 64, PR #83) — 🚨 nouvelle proposition : remplacer les 4 tableaux de catégorie de la Boutique par des grilles de tuiles**, dans la continuité de la réflexion sur le rendu tableau imparfait sur mobile (et parfois desktop) déjà évoquée pour le Bloc 63. **Portée : public uniquement** (le tableau Intro et l'admin, orientés saisie/édition en masse, restent en table — à confirmer si le joueur veut étendre le changement, non demandé explicitement pour l'instant).
- **Grille responsive** : 2 tuiles de large sur desktop, **1 seule colonne sur mobile**.
- **Structure de tuile** : image à gauche (même taille qu'aujourd'hui, 5rem — Bloc 46), à droite le **nom en gras** puis la **description**.
- **Placement du tarif en saphirs à trancher** — proposition faite au joueur : badge de prix en haut à droite de la tuile, aligné avec le nom (pattern "carte produit", prix visible immédiatement) ; alternative : prix en bas de tuile, après la description. Décision finale en attente du joueur.

**✅ Placement du tarif confirmé par le joueur (01/09/2026) — badge en haut à droite de la tuile, aligné avec le nom**, comme proposé.

**✅ Livré (Bloc 68, PR #87) — retour testeur : ajustement du placement du tarif, mobile uniquement.** Les tuiles fonctionnent bien en mobile, mais le contenu interne pourrait être amélioré — **le tarif en saphirs passe sous le titre (au lieu du badge en haut à droite), mais seulement en mobile**. Le placement desktop (badge en haut à droite, décision ci-dessus) reste inchangé.

**✅ Couleurs précisées par le joueur (01/09/2026) — tuiles en gris, tarif en saphirs en violet.** Le violet est déjà la couleur d'accent du site (mentionnée à plusieurs reprises comme identité visuelle — voir notamment le style des images de référentiel) — cohérent de l'utiliser pour mettre en avant le prix, l'élément sur lequel l'œil doit se poser en premier sur une tuile de type "carte produit".

**✅ Livré (Bloc 65, PR #84) — le tableau "Intro" (Image/Nom/Description, Bloc 58) passe aussi en tuiles, comme les 4 tableaux de catégorie (Bloc 64) — mais sans aucun coût.** Cohérence visuelle avec le reste de la page une fois les 4 tableaux de catégorie convertis. **Différence avec les tuiles de catégorie : pas de badge tarif** (les entrées de l'Intro — Saphirs, Inventaire — sont informatives, pas des objets à prix, contrairement aux 4 catégories). Même structure sinon : image à gauche, nom en gras puis description à droite, mêmes couleurs (tuiles grises).

**✅ Livré (Bloc 65, PR #84) — admin Boutique : élargir encore la colonne/le champ Description, il reste de la marge inutilisée.** Complète les ajustements de largeur déjà faits au Bloc 53 (champs élargis à leur colonne, colonne Description déjà élargie une 1ʳᵉ fois) — retour testeur : il reste de l'espace vide, **les colonnes doivent occuper toute la largeur disponible du tableau**, pas juste une largeur légèrement supérieure aux autres colonnes. ⚠️ Contrainte impérative inchangée (Bloc 40/42/48/53) : toujours aucun scroll horizontal, même après cet élargissement supplémentaire.

**✅ Livré (Bloc 65, PR #84) — images du référentiel Boutique : 5rem → 6rem.** Concerne les images des tuiles de catégorie (Bloc 46/64) et, une fois livré, celles du tableau/tuiles Intro (ci-dessus) — taille légèrement supérieure aux autres référentiels (3rem, Bloc 38), déjà le cas depuis le Bloc 46, simplement augmentée encore d'1rem.

**✅ Livré (Bloc 64, PR #83) — référentiel Level Up : styliser les contrôles de pagination (Précédent/Suivant/indicateur de page) comme les boutons de navigation déjà utilisés ailleurs sur le site** (ex: sélecteur de ligue en boutons, Bloc 61, ou tout autre style de bouton déjà établi cohérent avec l'identité visuelle) — remplace le rendu par défaut/générique actuel de la pagination. Précision exacte du composant de référence à confirmer en implémentation si ambigu.

**✅ Livré (Bloc 64, PR #83) — référentiel Coût des Templiers : afficher le tableau en 2 colonnes × 10 lignes, dans le style déjà utilisé par Level Up (2 paires de colonnes Niveau/Valeur côte à côte), mais figé à 10 lignes par colonne — pas de pagination nécessaire** (20 lignes au total pour Templiers, contre potentiellement plus pour Level Up qui justifie sa pagination). Objectif : utiliser mieux la largeur disponible, cohérent avec le style déjà validé au Bloc 38 pour l'alignement visuel entre Level Up/Templiers/Gemmes.
- `/admin/tools/[id]` — Édition détaillée d'un simulateur (bouton retour vers la liste)
- `/admin/users` — Gestion des utilisateurs admin (créer/modifier/supprimer des comptes, **activer/désactiver un compte sans le supprimer**, assigner un rôle, changer le mot de passe de n'importe quel utilisateur) — **réservé au rôle Super Admin**
- `/admin/logs` — Historique des modifications en langage naturel (ex: "admin a désactivé le calculateur Coût de Ville"), avec purge manuelle par plage de dates. **✅ Livré (Bloc 57, PR #78) — 2 bugs sur le référentiel Boutique.** (1) Un seul enregistrement (bouton de sauvegarde unique, Bloc 42) génère 2 lignes de log distinctes ("a modifié le texte d'introduction du référentiel Consommables" + "a modifié le référentiel Boutique") au lieu d'une seule — corrigé via un endpoint transactionnel combiné, 1 clic = 1 ligne de log. (2) Nom obsolète "Consommables" retiré partout où il traînait dans les messages de log dynamiques touchant ce référentiel. **✅ Livré (Bloc 59, PR #79) — 🐛 faille de sécurité, droits d'accès à cette page mal appliqués — ampleur précisée (relativisée) : seul `admin` a un problème d'accès, les autres rôles étaient déjà correctement exclus.** `admin` a actuellement accès complet (lecture + purge) à cette page, alors que la purge doit être réservée à `super_admin` uniquement. **Droits corrects à appliquer :**
  - **`super_admin`** : accès complet (lecture + purge) — déjà correct, à conserver.
  - **`admin`** : **lecture seule** — voit la page et son contenu, mais **aucun bouton/action de purge visible ni accessible** (ni côté UI, ni côté API — la route de purge doit elle-même vérifier le rôle, pas seulement masquer le bouton). **C'est le seul vrai correctif à apporter.**
  - **`guides_manager` / `calculators_manager` / `references_manager`** : aucun accès à cette page (déjà le cas, à ne pas casser en corrigeant `admin`).
  - **`read_only`** : **🚨 précision de périmètre complète (retour joueur) — accès en lecture seule à Tableau de bord, Outils, Référentiels, Guides uniquement.** Sur le Tableau de bord, **la section "dernières actions" (contenu d'historique) doit être masquée pour ce rôle** — pas d'exposition indirecte de l'historique via le dashboard. **Aucun accès à `/admin/logs` (Historique) ni à `/admin/users` (Utilisateurs)** — ni lien dans la nav admin, ni accès direct à l'URL (redirection/403 si tentative).
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

**🚨 Bug trouvé — compteur du dashboard trompeur (retour joueur)** : le dashboard affiche "X publiés / Y total" en comptant tous les guides au statut `published`, **sans tenir compte de `is_active`** — un guide publié mais désactivé compte comme publié alors qu'il est invisible côté public. **Ne pas fusionner `is_active` et le statut** (annulerait la décision ci-dessus, qui est volontaire). **Fix : le numérateur du compteur doit être `published ET is_active=true`** (réellement visible par les joueurs), pas juste `published`. Cohérent avec la logique déjà utilisée pour les outils/référentiels (comptés sur leur seul `is_active`, sans workflow de publication séparé à gérer).
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
> - **Contenu dynamique** (nom/description/astuces d'un calculateur, contenu d'un guide, libellés de tables de référence) — stocké en JSON par locale en base, mais **présenté en admin comme un formulaire avec un champ de saisie distinct par langue** — **✅ Précisé après retour utilisateur (Bloc 7) : liste déroulante compacte pour choisir la langue éditée**, pas d'onglets ni d'accordéon (jugés trop encombrants à l'usage sur l'éditeur de guides) — jamais le JSON brut affiché à l'utilisateur admin
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
| category | enum | villes / combat / classement / compétences — les référentiels (Équipements Combat/Expédition, **Level Up**) sont une entité distincte (voir note ci-dessous) |
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
| role | enum | **✅ Livré (Bloc 50, PR #73) — 6ᵉ rôle ajouté : `references_manager`** (5 valeurs → 6, voir décision complète section 3.2) : `super_admin` / `admin` / `guides_manager` / `calculators_manager` / `references_manager` / `read_only` |
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

**✅ Décidé — filtres de recherche sur `/admin/logs`** (nouveau, retour joueur post-Bloc 11) : filtrer par utilisateur (sélection parmi les admins existants), par mot présent dans le message en langage naturel affiché, et par plage de date. Le message affiché étant généré dynamiquement (pas un champ stocké), la recherche par mot doit porter sur le texte généré/affiché, pas sur un champ dédié à créer inutilement.

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

**✅ Livré (Bloc 33, PR #54) — fusion des deux parties en un seul bloc "Total" complet (retour testeur, corrige une 1re version qui supprimait à tort des infos) :** garder **toutes les informations disponibles**, sans rien perdre. Le bloc "Pour 1 ville" ci-dessous devient **LE bloc de résultat unique** ("Total"), avec le multiplicateur nombre de villes appliqué où c'est pertinent — l'ancien bloc "agrégé" (ci-dessous) est retiré car il n'avait qu'un sous-ensemble incomplet des informations (pas de Remparts).

*Bloc "Total" unique (remplace les 2 blocs précédents) :*
- Coût — **total pour l'ensemble des villes** (déjà multiplié par le nombre de villes)
- Remparts de la ville — niveau source A et niveau cible B (**non multiplié** — c'est un niveau, pas une quantité cumulable, identique pour chacune des villes upgradées)
- VP — **total gagné pour l'ensemble des villes** (déjà multiplié par le nombre de villes)
- Production gold et troupes (Production d'or, Production d'armée) — niveau source A et niveau cible B, **totale pour l'ensemble des villes** (déjà multipliée par le nombre de villes)

~~*Pour 1 ville (avant/après) :*~~
~~- Coût (pour upgrader une seule ville de A à B)~~
~~- Remparts de la ville — niveau source A et niveau cible B~~
~~- VP — niveau source A et niveau cible B~~
~~- Production gold et troupes (Production d'or, Production d'armée) — niveau source A et niveau cible B~~

~~*Pour le nombre de villes défini (agrégé) :*~~
~~- Coût total (pour l'ensemble des villes)~~
~~- VP total gagné (pour l'ensemble des villes upgradées)~~
~~- Production gold et troupes totale — niveau source A et niveau cible B (× nombre de villes)~~

**✅ Livré (Bloc 33, PR #54) — champ niveau cible, sélection automatique au focus (retour testeur) :** le champ niveau cible est prérempli à 2 par défaut (choix assumé, pas un bug). Mais actuellement il faut effacer manuellement le "2" avant de taper une nouvelle valeur — corriger en sélectionnant tout le contenu du champ au focus (comportement standard `select()` au clic/tab), pour que taper directement remplace la valeur préremplie. **Vérifier si ce même problème existe sur d'autres champs numériques préremplis du site** (ex: niveau source A, autres simulateurs Villes) et appliquer la même correction partout où c'est pertinent.

**✅ Livré (Bloc 34, PR #55) — 🐛 bug introduit par le correctif ci-dessus : la validation en temps réel empêche de taper un nombre à plusieurs chiffres.** Le champ niveau cible a une contrainte minimum (niveau cible ≥ niveau source + 1). Cette contrainte est actuellement appliquée **à chaque frappe** : exemple concret — niveau source = 1, niveau cible sélectionné (= "2" par le correctif ci-dessus), le joueur tape "1" pour commencer à écrire "100" → le champ contient temporairement "1", en dessous du minimum (2), donc la validation le **réinitialise immédiatement à 2** avant que le joueur ait pu taper le reste. Résultat : impossible de saisir "100" (ou tout nombre commençant par un chiffre inférieur au minimum). **Corriger en ne validant/clampant la valeur qu'à la perte de focus (`onBlur`) ou à la soumission du calcul, jamais à chaque frappe (`onChange`)** — laisser le joueur taper librement pendant la saisie, la contrainte ne s'applique qu'une fois la saisie terminée. **Vérifier tous les autres champs numériques du site avec une contrainte min/max similaire** (même risque partout où une validation temps réel a pu être ajoutée en même temps que le correctif select-on-focus).

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

**✅ Livré (Bloc 33, PR #54) — même traitement que Coût de Ville (retour testeur) : fusionner les 2 blocs de résultats en un seul bloc "Total" complet.** L'implémentation réelle affiche actuellement 2 blocs séparés (dont un bloc "Total") — comme pour Coût de Ville, fusionner en un seul bloc qui garde toutes les informations disponibles, sans rien perdre au passage. **⚠️ Cette liste d'outputs ci-dessus peut être incomplète par rapport à l'implémentation réelle actuelle** (déjà vu sur Coût de Ville, où le cdc ne reflétait pas tout ce qui existait en pratique) — vérifier contre le code réel du calculateur avant de fusionner, pas uniquement contre ce texte.

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

#### Villes — Calculateur 4 : Production (fusion Production de Ville + Production totale)

**✅ Fusion actée par le joueur :** ce qui était initialement 3 calculateurs séparés (Production d'une ville, Production totale, Récompenses) a d'abord été regroupé en un seul calculateur, puis **Récompenses en est ressorti** pour devenir un calculateur autonome (voir Calculateur 4bis ci-dessous) — plus simple d'usage, ne nécessite pas de connaître le nombre de villes/niveau pour l'utiliser. Production de Ville et Production totale restent fusionnées ici, les 2 sujets partagent le même besoin de base (nombre de villes, niveau).

**Objectif :** afficher, à partir d'un même jeu d'inputs, la production **par ville**, et la production **totale détaillée** (base / stuff / temple).

**🚨 Révision majeure — séparation Compétences personnelles / Temple du clan :** on avait d'abord fait contribuer automatiquement le nombre de Templiers du joueur à sa propre production. **C'est faux** : les Templiers d'un joueur alimentent un **bonus de temple partagé par tout le clan** (base du temple + somme des Templiers de tous les membres), pas directement la production du joueur qui les possède. Exemple donné par le joueur : 15 Templiers Vitesse personnels contribuent 15% au temple Vitesse du clan, qui a par exemple une base de 50% + les contributions de tous les membres = 325% au total, appliqué à **tout le clan**.

**Conséquences :**
- Les **Templiers** (section Paramètres du joueur, renommé — précédemment "Templiers personnels") ne contribuent plus automatiquement à la production affichée — ils restent utiles uniquement pour le calculateur Templiers lui-même (coût d'upgrade, contribution qu'ils apportent au pool du clan)
- **Nouvelle entrée dans les Paramètres du joueur : "Bonus de temple (clan)"** *(renommé, "clan" entre parenthèses — précédemment "Bonus de temple du clan")* — 5 champs (Attaque/Défense/Or/Recruteur/Vitesse). **✅ Simplifié (retour joueur)** : le joueur saisit uniquement la **contribution des Templiers du clan** (ex: 260% pour Vitesse, valeur lisible directement sur l'écran de temple du jeu), **pas le total** — la base du temple s'ajoute automatiquement, calculée par l'outil, pas par le joueur :

```
Bonus_temple_total(stat) = base_temple(stat) + Templiers_clan_saisi(stat)
```

| Stat | Base du temple (ajoutée automatiquement, pas saisie) | Pas d'incrément Templiers (aligné sur le taux Templier) |
|---|---|---|
| Attaque | 20% | 0,25 |
| Défense | 30% | 0,25 |
| Or (Prospérité) | 30% | 0,5 |
| Recruteur | 30% | 0,5 |
| Vitesse | 50% | 1 |

**🚨 Exigence UI, pas juste une donnée de référence (retour joueur, bug trouvé) :** les 5 champs de saisie doivent accepter des décimales avec le **pas exact de cette table** (`step` HTML) — un templier unique donne un bonus fractionnaire selon la stat (ex: 0,25% pour Attaque/Défense, 0,5% pour Or/Recruteur, 1% pour Vitesse), donc un champ limité aux entiers empêcherait de saisir des valeurs réelles observées en jeu.

**✅ Affichage compact et hiérarchique (révisé)** : plutôt que 3 colonnes au même niveau (Base / +Perso / +Temple), affichage type "dont" — le total en gros, puis le détail des contributions en dessous, sans signe "+" ni mention "perso"/"clan" redondante (juste "Stuff" et "Temple") :
```
💰 Or — Production totale : [total]
   Base : [base]   Stuff : [delta perso]   Temple : [delta temple]
⚔️ Troupes — Production totale : [total]
   Base : [base]   Stuff : [delta perso]   Temple : [delta temple]
VP total : [vp]
```

**Inputs (partagés par les 2 sous-sections) :**
- Nombre de villes
- Niveau moyen des villes
- **Ligue** — sélecteur dédié, vide par défaut, aligné automatiquement sur la ligue des Paramètres du joueur si définie (même comportement que Classement/Troupes attaque démo/Level Up, y compris au chargement initial — voir section 3.3 point 23)
- *(implicite, lu depuis les Paramètres du joueur en localStorage)* Compétences perso (Prosperous %, Recruiter %) et Bonus de temple (Or %, Recruteur %), séparément

**Outputs :**
- *Par ville* : VP, Remparts, Production d'or, Production d'armée (base, sans bonus)
- *Total* : VP total, Production d'or (Total / dont Base / dont Stuff / dont Temple), Production de troupes (idem)

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
```

**Paramètres numériques :** réutilise directement les formules/paramètres de la table "Niveaux de ville" (section 7.1 Villes), calcul interne via `mathjs` non exposé à l'admin.

#### Villes — Calculateur 4bis : Récompenses de production

**🚨 Nouveau, sorti du calculateur Production** (retour joueur) : plus besoin de renseigner nombre de villes/niveau/ligue — le joueur saisit directement sa production de base telle qu'affichée en jeu ("en blanc", brute, sans les bonus Stuff/Temple déjà appliqués visuellement en jeu), ce qui évite d'avoir à faire correspondre exactement sa configuration de villes pour un calcul ponctuel.

**Objectif :** convertir une récompense en heures de production (Or ou Troupes) en quantité réelle obtenue, à partir de la production de base du joueur.

**✅ UI en 2 blocs visuellement séparés (Or / Troupes), pas un formulaire mélangé** — chacun avec ses propres inputs et son propre résultat, cohérent avec le traitement Or/Troupes déjà utilisé ailleurs (ex: Production).

**Inputs (par bloc) :**
- Production de base (brute, sans bonus) — saisie avec **sélecteur d'unité ×1/k/M/G/T** (même pattern que "Or disponible" du calculateur Niveau Max), paliers de **0,1**
- Heures reçues — paliers de **0,5**

**Outputs (par bloc) :**
- Bonus obtenu

**Calculs :**
```
Bonus_or = Production_or_base × heures_recompense_or
Bonus_troupes = Production_troupes_base × heures_recompense_troupes
```

**✅ Règle confirmée par le joueur (inchangée depuis la version fusionnée) :** le calcul se base sur la **production de base** (sans compétences perso ni temple) — pas la production boostée. Exemple donné : villes produisant un total de 1 or/h en troupes ; une récompense de 25h de production troupes donne 25 or de troupes supplémentaires (1 × 25).



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

**✅ Corrigé (Bloc 28, PR #49) — arrondi vers le bas, jamais vers le haut :** `Rang_au_seuil(P)` s'arrondit avec `Math.floor`, jamais `Math.round`. Un seuil à 94,5 places n'affiche jamais 95 (le 95e joueur redescend réellement de ligue, afficher 95 induirait le joueur en erreur sur son maintien).

**✅ Livré (Bloc 31, PR #52) — chevauchement de rang entre deux plages adjacentes (bug résiduel après le Bloc 28) :** chaque plage (ex: "1-6%", "6-25%") calcule encore sa borne de départ ET sa borne de fin indépendamment depuis son propre seuil de pourcentage brut, ce qui peut faire apparaître le même rang dans deux plages adjacentes (ex: le 10e joueur en fin de "1-6%" ET en début de "6-25%"). Correction actée : seule la **borne de fin** de chaque plage se calcule depuis son pourcentage ; la **borne de départ** de chaque plage (sauf la première, qui démarre toujours à la place 1) = **borne de fin de la plage précédente + 1**, jamais recalculée indépendamment. Si "1-6%" couvre les places 1 à 10, "6-25%" démarre obligatoirement à la place 11.

**Inputs :** ligue (détermine les seuils affichés), pourcentage actuel du joueur, rang actuel du joueur
**Outputs :** nombre total de joueurs déduit, table des rangs correspondant à chaque seuil de pourcentage repère de la ligue choisie (ordre croissant), **colonnes affichées dans l'ordre Rang puis Seuil** (inversé par rapport à la première version)

**Paramètres numériques** pour le calcul (interne via `mathjs`, non exposé à l'admin), `lookup_table` pour les seuils par ligue (éditables en admin, cohérent avec le reste du site)

**Statut : ✅ Calculateur entièrement spécifié et complet — les 6 ligues ont leurs seuils et récompenses confirmés.**

**💡 Extension proposée par le joueur :** ajouter 2 colonnes au tableau — **Ligue cible** et **Récompenses obtenues** pour chaque seuil, puisque les seuils de classement déterminent les récompenses de fin de saison.

**🚨 Décidé — Ligue cible et Récompenses doivent être traduites (retour joueur, actuellement en français uniquement)** : ces 2 colonnes ne doivent pas être stockées/affichées comme du texte français brut ("Montée Or", "100 saphirs, 7 accélérations de troupes, 6 gemmes") — elles doivent passer par une **structure de données** (type de mouvement : montée/maintien/descente + ligue cible en enum ; récompenses en liste de `{type, quantité}` avec type en enum : gemmes/saphirs/accélérations de troupes/etc.) **rendue via next-intl** à l'affichage, cohérent avec le reste du texte fixe (cdc section 3.3) — pas une chaîne de caractères french-only stockée telle quelle.

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

**✅ Livré (Bloc 67, PR #86) — RENOMMAGE : "Level Up" → "Progression" (nom pas français, retour joueur).** Libellé public corrigé partout via la source unique `references.catalog.level-up`, cohérent avec le pattern Boutique/Templiers. **Slug d'URL inchangé (`/referentiels/level-up`)**. **Trouvaille en auditant les liens croisés : le sens outil→référentiel (Taux de gain d'XP → Progression) était carrément absent, pas juste mal ciblé** — ajouté, cohérent avec toutes les autres paires référentiel/outil. ⚠️ **"Level Up" reste le terme utilisé dans ce document cdc pour désigner ce référentiel** (nom de travail historique) — seul le libellé **public affiché sur le site** a changé.

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

**🚨 Constat d'audit (29/08/2026) — le code refuse honnêtement d'inventer une valeur pour Argent (`levelUpTroopsAt` renvoie `null`), mais ça va plus loin : le type de données exclut structurellement Argent, et l'éditeur admin n'affiche qu'un texte "Argent — non confirmé", sans aucun champ de saisie.** Contraire à la règle AGENTS.md ("toute donnée encore marquée non confirmée reste éditable en admin avec sa valeur actuelle par défaut, même une hypothèse") : refuser d'inventer une donnée de jeu est correct, mais refuser de donner à l'admin un moyen de la saisir dès qu'elle sera connue ne l'est pas. **À corriger : ajouter Argent au type `LevelUpParameters["troops"]` et un champ de saisie dans l'éditeur admin**, avec `null`/valeur non définie comme état par défaut plutôt qu'une absence structurelle de champ.

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

**🚨 Gap admin trouvé (audit Bloc 21, retour joueur) : ce simulateur a des paramètres stockés (seuils de ratio + % de gain par palier) mais aucun éditeur admin fonctionnel n'a jamais existé pour les modifier** — l'ancien écran "traductions" ne touchait que des champs `description`/`tips` inutilisés, jamais les vraies données de formule. Pas une régression du Bloc 21, un manque préexistant révélé en le nettoyant. À construire : éditeur dédié, même pattern que `CityParametersEditor`/`TemplarParametersEditor` déjà en place.

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

**✅ Livré (Bloc 68, PR #87) — remplacer la select box de ligue par des boutons**, même principe déjà appliqué à Level Up/Classement (Bloc 61) — étend le pattern à ce 3ᵉ outil à sélecteur de ligue.

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

#### ⏳ Nouveau mécanisme découvert — seuil de VP pour déclencher le mode "démo" côté attaquant, 3ᵉ mécanisme démo distinct

**🚨 Confirmé par le joueur : ceci est un mécanisme totalement séparé**, sans rapport avec le seuil <40% du Taux de gain d'XP ni avec le plafond de troupes en attaque démo (murailles) — 3 mécaniques "démo" bien distinctes coexistent dans le jeu, à ne jamais confondre entre elles dans les futurs échanges.

**Principe confirmé :** à partir d'une certaine VP de l'**attaquant** (VP absolue, pas relative), un ratio **VP attaquant ÷ VP cible** minimum est nécessaire pour déclencher le mode démo contre un adversaire plus faible. Ce ratio nécessaire **diminue à mesure que la VP de l'attaquant augmente** (un très gros compte a besoin d'un écart proportionnellement plus faible pour mettre un adversaire en mode démo).

**Données observées, approximatives et incomplètes (fournies par le joueur, extraites du jeu) :**

| VP attaquant | Ratio démo (VP attaquant ÷ VP cible) |
|---|---|
| 170G | 2,3x |
| 100G à 150G | 2,4x |
| 48G à 56,6G | 2,5x |
| 33G à 47G | 2,6x |
| 20G à 28G | 2,7x |
| 14,8G à 20G | 2,8x |
| 9,1G à 12G | 2,9x |
| 6,55G à 9G | 3,0x |
| 6G à 6,5G | 3,1x |
| 3,71G à 4,5G | 3,2x |
| 3G à 3,1G | 3,3x |
| 2,27G à 2,7G | 3,4x |
| 1,7G à 2G | 3,5x |
| 1,67G | 3,6x |
| 1,19G | 3,7x |
| 943M à 998M | 3,8x |
| 734M à 782M | 3,9x |
| 453M | 4,2x |
| 364M | 4,3x |
| 280M | 4,4x |
| 249M | 4,5x |
| 122M | 4,9x |
| 24M | 6,0x |
| 22,3M | 6,1x |
| 9,7M | 6,7x |

**⚠️ Données explicitement qualifiées d'approximatives par le joueur, avec des trous visibles** (ex: aucune valeur entre 3,9x et 4,2x, entre 4,5x et 4,9x, entre 4,9x et 6,0x, entre 6,1x et 6,7x) — **ne pas extrapoler de formule/courbe à partir de ce tableau en l'état**, conforme à la règle du projet (aucune extrapolation sans confirmation explicite en jeu). Traiter comme référence brute à affiner si le joueur collecte des points supplémentaires, pas comme un tableau de seuils prêt à implémenter.

**✅ Décidé — intégré au même outil que le Taux de gain d'XP**, puisque c'est déjà l'écran où la relation VP attaquant/VP cible est calculée. **✅ Comportement précis décidé (avec exemple concret du joueur) :**
1. À partir de la VP de l'attaquant saisie, chercher le ratio démo correspondant dans le tableau de paliers ci-dessus (ex: 453M VP → ratio 4,2x).
2. Calculer le **seuil de VP cible** en dessous duquel le mode démo se déclenche : `VP_cible_seuil = VP_attaquant ÷ ratio_démo` (ex: 453M ÷ 4,2 = 107,8M).
3. **Insérer ce seuil comme ligne supplémentaire, au bon emplacement, dans le tableau de résultats déjà existant du Taux de gain d'XP** (qui est lui-même organisé par plages de VP cible) — pas un bloc séparé, une vraie ligne intercalée à sa position naturelle parmi les paliers déjà affichés. Au-dessus de ce seuil : attaque normale (troupes complètes, vitesse normale). En dessous : mode démo (troupes plafonnées, vitesse réduite — mécaniques déjà connues par ailleurs, cdc section 7.1).

**Reste à trancher avant tout envoi Codex :** précision des paliers manquants dans le tableau de ratios démo (surtout 3,9x→4,2x et 4,9x→6,0x) ; confirmer si les valeurs "single point" du tableau sont de vrais points isolés ou des plages mal capturées.

**🚨 Même gap admin que le Taux de gain d'XP ci-dessus (audit Bloc 21)** : les 6 pourcentages par ligue sont stockés mais aucun éditeur admin fonctionnel n'existe pour les modifier. Même solution : éditeur dédié, pattern `CityParametersEditor`/`TemplarParametersEditor`.

**✅ Décidé — on garde "Classement" comme nom de catégorie**, question de renommage tranchée, pas de renommage prévu. **⚠️ Précision (corrige une ambiguïté antérieure) : ce nom concerne uniquement Ranking.** Taux de gain d'XP et Troupes en attaque démo appartiennent à la catégorie **Combat** (voir décision explicite en tête de cette section), pas à Classement — Classement ne s'élargit pas avec eux.

**✅ Décidé — ordre des outils, catégorie Combat** (public ET admin) : Combat, Troupes ennemies, Taux de gain d'XP, Troupes en attaque démo.

**⏳ Nouveau chantier en réserve — "Combat" (simulateur d'attaque sur 1 ville), pas encore cadré, aucune formule confirmée.** Principe donné par le joueur :
- **Inputs attaquant :** nombre de troupes, stats Attaque, Charognard *(charo — nom exact à confirmer, probablement "Scavenger"/`scavenger`, déjà dans la liste des clés techniques établies)*, Bravoure, VP de l'attaquant.
- **Inputs défenseur :** niveau de la ville, nombre de troupes dans la ville, stats Défense, Récupération, Intrépide, Salvageur *(`salvager`, déjà dans la liste des clés techniques établies)*, VP du défenseur.
- **Outputs attendus :** l'attaque passe ou échoue (condition de réussite inconnue à ce stade), montants gagnés par chacun des deux joueurs, XP gagnée, troupes tuées, troupes récupérées.
- **Rien de tout ça n'est encore verrouillé** — ni la condition de passage/échec de l'attaque, ni la formule de dégâts, ni la formule de gains/pertes, ni la formule XP de combat (distincte de la formule Level Up XP déjà confirmée). **Ne pas envoyer de prompt d'implémentation tant que ces formules ne sont pas confirmées par le joueur** — même prudence méthodologique que pour "Estimation des troupes ennemies" ci-dessous, voire davantage vu le nombre de variables en jeu (8 stats + VP des deux côtés).

#### Autres calculateurs existants à traiter ensuite
- **Combat** : Level Up, Fight, Enemy Troops (toujours non spécifiés) — **✅ mais Taux de gain d'XP et Troupes attaque démo sont désormais spécifiés et prototypés dans cette catégorie** (voir section 7.1, sous-section dédiée)
- **Classement** : Enemy Gain Factor, XP Given Rate

### 6.2 Nouveaux calculateurs à spécifier

#### Référentiel — Consommables

**🚨 Reclassé (retour joueur) — ce n'est pas un outil de calcul, c'est un référentiel** (comme Level Up), pas une "simulation d'achat" avec panier comme envisagé initialement. **✅ Livré (Bloc 43, corrigé en review PR #66) — rejoint le référentiel Boutique, URL actuelle `/referentiels/shop`** (historique : `/guides/referentiels/consommables` → renommé `/guides/referentiels/shop` au Bloc 48 → racine déplacée vers `/referentiels/shop` au Bloc 50) — **jamais dans `/tools`**, même traitement que Level Up (cdc section 3.1, décision équivalente).

**Objectif :** consulter la liste des consommables disponibles à l'achat et leur coût.

**Structure d'une entrée :**
- Photo de l'objet
- Nom
- Description
- **Catégorie** (Expédition / Stuff / Jeu — voir note ci-dessous) — nouvelle colonne
- Coût en saphirs

**✅ Prix confirmés fixes, ne varient pas par ligue** (contrairement aux gemmes) — un seul prix par objet, pas de table par ligue.

**✅ Tri : par catégorie, puis ordre alphabétique** à l'intérieur de chaque catégorie.

**💡 Contexte sur le choix de "Catégorie" plutôt que "source d'achat"** : les consommables s'achètent depuis 3 endroits différents en jeu (boutique du jeu, boutique d'événements spéciaux, achat direct pendant le jeu), mais un même objet peut être disponible depuis plusieurs sources à la fois (ex: coffres et accessoires d'expédition existent à la fois en boutique jeu ET boutique événements) — la source d'achat n'est donc pas un classement propre. La **catégorie par type d'objet** (Expédition / Stuff / Jeu) reste stable indépendamment d'où on peut l'acheter.

**Emplacement dans la navigation :** section Référentiels (même famille qu'Équipements de Combat/Expédition et Level Up) — la question posée initialement ("Villes ? nouvelle catégorie Boutique ?") ne se pose plus, puisque ce n'est plus un outil de calcul mais un référentiel comme les autres.

**Reste à définir :**
- Liste des objets consommables, leurs photos, descriptions, catégories et coûts en saphirs (aucune donnée collectée pour l'instant)
- Liste exacte/exhaustive des valeurs possibles pour "Catégorie" — Expédition/Stuff/Jeu proposées, à confirmer si d'autres types existent

### Catégorie "Compétences" — Compétences, Équipements, Gemmes, Templiers

**✅ Renommé (Bloc 29, PR #50) — "Stuff" retiré du nom public, pour bien différencier Combat et Expédition** : **"Simulateur de Stuff" → "Simulateur d'Équipement de Combat"**, **"Comparaison de stuff"/"Comparateur de stuff" → "Comparateur d'Équipement de Combat"**. Ce document garde encore l'ancien nom "Stuff" dans le texte historique ci-dessous (non retouché rétroactivement, changement de libellé uniquement) — seul le nom affiché au joueur/admin a changé. **Portée du changement : uniquement le libellé public/admin (fichiers de traduction next-intl)** — le slug technique du calculateur reste inchangé.

**✅ Livré (Bloc 31, PR #52) — nouvelle passe de renommage + suppression :**
- **"Simulateur d'Équipement de Combat" → "Équipement de Combat"** (raccourci, "Simulateur" retiré du libellé)
- **"Simulateur d'Équipement d'Expédition" → "Équipement d'Expédition"** (idem)
- **Comparateur d'Équipement de Combat : supprimé entièrement** — plus de comparateur de stuff dans la catégorie Compétences. La sous-section "Comparateur de stuff" ci-dessous documente une fonctionnalité qui va être retirée (texte gardé pour traçabilité jusqu'à la livraison, sera nettoyé une fois la PR mergée).
- **Ordre des outils de la catégorie Compétences revu** : Équipement de Combat, Équipement d'Expédition, Gemmes, Templiers (dans cet ordre, public et admin)

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

**🚨 UI révisée — plage de niveau partagée plutôt que 5 champs indépendants (retour joueur, remplace la conception initiale ci-dessus)** : plutôt que 5 champs "Nombre de Templiers [Attaque/Def/Recruteur/Speed/Or]" saisis indépendamment, **un seul champ Niveau de départ + un seul champ Niveau cible**, partagés pour les 5 compétences (le coût étant identique quelle que soit la compétence — pas la peine de le faire saisir 5 fois). **Outputs :**
- **Coût, affiché une seule fois** (formule ci-dessous, indépendante de la compétence)
- **5 lignes détaillées, une par compétence, avec 3 valeurs chacune** :
  - **Bonus par Templier** — le taux fixe de cette compétence (référence statique, ex: "0,25%/Templier" pour Attaque)
  - **Total au niveau cible** — `cible × taux(compétence)`, le bonus total si le joueur possède "cible" Templiers de cette compétence
  - **Gain (départ → cible)** — `(cible − départ) × taux(compétence)`, ce que rapporte spécifiquement cette montée en niveau

Le nombre de Templiers réellement possédé par compétence (potentiellement différent pour chacune, ex: 10 Attaque/5 Or/15 Vitesse) n'est plus modélisé dans cet outil — l'outil répond à "si je monte un templier de X à Y, peu importe lequel, ça coûte combien et ça rapporte combien selon la compétence investie", pas à "où en suis-je sur mes 5 compétences en ce moment". Simplification assumée, pas une perte accidentelle de fonctionnalité.

**✅ Livré (Bloc 68, PR #87) — retour testeur : rendu mobile de cet outil pas beau du tout, scroll horizontal. Refonte complète mobile + desktop.**
- **[Mobile]** Champs "Niveau de départ" et "Niveau cible" empilés verticalement, au lieu de rester sur la même ligne comme actuellement.
- **[Desktop]** Fusionner le bloc de saisie et le bloc "Coût total" en un seul bloc compact, **3 colonnes de largeur égale (1/3 chacune) : Niveau départ | Niveau cible | Coût total** (au lieu de 2 blocs séparés actuellement).
- **[Desktop ET mobile, identique aux 2]** Affichage des résultats en tuiles plutôt qu'en tableau — même principe que le référentiel Templiers (Bloc 66) — réutilise exactement les mêmes caractéristiques visuelles : tuile colorée selon la compétence (palette déjà en place), image à gauche 6rem, titre avec le nom du Templier. **Contenu de chaque tuile — reprend les 3 valeurs déjà spécifiées ci-dessus** : Bonus par templier, Bonus total donné par le nombre de templiers (= "Total au niveau cible" déjà spécifié), Gain départ-cible (= "Gain (départ → cible)" déjà spécifié) — pas de nouvelle donnée à calculer, juste un changement de mise en forme, qui fonctionne aussi bien à toute largeur d'écran.

**✅ Livré (Bloc 69, PR #88) — retour testeur : unité redondante après la valeur "Bonus par templier".** Le libellé du champ indique déjà "Bonus par Templier" — pas la peine de répéter un texte d'unité supplémentaire après la valeur elle-même (ex: "0,25%" doit s'afficher seul, sans texte redondant du type "par templier" répété une 2ᵉ fois après le chiffre).

**✅ Livré (Bloc 69, PR #88) — ajouter un contrôle de validation : niveau cible doit être au minimum niveau départ + 1.** Empêcher un niveau cible égal ou inférieur au niveau départ. **Comportement du contrôle : identique à celui déjà en place sur l'outil Villes** — appliqué après la saisie, au relâchement/à la perte de focus du champ (pas en temps réel à chaque frappe).

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

**🔗 Point de cohérence important :** ces 5 stats sont **exactement les mêmes** que celles qu'on avait provisoirement appelées "bonus de temple (clan)" dans les Paramètres du joueur du prototype — il s'agit bien du **même mécanisme : les Templiers**, pas d'un bâtiment de clan séparé. **Confirmé par le joueur : les Templiers concernent les stats du joueur, pas la production de villes** — d'où le déplacement de ce calculateur vers la catégorie Compétences plutôt que Production. *(UI initialement prévue avec 5 champs indépendants dans le prototype — révisée depuis, voir la section "UI révisée" plus bas.)*

**✅ Formule confirmée — remplace la table de coût comme donnée officielle du calculateur (simplification actée par le joueur) :**
```
Coût(n) = arrondi(150 × 1,3^(n−1))
```
où `n` = niveau/nombre du Templier concerné (1 à 20). Base = 150 Pouciel pour le 1er Templier, multiplicateur = ×1,3 par palier — **2 paramètres nommés** (`base`, `ratio`) au lieu d'une table à 21 lignes, cohérent avec le modèle admin "paramètres numériques nommés" déjà acté (section 6).

**Vérifiée par le joueur contre la table exacte : correspond sur 20 des 21 valeurs, un seul écart d'arrondi d'1 unité au niveau 15 (5906 calculé vs 5907 réel)** — écart jugé négligeable, la formule est adoptée.

**Table complète conservée ci-dessous pour référence/vérification** (valeurs réellement observées en jeu, servent aussi de jeu de test pour valider l'implémentation de la formule) :

**✅ Décidé — cette table devient le référentiel "Coût des Templiers"** (retour joueur), URL actuelle `/referentiels/templars` (historique : `/guides/referentiels/templiers` → racine déplacée au Bloc 50, slug re-anglicisé `templars` au même bloc). ⚠️ Note historique obsolète retirée : ce paragraphe indiquait à l'origine que Templiers serait "le 4ᵉ référentiel réellement construit, pas le 5ᵉ" et que Consommables n'était pas encore construit — **les deux sont désormais construits**, 6 référentiels réels au total (Combat, Expédition, Level Up, Templiers, Gemmes, Boutique). **Liens croisés réciproques** entre le calculateur (`/tools`, catégorie Compétences) et ce référentiel : le calculateur Templiers pointe vers "Voir la table complète" (référentiel), et le référentiel pointe vers "Utiliser le simulateur" (calculateur) — même principe que le lien déjà en place entre Simulateur de Stuff et le référentiel Équipements de Combat (Bloc 0).

**✅ Livré (Bloc 66, PR #85) — RENOMMAGE : "Coût des Templiers" → "Templiers" tout court.** Libellé public à corriger partout (titre de page, nav, tuile accueil/`/referentiels`, bandeau de bascule référentiels). **Penser à corriger le texte du lien croisé réciproque** (voir juste au-dessus) depuis l'outil Templiers, qui référence probablement encore l'ancien nom complet. **⚠️ Conséquence attendue et automatique du tri alphabétique (Blocs 62/64) : le référentiel change de position dans l'ordre.** Le tri étant calculé dynamiquement sur le nom affiché (pas une position figée en base), "Templiers" (T) se repositionne automatiquement après tout ce qui commence par une lettre antérieure — au lieu de sa position antérieure sous "Coût des Templiers" (C). **Comportement attendu, pas un bug à corriger** — s'applique partout où le tri alphabétique référentiels est en place : accueil, `/referentiels`, bandeau de bascule référentiels, admin (`/admin/referentiels`).

**✅ Livré (Bloc 66, PR #85) — nouvelle section de présentation en tuiles, insérée AVANT le tableau de coût (qui reste, structure 2×10 lignes du Bloc 64 inchangée).** Objectif : présenter les 5 templiers existants (chacun associé à une compétence — Attaque, Défense, Or, Recruteur, Vitesse) avant le détail des coûts par niveau, dans l'esprit tuiles déjà éprouvé ailleurs sur le site (fonctionne bien en mobile).

**✅ Livré (Bloc 68, PR #87) — grille de tuiles Templiers : 3 colonnes sur desktop.** Aucun nombre de colonnes n'avait été explicitement fixé à la livraison du Bloc 66 (probablement 2 par défaut, analogie avec Boutique) — précisé maintenant : **3 tuiles par ligne sur desktop** (5 templiers = 3+2). Comportement mobile inchangé (1 colonne, déjà correct).
- **Admin** : même pattern d'édition que Boutique (tableau simple, pas de tuiles côté admin). **Champs : Image, Nom, Description, Base Temple, Bonus.** **Pas de boutons d'action** (pas d'ajout/suppression/réordonnancement) — contrairement à Boutique, **le jeu de 5 templiers est fixe et complet**, toujours affiché dans l'ordre alphabétique déjà défini. **✅ Corrigé (Bloc 67, PR #86) — cause racine confirmée : Base Temple et Bonus avaient été rendus lecture seule/calculés pendant la review Codex du Bloc 66 (PR #85)** — reverti, éditable et persisté à nouveau (vérifié en live pour les 5 templiers, admin → sauvegarde → reflet public). Valeur vide affiche "—" côté public plutôt qu'un "%" cassé.
- **Public** : tuile colorée selon la compétence associée à ce templier — réutilise la palette de couleurs par compétence déjà en place (même principe que la refonte Gemmes, Bloc 65). **Image à gauche, 6rem** (cohérent avec Boutique, Bloc 65). **Titre de la tuile : "Templier [Compétence]"** (ex: "Templier Recruteur", pas juste "Recruteur"). **En dessous du titre : Base Temple, puis "Bonus par templier"** (✅ libellé raccourci, Bloc 67, PR #86 — remplace "Bonus donné par 1 templier", et équivalents EN/ES/TR, DE déjà court). **✅ Livré (Bloc 67, PR #86) — images réelles intégrées** : `templar-striker.webp`, `templar-guardian.webp`, `templar-prosperous.webp`, `templar-recruiter.webp`, `templar-rusher.webp`, câblées dans le catalogue de présentation par défaut, remplacent les placeholders.

**✅ Livré (Bloc 66, PR #85) — taille du titre des tuiles harmonisée à 1.1rem, sur les 3 référentiels à tuiles : Boutique, Gemmes, et Templiers (une fois livré ci-dessus).** Ajustement de style transverse, pas propre à un seul référentiel.

**✅ Livré (Bloc 66, PR #85) — tableau de coût Templiers : 2 correctifs d'affichage, retour testeur.**
1. **Ne jamais compacter le chiffre en notation k/M** — chiffre complet affiché (ex: `21929` pour le coût du 20ᵉ niveau, pas `21,9k` ou équivalent). ⚠️ Écart avec la spec d'origine possible ou régression du Bloc 64 (restructuration 2×10 colonnes) à vérifier — le tableau devait déjà afficher "Coût (Pouciel)" en en-tête de colonne dès la construction initiale de ce référentiel.
2. **Afficher la devise** — actuellement absente, donnant l'impression que le chiffre est sans unité. **Devise : Pouciel** (nom français confirmé, "Skydust" en anglais — cdc, terme déjà verrouillé). En-tête de colonne attendu : "Coût (Pouciel)" ou équivalent selon la langue active.

**✅ Bloc 30, PR #51 mergée — trou d'édition admin corrigé :** le référentiel Templiers, contrairement aux 3 autres référentiels réellement construits, n'a pas de valeurs propres de type `lookup_table` (c'est une table calculée depuis les 2 mêmes paramètres de formule que le calculateur — `base`/`ratio`), donc le pattern d'édition standard des référentiels (dropdowns rareté/famille/emplacement) ne s'y appliquait pas et le bouton "Modifier" était absent du tableau admin Guides. Corrigé en pointant ce bouton vers le même éditeur que le calculateur Templiers (`TemplarParametersEditor`, `/admin/tools/templars`) — un seul point d'édition partagé, même principe déjà en place pour les 3 simulateurs Villes. Au passage, confirmé que Combat/Expédition/Level Up restent bien de vraies `lookup_table` (pas le même trou) et que "Consommables" n'existe pas comme référentiel séparé (c'est un nom de stat d'Expédition, pas une table à part — cohérent avec le fait que ce référentiel n'a jamais été construit).

**✅ Livré (Bloc 33, PR #54) — 🐛 bug : activation outil Templiers et référentiel Templiers pas indépendantes.** Désactiver l'un désactive l'autre — alors que ce sont 2 entrées distinctes (l'outil dans `/tools`, catégorie Compétences ; le référentiel dans `/guides`, section Référentiels), chacune censée garder son propre statut actif/inactif, **même principe que les 3 simulateurs Villes qui partagent un point d'édition mais gardent chacun leur propre statut actif/inactif** (cdc section 3.2, cas particulier Villes). Cause probable : le bouton toggle du référentiel Templiers (corrigé au Bloc 30 pour pointer vers le bon éditeur) partage aussi, par erreur, le même champ `active` en base que l'outil calculateur, au lieu d'avoir chacun le sien. **Corriger pour que les 2 statuts soient stockés et togglés indépendamment**, tout en gardant le partage des paramètres de formule (`base`/`ratio`) et du point d'édition (`TemplarParametersEditor`) — ce sont deux choses différentes : les *paramètres* sont partagés (légitime), le *statut actif/inactif* ne doit pas l'être.


**✅ Livré (Bloc 32, PR #53) — 3 corrections sur le tableau admin Guides :**
- **Bouton activer/désactiver Templiers restauré** (le Bloc 30 n'avait corrigé que le bouton "Modifier" — routé via `/admin/tools`, `calculators.toggle`, pas la route référentiels, pour ne pas casser le correctif anti-escalade de privilèges du Bloc 30).
- **Boutons de filtre Guides/Référentiels/Tous** : colorés en violet quand sélectionnés.
- **Disposition** : bouton "Nouveau" déplacé sur la ligne de filtre.

**✅ Livré (Bloc 33, PR #54) — "Tous" doit être sélectionné par défaut** à l'arrivée sur la page (pas encore confirmé livré par la PR #53, à vérifier/corriger si besoin).

- **✅ Livré (Bloc 38, PR #60) — [Référentiel Level Up uniquement, public] tableau à aligner sur le style déjà utilisé par Coût des Templiers et Gemmes** (retour testeur : le tableau Level Up détonne visuellement des deux autres, qui partagent déjà un style cohérent entre eux). **Reprendre exactement ce même style de référence** — pas une amélioration isolée du tableau Level Up. Points de style à répliquer : (1) **alternance de couleur de ligne** (blanc/gris clair) ; (2) **encadrement** (bordure) autour du tableau ; (3) **séparation claire entre les 2 colonnes de tableaux** — le tableau Level Up utilise une disposition en 2 paires de colonnes côte à côte (Niveau/Valeur répété 2 fois, même principe que la table Templiers ci-dessus), actuellement pas assez distinctement séparées visuellement l'une de l'autre.

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

**✅ Résumé visuel enrichi (révisé, retour joueur) — 3 composantes affichées, pas 2, pour les 5 compétences concernées par le temple** (Attaque/Défense/Prospérité/Recruteur/Vitesse — voir table ci-dessus) : ligne 2 du bandeau replié affiche, pour ces 5-là, le **total suivi du détail entre parenthèses** : `[abréviation] [total] ([équipement] + [points] + [clan])`. Exemple : `Atq 600 (400 + 120 + 80)` où 600 = total, 400 = "Statistiques données par l'équipement" seule, 120 = "Points de compétence" seul, 80 = contribution du "Bonus de temple (clan)" sur cette compétence (base + Templiers, déjà additionnés — voir Calculateur 4 Production pour le détail du calcul de ce bloc). **Les 5 autres compétences (Bravoure/Charognard/Intrépide/Récupération/Recycleur) n'ont pas de bonus de temple — restent en 2 composantes** (`[total] ([équipement] + [points])`), comme avant.

```
Total(compétence) = Équipement(compétence) + Points(compétence) + Bonus_temple_total(compétence)
```

Plafonné à 90% (Bravoure/Intrépide, 75% en Légende) ou 50% (Récupération) sur le **total final**, même si la somme des 3 composantes dépasse individuellement — cohérent avec l'audit du Bloc 17.

**✅ Code couleur cohérent entre la définition des paramètres et le résumé** : chaque composante (Équipement / Points / Temple clan) garde la **même couleur** dans le bloc de saisie "Statistiques données par l'équipement" / "Points de compétence" / "Bonus de temple (clan)" **et** dans le résumé replié — permet de repérer visuellement d'où vient chaque chiffre sans avoir à relire les labels. **✅ Le total a sa propre couleur, distincte des 3 composantes** (fait au Bloc 22, PR #41). **🚨 Contraste thème clair — 3e tentative (Blocs 22 et 24 insuffisants malgré un contraste WCAG AA mesuré à 8:1 après le Bloc 24)** : le problème n'est visiblement pas que le contraste numérique, c'est le ressenti visuel — passer sur des **variantes flashy/vives** des mêmes teintes (orange/bleu/vert/violet) plutôt que de continuer à affiner la luminosité seule.

**🚨 Mise en page — 2 lignes de 5 compétences, sur TOUTES les tailles d'écran, pas juste en dessous d'un seuil (2e retour, PR #41 incomplète)** : le split 5/5 a été fait, mais **seulement en dessous d'un certain seuil de largeur** — en desktop, les 10 compétences restent affichées sur une seule ligne. Le split en 2 groupes fixes de 5 doit s'appliquer **partout, y compris en desktop**, pas juste sur mobile/tablette — ce n'est pas une histoire de largeur d'écran disponible, c'est une mise en page à toujours appliquer.

Reste sur 2 lignes fixes (retour à la ligne autorisé sous 640px, sinon défilement horizontal discret) — le détail entre parenthèses peut nécessiter un peu plus de largeur, à gérer avec la même règle de repli.

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

**Données complètes (180 lignes : 5 raretés × 4 familles × 9 emplacements) sauvegardées dans `reference-data-equipment-sets.csv`** plutôt que reproduites intégralement ici — colonnes : rareté, nom du set, famille, pouciel à la destruction, emplacements gemmes autorisés, type d'emplacement (Arme/Bouclier/.../Bottes), nom de l'objet (rempli seulement pour les armes, ex: "Marteau"), et jusqu'à 4 compétences avec leur % associé. **✅ Complété (01/09/2026) — les 10 sets (30 lignes) qui avaient encore des valeurs explicitement vides (`skill_1: "Inconnu"`) sont désormais tous renseignés.** Saisi directement par le joueur en admin (pas via un prompt Codex/Claude Code) — toutes les 180 lignes du référentiel Équipements de Combat ont maintenant leurs compétences complètes, plus aucune valeur "Inconnu" restante.

**⚠️ Fiabilité des sources externes (MLCLord, wiki)** : plusieurs désaccords ont été observés entre ces sources et les observations en jeu du joueur au fil de la collecte de données (ex: valeurs par emplacement différentes de ce qui était initialement extrait). **Les observations directes du joueur priment systématiquement sur les sources externes en cas de désaccord** (cohérent avec le principe déjà établi pour les données Villes).

**✅ Confirmé — sets Légendaires bien uniformes.** Le joueur confirme en jeu : pour les 4 sets Légendaires (Spirit Fulgur, Spirit Zephyr, Spirit Vanna, Spirit Fyra), les 9 emplacements donnent effectivement des valeurs identiques entre eux. Ce n'est pas une erreur de source — c'est une vraie particularité du palier Légendaire, à l'inverse des autres raretés où chaque emplacement varie individuellement.

**✅ 7 sets nouvellement confirmés par le joueur (Casque/Gantelet/Bottes partagent les mêmes valeurs au sein d'un même set — motif à part, différent du reste de la table où chaque emplacement varie individuellement) :**

| Rareté | Set (famille) | Casque = Gantelet = Bottes |
|---|---|---|
| Commun | Barbarian (Attaque) *(déjà connu, reconfirmé)* | Attaque 2% |
| Commun | Bard (Troupes/Vitesse) | Bravoure 2% |
| Commun | Journeyman (Défense) | Bravoure 2% |
| Commun | Thief (Or) | Recycleur (Salva) 1% *(confirmé en jeu sur les 3 emplacements — Casque, Gantelet, Bottes)* |
| Rare | Adventurer (Défense) | Bravoure 4%, Défense 3% |
| Rare | Hunter (Troupes/Vitesse) *(déjà connu, reconfirmé)* | Bravoure 4%, Recruteur 3% |
| Épique | Knight (Défense) | Bravoure 6%, Défense 6%, Recycleur 1% |
| Épique | Shopkeeper (Or) | Recycleur (Salva) 3%, Charognard 4%, Récupération 1% *(Casque confirmé ; Gantelet/Bottes présumés identiques, pattern établi)* |
| Rare | Soldier (Attaque) | Intrépide 4%, Attaque 2% *(Gantelet confirmé ; Casque/Bottes présumés identiques, pattern établi)* |

*(Barbarian et Hunter n'étaient pas dans la liste des 30 lignes manquantes — leurs stats étaient déjà connues, le joueur les a redonnées en même temps, ça reconfirme les valeurs existantes.)*

**Point isolé confirmé (hors trio Casque/Gantelet/Bottes) : Bracelet du Voleur (Thief, Commun) = Récupération 2%** — slot différent de Casque/Gantelet, sa propre valeur, cohérent avec le motif déjà vu où un même set a des compétences différentes selon l'emplacement (ex: Bague du Barbare = Charognard, différent de Casque/Gantelet/Bottes = Attaque).

**⚠️ 9 lignes encore manquantes (3 sets Rare/Épique)** — leur groupe Casque/Gantelet/Bottes n'a aucune valeur connue :

| Rareté | Sets concernés |
|---|---|
| Rare | Smuggler (Or) |
| Épique | Royal Archer (Troupes/Vitesse), Royal Guard (Attaque) |

**🚨 À reporter manuellement dans `reference-data-equipment-sets.csv`** — ce fichier CSV externe n'est pas dans le contexte de cette session, les 8 sets confirmés ci-dessus (24 lignes Casque/Gantelet/Bottes + 1 ligne Bracelet Voleur) doivent y être recopiées séparément.

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

**🚨 Constat d'audit (29/08/2026) — cette formule n'a jamais été implémentée dans le code, malgré son statut "entièrement verrouillée" depuis plusieurs blocs.** Contrairement au pendant Expédition (`expeditionMergeCost()`, avec son propre tableau public par rareté), **aucune fonction `combatMergeCost` ni tableau associé n'existe** dans le code source. La seule table à 5 valeurs présente (nommée "Skydust" dans le code, `defaultCombatSkydustBase` = 3/10/30/120/160) correspond en réalité au **"Pouciel à la destruction"** (donnée différente, section suivante ci-dessous), utilisée uniquement pour une colonne d'affichage — jamais pour calculer un coût de fusion. **À envoyer comme tâche d'implémentation** (le Simulateur d'Équipement de Combat n'affiche donc actuellement aucun coût de fusion en Pouciel, alors que la donnée est prête depuis longtemps).

**🚨 Rappel — les anciennes estimations Mythique/Légendaire (issues des paliers 5★/6★, explicitement qualifiées d'approximatives par le joueur) sont invalidées et ne doivent plus être utilisées.** Elles donnaient K(Mythique)≈320 et K(Légendaire)≈637,5 — systématiquement le double des vraies valeurs, désormais toutes confirmées exactes ci-dessus.

**Prochaine étape concrète — à vérifier en jeu :**
1. Les noms des sets (Spirit Fulgur, Shark, Shopkeeper...) correspondent-ils à ce que tu vois dans ton inventaire ?
2. Les 30 lignes manquantes (tableau ci-dessus), si tu croises ces équipements

#### ✅ Simulateur de Stuff — implémenté, structure finale (⚠️ restructuration décidée au Bloc 32, voir plus bas — cette description garde le texte d'origine par traçabilité, le comportement réel change)

~~**4 blocs affichés côte à côte sur PC / empilés sur mobile**, dans l'ordre : **Attaque, Défense, Or, Vitesse.** Chaque bloc a 3 colonnes toujours visibles (pas de repli/dépli) : grille 3×3 d'emplacements à gauche, panneau de configuration au centre (se remplit au clic sur un emplacement, un 2e clic sur le même emplacement le referme), résumé de stats à droite (encarts empilés, 2 colonnes).~~ **→ voir décision Bloc 32 ci-dessous, ce paragraphe est remplacé.**

**Grille 3×3, ordre des emplacements (inchangé) :**
```
Amulette   Casque    Bracelet
Anneau     Ceinture  Gantelet
Arme       Bottes    Bouclier
```

**Catalogues d'équipement mixtes par bloc/famille (confirmé par le joueur, inchangé) :**

| Bloc/Famille | Familles d'équipement sélectionnables |
|---|---|
| Attaque | Attaque uniquement |
| Défense | **Défense + Or** (mixte) |
| Or | **Or + Troupes/Vitesse** (mixte) |
| Vitesse | Troupes/Vitesse uniquement |

Les équipements du sélecteur sont triés par rareté décroissante (Légendaire → Commun), libellé `Rareté — Nom du set (Famille)` pour lever toute ambiguïté sur les catalogues mixtes.

**🚨 Liste blanche des compétences réellement comptabilisées (inchangée) — la question ouverte "un emplacement est-il libre de recevoir n'importe quelle famille" est résolue : non, seules certaines compétences comptent selon le bloc ET la famille réelle de l'objet équipé, même pour les objets de la famille "native" du bloc :**

| Bloc | Compétences comptabilisées, par famille d'origine de l'objet |
|---|---|
| Attaque | Attaque (natif) : Attaque, Charognard, Intrépide — tout compte |
| Défense | Défense (natif) : Bravoure, Défense, Recycleur — tout compte · Or (secondaire) : **seulement** Recycleur, Récupération |
| **Or** | Or (natif) : **seulement Prospérité** · Troupes/Vitesse (secondaire) : **seulement Recruteur** |
| Vitesse | Troupes/Vitesse (natif, seule famille du bloc) : **seulement Vitesse** |

Cette liste blanche s'applique de façon identique à 2 endroits désormais (le "Résumé par bloc" disparaît, voir Bloc 32 ci-dessous) : le calcul du récapitulatif global, et les options proposées dans le sélecteur de compétence des gemmes (pas d'option pour une compétence qui ne compterait pas de toute façon).

**Récapitulatif global** en haut de page : agrège les contributions des 4 familles combinées (une compétence qui reçoit des contributions de plusieurs blocs — via les catalogues mixtes — voit ses valeurs s'additionner).

**Gemmes par emplacement :** nombre d'emplacements = selon la rareté de l'équipement choisi (0/1/2/3), chaque gemme avec sa propre compétence (restreinte à la liste blanche du bloc), son niveau d'étoile, et **sa propre ligue** (Bronze incluse ici — gemmes déjà possédées, pas un achat simulé, donc pas de restriction Bronze contrairement au calculateur Gemmes).

**Sauvegarde en localStorage**, cohérent avec l'architecture déjà actée pour les paramètres du joueur.

**✅ Livré (Bloc 31, PR #52) — 3 évolutions de compacité/disposition (partiellement obsolètes, voir Bloc 32 ci-dessous) :**
- ~~Colonne récapitulatif (compétences + %) réduite à ~50% de sa largeur actuelle~~ → **obsolète, la restructuration Bloc 32 change la disposition en profondeur, voir plus bas.**
- **Boutons de filtre du bloc/famille : compacts, sur une seule ligne (jamais de retour à la ligne), colorés selon la couleur déjà associée à la famille/compétence concernée** — toujours valable, s'applique maintenant aux nouveaux boutons de filtre de famille du Bloc 32 (voir plus bas) — même exigence sur les boutons de filtre des référentiels Équipements de Combat/Expédition et de Gemmes (cohérence visuelle transverse). **✅ Livré (Bloc 34, PR #55) — précision mobile : "une seule ligne" ne s'applique qu'au desktop.** Sur mobile, la ligne unique déborde et génère un **scroll horizontal indésirable** sur les écrans Équipement de Combat et Équipement d'Expédition. Corriger pour que les boutons de famille **passent sur 2 lignes sur mobile**, sans jamais déclencher de scroll horizontal.
- ~~Bouton de transfert de compétences (Bloc 28, point 5) déplacé sur la ligne de titre~~ — **annulé, voir décision plus récente ci-dessous** (rejoint la nouvelle ligne de boutons de famille à la place).

**✅ Livré (Bloc 32, PR #53) — retour à la disposition de case d'origine :** nom de l'emplacement, puis image, puis niveau d'étoile de l'équipement, puis les gemmes en dessous, sur une seule ligne sans retour à la ligne même à 3 gemmes. Pas de colonnes internes.

**✅ RÉVISION MAJEURE LIVRÉE (Bloc 73, PR #92) — nouvelle disposition de case, alignée sur le jeu réel, remplace la disposition Bloc 32 ci-dessus.** Discussion du 01/09/2026, déclenchée par une comparaison directe avec le rendu en jeu.
- **Disposition** : image de l'équipement à gauche, niveau d'étoile de l'équipement en dessous de l'image (inchangé sur ce point) — **et les 3 gemmes passent à DROITE de l'image, empilées en colonne** (au lieu d'en dessous, sur une ligne, comme actuellement).
- **✅ Nouveau système d'étoiles visuelles, s'applique à la fois à l'étoile de l'équipement ET aux étoiles des gemmes (actuellement non affichées du tout pour les gemmes sur la case) :**
  - **Rendu visuel réel (icônes d'étoile répétées), jamais de notation texte type "3★" ou "3*".**
  - **Paliers de conversion, plafond pratique à 8 :**
    - **1 à 4 étoiles → étoiles blanches**, autant d'icônes que de niveau (1★=1 icône blanche, ..., 4★=4 icônes blanches).
    - **5 à 8 étoiles → conversion complète en étoiles jaunes** : à 5, les 5 étoiles blanches disparaissent, remplacées par **1 seule étoile jaune** ; 6★=2 jaunes, 7★=3 jaunes, 8★=4 jaunes. **Conversion complète, pas additive** (jamais de mélange blanc+jaune affiché simultanément).
  - **⚠️ Nuance sur le "8★ maximum" déjà verrouillé plus bas dans ce document (section Combat)** : techniquement possible de dépasser 8 en jeu, mais **extrêmement rare** — **le joueur confirme rester sur 8 comme plafond pratique pour cette fonctionnalité**, pas de palier de couleur au-delà du jaune à ce stade (inconnu s'il en existe un). Ne pas sur-ingénierer pour ce cas extrême non documenté.
- **Composant de rendu d'étoiles à créer/partager** entre l'affichage de l'étoile d'équipement et l'affichage des étoiles de gemme — même logique de conversion des deux côtés, éviter la duplication (cohérent avec la consigne de factorisation d'AGENTS.md déjà appliquée ailleurs, ex: `valueAtStar`).
- **✅ Demande explicite du joueur : conserver le rendu actuel (disposition Bloc 32) de façon à pouvoir revenir en arrière facilement si ce changement ne convient pas une fois vu en pratique.** Vu l'ampleur du changement (repositionnement des gemmes, nouveau système de rendu des étoiles), s'assurer que l'ancien composant/l'ancienne disposition reste facilement récupérable (ex: historique Git propre et isolé sur ce changement pour permettre un `git revert` simple, ou toute autre approche jugée la plus pratique par l'agent d'implémentation) — pas de prescription technique précise imposée, l'objectif est la facilité de retour arrière si besoin.

**✅ Livré (Bloc 85, PR #103) — [Simulateur d'Équipement de Combat] remplacer le texte "Vide" (emplacement sans équipement sélectionné) par une icône représentant le type d'emplacement.** Le joueur a déposé dans `public/equipment/combat/` des fichiers **`item-XXXX.webp`** (XXXX = nom de l'emplacement — 9 fichiers attendus : `item-amulet.webp`, `item-belt.webp`, `item-boots.webp`, `item-bracelet.webp`, `item-gauntlets.webp`, `item-helmet.webp`, `item-ring.webp`, `item-shield.webp`, `item-weapon.webp`, cohérent avec les 9 slugs d'emplacement déjà verrouillés section 12). **Quand aucun équipement n'est sélectionné pour un emplacement, afficher l'icône `item-{emplacement}.webp` correspondante** à la place du texte "Vide" — même zone/taille d'image que pour un équipement réellement sélectionné (probablement en grisé/estompé pour signaler visuellement l'état vide, à l'appréciation de l'implémentation).

**✅ Livré (Bloc 85, PR #103) — même traitement pour le Simulateur d'Équipement d'Expédition.** Le joueur a déposé dans `public/equipment/expedition/` des fichiers **`item-exped-YYYY.webp`** (YYYY = nom de l'emplacement — 6 fichiers attendus : `item-exped-cape.webp`, `item-exped-compass.webp`, `item-exped-pickaxe.webp`, `item-exped-pouch.webp`, `item-exped-spyglass.webp`, `item-exped-torch.webp`, cohérent avec les 6 slugs d'emplacement Expédition déjà verrouillés section 12). Même comportement que Combat ci-dessus : icône affichée à la place du texte "Vide" quand aucun équipement n'est sélectionné. **⚠️ Écart de nommage trouvé et contourné à la livraison** : les fichiers Combat réellement fournis utilisaient `item-pendant.webp`/`item-gloves.webp` plutôt que `item-amulet.webp`/`item-gauntlets.webp` attendus — traité via une table de correspondance dédiée dans le code, aucun 404. **Ne pas supposer que les noms de fichiers déposés correspondent toujours exactement aux slugs déjà verrouillés au cdc** — vérifier au cas par cas.

**✅ Livré (Bloc 73, PR #92) — images d'équipement du Simulateur d'Équipement de Combat agrandies à 2.8rem** (classe CSS `.stuff-slot-image`).

**✅ Livré (Bloc 78, PR #95) — taille des images révisée à nouveau : 2.8rem → 3.2rem** (même classe CSS `.stuff-slot-image`).

**✅ Livré (Bloc 78, PR #95) — étendre au Simulateur d'Équipement d'Expédition : même système de rendu d'étoiles que Combat (Bloc 73) + même taille d'image 3.2rem.** ⚠️ **Hypothèse de périmètre à confirmer si ambigu** : le joueur a écrit "référentiel équipement expéditions", mais le système d'étoiles (Bloc 73) concernait le **Simulateur** (outil de configuration joueur), pas le référentiel (table de référence, sans concept de niveau d'étoile configuré par le joueur) — interprété ici comme visant le **Simulateur d'Équipement d'Expédition**, équivalent du Simulateur de Stuff côté Expédition. **Nuance importante : pas de gemmes sur l'équipement d'Expédition** (confirmé Bloc 75) — seul le rendu de l'étoile de l'équipement lui-même est concerné, pas de gemmes à styliser puisqu'il n'y en a pas sur ce type d'équipement.

**✅ Livré (Bloc 79, PR #96) — [Simulateur d'Équipement d'Expédition] l'étoile affichée en dessous de l'image d'équipement (système du Bloc 78) doit être centrée horizontalement.**

**✅ Livré (Bloc 74, PR #93) — retour testeur : contraste insuffisant des étoiles blanches (1-4★) en thème clair, illisibles.** Confirmé bon en thème sombre. **Passer les étoiles blanches en gris foncé pour le thème clair** (les étoiles jaunes, 5-8★, ne sont pas concernées — déjà suffisamment contrastées). ⚠️ **Précédent connu sur ce type de problème** (contraste thème clair, résumé des composantes de bonus temple — Bloc 22/24) : l'ajustement de luminosité seule s'était révélé insuffisant 2 fois de suite, la vraie solution était de changer de teinte plutôt que de juste foncer/éclaircir la même couleur. **Bien tester le rendu réel en thème clair** avant de considérer ce point réglé, pas se fier uniquement à un contraste WCAG calculé.

**✅ Livré (Bloc 78, PR #95) — retouche : le gris du Bloc 74 est trop foncé en thème clair, se confond avec du noir.** Éclaircir légèrement la teinte de gris utilisée pour les étoiles blanches en thème clair — reste suffisamment contrasté pour être lisible, mais ne doit plus donner l'impression d'être noir. S'applique partout où le système d'étoiles Bloc 73/74 est en place (Simulateur d'Équipement de Combat, et Expédition une fois le point B de ce bloc livré).

**✅ Livré (Bloc 74, PR #93) — retour testeur : bug distinct, les étoiles jaunes (5-8★) changent de teinte entre thème sombre et thème clair.** Bon en thème sombre, mais **devient plus foncé en thème clair, contraste augmente** — signe que la couleur jaune est probablement liée par erreur à une variable de thème qui varie selon sombre/clair, au lieu d'être une couleur fixe. **Corriger pour que le jaune reste rigoureusement identique dans les deux thèmes** — une seule valeur de couleur fixe, jamais recalculée selon le thème actif.

**✅ Livré (Bloc 32, PR #53) — restructuration complète de l'écran, même principe que le Simulateur d'Équipement d'Expédition (Bloc 31) :**
- **Boutons de filtre de famille/bloc** (Attaque, Défense, Or, Vitesse — même ordre, même 4 blocs qu'aujourd'hui, mais **un seul affiché à la fois**, plus de 4 blocs simultanés côte à côte/empilés). Chaque famille garde sa **propre configuration des 9 emplacements sauvegardée indépendamment** (4 configurations distinctes en localStorage, une par famille/bloc — même principe de persistance indépendante par filtre déjà acté pour Expédition, Bloc 31 point E.1) : changer de filtre ne doit jamais écraser la configuration d'une autre famille.
- **Le récapitulatif global reste toujours affiché**, quelle que soit la famille active — il continue d'agréger les 4 familles combinées (comportement d'agrégation inchangé, les 4 configurations existent toujours en parallèle même si une seule est visible/éditable à la fois). Toujours les 10 compétences, ordre alphabétique, 0% par défaut (repris de la décision juste en dessous). **Affiche la contribution de l'emplacement actuellement sélectionné entre parenthèses, à droite de la valeur totale** — remplace l'ancien "Résumé par bloc", qui n'existe plus (voir point suivant). **✅ Livré (Bloc 33, PR #54) — disposition : les 10 compétences occupent tout l'espace disponible, par défaut 2 lignes de 5 cases sur desktop** (même principe déjà décidé côté Équipement d'Expédition, Bloc 31 point E.4) **— responsive, s'adapte selon la largeur d'écran** (le "responsive" laissé à la discrétion de l'implémentation au Bloc 33 n'a pas donné le bon résultat sur mobile — voir correctif ci-dessous). **✅ Livré (Bloc 34, PR #55) — mobile : disposition 2 colonnes, alignée sur Équipement d'Expédition.** Sur mobile, le récapitulatif Combat doit passer en **2 colonnes** (5 lignes de 2), **même comportement que le récapitulatif Équipement d'Expédition** sur mobile — actuellement pas cohérent entre les deux outils.
- **Zone de configuration d'une famille réduite à 2 colonnes** : grille 3×3 à gauche, panneau de configuration à droite qui **apparaît au clic sur un emplacement et disparaît en recliquant sur le même emplacement** (comportement de bascule déjà en place, inchangé). **Le "Résumé par bloc" (3e colonne, résumé de stats par famille) est entièrement retiré** — plus aucun résumé par famille affiché nulle part, seul le récapitulatif global (toujours visible en haut de page) subsiste comme résumé de stats.
- **Position de la ligne de boutons de famille** : sur une nouvelle ligne, **sous le récapitulatif global**, au-dessus de la zone grille + panneau de configuration. **Même positionnement pour Équipement d'Expédition** (ses boutons de filtre, Bloc 31 point E.1) — cohérence de mise en page entre les deux outils : récapitulatif en haut, ligne de boutons de sélection juste en dessous, zone de configuration ensuite.
- **Bouton de transfert de compétences (Bloc 28, point 5) déplacé une nouvelle fois** — après avoir été positionné sur la ligne de titre du récapitulatif (décision antérieure, à annuler), il rejoint désormais **cette nouvelle ligne de boutons de famille**, avec la **même taille que les boutons de famille**. **✅ Livré (Bloc 33, PR #54) — précision de style :** **aligné à droite** sur cette même ligne (les boutons de famille restent à gauche) ; **couleur distincte des boutons de famille — accent violet** (plutôt qu'un style visuellement identique aux boutons de famille comme décidé initialement) ; **surbrillance au clic** pour confirmer visuellement l'action de transfert (en plus de toute confirmation déjà en place — message ou état temporaire du Bloc 28). **✅ Livré (Bloc 33, PR #54) — message de confirmation temporaire :** le message/état de confirmation après clic (Bloc 28) disparaît automatiquement après **3 secondes** (dans la limite des 5 secondes maximum demandées).

#### ✅ Comparateur d'Équipement de Combat — supprimé (Bloc 31, PR #52 mergée)

Ce calculateur existait (comparaison A/B côte à côte) et a été **entièrement retiré** — code, route, entrée admin, migration DB. Décision produit : redondant avec le Simulateur d'Équipement de Combat, pas assez utilisé pour justifier le maintien. Ne plus y faire référence dans les futurs prompts.

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

**⚠️ Note d'implémentation (audit Bloc 6, 2026-08-21) :** cette formule est aujourd'hui codée dans `equipmentValueAtStar()` (`src/lib/equipment.ts`), écrite spécifiquement pour l'équipement de combat. Or la même formule additive `base + incrément × (n−1)` est confirmée pour l'Équipement d'Expédition (voir plus bas) — un système distinct mais avec la même mécanique de progression par étoile. **Avant de construire le calculateur Expédition, extraire cette formule en helper neutre partagé (ex: `valueAtStar(base, increment, star)`, pas de dépendance à un skill de combat)**, plutôt que de la recopier pour l'équipement d'expédition. Sans cette extraction, le futur calculateur Expédition dupliquerait exactement une logique déjà écrite — contraire à la consigne de factorisation d'AGENTS.md ("factoriser la logique partagée entre calculateurs plutôt que dupliquer"). Ne pas faire l'extraction avant que le second appelant existe réellement (pas d'abstraction prématurée) — mais la faire dans la même tâche que la construction du calculateur Expédition, pas après coup.

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

**✅ Pattern confirmé par le joueur (levait la prudence méthodologique ci-dessus) :** la stat de "type" (désormais appelée **stat primaire**, voir juste en dessous) a bien la **même valeur sur les 6 emplacements** d'un même set — confirmé explicitement par le joueur (formulation "sur chaque objet"), pas seulement une hypothèse à vérifier.
- **4 stats primaires** (une par famille, valeur identique sur les 6 emplacements du set) : Or, Troupes, Équipement (Battle Gear), Consommables
- **6 stats secondaires** (propres à l'emplacement, absentes en dessous d'Épique) : Vitalité (Cape), Perception (Longue-vue), Récupération *(expédition)* (Sacoche), Vitesse *(expédition)* (Boussole), Esquive (Torche), Chance (Pioche)
- Or et Troupes partagent toujours la même valeur ; Équipement et Consommables partagent toujours une valeur plus faible

**✅ Confirmé par le joueur : pas de gemmes sur l'équipement d'expédition** — contrairement au combat, aucun emplacement de gemme, à aucune rareté. Le futur Simulateur d'Équipement d'Expédition n'a donc pas de configuration de gemmes par emplacement (différence structurelle avec le Simulateur de Stuff Combat).

**✅ Incréments par étoile — 8 stats supplémentaires confirmées par le joueur, ligue Légendaire (formule additive, même principe que le combat) :**

| Stat | Type | Base 1★ (Légendaire) | Incrément par étoile |
|---|---|---|---|
| Or (primaire) | primaire | 5,4% | +0,3% |
| Troupes (primaire) | primaire | 5,4% | +0,3% |
| Équipement/Battle Gear (primaire) | primaire | 3,6% | +0,2% *(déjà connu)* |
| Consommables (primaire) | primaire | 3,6% | +0,2% |
| Vitalité (secondaire, Cape) | secondaire | 45% | +2,5% *(déjà connu)* |
| Perception (secondaire, Longue-vue) | secondaire | 5,4% | +0,3% |
| Récupération *(expédition)* (secondaire, Sacoche) | secondaire | 18% | +1% |
| Vitesse *(expédition)* (secondaire, Boussole) | secondaire | 22,5% | +1,3% |
| Esquive (secondaire, Torche) | secondaire | 5,4% | +0,3% |
| Chance (secondaire, Pioche) | secondaire | 45% | +2,5% |

**Les 10 stats d'expédition ont désormais chacune un incrément confirmé.** ⚠️ **Nuance à garder en tête :** ces incréments sont confirmés à la ligue **Légendaire**, avec une **première confirmation croisée sur Or** : le joueur confirme Commun/Or/Torche = 0,9% en 1★ (valeur déjà connue), **+0,3%/★** — incrément identique à celui de Légendaire/Or, cohérent avec l'hypothèse d'indépendance à la rareté. L'hypothèse que l'incrément est indépendant de la rareté (comme démontré pour le Combat sur 12 exemples/3 raretés, déjà indiqué par Équipement +0,2% vérifié sur Commun ET Épique, et maintenant Or +0,3% vérifié sur Commun ET Légendaire) est de plus en plus **solide mais reste non exhaustivement prouvée** pour les 7 autres stats sur les raretés non-Légendaire — à traiter comme valeur par défaut en admin, éditable si un écart apparaît en jeu.

**✅ Coût de fusion en Terradust — confirmé par le joueur pour les 5 raretés, mêmes principes que le Pouciel côté Combat :**
```
Coût_Terradust(rareté, n) = K(rareté) × 2^(n−1)
```
où `n` = niveau d'étoile de départ de l'objet à améliorer.

| Rareté | K (Terradust) | Statut |
|---|---|---|
| Légendaire | **8 000** | ✅ Confirmé (1★→2★=8000, 2★→3★=16000, 3★→4★=32000) |
| Mythique | **4 000** | ✅ Confirmé (1★→2★=4000, 2★→3★=8000) |
| Épique | **2 000** | ✅ Confirmé (1★→2★=2000, 2★→3★=4000) |
| Rare | **1 100** | ✅ Confirmé (1★→2★=1100, 2★→3★=2200) |
| Commun | **600** | ✅ Confirmé (1★→2★=600, 2★→3★=1200) |

**🎉 Coût de fusion désormais 100% verrouillé, les 5 raretés confirmées.** Pas de doublement uniforme par palier de rareté comme au Combat (20/40/80/160/320) — la progression réelle est 600/1100/2000/4000/8000, ratio non constant entre Commun→Rare (×1,83) et Rare→Épique (×1,82) puis ×2 au-delà. Confirme qu'il ne fallait pas extrapoler depuis le motif Combat — bien joué d'avoir vérifié en jeu plutôt que de le supposer.

**Rappel implémentation :** ne pas réécrire cette formule pour Expédition — réutiliser le helper additif partagé mentionné dans la section Équipements de Combat ci-dessus, une fois extrait de `equipmentValueAtStar()`.

**✅ Nouveau calculateur livré (Bloc 29, PR #50) — Simulateur d'Équipement d'Expédition** (renommé "Équipement d'Expédition" au Bloc 31, catégorie Compétences, `/tools`, même famille que le Simulateur d'Équipement de Combat) : même principe qu'en Combat (grille d'emplacements → panneau de configuration → résumé de stats), avec :
- **Grille 2×3** (6 emplacements), ordre :
  ```
  Cape        Longue-vue   Bourse (Sacoche)
  Boussole    Torche       Pioche
  ```
- **Pas de gemmes** (spécificité structurelle du système Expédition, aucun emplacement de gemme à aucune rareté)
- Sélection d'un set exact par emplacement (rareté + nom + famille), niveau d'étoile, résumé agrégé des stats primaires + secondaires, localStorage indépendant du Combat, lien croisé vers le référentiel
- Formule additive portée par le helper partagé `valueAtStar()`, extrait de `equipmentValueAtStar()` pour être réutilisé par Combat et Expédition sans duplication

**✅ Livré (Bloc 31, PR #52) — 6 évolutions du récapitulatif et du sélecteur :**
1. **"Récapitulatif des statistiques d'expédition" → "Récapitulatif des compétences d'expédition"** (cohérence avec le libellé déjà harmonisé côté Combat au Bloc 28 : "Récapitulatif des compétences d'équipement").
2. **Boutons de filtre du type d'équipement**, au-dessus de la grille 2×3 :
   Personnalisé, Or, Équipement combat, Consommables, Troupes — filtre le catalogue proposé dans les sélecteurs d'emplacement à une seule famille (stat primaire) à la fois quand un filtre autre que Personnalisé est actif.
   **Persistance indépendante par filtre** : chaque filtre a sa propre configuration d'équipements sauvegardée séparément (5 configurations distinctes en localStorage, une par filtre). Changer de filtre ne doit jamais écraser la configuration d'un autre filtre — en revenant sur un filtre déjà configuré, les équipements et niveaux d'étoile précédemment choisis pour ce filtre doivent être retrouvés tels quels. Exemple : configurer "Personnalisé", passer sur "Consommables" et configurer différemment, revenir sur "Personnalisé" → la configuration "Personnalisé" d'origine doit être intacte, pas remplacée ni vidée.
   **✅ Livré (Bloc 33, PR #54) — "Personnalisé" avec une couleur distincte des 4 autres** : les 4 filtres de famille (Or, Équipement combat, Consommables, Troupes) gardent leurs couleurs sémantiques respectives déjà décidées (Bloc 31/32, cohérence avec les couleurs de famille utilisées ailleurs) ; "Personnalisé" doit avoir sa propre couleur, différente des 4 — logique, puisqu'il ne correspond à aucune famille en particulier (catalogue mixte).
3. **Ordre des 10 compétences dans le récapitulatif revu** : Équipement combat, Consommables, Or, Troupes, Esquive, Chance, Perception, Récupération, Vitesse, Vitalité (remplace l'ordre affiché actuellement).
4. **Toujours afficher les 10 compétences dans le récapitulatif, y compris à 0%** — ne plus masquer les compétences sans contribution (comportement différent du récapitulatif Combat, qui n'affiche que les compétences avec valeur > 0 — décision spécifique à Expédition).
5. **Disposition desktop : 2 lignes de 5 compétences** dans le récapitulatif (au lieu d'une grille à colonnes variables).
6. **Contribution de l'emplacement sélectionné affichée entre parenthèses** à côté de la/les compétences concernées, quand un emplacement est en cours de configuration — même pattern déjà en place côté Combat (cdc, Simulateur de Stuff, "Résumé par bloc" : `+1400% (60%)`).

**✅ Livré (Bloc 35, PR #57) — 6 corrections sur l'édition admin des référentiels (retour testeur) — périmètre précisé pour chaque point :**
1. **[Référentiel Équipement d'Expédition uniquement]** Points d'incrément par compétence en grille, pour éviter le scroll horizontal sur cet écran d'édition. **🐛 Retour de test (Bloc 37) : les cases se chevauchent dans la disposition actuelle.** Corriger en **basculant les champs sur 2 lignes** plutôt que la grille actuelle qui provoque le chevauchement — objectif inchangé (pas de scroll horizontal), mais disposition à revoir pour éviter la superposition des cases. Les 2 autres tableaux de cet écran (Terradust au démantèlement, coût de fusion) sont corrects, ne pas y toucher.
2. **[Tous les référentiels]** Boutons d'enregistrement invisibles — actuellement sans contour visible, difficiles à repérer. Corriger pour qu'ils soient clairement visibles (contour ou fond, cohérent avec le reste de l'UI admin).
3. **[Tous les référentiels]** Un seul bouton d'enregistrement dans un bandeau en haut de page (au lieu de plusieurs boutons d'enregistrement séparés actuellement) — même pattern retour/enregistrer/confirmation déjà en place sur les autres pages d'édition admin (ex: éditeur mentions légales, Bloc 32). **🐛 Retour de test (Bloc 37) : pas encore correct sur les écrans multi-tableaux Combat et Expédition** (chacun a plusieurs tableaux sur la même page — Combat : principal + Pouciel + Gemmes ; Expédition : incréments + Terradust + coût de fusion). **Le bandeau doit être en haut de la page** (pas en bas ni répété) **avec un seul bouton qui enregistre l'ensemble des tableaux de la page en une seule action** — pas un bouton par tableau.
4. **[Référentiel Équipement d'Expédition uniquement]** Nouvelle table de configuration : Terradust donné au démantèlement d'un équipement, 1 champ par rareté (5 valeurs) — alimente le petit tableau public par rareté décidé au Bloc 35 (point 4 de la liste ci-dessus, équivalent Terradust/Expédition du Pouciel/Combat). **✅ Livré avec valeur par défaut 0 sur les 5 raretés** — donnée jamais confirmée en jeu (cf. section 7.1, "reste à définir"), le joueur a validé 0 comme valeur de départ éditable en attendant, à corriger lui-même en admin dès qu'il aura la vraie valeur.
5. **[Référentiel Équipement d'Expédition uniquement]** Colonnes des valeurs en % réduites en largeur dans le tableau d'édition des incréments — les valeurs ne dépassent jamais 100%, donc pas besoin de beaucoup d'espace ; évite un scroll horizontal du tableau.
6. **[Référentiel Équipement d'Expédition uniquement]** Ordre des colonnes du tableau d'édition : Famille, Rareté, Nom du set, Emplacement, Valeur stat primaire (famille), Stat secondaire, Valeur stat secondaire.
7. **[Référentiel Équipement d'Expédition uniquement]** Remplacer la phrase descriptive actuelle par **un titre dédié pour chacun des 3 tableaux** de cet écran d'édition :
   - "Incréments par étoile des statistiques d'Équipement d'Expédition"
   - "Coût de fusion en Terradust par rareté (Coût = K × 2^(n-1))"
   - "Détail des équipements d'expédition"

**✅ Livré (Bloc 35, PR #57) — [Référentiel Équipements de Combat uniquement, admin] même traitement que l'édition admin Expédition ci-dessus, reproduit au maximum à l'identique :**
1. **Retrait des colonnes Pouciel et Gemmes** du tableau principal d'édition → **2 tableaux séparés, indexés par rareté** (données déjà verrouillées dans le cdc, table "Rareté | Couleur | Emplacements gemmes | Pouciel à la destruction" section 7.1 — à scinder en 2 tableaux admin distincts, un pour Pouciel, un pour Gemmes, chacun avec ses 5 lignes par rareté).

**✅ RÉVISION LIVRÉE (Bloc 75, PR #93) — fusion des tableaux secondaires indexés par rareté en 1 seul tableau, public ET admin, pour Combat ET Expédition.** Discussion du 01/09/2026 : constat que la grille principale (familles × raretés × sets) est déjà en tuiles depuis le Bloc 39, mais les tableaux secondaires (rareté seule en index) restent multiples et peu lisibles.
- **[Référentiel Équipements de Combat]** 3 tableaux actuels (Pouciel fusion, Gemmes par rareté, Pouciel à la destruction) → **fusionnés en 1 seul tableau : colonnes = raretés (Commun/Rare/Épique/Mythique/Légendaire), 3 lignes = Fusion / Gemmes / Destruction.** Même chose en admin (1 tableau d'édition au lieu de 3).
- **[Référentiel Équipement d'Expédition]** Même principe, **mais 2 lignes seulement (pas de gemmes sur l'équipement d'Expédition, confirmé par le joueur)** : Fusion / Destruction. **✅ Le coût de fusion Terradust existe déjà (données admin, `expeditionMergeCost()` déjà implémentée) mais n'est actuellement PAS affiché côté public** — corriger cet oubli en même temps que la fusion des tableaux (pas une nouvelle formule à calculer, juste une donnée existante à afficher).

**✅ Écart de parité corrigé (Bloc 75, PR #93) — les incréments par étoile (compétence) sont éditables en admin pour Expédition (grille dédiée, Bloc 37), mais PAS pour Combat.** Combat utilise la même mécanique de progression (formule additive partagée `valueAtStar()`, section 7.1), mais ses incréments par compétence restent **codés en dur dans `equipmentValueAtStar()`** (`src/lib/equipment.ts`), pas exposés via une interface admin éditable comme pour Expédition. **Ajouter une grille admin éditable pour Combat, équivalente à celle d'Expédition** — même pattern, mêmes 10 compétences, corrige l'écart de parité entre les 2 référentiels.
- **Justification du format tableau conservé (pas de passage en tuiles) pour ces tableaux secondaires** : contrairement à la grille principale (beaucoup de lignes, familles/sets), ces données sont une petite grille numérique compacte (2-3 métriques × 5 raretés, 10-15 cellules) — un format tabulaire dense reste plus adapté et plus rapide à lire d'un coup d'œil qu'une conversion en tuiles pour ce volume de données.

**✅ Livré (Bloc 76, PR #94) — retour testeur : 2 correctifs sur les tableaux fusionnés du Bloc 75 (admin).**
1. **Largeur des champs de saisie** : sur les 2 tableaux fusionnés admin (Terradust pour Expédition, Pouciel+Gemmes pour Combat), les champs de saisie doivent prendre toute la largeur disponible, **sans scroll horizontal**.
2. **L'indicateur de ligne (le libellé "Fusion"/"Gemmes"/"Destruction" en tête de chaque ligne) doit devenir éditable en admin**, pour ajuster le texte librement — actuellement fixe/non modifiable.
2. **Ordre des colonnes du tableau principal** : Famille, Rareté, Nom du set, Emplacement, Compétence 1, Valeur 1, Compétence 2, Valeur 2, Compétence 3, Valeur 3, Compétence 4, Valeur 4 (jusqu'à 4 compétences par pièce d'équipement, cohérent avec la liste blanche de compétences par bloc déjà en place).

**✅ Livré (Bloc 37, PR #59) — [Référentiel Équipements de Combat uniquement, public + admin] 🐛 affichage trompeur pour les objets à moins de 4 compétences.** Quand un équipement n'a réellement que 1, 2 ou 3 compétences (pas 4), l'affichage public montre actuellement "À compléter en admin" sur les slots vides — trompeur, car ça laisse penser qu'une donnée manque à collecter, alors qu'il n'y aura jamais rien à cet emplacement. **Ajouter un choix "Rien" (aucune compétence) dans le sélecteur de compétence** de l'admin, distinct de "non renseigné" — quand "Rien" est sélectionné, l'affichage public montre simplement **"—"** au lieu de "À compléter en admin". Distinguer bien les 2 états côté admin : un slot **non encore rempli** (à compléter, affichage "À compléter en admin" toujours pertinent) vs un slot **explicitement vide** ("Rien" sélectionné, affichage "—").
3. **Colonnes de valeur (Valeur 1 à 4) réduites en largeur** — mêmes raisons que côté Expédition (point 5 ci-dessus) : les valeurs ne dépassent jamais 100%, pas besoin de beaucoup d'espace, évite un scroll horizontal du tableau.
4. **🐛 Retour de test (Bloc 37) : filtres de famille en select box trop longues, même symptôme que le point B côté Expédition** — les filtres ne doivent pas nécessairement occuper toute la largeur disponible, les dimensionner à leur contenu.

**✅ Livré (Bloc 35, PR #57) — [Référentiel Templiers uniquement, admin] 🐛 bug : le bouton "Retour" de `TemplarParametersEditor` ramène toujours vers l'admin Outils, même en arrivant depuis l'admin Guides.** Ce point d'édition est partagé entre le calculateur Templiers (admin Outils) et le référentiel Templiers (admin Guides, corrigé au Bloc 30/32 pour pointer vers ce même éditeur) — mais le bouton retour ne tient pas compte du point d'entrée réel. **Corriger pour un retour contextuel** : arrivé depuis l'admin Guides (référentiel) → retour vers l'admin Guides ; arrivé depuis l'admin Outils (calculateur) → retour vers l'admin Outils. Peut se faire via un paramètre d'URL/query indiquant la provenance, ou l'historique de navigation standard du navigateur.

**✅ Livré (Bloc 35, PR #57) — [Tous les outils et référentiels, admin] alignement global du style des boutons et tableaux d'édition** : incohérent aujourd'hui d'un écran à l'autre. **Prendre le style de l'éditeur Templiers comme référence** et l'appliquer partout (boutons, tableaux, mise en page générale des écrans d'édition admin) — un seul système visuel cohérent, pas un style différent par outil/référentiel.

**✅ Livré (Bloc 35, PR #57) — [Outil Gemmes uniquement, admin] 4 corrections sur l'écran d'édition :**
1. **Colonnes réduites en largeur** — les valeurs ne dépassent jamais 100%, pas besoin de beaucoup d'espace (même principe que Combat/Expédition ci-dessus).
2. **Tableau "prix d'achat" : occuper la largeur disponible** de l'écran (actuellement trop étroit/mal réparti).
3. **En-têtes de colonnes simplifiés** — actuellement "Prix Argent", "Prix Or"... remplacer par le **nom de la ligue seul** (le préfixe "Prix" est redondant avec le titre du tableau).
4. **Renommer le tableau en "Prix d'achat des gemmes par ligue (en saphirs)"** — prévoir la traduction (next-intl, comme tout texte fixe).

**✅ Livré (Bloc 37, PR #59) — [Outil Gemmes uniquement, admin] retour de test : cases trop petites après la réduction du Bloc 35.** Le scroll horizontal a bien disparu, mais les cellules sont désormais un peu trop petites. **Augmenter la taille des cases d'environ 50%** — reste un ajustement fin, la marge de manœuvre est confirmée (pas de retour de scroll horizontal à craindre à cette taille).

**✅ Livré (Bloc 37, PR #59) — [Référentiel Équipements de Combat + Référentiel Équipement d'Expédition, public] affichage compétence/valeur sur la même ligne.** Actuellement le nom de la compétence/stat est affiché sur une ligne, avec la valeur en % en dessous sur la ligne suivante. Passer à un affichage **sur la même ligne** (nom + valeur côte à côte), plus compact.

**✅ Livré (Bloc 37, PR #59) — [Référentiel Équipements de Combat + Référentiel Équipement d'Expédition, public] retrait de la recherche + redimensionnement des filtres.**
- **Retirer la barre de recherche** de ces 2 pages référentiel — libère de la place pour les filtres.
- **Redimensionner la ligne de filtres** : Famille sur 1/3 de la largeur, Rareté sur 1/3, **niveau d'étoile sur 20%, aligné à droite**.
- **Aligner la hauteur du sélecteur de niveau d'étoile avec Famille et Rareté** — actuellement une différence de hauteur visible entre ces contrôles, à corriger pour un alignement propre sur la même ligne.

**✅ Livré (Bloc 37, PR #59) — [Page d'un référentiel, public] style du bandeau de bascule entre référentiels aligné sur le bandeau de boutons de famille des outils.** Le bandeau de bascule entre référentiels (Bloc 35, point 1.2) doit reprendre **exactement le même rendu** que le bandeau de boutons de famille **utilisé à l'intérieur d'un outil** (ex: Équipement de Combat/Expédition, Bloc 31/32/33 — bandeau sous le récapitulatif permettant de basculer entre Attaque/Défense/Or/Vitesse) — **pas** les tuiles de catégorie de la page Outils/Accueil (référence incorrecte notée précédemment, corrigée ici).

**✅ Investigué (Bloc 38, PR #60) — [Page d'un référentiel, public] pas un bug de code : le bandeau était déjà correctement stylé.** Vérifié par capture d'écran avant/après pendant le Bloc 38 — le rendu du bandeau de bascule entre référentiels correspondait déjà à la cible du Bloc 37, point K. **⚠️ Retour testeur au Bloc 40 : la conclusion "déjà correct" était incomplète.** Précision qui manquait à la comparaison du Bloc 38 : le bandeau de référentiels s'affiche actuellement comme **une rangée de boutons individuels** (largeur au contenu, alignés à gauche ou groupés), alors que la cible — le bandeau de sélection des outils depuis la page d'un outil en propre — **prend toute la largeur disponible** (bandeau pleine largeur, pas juste des boutons). C'est cette différence structurelle de largeur qui manquait à l'observation précédente, pas une histoire de couleur/style de bouton. **✅ Livré (Bloc 40, PR #62) — corriger pour que le bandeau référentiels prenne toute la largeur**, structurellement identique au bandeau outils (même conteneur/layout, pas juste les mêmes classes de bouton).

**✅ Livré (Bloc 35, PR #57) — [Outil Classement uniquement, admin] largeur des colonnes de valeurs numériques à revoir** — même principe transverse que Combat/Expédition/Gemmes ci-dessus : ajuster la largeur des colonnes de valeurs numériques de l'écran d'édition à ce qu'elles contiennent réellement, pas de largeur excessive/mal répartie.

**✅ Livré (Bloc 37, PR #59) — [Tous les outils et référentiels, admin] 🐛 retour de test : réduction insuffisante.** Malgré le correctif du Bloc 35 (point 5.3/9.1/M/R et équivalents), les colonnes de valeurs numériques restent trop larges dans l'admin d'édition des référentiels/outils. **Réduire davantage** — la largeur doit correspondre au contenu réel affiché (2-4 caractères pour une valeur en %, pas une colonne pleine largeur).

**✅ Livré (Bloc 35, PR #57) — [Tous les outils et référentiels, admin] centrage des champs de saisie/sélection** : pour tous les champs de type select (dropdown) et tous les champs de saisie de valeur, le contenu doit être **centré** (texte/valeur centré horizontalement dans le champ) — cohérent avec l'alignement global du style décidé plus haut (référence Templiers).

**Reste à définir avant envoi à Codex :**
- Incréments des 8 stats confirmés à la ligue Légendaire, avec une confirmation croisée sur Or (Commun) — les 7 autres stats restent à généraliser aux raretés non-Légendaire (via admin, valeur par défaut = incrément Légendaire en attendant vérification)
- ~~Coût de fusion en Terradust~~ → ✅ résolu, 5 raretés confirmées
- Comment obtenir de l'équipement d'expédition (containers de conteneurs déjà mentionnés — Urne/Jarre — probablement un futur calculateur "valeur de conteneur" à envisager, cohérent avec ce que MLCLord propose déjà sous le nom "Chest Value")

#### 💡 Suggestion — Tableau dynamique Équipements (dimensions et filtres)

**✅ Emplacement confirmé (mis à jour) : catégorie "Référentiels"**, distincte de "Compétences" — les Référentiels regroupent les données consultables (Équipements de Combat, Équipement d'Expédition, **Level Up**, **Gemmes**, **Coût des Templiers**, **Boutique**, 6 au total), séparées des vrais outils de calcul (Équipement de Combat, Équipement d'Expédition, Gemmes, Templiers — ~~Comparateur d'Équipement de Combat, supprimé au Bloc 31~~) qui restent dans Compétences. Cette séparation a été actée après coup : au départ tout était mélangé dans une seule catégorie Compétences, le joueur a demandé à distinguer "outils de calcul" de "données de référence consultables". **Level Up est un cas particulier : sa catégorie thématique est Combat (pas Compétences), mais il reste un référentiel dans sa nature (table consultable, pas de calcul avec input/output) — donc il vit dans la section Référentiels (`/referentiels`, racine séparée depuis le Bloc 50 — vivait auparavant sous `/guides/referentiels`), jamais dans `/tools`, malgré son étiquette de catégorie Combat.**

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

**✅ Livré (Bloc 10, confirmé par le porteur de projet 31/08/2026) — remplacement effectué, images réellement intégrées.** Le joueur a fourni les images réelles pour les gemmes (par compétence × ligue) et les équipements (Combat + Expédition), désormais utilisées à la place des couleurs/badges texte dans : Simulateur de Stuff, Comparateur de stuff, référentiels Équipements, et le calculateur Gemmes. **⚠️ 36 fichiers Combat encore manquants** (Casque/Gantelet/Bottes pour Commun/Rare/Épique, motif déjà connu) — le composant de repli (voir plus bas) couvre ce cas tant que ces fichiers ne sont pas déposés, non bloquant.

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

**✅ Livré (Bloc 72, PR #91) — [Mobile uniquement] Simulateur d'Équipement de Combat, ligne de configuration d'une gemme (Compétence + Étoiles + Ligue, 3 champs de sélection) : le label "Gemme X" passe au-dessus des 3 champs, au lieu de rester en début de ligne.** Objectif : libérer toute la largeur de la ligne pour les 3 select, actuellement trop serrés sur mobile faute de place (le label prend une part significative de la largeur disponible). **Desktop inchangé** (déjà satisfaisant, label en début de ligne conservé). Alternative envisagée puis écartée : abréger "Gemme X" en juste le chiffre — jugée insuffisante, ne libère pas assez de largeur avec 3 champs à caser, et un chiffre seul sans contexte serait ambigu.

**✅ Livré (Bloc 72, PR #91) — [Mobile uniquement, Simulateur d'Équipement de Combat] 2 affinages supplémentaires :**
- **Boutons de sélection compétence (filtre famille) en pleine largeur, toujours sur une seule ligne.**
- **Le bouton "Transférer en Paramètres joueur" prend aussi toute la largeur, positionné sur la 2ᵉ ligne** (sous les boutons de compétence).

**✅ Livré (Bloc 72, PR #91) — [Mobile uniquement, Simulateur d'Équipement d'Expédition] boutons de filtre famille en pleine largeur** — **1ʳᵉ ligne : 3 boutons, 2ᵉ ligne : 2 boutons** (5 filtres au total : Personnalisé, Or, Équipement, Consommables, Troupes — répartition 3+2).

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

**✅ Livré (Bloc 72, PR #91) — [Mobile uniquement] boutons de sélection de famille/compétence de l'outil Optimisation Gemmes : pleine largeur, tout en restant sur une seule ligne.**

**✅ Livré (Bloc 82, PR #99) — le sélecteur de compétence ne doit avoir aucune valeur par défaut, sur les 2 modes du Calculateur Gemmes (Optimisation et Budget disponible).** Actuellement une compétence semble pré-sélectionnée par défaut — remplacer par le placeholder générique "— Choisir —" déjà utilisé ailleurs sur le site (cohérent avec le principe "aucun sélecteur n'a de valeur par défaut", section 3.1), obligeant le joueur à sélectionner activement une compétence.
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

**✅ Livré (Bloc 36, PR #58) — Référentiel "Gemmes"**, URL actuelle `/referentiels/gems` (historique : livré en français `/guides/referentiels/gemmes` au Bloc 36 ; racine déplacée et slug re-anglicisé `gems` au Bloc 50 — ⚠️ la justification initiale "cohérent avec Consommables/Templiers en français" ne tient plus, ces deux référentiels sont désormais aussi en anglais dans leur slug depuis le Bloc 50, voir décision section 4) ; 5ᵉ référentiel réellement construit après Combat/Expédition/Level Up/Templiers) : **1 tableau, 1 colonne par ligue (6 colonnes : Bronze, Argent, Or, Platine, Diamant, Légende), 11 lignes.**

**✅ Livré (Bloc 65, PR #84) — RÉVISION : refonte en tuiles du référentiel Gemmes, remplace le tableau 11×7 ci-dessus.** Motivation (retour testeur, discussion) : le tableau devient illisible sur mobile (scroll vertical) et déjà serré sur desktop (11×7). **Contrairement aux tuiles Combat/Expédition/Boutique (listes d'objets discrets, chaque tuile = 1 objet)**, Gemmes est une vraie **matrice compétence × ligue** — la comparaison entre les 6 ligues pour une même compétence est un vrai besoin métier confirmé par le joueur (contrairement aux autres tableaux qui affichent une ligue à la fois via sélecteur — Level Up/Classement/Troupes attaque démo, Bloc 61 — ce pattern ne convient pas ici, la comparaison multi-ligues doit rester visible d'un coup).
- **1 tuile par compétence** (~10-11 tuiles, une par ligne du tableau actuel).
- **Titre de la tuile : nom de la compétence.**
- **Couleur de la tuile : couleur déjà associée à cette compétence**, réutilise la palette de couleurs par compétence déjà décidée et en place ailleurs sur le site (voir section dédiée plus bas dans ce document) — pas une nouvelle palette à inventer.
- **À l'intérieur de chaque tuile, un mini-tableau à 3 lignes** : ligne 1 = noms des 6 ligues, ligne 2 = valeur en pourcentage, ligne 3 = image de la gemme correspondante. **Colonnes de largeur égale, contenu des cellules centré.**
- **✅ Même design sur mobile et desktop, confirmé par le joueur** — pas d'adaptation séparée nécessaire, contrairement à ce qui était envisagé initialement (option d'une vue mono-ligue sur mobile, écartée).
- **✅ Tuile "Coût" supplémentaire, décidée** — le prix d'achat d'1 gemme varie par ligue (confirmé, contrairement à d'autres référentiels à prix fixe — cdc, `Coût réel = gemmes effectivement utilisées × Prix(ligue)`). **Mini-tableau à 2 lignes** (pas 3, pas d'image ici) : ligne 1 = noms des 6 ligues, ligne 2 = coût en saphirs pour 1 gemme. **✅ Tuile pleine largeur sur desktop** (au lieu de la taille classique des tuiles compétence — évite un vide visuel avec seulement 2 lignes, et distingue visuellement cette info transversale des compétences individuelles). **✅ Position : en premier**, avant les tuiles de compétence. **✅ Couleur : gris** (pas de couleur de compétence associée, cohérent avec le fait qu'elle ne représente aucune compétence en particulier — même logique de couleur neutre que les tuiles Boutique).
- **1ère ligne : coût en saphirs** (formule `Prix(ligue) = 3000 + 1000 × (rang_ligue − 2)` déjà verrouillée ci-dessus) — cellule Bronze affichée comme non applicable ("—" ou équivalent, pas d'achat possible en Bronze, cf. nuance déjà actée).
- **10 lignes suivantes : les 10 compétences, triées par ordre alphabétique** (ordre respecté selon la locale active), reprenant les valeurs de base `y` déjà verrouillées dans le tableau ci-dessus.
- **Image de la gemme affichée dans chaque cellule** (60 images réelles dans `public/gems`, `gemImagePath` corrigé pendant le Bloc 36 pour matcher les vrais noms de fichiers livrés plutôt qu'une convention provisoire) — chaque cellule des 10 lignes de compétences affiche l'image spécifique à cette compétence ET cette ligue.
- Lien croisé bidirectionnel avec le calculateur Gemmes (`/tools`, catégorie Compétences).
- **✅ Livré — point d'édition admin partagé avec le calculateur Gemmes, construit correctement dès le départ** (contrairement à Templiers qui avait souffert de 2 bugs découverts après coup) : statuts actif/inactif indépendants entre outil et référentiel, bouton "Retour" contextuel selon le point d'entrée réel.

**✅ Livré (Bloc 38, PR #60) — [Référentiel Gemmes uniquement, public] 6 corrections retour de test :**
1. **Largeur des colonnes de ligue strictement identique** pour les 6 colonnes (actuellement inégale).
2. **Image de gemme agrandie : 3rem au lieu de 2,2rem actuellement.**
3. **Le % affiché à côté de l'image de la gemme, pas en dessous** (même correctif que le point H du Bloc 37, appliqué ici aussi).
4. **Titre et contenu des colonnes centrés.**
5. **🐛 Ne pas simplifier le coût en unité compacte (k/M...) pour ce référentiel précis** — afficher la valeur brute complète (ex: "3000", pas "3K"). **Cas particulier d'une règle générale confirmée depuis** (cdc section 3.3) : aucun achat en saphirs n'est jamais compacté, pas spécifique aux Gemmes.
6. **🐛 Bug de traduction anglais des noms de compétences — mapping incorrect actuellement affiché.** Le mapping FR→EN exact est **déjà verrouillé dans le cdc** (tableau des valeurs `y` par ligue, section 7.1) : Attaque = **Striker**, Défense = **Guardian**, Bravoure = **Brave**, Prospérité = **Prosperous**, Vitesse = **Rusher**, Récupération = **Cautious**, Intrépide = **Fearless**, Recruteur = **Recruiter**, Charognard = **Scavenger**, Recycleur = **Salvager**. Corriger l'affichage en anglais pour respecter exactement ce mapping, pas une traduction littérale improvisée.

**✅ Livré (Bloc 38, PR #60) — [Référentiels Combat + Expédition, public] uniformiser la taille des images d'équipement à 3rem** — même taille que l'image de gemme du référentiel Gemmes (point 2 ci-dessus), pour une cohérence visuelle entre les 3 référentiels d'équipement/gemmes.

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
- Tableau de bord synthétique (outils actifs/total, guides publiés/total, **référentiels activés/total**, **utilisateurs total/actifs**, dernières actions des logs)
- **✅ Décidé — refonte compacte de l'UI admin, sur `shadcn/ui`** : tableaux, boutons et espacements actuels jugés trop volumineux et mal alignés (retour joueur après le Bloc 6). `shadcn/ui` choisi comme référence — cohérent avec le stack Next.js/TypeScript existant, composants copiés dans le repo (pas de dépendance runtime lourde à maintenir), documentation la plus à jour pour cet écosystème. **Si l'admin utilise déjà partiellement `shadcn/ui`**, étendre son usage plutôt que d'en réintroduire une installation. Objectif : densité et alignement cohérents partout, pas une refonte esthétique complète.

**✅ Résolu (Bloc 27, PR #47) — les noms d'Outils/Guides/Référentiels affichés en admin suivent la langue de l'interface admin.** Si l'admin est en anglais (`AdminLocaleToggle`, Bloc 11bis), les colonnes Nom des tableaux Outils/Guides affichent bien les libellés traduits en anglais (même mécanisme next-intl que le reste, déjà utilisé pour ces noms, désormais branché sur la locale admin). *(Statut initialement ambigu à la livraison du Bloc 27 — clarifié : erreur de rapport, pas un point sauté.)*
- **✅ Décidé — lien vers le site public dans la barre du haut**, à côté des boutons utilisateur/thème déjà en place, ouverture dans un nouvel onglet (`target="_blank"`).
- **🚨 Décision inversée (essayée en sidebar au Bloc 11, revenue en arrière) — navigation principale admin en barre du haut, pas en sidebar gauche.** La sidebar (introduite au Bloc 11, cohérente avec le pattern `shadcn/ui`) prenait trop de place horizontale au détriment du contenu — retour à une barre du haut classique. La barre du haut porte donc : les liens principaux (Dashboard, Outils, Guides, Utilisateurs, Logs) **et** les contrôles utilitaires (bouton utilisateur, thème, lien site public).

**✅ Décidé — pas de titre de page redondant en admin** (retour joueur, texte parasite) : une fois sur une page admin, le bouton coloré (actif) de la barre de navigation suffit à indiquer où on est — pas besoin de répéter le nom de la page en gros titre en haut du contenu.

**✅ Décidé — gestion des utilisateurs, activer/désactiver** (nouveau, en plus de créer/modifier/supprimer déjà prévu) : un compte utilisateur admin peut être désactivé sans être supprimé (équivalent au pattern déjà utilisé pour les outils/guides — inactif ≠ supprimé). **Compteur utilisateurs sur le dashboard** : total / actifs, à côté des compteurs déjà prévus (guides, outils, référentiels). **🚨 Comportement de connexion, précisé** : un compte désactivé **ne doit plus pouvoir se connecter** — vérification côté serveur (pas juste masqué côté client), message affiché sur l'écran de connexion : *"Compte désactivé, contacter l'administrateur."* ⚠️ Note de compromis sécurité, assumé : ce message révèle que le compte existe (contrairement au message générique du Bloc 8 pour identifiants incorrects, qui ne révèle rien) — acceptable ici puisque le nombre de comptes admin reste faible et connu de l'équipe, mais à garder en tête si le nombre de comptes grandissait significativement.

**✅ Décidé — édition d'un Outil alignée sur l'édition d'un Guide** (retour joueur, incohérence trouvée) : actuellement l'écran d'édition d'un outil diffère de celui d'un guide (bouton retour différent, bouton Enregistrer et message de confirmation en bas de page). À aligner sur le pattern déjà retenu pour les guides (Bloc 7ter) : actions et confirmation regroupées en haut, dans une barre compacte, à côté du bouton retour.

**✅ Décidé — renommage "Contenu statique" → "Conditions d'utilisation"** (cohérence avec le nom déjà utilisé côté public, section 3.1) — la page/section admin d'édition des mentions légales doit porter le même nom que la page publique qu'elle édite.

**✅ Décidé — pagination de l'historique par lot de 20** (`/admin/logs`) — actuellement affiché sans pagination.

**🧹 Nettoyage de texte parasite** (phrases ajoutées sans être spécifiées, à retirer) :
- Admin Outils : *"Un outil inactif reste annoncé au public, mais il est grisé et impossible à ouvrir."*
- Admin Guides : *"Crée, traduis et soumets les guides à validation."*
- Admin Conditions d'utilisation (ex-"Contenu statique") : *"Texte des mentions légales (Markdown)"*

**📋 Pour le suivi précis de ce qui est réellement implémenté vs restant à faire, voir la "Liste unifiée" (section 4) de `docs/brief-demarrage-codex.md`** — c'est la source de vérité à jour, pour éviter de maintenir deux listes de suivi qui divergent entre elles.

---

## 9. Points ouverts restants (données de jeu)

**Pour le suivi complet de toutes les tâches restantes (UI/UX, admin, contenu), voir la "Liste unifiée" (section 4) de `docs/brief-demarrage-codex.md`** — cette section 9 ne garde que les points de données de jeu encore ouverts, propres à ce document.

1. **Équipement d'Expédition** — ✅ 10 stats sur 10 confirmées à la ligue Légendaire (incréments par étoile) ; ✅ coût de fusion Terradust 100% verrouillé (5/5 raretés). Reste : généraliser les incréments aux 4 autres raretés (hypothèse par défaut = même incrément, à corriger en admin si écart constaté). **🚨 Constat d'audit (29/08/2026) : le Simulateur d'Équipement d'Expédition ne distingue jamais, à l'écran, une pièce Légendaire (incréments vérifiés) d'une pièce d'une autre rareté (incréments extrapolés)** — recherche exhaustive dans le composant : aucun indicateur de confiance sur la donnée affichée, et le type de données (`ExpeditionStarIncrements`) n'a de toute façon pas de dimension rareté pour porter cette information. Un joueur planifiant la progression d'une pièce non-Légendaire ne peut donc pas savoir que la courbe affichée est une extrapolation, pas une donnée vérifiée. **⏸️ Mis de côté (retiré du Bloc 42) — à rediscuter plus tard**, pas encore une évolution actée (indicateur visuel discret, ex. astérisque ou tooltip sur les raretés non-Légendaire, était la piste envisagée mais rien de tranché).
2. **Équipements de combat** — reste uniquement les 30 lignes de valeurs de compétences manquantes (10 sets Commun/Rare/Épique) ; tout le reste (formule par étoile, mécanisme de pièces, coût de fusion) est verrouillé
2 bis. ~~**Nouveaux simulateurs "Taux de gain d'XP" et "Troupes max en attaque démo"**~~ → **✅ Les deux sont désormais entièrement résolus** (formules confirmées, voir section 7.1). Prêts à être spécifiés comme tâches Codex.
3. **Combat** — Fight, Enemy Troops toujours non spécifiés. **3 éléments Combat désormais spécifiés/prototypés** : Taux de gain d'XP, Troupes max en attaque démo (simulateurs), et **Level Up** (référentiel — formule troupes ✅ verrouillée pour Légende `32,2 × 1,245^n`, cycle de coffres ✅ confirmé, contenu des coffres couvert par le guide plutôt que la donnée structurée, reste : les 5 autres ligues, formule XP requis par niveau). Voir section 7.1.

3 bis. **⏳ Nouveau chantier en réserve — "Estimation des troupes ennemies" (catégorie Combat)** : idée du joueur, pas encore cadrée, données en cours de vérification.
   - **Principe visé** : à partir de la VP totale d'un ennemi, de son nombre de villes et du niveau moyen de ses villes, déduire la VP apportée par les villes (formule `VP(n) = 20 × 1,115^(n−1)` déjà verrouillée, section 7.1 Villes), soustraire du total pour isoler la VP apportée par les troupes, puis convertir cette VP restante en nombre de troupes via un ratio troupes↔VP à déterminer.
   - **Hypothèse de ratio en cours de calibrage** — 4 points de données désormais rassemblés :
     1. 1 ville niveau 80 (VP≈108 860), troupes totales 114 400 000, VP totale du compte 329 000 → ratio observé ≈ **0,001924 VP/troupe**
     2. Niveau 50, 1 ville niveau 80 (VP≈108 598), troupes totales 143 300 000 (82,2M + 61,1M au récolteur, confirmé additif), VP totale du compte **389 000 (confirmé par le joueur)** → ratio observé ≈ **0,001957 VP/troupe**
     3. Niveau 40, 17 villes (1×niv53, 1×niv80, 7×niv70, 1×niv63, 7×niv60 → VP villes cumulée ≈ 473 473 via la formule verrouillée), troupes totales 6 530 000, VP totale du compte 486 000 → ratio observé ≈ **0,001918 VP/troupe**
     4. **Niveau 84, 21 villes (1×niv110, 4×niv100, 16×niv95 → VP villes cumulée ≈ 15 569 023 via la formule verrouillée), troupes totales 32 628 000 000 (31,8G + 828M, additif), VP totale du compte 70 600 000** → ratio observé ≈ **0,001687 VP/troupe**
   - **🚨 Découverte majeure (01/09/2026) — la VP du compte n'est pas juste villes + troupes, elle inclut aussi l'or : `VP_totale = VP_villes + VP_troupes + VP_or`.** Confirmé explicitement par le joueur, relation linéaire pour la composante or (comme pour les troupes), mais **ratio VP/or totalement inconnu pour l'instant** — aucune donnée pour l'isoler. **Ça remet en cause la méthode de calcul des 4 points ci-dessus** : ce qu'on appelait "VP_troupes" (= VP_totale − VP_villes) était en réalité VP_troupes + VP_or mélangés, pas juste des troupes — explique vraisemblablement pourquoi le point 4 (compte le plus avancé, donc probablement le plus d'or accumulé) divergeait des 3 premiers.
   - **✅ Ratio connu du joueur, confirmé par l'expérience de jeu : 0,001667 VP/troupe** (≈ 1/600 troupes par VP, chiffre rond — bon signe de fiabilité). **Notablement proche du point 4 (0,001687, écart ≈1,2%)**, bien plus proche que des points 1-3 (~0,00193, écart ≈13-16%) — piste à ne pas trancher prématurément : pourrait indiquer que ce ratio expérientiel est le vrai ratio troupes pur, et que les points 1-3 étaient faussés par une contribution or non isolée (proportionnellement plus faible sur les gros comptes, donc le point 4 s'en rapproche déjà davantage).
   - **⏳ En attente d'un point de données complet (villes + troupes + or + VP totale) pour résoudre le système à 2 inconnues** (ratio troupes, ratio or) simultanément. **Les montants d'or des points 1-3 ne sont pas disponibles rétroactivement** (non collectés à l'époque) — reconstruction impossible sur ces points.
   - **Point 5 reçu (même compte que le point 4, mesuré plus tard — mêmes 21 villes : 1×niv110, 4×niv100, 16×niv95, VP villes ≈ 15 567 064 inchangée)** : troupes 33 965 000 000 (33G+965M), or 29 700 000 000 (29,7G), VP totale du compte 72 700 000 → VP troupes+or = 57 132 936.
   - **Point 6 reçu — compte différent (15 villes : 1×niv53, 5×niv70, 1×niv63, 7×niv60, 1×niv59, VP villes ≈ 302 813)** : troupes 115 000 000, or 206 000 000, VP totale du compte 529 000 → VP troupes+or = 226 187. ⚠️ Une 1ère version de ce point (troupes 117,7M, or 196M, VP 449k) contenait une erreur de saisie, corrigée par le joueur — **la 1ère résolution avec les valeurs erronées donnait un ratio or négatif (impossible physiquement)**, signal qui a permis de repérer l'erreur.
   - **Point 7 reçu (01/09/2026) — compte de grande échelle, proche du point 5 (2 villes : 1×niv115, 1×niv113, VP villes ≈ 8 844 799)** : troupes 50 400 000 000 (50,4G), or 47 800 000 000 (47,8G), VP totale du compte 93 900 000 → VP troupes+or = 85 055 201.
   - **🚨 Découverte importante — apparier des comptes de tailles similaires donne un résultat bien plus cohérent avec le ratio troupes connu du joueur que d'apparier des tailles très différentes.**
     ```
     Système points 5+6 (tailles très différentes) : ratio_troupes ≈ 0,00141  → écart 15% avec 0,001667
     Système points 5+7 (tailles similaires, tous les 2 gros comptes) : ratio_troupes ≈ 0,00162 → écart ~3% avec 0,001667
     ```
     Le ratio troupes issu du système 5+7 (0,00162) est **nettement plus proche** du ratio empirique du joueur que celui du système 5+6 (0,00141) — signal fort que le **point 6 (petit compte) est probablement la source principale du bruit** observé jusqu'ici, plutôt qu'une imprécision générale de la méthode. **Piste à privilégier pour la suite : comparer des comptes d'échelle proche entre eux**, plutôt que de mélanger délibérément des échelles très différentes en espérant que ça aide à isoler les 2 inconnues — contre-intuitif par rapport à l'approche initiale, mais les données le suggèrent. Ratio or du système 5+7 : ≈0,000074 (encore assez différent du système 5+6, ≈0,00031) — **toujours pas stabilisé**, mais l'image d'ensemble devient plus nette sur le ratio troupes au moins.
   - **Point 8 reçu (01/09/2026) — même compte que le point 7** (mêmes 2 villes : 1×niv115, 1×niv113, VP villes ≈ 8 844 799), **mesuré plus tard dans le temps (progression naturelle du compte)** : troupes 60 200 000 000 (60,2G), or 62 900 000 000 (62,9G), VP totale du compte 110 000 000 → VP troupes+or = 101 155 201. **Données confirmées correctes par le joueur** (pas d'erreur de saisie, malgré un ratio or négatif obtenu en résolvant certains systèmes à 2 équations — voir nuance ci-dessous).
     - **✅ Estimation VP à partir des villes + troupes SEULES (sans l'or), avec le ratio troupes de confiance (0,001667)** : `8 844 799 + (60,2G × 0,001667) = 109 198 199` contre **110 000 000 réels — écart de seulement 0,73%** (801 801 VP). Résultat frappant : villes + troupes seules suffisent déjà à estimer la VP totale avec une très bonne précision, l'or ne représente qu'une petite correction.
     - **✅ Ratio or dérivé de ce residual (801 801 VP / 62,9G or) : 0,0000127** (~1 VP pour 78 448 or) — **positif et cohérent**, du même ordre de grandeur que le point 5 (0,0000173, ~1 VP pour 57 863 or) — facteur d'écart ~1,35 seulement entre 2 comptes de grande échelle, très loin de l'écart ×18 observé avec le système 5+6 (petit compte). **Confirme à nouveau la piste des comptes de tailles similaires.**
     - ⚠️ **Nuance sur le ratio or "négatif" observé en résolvant certains systèmes à 2 équations (7+8, 5+8)** : cette négativité ne vient PAS d'une erreur de saisie, mais du fait que le **ratio troupes recalculé par ces systèmes divergeait légèrement du ratio de confiance (0,001667)**, sur-attribuant de la VP aux troupes et laissant un residual négatif pour l'or dans ce calcul précis. En utilisant directement le ratio troupes déjà connu (plutôt que de le laisser être recalculé par le système), le residual or redevient positif et cohérent — voir calcul juste au-dessus. Le residual lui-même (801 801 VP) n'a jamais été négatif.
   - **✅ 1ère résolution du système à 2 équations/2 inconnues, avec points 5 et 6 (compte réellement indépendant)** :
     ```
     ratio_troupes ≈ 0,001411 VP/troupe   (≈ 1 VP pour 709 troupes)
     ratio_or      ≈ 0,000311 VP/or       (≈ 1 VP pour 3 220 or)
     ```
     Écart avec le ratio troupes connu du joueur par l'expérience (0,001667) : −15,4%.
   - **✅ Ratio troupes 0,001667 remonté en confiance (retour joueur, 01/09/2026) — utilisé manuellement et de façon répétée en jeu pour estimer les troupes ennemies, avec un écart toujours faible face à la réalité observée.** Ce n'est pas juste une valeur dérivée d'un seul calcul isolé, mais une valeur **validée empiriquement par un usage pratique répété** — poids plus élevé que la résolution mathématique à 2 points ci-dessus (elle-même sensible à la moindre erreur de saisie sur l'un des 8 chiffres impliqués, comme déjà démontré par l'incident du point 6).
   - **🚨 Ratio or : chantier ouvert, aucune valeur fiable pour l'instant.** En fixant le ratio troupes à 0,001667 et en dérivant le ratio or implicite séparément sur chaque point : **point 5 → 0,0000173 VP/or (≈1 VP pour 57 863 or) ; point 6 → 0,0001674 VP/or (≈1 VP pour 5 974 or)** — un écart d'un facteur ~10 entre les deux, bien au-delà d'une simple imprécision. **Le joueur n'a aucune intuition/expérience de terrain pour ce ratio** (contrairement aux troupes), donc rien à quoi se raccrocher pour trancher entre ces deux estimations très divergentes. Cause possible : composition différente entre un petit et un gros compte, une part variable de l'or pouvant être "stockée"/non comptée dans la VP selon le contexte, ou une relation non strictement linéaire pour l'or spécifiquement (contrairement aux troupes, confirmées linéaires).
   - **Un 3ᵉ point indépendant complet (villes + troupes + or + VP) reste nécessaire** pour espérer isoler un ratio or fiable — idéalement sur un compte à une échelle encore différente des points 5 et 6.
   - **Règle pour tout futur point de données sur ce chantier : toujours collecter villes + troupes + or + VP totale ensemble**, jamais un sans l'autre — un point incomplet ne permet plus de résoudre le système à 2 inconnues. **Idéalement des comptes différents** (ou le même compte mesuré à des moments plus espacés, pour que la composition troupes/or ait le temps de varier différemment) plutôt que 2 mesures rapprochées du même compte, qui n'apportent pas de vraie 2ᵉ équation indépendante.
   - **⚠️ Mise en garde permanente (01/09/2026), à garder en tête pour toute résolution de ce système** : **les valeurs communiquées par le joueur sont elles-mêmes arrondies** (affichage en jeu compacté type "60,2G", "110M", pas le détail exact) — **une petite marge d'imprécision inhérente existe sur chaque point de donnée**, indépendamment de toute erreur de saisie. Explique une partie du bruit observé sur les résolutions de systèmes à 2 équations (ratios instables, parfois négatifs) — ne pas systématiquement chercher une erreur de saisie quand un résultat semble légèrement incohérent, l'arrondi source peut suffire à l'expliquer.
   - Ne pas envoyer de prompt d'implémentation tant que le ratio n'est pas confirmé sur plusieurs points cohérents entre eux.

3 ter. **⏳ Nouveau chantier en réserve — Référentiel "Événement" (7ᵉ référentiel potentiel)** : idée du joueur, structure discutée et globalement verrouillée, données pas encore prêtes, pas encore cadré comme tâche Codex.

   **Principe** : chaque saison, des quêtes personnelles ("événements") ont lieu, que le joueur doit compléter seul (pas de mécanique collective/clan). **⚠️ Nom de travail "Événement" retenu pour l'instant, mais le terme est déjà utilisé ailleurs pour désigner les événements spéciaux de saison** (relation différente, potentielle confusion) — à renommer plus tard si un meilleur terme se dégage, décision explicitement reportée par le joueur.

   **Structure à 3 niveaux, verrouillée — ⚠️ révisée (Bloc 77) par rapport à la structure d'origine, voir note de révision juste en dessous :**
   ```
   Ligue (sélecteur, synchronisé Paramètres joueur — même pattern que
          Classement/Troupes attaque démo/Level Up)
     └─ Durée de la saison (éditable, ex: 14 jours) — dénominateur du
        visuel timeline ci-dessous, pas une constante figée en dur
     └─ Liste d'Events — 🚨 entièrement indépendante par ligue (ordre ET
        durée compris, pas juste les paliers/récompenses)
          └─ Nom de l'event
          └─ Description (texte libre)
          └─ Durée (24h / 48h / 72h)
          └─ Bloc repliable → Liste de Paliers (nombre variable d'un
             event à l'autre, pas de nombre fixe)
               └─ Objectif (texte libre)
               └─ Récompense (texte libre)
   ```

   **✅ RÉVISION LIVRÉE (Bloc 79, PR #96) — affichage public en tuiles, remplace le simple "bloc repliable" ci-dessus.** Discussion du 01/09/2026 : cohérence visuelle avec le reste des référentiels déjà passés en tuiles (Boutique, Templiers, Gemmes).
   - **Le visuel timeline (Bloc 77) reste inchangé, en haut de page.**
   - **En dessous : grille de tuiles, 2 par ligne (1/2 largeur, desktop — 1 colonne mobile, même pattern que Boutique/Bloc 64), ordre chronologique** (même ordre que le visuel timeline, pas un ordre alternatif).
   - **Tuiles grises**, même traitement que Boutique — fond de tuile toujours gris, pas de coloration de fond par event. **🚨 Nuance ajoutée (Bloc 80) : le titre (nom de l'event) est écrit dans la couleur choisie pour cet event** (voir sélecteur de couleur, décision plus bas) — même couleur que le segment correspondant sur le visuel timeline, lien visuel entre les 2 zones sans colorer le fond de la tuile elle-même.
   - **Contenu de la tuile (pas d'image, contrairement à Boutique)** : titre (nom de l'event) et description en dessous. **2 badges affichés en évidence : l'objectif du DERNIER palier** (le plus élevé, même principe que le badge tarif saphirs sur les tuiles Boutique) **et la Durée de l'event.** **[Desktop] côte à côte** ; **[Mobile] en dessous du titre**, au lieu d'à côté comme en desktop. **🚨 Révision (Bloc 81) — le badge Durée intègre aussi les jours de début/fin de l'event : format "Jx-Jy (durée)"**, ex: **"J0-J3 (72h)"** — jours en premier, durée entre parenthèses ensuite.
   - **Clic sur la tuile → déplie/replie**, affichant tous les paliers (Objectif + Récompense) à l'intérieur — la tuile elle-même EST le bloc repliable, pas un élément séparé.

   **✅ Livré (Bloc 79, PR #96) — [Admin] indicateur de position numérique (1, 2, 3...), non éditable, calculé automatiquement selon la position de l'event dans la liste** (le réordonnancement par flèches existe déjà) — **purement informatif en admin, jamais affiché côté public.**

   **✅ Livré (Bloc 80, PR #97) — retours de test après livraison du Bloc 79, 6 correctifs admin + 1 révision publique :**
   1. **[Admin]** Ajouter le label **"Ligue"** au-dessus des boutons de sélection de ligue.
   2. **[Admin]** Aligner le champ **"Durée de la saison"** sur la même ligne que les boutons de ligue.
   3. **[Admin]** Pour chaque event de la liste : aligner le **numéro d'event** (indicateur du Bloc 79), les champs **Nom, Description, Durée**, le **sélecteur de couleur** (point 6 ci-dessous) et les **boutons d'action** — cohérence de grille/alignement sur la ligne, tous les contrôles de cette ligne inclus.
   4. **[Admin]** Champ Description agrandi encore une fois : **+50% de sa taille actuelle** (s'ajoute au ×3 déjà livré au Bloc 79).
   5. **[Admin]** Champ **Récompense** (au niveau des paliers) agrandi **×3**.
   6. **🚨 RÉVISION — sélecteur de couleur manuel par event, remplace l'auto-dérivation par nom (Bloc 79, point 6, abandonnée).** Le joueur choisit la couleur de chaque event via un bouton dédié, parmi une **palette fixe d'environ 10 options** (10 couleurs distinctes, ou 5 couleurs de base × 2 teintes chacune — au choix de l'implémentation la plus simple). Permet de donner manuellement la même couleur/nuance à 2 events similaires (ex: les 2 occurrences d'"Architecte"), avec un contrôle total du joueur plutôt qu'une déduction automatique. **🚨 Révision de palette (Bloc 81) — retour testeur sur le rendu livré au Bloc 80 : remplacer les 10 couleurs par 5 couleurs × 2 nuances, plus vives et moins sombres** que la palette initialement livrée (jugée trop sombre en pratique).
      - **Visuel timeline** : segment coloré selon la couleur choisie pour l'event. **🚨 Précision (Bloc 81) : le nom de l'event écrit sur le segment doit être dans cette même couleur** — vérifier que le texte suit bien la couleur choisie, pas une couleur de texte fixe indépendante du segment.
      - **Tuiles publiques (Bloc 79, point I)** : **fond de tuile reste gris**, mais **le titre (nom de l'event) est écrit dans la couleur choisie** — cohérence visuelle avec le segment timeline correspondant, sans colorer tout le fond de la tuile.

   **🚨 RÉVISION (Bloc 77, discussion du 01/09/2026) — "Jour de début / jour de fin" retiré, remplacé par un champ "Durée" seul + un visuel calculé automatiquement.**
   - **Contexte métier** : une saison (Argent à Légende) démarre un mercredi entre 12h et 16h (heure variable, jamais précise) et dure exactement **14 jours**, se terminant le mercredi suivant à **10h précises**. **⚠️ Bronze est exclu de ce cycle** — sa saison dure **21 jours**, pas 14 (aucun événement personnel de ce type en Bronze, cohérent avec l'absence de ligue Bronze dans ce référentiel). Les événements de la saison s'enchaînent **sans interruption** (le suivant démarre exactement quand le précédent se termine) — **seul le 1er event de la saison est en pratique un peu plus court que sa durée nominale**, pour absorber l'imprécision de l'heure de démarrage de la saison (12h-16h) et permettre à tous les events suivants de tomber pile sur des horaires ronds (fin à 10h). **Exemple concret validé (Ligue Diamant/Légende, 6 events) : 72h+72h+72h+72h+24h+24h = 336h = 14 jours pile** — confirme que les durées d'une ligue s'additionnent exactement sur le cycle complet.
   - **Décision : ne pas modéliser de date/heure de début-fin du tout.** Juste un champ **Durée** par event (24h/48h/72h). **La position de chaque event dans le cycle de 14 jours se calcule automatiquement par cumul des durées des events précédents dans l'ordre** (event 2 commence exactement où l'event 1 finit, etc.) — pas besoin de saisir un jour de début, ni de gérer le léger raccourcissement réel du 1er event (imprécision jugée sans intérêt pratique pour l'affichage).
   - **Visuel : barre horizontale façon "échelle visuelle" du Classement (Bloc 62/F)**, représentant le cycle de la saison, avec chaque event affiché comme un segment proportionnel à sa durée, positionné par cumul dans l'ordre. Réutilise le principe déjà éprouvé côté Classement plutôt que d'inventer un nouveau composant visuel. **🚨 Périmètre du visuel révisé (Bloc 81) : nom de l'event uniquement, plus la durée** — la durée est retirée du texte affiché sur le segment, devenue redondante depuis que les tuiles publiques (Bloc 79/I) l'affichent déjà en badge. **Toujours aucun palier ni récompense affiché sur ce visuel.** Le détail complet (paliers/récompenses) reste affiché en dessous, dans les tuiles (Bloc 79/I) — le visuel timeline et les tuiles sont 2 zones distinctes et complémentaires, pas redondantes.
   - **Avantage de cette approche : la donnée saisie une fois par ligue reste valable pour toutes les saisons futures** (le cycle se répète à l'identique toutes les 2 semaines) — pas de ressaisie de dates à chaque nouvelle saison, contrairement à ce qu'aurait impliqué le stockage de vraies dates calendaires.
   - **✅ Champ supplémentaire (01/09/2026) — "Durée de la saison" éditable, au niveau de chaque ligue** (pas au niveau de chaque event). Plutôt que de figer 14 jours en dur dans le composant visuel, cette durée totale devient une valeur admin-éditable, utilisée comme dénominateur pour le calcul proportionnel de la barre horizontale — cohérent avec la découverte que la durée de saison varie déjà par ligue dans le jeu (Bronze = 21 jours, hors périmètre de ce référentiel, mais confirme que ce n'est pas une constante universelle à figer en dur).

   **✅ Livré (Bloc 81, PR #98) — retour testeur sur l'alignement admin livré au Bloc 80, 3 correctifs :**
   - **Champ "Durée de la saison" réduit** : **1/4 de sa taille actuelle** suffit (actuellement bien trop grand).
   - **🐛 Alignement de ligne (numéro/Nom/Description/Durée/Couleur/boutons d'action) toujours pas correct malgré le Bloc 80.** Précisions exactes du problème :
     - **Le numéro d'event doit être aligné avec les champs de saisie (les valeurs), pas avec le titre des colonnes.**
     - **Le titre "Durée" n'est pas aligné avec les titres des autres colonnes.**
     - **Même problème pour le titre "Couleur".**
   - **Si besoin de réduire le champ Description pour obtenir un bon alignement d'ensemble, le réduire de 10%** (marge de manœuvre autorisée, priorité donnée à un alignement propre plutôt qu'à la taille maximale du champ Description).

   **Chaque palier = 2 champs texte libre**, même principe que les récompenses de palier du référentiel Classement (pas de structuration en sous-champs séparés, ex: pas de champ "or" + champ "saphirs" distincts — un seul champ texte qui peut contenir un mélange). Justification donnée par le joueur : les objectifs et récompenses varient trop dans leur forme d'un event à l'autre pour être structurés (unité différente selon l'event — "troupes enrôlées" pour un event donné, autre chose pour un autre event ; récompenses composées, mélangeant or/saphirs/reskill/speedup/monnaie spéciale de saison).

   **Exemple concret fourni par le joueur (Ligue Légende, event "Recruteur", 7 paliers) :**

   | Palier | Objectif | Récompense |
   |---|---|---|
   | 1 | 1G troupes enrôlées | 100M or + 250 éclats |
   | 2 | 3G troupes enrôlées | 300M or + 5 saphirs + 380 éclats |
   | 3 | 8G troupes enrôlées | 1G or + 20 saphirs + 510 éclats |
   | 4 | 16G troupes enrôlées | 2,5G or + 1 reskill + 640 éclats + 1 speedup |
   | 5 | 32G troupes enrôlées | 5G or + 770 éclats + 2 speedup |
   | 6 | 50G troupes enrôlées | 20G or + 900 éclats + 3 speedup |
   | 7 | 75G troupes enrôlées | 50G or + 1 reskill + 1,03k éclats + 4 speedup |

   ⚠️ **"Éclats" = monnaie spéciale de cette saison précise, susceptible de changer de nom la saison suivante** — le joueur ajustera le texte manuellement le moment venu, pas de concept de "monnaie de saison" à modéliser séparément, cohérent avec l'approche texte libre.

   **Admin** : sélecteur de ligue (comme côté public), puis pour la ligue sélectionnée — CRUD complet sur les events (ajout/suppression/réordonnancement, même pattern que les catégories Boutique) et CRUD imbriqué sur les paliers de chaque event (ajout/suppression/édition, 2 champs texte).

   **✅ Livré (Bloc 79, PR #96) — retour testeur après livraison du Bloc 77, 5 correctifs :**
   1. **[Admin]** Sélection de la durée de l'event (24h/48h/72h) en **boutons**, pas en select box.
   2. **[Admin]** Champ Description agrandi **×3** en largeur.
   3. **[Public]** Ajouter une échelle sur le visuel timeline (Bloc 77), **calée sur la fin de saison (fixe) plutôt que le début (variable, 12h-16h)**. **🚨 Règle finale (révisée Bloc 81, s'applique desktop ET mobile, pas de distinction) : n'afficher un repère que là où un changement d'event a lieu** (fin d'un event / début du suivant), **pas un repère systématique tous les 24h.** Exemple : J0, J3, J6... — **le nombre et la position exacte des repères s'adaptent aux durées réelles des events de la ligue affichée** (dépend des durées 24h/48h/72h effectivement configurées), pas une règle figée à intervalle constant. **✅ Livré (Bloc 82, PR #99) — le dernier repère (fin de saison, ex: J14) ne s'affiche pas.** La fin du dernier event = fin de saison, c'est bien une transition au même titre que les autres et doit donc suivre la même règle — corriger pour que ce repère final apparaisse comme tous les autres. **✅ Livré (Bloc 82, PR #99) — pour les jours qui ne sont PAS une transition d'event (donc sans label Jx), afficher malgré tout un fin trait vertical à cette position** — objectif : garder une échelle visuellement continue jour par jour (effet règle graduée), mais seuls les jours de transition affichent le texte du label (Jx). Les autres jours n'ont qu'un simple trait, sans aucune valeur d'axe écrite.
   4. **🐛 [Public]** Le texte du nom d'un event est **tronqué** sur le visuel timeline si trop long pour son segment (ex: "Enrôleur de troupes" sur un event de 72h) — corriger pour que le texte reste lisible, quelle que soit la largeur du segment. **🚨 Précision (Bloc 80) — retour à la ligne limité à 2 lignes maximum, mais pas la solution à privilégier en premier.** Pour un event de 72h (segment large), 1 ligne devrait normalement suffire — **privilégier l'agrandissement de la zone de texte** (taille de police adaptative, zone de texte élargie dans le segment) **plutôt que de basculer sur 2 lignes dès que possible** ; le retour à la ligne (max 2 lignes) reste un filet de sécurité pour les segments réellement trop étroits (events courts, 24h), pas le comportement par défaut pour un segment déjà large.
   5. **[Public]** La **Description de l'event doit apparaître à côté de son nom, même quand le bloc repliable est fermé** — actuellement visible seulement une fois le bloc déplié (ou pas du tout à cet endroit).
   6. **✅ Précision de modèle de données confirmée (01/09/2026) — un même nom d'event peut apparaître plusieurs fois dans une même saison, avec des durées et objectifs différents.** Exemple donné : "Architecte" en début de saison (72h, objectif élevé) ET en fin de saison (24h, objectif réduit) — **2 events distincts en base** (2 lignes CRUD séparées, pas d'unicité du nom à imposer), mais **le joueur souhaite qu'ils partagent la même couleur sur le visuel timeline**, pour une reconnaissance visuelle cohérente entre les occurrences d'un même type d'event. **🚨 RÉVISÉ (Bloc 80) — l'auto-dérivation par nom est abandonnée, remplacée par un sélecteur de couleur manuel, voir décision détaillée plus bas.**

   **Reste à trancher avant tout envoi Codex :**
   - Le libellé exact du référentiel (nom de travail "Événement" à reconsidérer, voir ci-dessus).
   - **✅ Disponibilité des données de départ, tranchée (01/09/2026)** : le joueur remplira progressivement, pas de jeu de données complet prêt d'avance pour aucune ligue — construction vide comme Boutique (Bloc 43), remplissage étalé dans le temps. **✅ Décidé — construction immédiate (Bloc 60), toggle actif/inactif (déjà existant sur tous les référentiels/outils) laissé sur inactif par défaut** — le référentiel est construit et masqué du public jusqu'à ce que le joueur ait assez de contenu, pas de délai sur l'envoi du bloc lui-même.
   - Avec 6 ligues aux listes totalement indépendantes, le volume de saisie admin à terme est important — à garder en tête pour le rythme de remplissage, pas un frein à la construction du référentiel lui-même.
   - **✅ Slug d'URL décidé : `/referentiels/events`** (anglais, cohérent avec les 6 slugs déjà en anglais depuis le Bloc 50 — même principe que Boutique : libellé public en français "Événement", slug technique en anglais).
   - **✅ Rôle : `references_manager` a accès complet** (comme les 6 autres référentiels, aucun traitement particulier) — `admin`/`super_admin` aussi, comme toujours.
   - **✅ Livré (Bloc 60, PR #81, 834 tests) — référentiel Événement construit et mergé.** Structure complète (3 niveaux, CRUD imbriqué, boutons de ligue, slug `/referentiels/events`), toggle laissé inactif comme prévu — masqué du public en attendant le remplissage progressif par le joueur. **2 correctifs de review Codex traités avant merge :** (1) localisation FR/EN des paliers ; (2) **masquage complet des référentiels inactifs de la découverte publique** (recherche, sitemap), pas seulement de la navigation — précision utile pour tout futur référentiel/outil laissé inactif intentionnellement, pas propre à Événement.

**✅ Livré (Bloc 62, PR #82) — retour testeur : bandeau de bascule référentiels (nav de section, Bloc 50) devenu trop chargé avec 7 référentiels, textes de bouton passant sur 2 lignes.**
- **[Desktop uniquement, mobile déjà OK]** Grille à **4 référentiels par ligne max**, passage automatique à une 2ᵉ ligne au-delà de 4 (7 référentiels = 4+3 actuellement).
- **Ordre alphabétique** des boutons.
- **🚨 Nuance importante avec la règle de masquage du Bloc 60 ci-dessus, à bien distinguer :** le masquage complet (recherche/sitemap) concerne la **découverte externe** (SEO, moteurs de recherche) — **ce bandeau, lui, doit au contraire afficher aussi les référentiels inactifs**, comme un teaser interne pour les visiteurs déjà sur le site. **Référentiel inactif affiché avec un astérisque de couleur**, et le libellé "Bientôt disponible" **également en couleur** (pas juste grisé/discret) — cohérent avec le pattern déjà en place pour les outils (Bloc 33, voir juste en dessous), mais pas encore appliqué à ce bandeau référentiels jusqu'ici. **Comportement par défaut supposé (à confirmer/ajuster en implémentation si besoin)** : bouton visible mais non cliquable, cohérent avec le pattern déjà établi pour les outils désactivés (grisé/non cliquable, ligne ci-dessous) — ne mène pas vers la page réelle du référentiel tant qu'il reste inactif.

**✅ Livré (Bloc 62, PR #82) — extension/renforcement du pattern "Bientôt disponible" (Bloc 33) : tous les outils désactivés ou pas encore disponibles doivent afficher un astérisque de couleur, en plus du texte "Bientôt disponible" qui passe lui aussi en couleur** (au lieu du texte simple actuel) — même traitement visuel que le bandeau référentiels ci-dessus, pour une cohérence entre les deux zones du site. S'applique partout où le pattern Bloc 33 s'applique déjà (navigation, dashboard, `/tools`) — pas une nouvelle zone, un renforcement visuel de l'existant.

3 quater. **⏳ Nouveau chantier en réserve — refonte visuelle en tuiles des outils Villes (Coût de Ville, Niveau Max Atteignable, Production)** : idée du joueur (01/09/2026), pas encore cadrée. Objectif : harmoniser avec le reste de l'app (référentiels et plusieurs outils déjà passés en tuiles — Boutique, Templiers, Gemmes), améliorer la lisibilité actuelle, et **s'assurer de n'afficher que les informations réellement utiles** (sous-entendu : les sorties actuelles de ces 3 outils affichent probablement trop d'information, ou une information mal hiérarchisée). **✅ Précision de portée (01/09/2026, fusionne l'ancien "Bloc 63") : le problème n'est pas spécifique au mobile — ces 3 outils sont jugés moyens aussi bien en desktop qu'en mobile.** Ne pas cadrer ce chantier comme une simple retouche responsive, c'est une vraie refonte visuelle à traiter pour les 2 largeurs d'écran en même temps. **Rien de plus précis pour l'instant** — pas de structure de tuile proposée, pas de périmètre exact des données à afficher/masquer. Nécessitera une vraie session de cadrage (comme pour Gemmes, Bloc 65, ou Templiers/outil, Bloc 68/69) avant de pouvoir en faire un prompt : quelles informations de sortie actuelles sont réellement utiles vs superflues, structure de tuile par ville/palier/résultat, comportement desktop vs mobile.

3 quinquies (ex-Bloc 63). **⏳ Chantier en réserve distinct — revue mobile d'autres pages à tableaux, hors outils Villes** (traité séparément ci-dessus) : sans impact sur le rendu desktop. **✅ Confirmé par le joueur (01/09/2026) : Templiers, Gemmes et Boutique sont OK desktop ET mobile**, sortent de cette liste. Reste potentiellement : référentiel Level Up/Progression, et/ou des écrans admin à tableaux — **liste précise toujours en attente du joueur**, pas encore assez d'information pour en faire un prompt.

3 sexies. **⏳ Nouveau chantier en réserve, 🚩 explicitement V2 (01/09/2026, décision du joueur — priorité donnée à la finition de la V1)** — configurateur d'avatar joueur, comme dans le jeu : idée du joueur (01/09/2026), pas encore cadrée. Objectif pressenti : reproduire l'écran de personnalisation d'avatar en jeu (choix de race/genre — au moins Humain, Tigre, Lion, Panthère selon les sprite atlas déjà identifiés lors de l'extraction APK — et probablement d'autres options de customisation à préciser). **✅ Mécanique envisagée précisée par le joueur (01/09/2026, qui reconnaît lui-même le risque de complexité) : composition en calques.** Des images superposées par composant (cheveux, forme du visage, barbe, yeux, bouche, ...), **chaque composant ayant son propre bouton de défilement** (précédent/suivant à travers les variantes disponibles pour ce composant), et **un aperçu qui recompose l'ensemble en temps réel** à chaque changement. **✅ Assets déjà disponibles côté joueur (01/09/2026)** — l'extraction APK est déjà faite, plus une inconnue bloquante. **Complexité restante à trancher** : mécanisme de composition visuelle (calques CSS superposés, canvas, SVG), cohérence des calques entre eux (un cheveux donné doit s'aligner visuellement avec n'importe quelle forme de visage — probablement des jeux de calques séparés par race/genre plutôt qu'un jeu universel, à confirmer). **Rien de cadré pour l'instant** au-delà de cette mécanique générale — périmètre exact des composants personnalisables, utilité pour le joueur (juste un aperçu, ou lié à un autre outil ?). **Session de cadrage volontairement reportée à après la finalisation de la V1** — voir aussi section 13 (V2, sans deadline).

3 septies. **⏳ Nouveau chantier en réserve, 🚩 explicitement V2 (même décision que ci-dessus)** — configurateur de bannière de clan, comme dans le jeu : idée du joueur (01/09/2026), pas encore cadrée. Même principe que le configurateur d'avatar ci-dessus, mais pour la bannière de clan. **Rien de cadré pour l'instant** : périmètre exact des options personnalisables (fond, symbole, couleurs...), source des assets visuels nécessaires. **Session de cadrage volontairement reportée à après la finalisation de la V1** — voir aussi section 13 (V2, sans deadline).

3 quinquies. **⏳ Question en attente de décision — l'outil Templiers (calculateur) est-il devenu redondant avec le référentiel Templiers ?** Discussion du 01/09/2026 : le référentiel affiche déjà le coût **unitaire par niveau ET cumulé depuis le niveau 1** — "coût pour aller du niveau A au niveau B" = simple soustraction entre 2 valeurs déjà visibles dans le référentiel. Le bonus/gain personnalisé (dépendant du nombre de templiers réellement possédés) reste, selon le joueur, **facile à calculer soi-même** malgré tout. **✅ Décidé pour l'instant : l'outil est conservé**, pas de retrait immédiat — mais la question reste ouverte pour une décision future. Si retrait décidé plus tard : impact à prévoir sur `/tools` (catégorie Compétences), les liens croisés réciproques référentiel↔outil (Bloc 53/54/67), et sur tout travail en cours sur cet outil au moment de la décision (ex: Bloc 69, points B/C, en cours au moment de cette discussion).

4. **Référentiel Consommables** — reclassé (n'est plus un simulateur). **✅ Structure décidée, données en cours de finalisation (30/08/2026) :**
   - **Page publique en 2 zones** : (1) une **zone de texte libre éditable en markdown** en haut de page — même éditeur que les guides/mentions légales (`@uiw/react-md-editor`) — contenant notamment les icônes Saphirs et Inventaire, et le texte général sur les devises d'événement (pas des objets précis, donc pas dans le tableau) ; (2) **le tableau des objets** en dessous, avec leurs détails. **✅ Texte d'intro retenu par le joueur (01/09/2026)** : "Les saphirs sont la monnaie interne de Million Lords. Ils permettent d'acheter tous les objets ce que vous retrouverez dans la boutique ou encore certains changements pratiques comme un renommage de ville ou de seigneur. Tous les objets achetés atterrissent dans l'inventaire, accessible directement depuis l'écran principal en jeu. Retrouve ci-dessous le détail de chaque objet, classés par catégorie : Conseillers, Équipement, Expédition et Inventaire." — avec les images Saphirs/Inventaire intégrées en HTML brut (`<img src="..." width="48">`), voir bug ci-dessous.
   - **✅ Livré (Bloc 58, PR #79) — RÉVISION MAJEURE : la zone de texte libre markdown est supprimée, remplacée par un tableau "Intro" structuré.** Suite au feuilleton HTML/markdown/float des Blocs 55-57, décision de simplifier radicalement plutôt que de continuer à corriger un système de texte libre fragile. **La zone markdown disparaît entièrement** — plus de HTML, plus de float, plus de souci de rendu public/admin divergent.
     - **Nouveau tableau "Intro"**, même pattern que les 4 tableaux de catégorie (Conseillers/Équipement/Expédition/Inventaire, Bloc 43/46/48) : **3 colonnes — Image, Nom, Description**.
     - **Toujours affiché en 1er bloc**, avant les filtres de catégorie — et **jamais affecté par les filtres** (ne se masque jamais, contrairement aux 4 tableaux de catégorie qui disparaissent quand leur filtre est désélectionné, Bloc 48).
     - **Même CRUD complet que les 4 autres tableaux** : ajout (icône "+", Bloc 49), suppression (croix rouge + confirmation, Bloc 49), édition — réutilise directement le même composant/pattern, pas de nouveau développement de zéro.
     - **Contenu à adapter** : les 2 lignes prévues (Saphirs, Inventaire) reprennent l'esprit du texte déjà retenu par le joueur, mais réparties en Nom + Description distincts par ligne plutôt qu'un texte continu — à resaisir par le joueur directement dans ce nouveau tableau une fois construit, pas une reprise automatique du texte markdown existant.
     - **✅ Livré (Bloc 58, PR #79) — retirer le titre de colonne "Image" dans les tableaux affichés côté public** (tableau Intro et les 4 tableaux de catégorie) — l'image reste affichée normalement dans la colonne, seul le libellé d'en-tête de colonne disparaît.
   - **✅ Diagnostic définitif (confirmé par 2 tests successifs du joueur) — le HTML brut `<img>` ne fonctionne jamais côté public, ni en tableau ni en paragraphe simple ; seule la syntaxe markdown pure `![alt](url)` fonctionne, mais sans aucun contrôle de taille possible (rendu trop grand, testé en tableau ET en paragraphe simple).** Le renderer public filtre/ignore purement et simplement le HTML brut, quel que soit le contexte — pas un souci spécifique aux tableaux.
   - **✅ Livré (Bloc 56, PR #77) — corriger le rendu public pour qu'il supporte le HTML brut (`<img>` a minima), comme l'aperçu admin le fait déjà.** Cause confirmée : absence de `rehype-raw` sur le pipeline de rendu public de `@uiw/react-md-editor`, alors que l'éditeur admin l'ajoute en interne. Corrigé à la racine dans `markdown-plugins.ts`, partagé par Boutique/guides/mentions légales.
   - **✅ Probablement résolu par le même correctif (Bloc 56), et de toute façon devenu sans objet pour Boutique (Bloc 58, zone markdown supprimée) — le HTML brut imbriqué dans un tableau markdown.** Le correctif `rehype-raw` du Bloc 56 était général (pipeline complet), pas scopé aux paragraphes hors tableau — il a vraisemblablement aussi résolu ce cas précis, même si pas explicitement re-testé isolément. **Non prioritaire à vérifier davantage** : la zone markdown de Boutique disparaît entièrement au Bloc 58 (remplacée par un tableau structuré), et guides/mentions légales n'ont pas signalé ce besoin spécifique (HTML riche dans un tableau) à ce jour.
   - **✅ Livré (Bloc 52, PR #74) — 3 correctifs de style/texte retour testeur, référentiel Boutique :**
     1. **[Public] Barre de filtres (catégories) : même style que les autres pages référentiel** (ex: Équipement de Combat) — cadre/bordure identique, actuellement visuellement différent/moins soigné sur Boutique.
     2. **[Public] Zone de texte markdown (intro) également dans un cadre du même style** que le reste du site — actuellement sans encadrement cohérent.
     3. **[Admin] Retirer les textes explicatifs affichés au-dessus des zones** — le texte "Zone de texte..." (au-dessus de la zone markdown) et "Ajoute, réordonne..." (au-dessus du tableau d'objets) sont des phrases d'aide superflues à supprimer, l'interface doit se comprendre sans ce texte d'accompagnement.
   - **Colonnes du tableau** : image, nom, description, coût (saphirs) — **une seule colonne de coût** (correction d'une 1ère version de cette section qui envisageait 3 colonnes de coût séparées par palier ; décision finale actée plus loin dans ce document : chaque palier de quantité devient un objet/ligne distinct plutôt qu'une colonne agrégée).
   - **✅ Livré (Bloc 46, PR #69) — [Référentiel Consommables uniquement, public] image agrandie à 5rem** (au lieu de la taille actuelle) — taille différente des images d'équipement/gemmes (3rem, Bloc 38), propre à ce référentiel.
   - **✅ Livré (Bloc 46, PR #69) — [Référentiel Consommables uniquement, admin] boutons de réordonnancement en icônes flèches plutôt qu'en texte.** Les boutons "Move up"/"Move down" (Bloc 43, réordonnancement 1 position à la fois) passent en **icônes de flèche** (↑/↓) — plus compact, cohérent avec le reste des contrôles d'action de l'admin. Comportement inchangé, seul le rendu visuel change.
   - **✅ Livré (Bloc 48, PR #71) — révision structurelle de la catégorisation livrée au Bloc 46 : 4 tableaux séparés par catégorie, plus de select ni de colonne Type.** Le Bloc 46 avait livré la catégorisation avec un sélecteur de catégorie par ligne + une colonne Type dans un tableau unique. **Retour testeur : structure changée pour 4 tableaux distincts, un par catégorie** (Expédition, Conseillers, Équipement, Inventaire) — la catégorie devient implicite au tableau, plus besoin de la sélectionner ni de l'afficher en colonne (gagne de la place pour les autres colonnes).
     - **Public :** 4 tableaux séparés, un par catégorie, chacun avec son propre titre. **Les boutons de filtre masquent complètement le tableau correspondant** s'ils sont désélectionnés (même principe que le masquage complet déjà acté pour famille/rareté sur les tuiles Combat/Expédition, Bloc 41) — pas juste un ombrage.

**✅ Livré (Bloc 68, PR #87) — [Mobile uniquement] boutons de filtre catégorie Boutique (Conseillers/Équipement/Expédition/Inventaire) en grille 2×2**, prenant toute la largeur disponible — au lieu de leur disposition actuelle sur mobile.

**✅ Livré (Bloc 68, PR #87) — [Mobile uniquement] même traitement en grille pour les boutons de filtre des référentiels Équipement de Combat et Équipement d'Expédition, prenant toute la largeur disponible :**
- **Filtre famille** (4 familles chacun — Attaque/Défense/Or/Vitesse pour Combat, Or/Équipement/Consommables/Troupes pour Expédition, Bloc 41) : **grille 2×2**, même principe que Boutique ci-dessus.
- **Filtre rareté** (5 raretés — Commun/Rare/Épique/Mythique/Légendaire) : **2 lignes, mais réparties 2+3, pas 2×2 symétrique** — **ligne 1 : Légendaire, Mythique** (2 boutons) ; **ligne 2 : Épique, Rare, Commun** (3 boutons). ⚠️ **Ordre du plus rare au plus commun, explicitement inversé par rapport à l'ordre Commun→Légendaire habituellement utilisé ailleurs sur le site** — reformulation volontaire de l'ordre pour cette disposition mobile spécifique, pas une erreur à corriger vers l'ordre standard.

**✅ Livré (Bloc 68, PR #87) — [Mobile uniquement] boutons de sélection de ligue des référentiels Événement et Progression (ex-Level Up) : 2 lignes de 3 boutons**, prenant toute la largeur disponible (6 ligues = 3+3) — au lieu de leur disposition actuelle sur mobile.
     - **Admin : même structure en miroir, 4 tableaux séparés, un par catégorie.** Chaque tableau a **son propre bouton "Ajouter"** (pré-scope à sa catégorie, plus besoin de select — le tableau détermine la catégorie) et **sa propre suppression par ligne**. Le réordonnancement (flèches monter/descendre, Bloc 43/46) est donc naturellement **scopé par catégorie** — plus d'ambiguïté sur ce que "monter" signifie pour un ordre global mélangeant les catégories, chaque tableau a son propre ordre indépendant. **✅ Livré (Bloc 49, PR #72) — 2 affinages UI sur ces 4 tableaux admin :**
       1. **Bouton "Ajouter" simplifié en icône "+"**, sur la même ligne que le titre du tableau (au lieu du libellé verbeux actuel type "Ajouter (Équipement)", "Ajouter (Conseillers)"...) — la catégorie reste implicite au tableau, pas besoin de la répéter dans le libellé du bouton.
       2. **Suppression d'une ligne : icône croix rouge, avec message de confirmation avant suppression effective** — actuellement, la suppression se fait sans confirmation, ce qui manque vu le caractère irréversible de l'action.
     - **✅ Livré (Bloc 53, PR #75) — 3 affinages supplémentaires sur ces 4 tableaux admin, retour testeur post-Bloc 50 :**
       1. **Boutons monter/descendre + suppression regroupés dans une seule colonne "Actions"** (au lieu de colonnes séparées actuellement).
       2. **Champs de saisie (Nom, Description) élargis à la largeur de leur colonne** — trop d'espace vide entre chaque champ actuellement, ils doivent occuper toute la largeur disponible de leur cellule.
       3. **Colonne Description légèrement élargie** (elle contient du texte plus long que les autres colonnes, mérite un peu plus de place).
       **⚠️ Contrainte impérative, déjà source de plusieurs correctifs sur cet écran (Bloc 40/42/48) : toujours aucun scroll horizontal**, même après ces 3 ajustements — vérifier concrètement en navigateur à plusieurs largeurs d'écran avant de considérer ce point livré.
     - **Migration des données existantes** : les objets déjà catégorisés au Bloc 46 (champ catégorie déjà en base) doivent être répartis dans le bon tableau lors de cette refonte, pas repartir de zéro.
     - **✅ Livré (Bloc 62, PR #82) — 2 nouveaux affinages :**
       1. **🐛 Boutons d'action de la colonne Actions (Bloc 53) actuellement empilés verticalement au lieu d'être alignés horizontalement** — les icônes monter/descendre/suppression doivent être **sur la même ligne**, côte à côte, pas les unes au-dessus des autres.
       2. **Support d'un texte en gras dans les champs Nom/Description des tableaux (Intro + 4 catégories) — syntaxe `**gras**`, implémentation la plus légère possible.** ⚠️ Révision : le joueur n'est finalement pas opposé à markdown ni HTML pour ce cas précis, sa vraie priorité est la légèreté d'implémentation, pas d'éviter markdown à tout prix. **Solution retenue : syntaxe markdown `**texte**` reconnue, mais via un simple regex dédié à ces champs** (`/\*\*(.+?)\*\*/g` → `<strong>`), **surtout pas en réimportant la bibliothèque markdown complète/`rehype-raw`** qui a causé tous les soucis des Blocs 55-58 — juste le gras, rien d'autre (pas d'italique, pas de liens, pas de listes, pas d'images). Rendu identique admin/public (même petit renderer utilisé aux deux endroits, pas de pipeline qui diverge comme cause du bug corrigé au Bloc 56).

**✅ Livré (Bloc 48, PR #71) — 🐛 le sélecteur de langue public (Bloc 47, PR #70) s'ouvre dans le mauvais sens.** Le style est bon, mais la liste déroulante s'ouvre **à l'emplacement de l'option actuellement sélectionnée** (comportement natif du `<select>` HTML, dépend du navigateur/OS) — donc parfois vers le haut, parfois vers le bas selon la langue en cours, avec un scroll vertical de la page quand ça ouvre vers le haut alors que le sélecteur est déjà en haut de page. **La liste doit toujours s'ouvrir vers le bas, sans exception.** ⚠️ **Un `<select>` HTML natif ne permet pas de contrôler fiablement le sens d'ouverture d'un navigateur à l'autre** — le corriger nécessite probablement de remplacer le `<select>` natif par un **menu déroulant personnalisé** (composant listbox custom, toujours accessible au clavier) qui a l'apparence d'un select mais dont le positionnement d'ouverture est réellement contrôlable en code plutôt que délégué au navigateur.

**✅ Livré (Bloc 48, PR #71) — ordre des 4 tableaux de catégorie : alphabétique.** Ordre exact : **Conseillers, Équipement, Expédition, Inventaire** — s'applique à la fois à l'ordre d'affichage des 4 tableaux publics et à l'ordre des boutons de filtre correspondants (les deux doivent rester synchronisés). **À l'intérieur de chaque catégorie, les consommables suivent l'ordre défini en admin** (flèches monter/descendre, déjà scopées par catégorie suite à la révision structurelle ci-dessus) — l'ordre alphabétique ne s'applique qu'au niveau des 4 catégories elles-mêmes, pas aux lignes à l'intérieur.

**✅ Livré (Bloc 48, PR #71) — donnée : les 3 potions (25/50/75 PV) vont dans la catégorie Expédition**, pas Inventaire — cohérent avec leur usage réel (soin de l'aventurier en expédition).

**✅ Livré (Bloc 48, PR #71) — renommage complet : "Consommables" → "Boutique".** Le référentiel couvre en réalité tout ce qui s'achète en saphirs (conseillers, coffres, potions, renommages...), pas seulement des "consommables" au sens strict — "Boutique" est un intitulé plus juste. **Libellé public renommé partout** (titre de page, navigation, tuiles, liens croisés) **et URL changée : `/guides/referentiels/consommables` → `/guides/referentiels/shop`.** **Changement direct, pas de redirection** de l'ancienne URL — le site n'a pas encore de trafic indexé à préserver. Les identifiants internes (fichiers, routes API, clés DB déjà basées sur "consumables"/"consommables") restent inchangés — seuls le libellé visible et le slug d'URL changent. **⚠️ Mise à jour ultérieure (Bloc 50) : la racine elle-même a changé** — `/guides/referentiels/shop` → **`/referentiels/shop`** (nouvelle racine `/referentiels/*`, indépendante de `/guides/*`), URL actuelle donc `/referentiels/shop`.
   - **✅ Les conseillers sont inclus** dans ce référentiel (décision inversée en cours de route — d'abord exclus, puis réintégrés puisqu'ils s'achètent aussi en saphirs).
   - **🚨 CRUD complet en admin, différence structurelle avec les autres référentiels** : contrairement à Combat/Expédition/Level Up/Templiers/Gemmes (catalogue fixe, édition valeur par valeur uniquement), **Consommables permet l'ajout et la suppression libre de lignes** — le catalogue du jeu peut évoluer (nouveaux objets, retraits), pas un nombre de lignes figé à l'avance. **✅ Corrigé en review Codex (PR #66, commit `7506da6`) — une seule action de sauvegarde pour la zone markdown ET le tableau d'objets** (au lieu de 2 boutons séparés, qui pouvaient perdre la moitié des modifications si l'un des deux n'était pas cliqué), avec message explicite en cas d'échec partiel — cohérent avec la règle transverse "un seul bouton d'enregistrement par écran" déjà actée pour les autres référentiels multi-tableaux (Bloc 37, point E).
   - **✅ Livré (Bloc 48, PR #71) — [admin uniquement] 🐛 zone markdown trop large, à cause du tableau en dessous — corrigé pour de bon cette fois.** Historique : marqué livré au Bloc 42 (PR #68) mais toujours présent en pratique (réouvert au 31/08/2026) — le tableau affichait encore Nom (FR)/Nom (EN)/Description (FR)/Description (EN) en colonnes séparées. **Cette fois vérifié concrètement en navigateur réel** (changement de langue FR→EN confirmé swap bien les valeurs affichées, pas juste les libellés) — le sélecteur de langue en haut de page pilote désormais les colonnes du tableau (2 colonnes actives, Nom + Description, plus 4 fixes).

**✅ Livré (Bloc 42, PR #68) — [Transverse, admin] composant/classe CSS partagé pour les champs numériques compacts, appliqué rétroactivement.** Constat après plusieurs itérations (Blocs 35/37/38/40/41/45) : le même problème de largeur de champ/colonne a été corrigé indépendamment sur au moins 5 écrans différents (Combat, Expédition, Gemmes, Classement, Consommables), à chaque fois après coup plutôt qu'en amont — risque élevé de réapparition sur tout futur écran admin (ex: un futur référentiel Fight/Enemy Troops). **Créer un composant/classe CSS unique, documenté** ("champ numérique compact d'admin" — largeur fixe raisonnable, sans flèches d'incrément, centré) **et l'appliquer rétroactivement sur tous les écrans d'édition existants**, pour que ce ne soit plus jamais un correctif ponctuel par écran.

**✅ Livré (Bloc 42, PR #68) — [Transverse, tests e2e] stabiliser les sélecteurs de test avec des attributs `data-testid`.** Constat après plusieurs refontes (Bloc 39 — tuiles référentiels, Bloc 41 — réordonnancement Consommables) : des tests e2e reposant sur la structure DOM ou le texte affiché cassent à chaque refonte visuelle, même quand le comportement fonctionnel reste correct. **Ajouter des attributs `data-testid` stables sur les éléments interactifs clés** (boutons de filtre, lignes de tableau, champs de formulaire, boutons d'action) et migrer progressivement les tests e2e existants vers ces sélecteurs plutôt que le texte/la structure DOM — priorité aux écrans les plus souvent refondus (référentiels, simulateurs).

**✅ Livré (Bloc 42, PR #68) — SEO de base.** Jamais abordé jusqu'ici. À couvrir : `sitemap.xml` généré dynamiquement (toutes les pages publiques : outils, guides, référentiels, dans les 5 langues) ; balise meta description par page (générique par type de page si pas de contenu spécifique disponible, jamais vide) ; attributs `hreflang` sur chaque page pour signaler les 5 langues disponibles aux moteurs de recherche, maintenant que le site est réellement multilingue (Bloc 44). Analytics (Umami déjà choisi par le joueur, code de suivi à ajouter au moment de la mise en public du site — pas dans ce bloc) et sauvegarde de la base (gérée manuellement par le joueur pour l'instant, hors périmètre) ne sont pas concernés par ce point.
   - **✅ Corrigé en review Codex (PR #66, commit `7506da6`) — repli fr→en manquant pour DE/ES/TR.** DE/ES/TR n'avaient aucun repli vers l'anglais si le français était vide (contrairement à la règle générale "repli sur l'anglais si une traduction manque", cdc section 2) — corrigé. **Précision qui clarifie un point potentiellement ambigu du cdc** : `defaultLocale=fr` (langue chargée par défaut pour un visiteur) et "repli sur l'anglais" (filet de sécurité si une clé de traduction manque, quelle que soit la locale) sont deux notions distinctes, pas contradictoires — l'anglais reste le filet de sécurité universel même quand le français est la langue par défaut du site.
   - **28 objets collectés** (31 lignes du fichier fourni, moins les 3 déplacées dans la zone markdown : Saphirs, Inventaire, texte devises d'événement) — images déposées dans `public/consumables/` (extensions `.webp` corrigées, 3 fichiers avaient une coquille `.web`). **Deviennent ~33-38 lignes une fois les paliers de quantité éclatés en objets séparés** (voir décision juste en dessous).
- **Coûts par palier de quantité : objets distincts, pas de colonne agrégée.** Décidé après réflexion : plutôt qu'une colonne combinant plusieurs prix (unitaire/×5/×10), **chaque palier devient sa propre ligne/objet** (ex: "Coffre" à 150 saphirs et "Coffre ×5" à 675 saphirs, comme 2 entrées distinctes) — cohérent avec le CRUD libre déjà décidé (ajouter un palier = ajouter une ligne, même logique uniforme partout), tableau public à 1 seule colonne de coût, pas de format d'affichage spécial à construire.
- **Réordonnancement des lignes en admin, par flèches monter/descendre d'1 position** (pas de glisser-déposer, pas de raccourci "haut"/"bas") — plus simple à construire, fonctionne nativement sur mobile, accessible par défaut. Décision motivée par le volume modéré (~30-35 lignes une fois les paliers éclatés en objets séparés) et un usage occasionnel, pas un réordonnancement fréquent qui justifierait plus de complexité.
- **⚠️ "Changement de ville principale" a une mécanique conditionnelle, pas un prix fixe unique** : **1er changement gratuit**, ensuite **payant** (soit en saphirs directement, soit via l'objet dédié lui-même comme monnaie d'échange). Le champ "coût" classique ne suffit pas à représenter ça — noter ce cas comme une exception dans la description de l'objet plutôt que forcer une valeur numérique dans les colonnes de coût.
- **✅ Livré (Bloc 43) — 4 objets encore sans coût chiffré** (Renommer ville, Renommer clan, Nouveau départ, Changement de ville principale) — champ laissé vide/éditable en admin, aucune valeur inventée (cohérent avec la règle AGENTS.md sur les données non confirmées).
   - **Coût en saphirs** : suit la règle générale déjà actée (cdc section 3.3) — **jamais de simplification k/M**, valeur brute toujours affichée.
5. **Guides** — modèle de données et éditeur prêts, **5 guides publiés** sur 56 prévus (voir section 10 pour le plan complet et le suivi)
6. **Cohérence de nommage dans ce document** — les noms de simulateurs Villes ont été traduits en français dans le prototype (Coût de Ville, Niveau Max Atteignable, Production, Classement) ; ce document garde encore les noms techniques anglais (City Cost, City Max Level, Ranking) par choix assumé (jargon technique interne, voir section 6) — non bloquant

**Résolu depuis la dernière grosse session de données (Villes, Classement, fusion équipements) :** Or/Bronze/Argent pour Villes, les 6 ligues de Classement, la formule complète de fusion des équipements (5/5 raretés) — voir sections 7.1 correspondantes pour le détail.

**Changements structurels notables (historique, pour comprendre les choix actuels) :**
- La catégorie "Production" a été retirée — fusionnée dans **Villes** (3 simulateurs : Coût de Ville, Niveau Max Atteignable, Production)
- La catégorie **"Référentiels"** regroupe les données consultables (Équipements Combat/Expédition, **Level Up**), distincte de "Compétences" (vrais outils de calcul)
- Les Templiers n'alimentent plus automatiquement la production du joueur — pool de clan séparé ("Bonus de temple (clan)"), saisi directement (contribution Templiers uniquement, base ajoutée automatiquement)
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

**10 compétences × 6 ligues = 60 fichiers — ✅ reçus, complets (60/60), aucun manquant.**

**✅ Repasse qualité (03/09/2026)** : le joueur a fourni une 2ᵉ livraison des 60 fichiers en meilleure résolution, à utiliser en remplacement (même convention de nommage, `gem-{competence}-{ligue}.webp`).

**✅ 11ᵉ gemme confirmée : `random`** — **hors périmètre référentiel** (n'est associée à aucune des 10 compétences affichées dans le tableau des gemmes), utilisée dans le jeu lors d'un **reroll** (tentative de remplacer une gemme obtenue par une autre). **Même convention de nommage appliquée** : `gem-random-{ligue}.webp` (6 fichiers, bronze à legendary) — pas d'usage identifié pour l'instant sur le site, gardée à disposition si un futur outil en a besoin (ex: un simulateur de reroll, non cadré à ce jour).

**🚨 Convention de nommage révisée (remplace la version initiale ci-dessous, jamais utilisée)** : `gem-{competence-technique}-{ligue-technique}.webp` — clés techniques anglaises déjà établies (AGENTS.md), pas les clés françaises initialement prévues, cohérent avec le traitement des équipements (clés techniques anglaises, `.webp`).

**Compétences (clé technique déjà établie, AGENTS.md) :** `prosperous`, `recruiter`, `striker`, `guardian`, `scavenger`, `salvager`, `rusher`, `fearless`, `brave`, `cautious`.

**⚠️ Exception assumée sur la ligue Légende — confirmée par le joueur :** `bronze` / `silver` / `gold` / `platinum` / `diamond` suivent la clé technique standard des ligues, **mais le palier le plus haut utilise `legendary`, pas `legend`** (contrairement à la clé `legend` utilisée partout ailleurs dans le projet pour cette même ligue — sélecteurs de ligue, `player-league`, etc.). **Point d'implémentation à ne pas rater** : toute construction de chemin d'image gemme à partir de la ligue sélectionnée par le joueur doit convertir `legend` → `legendary` spécifiquement pour ce nommage de fichier, cette conversion ne s'applique nulle part ailleurs dans le code.

**Exemple :** `gem-striker-legendary.webp` (Attaque, Légende).

**🐛 1 typo à corriger avant intégration :** `gem-striker-diamonds.webp` reçu avec un "s" en trop — à renommer en `gem-striker-diamond.webp` (seul fichier concerné sur les 60).

| Compétence (clé) | Bronze | Argent | Or | Platine | Diamant | Légende |
|---|---|---|---|---|---|---|
| Attaque (`striker`) | `gem-striker-bronze.webp` | `gem-striker-silver.webp` | `gem-striker-gold.webp` | `gem-striker-platinum.webp` | `gem-striker-diamond.webp` *(corrigé, était `diamonds`)* | `gem-striker-legendary.webp` |
| Bravoure (`brave`) | `gem-brave-bronze.webp` | `gem-brave-silver.webp` | `gem-brave-gold.webp` | `gem-brave-platinum.webp` | `gem-brave-diamond.webp` | `gem-brave-legendary.webp` |
| Charognard (`scavenger`) | `gem-scavenger-bronze.webp` | `gem-scavenger-silver.webp` | `gem-scavenger-gold.webp` | `gem-scavenger-platinum.webp` | `gem-scavenger-diamond.webp` | `gem-scavenger-legendary.webp` |
| Défense (`guardian`) | `gem-guardian-bronze.webp` | `gem-guardian-silver.webp` | `gem-guardian-gold.webp` | `gem-guardian-platinum.webp` | `gem-guardian-diamond.webp` | `gem-guardian-legendary.webp` |
| Intrépide (`fearless`) | `gem-fearless-bronze.webp` | `gem-fearless-silver.webp` | `gem-fearless-gold.webp` | `gem-fearless-platinum.webp` | `gem-fearless-diamond.webp` | `gem-fearless-legendary.webp` |
| Prospérité (`prosperous`) | `gem-prosperous-bronze.webp` | `gem-prosperous-silver.webp` | `gem-prosperous-gold.webp` | `gem-prosperous-platinum.webp` | `gem-prosperous-diamond.webp` | `gem-prosperous-legendary.webp` |
| Recruteur (`recruiter`) | `gem-recruiter-bronze.webp` | `gem-recruiter-silver.webp` | `gem-recruiter-gold.webp` | `gem-recruiter-platinum.webp` | `gem-recruiter-diamond.webp` | `gem-recruiter-legendary.webp` |
| Récupération (`cautious`) | `gem-cautious-bronze.webp` | `gem-cautious-silver.webp` | `gem-cautious-gold.webp` | `gem-cautious-platinum.webp` | `gem-cautious-diamond.webp` | `gem-cautious-legendary.webp` |
| Recycleur (`salvager`) | `gem-salvager-bronze.webp` | `gem-salvager-silver.webp` | `gem-salvager-gold.webp` | `gem-salvager-platinum.webp` | `gem-salvager-diamond.webp` | `gem-salvager-legendary.webp` |
| Vitesse (`rusher`) | `gem-rusher-bronze.webp` | `gem-rusher-silver.webp` | `gem-rusher-gold.webp` | `gem-rusher-platinum.webp` | `gem-rusher-diamond.webp` | `gem-rusher-legendary.webp` |

**Convention initiale, jamais utilisée, conservée pour historique uniquement :** ~~`gemme-{competence}-{ligue}.png`~~ (français, `.png`) — abandonnée au profit de la convention ci-dessus.

**✅ Convention équipements (Combat + Expédition) actée — manifeste complet en section 12.**
## 12. Manifeste des images — Équipements (Combat + Expédition)

**Convention de nommage : `{famille-slug}-{rarete-slug}-{emplacement-slug}.webp`** (minuscules, sans accent, tirets, apostrophes retirées) — plutôt qu'à partir du nom du set, pour rester systématique et prévisible sans avoir à connaître les noms exotiques des sets (Spirit Fyra, Almaty, Shark...). Famille+rareté identifient un set de façon unique (vérifié : 300 combinaisons, zéro collision). Exemple : `attaque-legendaire-amulette.webp`.

**🚨 Structure de dossiers révisée — Combat et Expédition séparés (retour joueur)** : le dossier `public/equipment/` créé au Bloc 22 (préparation) se subdivise en 2 sous-dossiers distincts, pas un seul dossier mélangeant les deux familles d'équipement :
```
public/equipment/combat/       ← 180 fichiers Combat
public/equipment/expedition/   ← 120 fichiers Expédition
public/gems/                   ← 60 fichiers Gemmes (déjà correct, inchangé)
```
Le nom de fichier lui-même (`{famille}-{rareté}-{emplacement}.webp`) ne change pas — seul l'emplacement dans l'arborescence est concerné. Toute référence de code déjà écrite pointant vers `public/equipment/` sans sous-dossier doit être mise à jour en conséquence.

**✅ Décidé — convention pour les 4 images de catégorie d'outils (générées par IA, validées par le joueur)** : `public/tools/{slug}.webp`, un fichier par catégorie de la page Outils/Accueil, **noms de fichiers en anglais** (cohérent avec AGENTS.md — code/clés techniques toujours en anglais, même quand le libellé public est en français). Slugs : `cities.webp` (Villes), `fight.webp` (Combat), `ranking.webp` (Classement), `skills.webp` (Compétences). **✅ Décision structurelle plus large : `public/tools/` et `public/guides/` comme 2 dossiers racine distincts** pour les assets images liés respectivement aux outils (catégories, éventuellement futures images d'outils individuels) et aux guides (illustrations de guide) — séparation cohérente avec la distinction déjà actée entre les deux sections du site (Outils vs Guides). **Structure exacte de `public/guides/` pas encore définie** (illustrations par guide, potentiellement plusieurs fichiers par guide — à préciser au moment d'intégrer les 6 images du guide "Bien débuter", pas de convention à inventer par anticipation). **✅ Livré (Bloc 36, PR #58) — les 4 images s'affichent via un composant partagé unique `ToolCategoryGrid`** (accueil ET `/tools`, pas de duplication de logique), avec repli SVG propre si un fichier venait à manquer. **✅ Livré (Bloc 38, PR #60) — la div conteneur de l'image (classe CSS `.tool-category-image`) doit être en `aspect-ratio: 1`** (carré strict), pour un rendu cohérent quel que soit le ratio natif du fichier source.

**✅ Livré (Bloc 38, PR #60) — 5 images de vignette référentiel déposées, à intégrer.** Dossier `public/referentials/`, générées par IA, validées par le joueur :
```
referential-expedition.webp
referential-fight.webp
referential-gems.webp
referential-levelup.webp
referentials-temples.webp   ← ⚠️ incohérence de nommage (pluriel "referentialS"),
                               à corriger en referential-temples.webp avant intégration
                               pour garder un mapping slug↔fichier cohérent
```
Remplacent les placeholders actuels des 5 tuiles de référentiel (accueil + page `/guides`). **Même traitement que les images de catégorie d'outils** : composant de repli si un fichier manque, `aspect-ratio: 1` sur ces images aussi (cohérence avec le point juste au-dessus).

**✅ Livré (Bloc 38, PR #60) — [Tous les outils et référentiels, admin] retirer les flèches d'incrément/décrément sur les champs de saisie numériques.** Les flèches natives du navigateur (`<input type="number">`) sur les champs numériques de l'admin ne sont pas utiles — retrait pur, saisie au clavier uniquement, sur l'ensemble des écrans d'édition (outils et référentiels).

**✅ Livré (Bloc 38, PR #60) — [Référentiel Équipements de Combat + Référentiel Équipement d'Expédition uniquement, admin] doubler la largeur des blocs de saisie numériques.** Augmenter la largeur des champs de saisie numériques (pas les colonnes déjà resserrées aux Blocs 35/37 — les champs de saisie eux-mêmes) à **environ 2× la largeur actuelle**, sur ces 2 écrans spécifiquement.

**✅ Livré (Bloc 40, PR #62) — [Référentiel Équipement d'Expédition uniquement, admin] 🐛 retour de test : scroll horizontal toujours présent sur 2 tableaux.** Malgré les correctifs précédents, le **tableau coût de fusion** et le **tableau Terradust au démantèlement** ont toujours du scroll horizontal. **Les tableaux doivent occuper toute la largeur disponible de l'écran, sans aucun scroll horizontal.**

**✅ Livré (Bloc 40, PR #62) — [Référentiels Équipements de Combat + Équipement d'Expédition, admin] doubler à nouveau la largeur des champs numériques de valeurs de stats/compétences.** Le doublement du Bloc 38 (ci-dessus) ne suffit pas encore pour ces champs précis (valeurs de stats et de compétences, distinctes des autres champs numériques déjà élargis) — **doubler une nouvelle fois leur largeur actuelle** sur les 2 écrans référentiels.

**✅ Livré (Bloc 38, PR #60) — [Accueil, public] espacement excessif entre la phrase d'introduction et la grille d'outils.** Classe CSS `.home-tools`, propriété `margin-top` à **diminuer de moitié**.

**✅ Livré (Bloc 38, PR #60) — [Accueil, public] retour à la ligne disgracieux sur la phrase d'intro Guides.** La phrase "Retrouve les guides de la communauté pour comprendre les mécaniques du jeu et progresser plus sereinement." se casse actuellement avec seulement le mot "sereinement" isolé sur la 2ᵉ ligne. Corriger — par un ajustement de largeur du conteneur, une reformulation plus courte, ou un point de césure choisi (`&nbsp;` entre les 2 derniers mots par exemple) — pour éviter cet effet de mot orphelin.

**✅ Décidé — repli visuel pour image manquante.** Les 300 fichiers arrivent progressivement (36 encore manquants au moment de l'écriture, cf. statut ci-dessous), pas tous d'un coup. **Le site ne doit jamais afficher une icône d'image cassée du navigateur** : composant de repli (placeholder visuel générique, ex. silhouette/icône neutre + éventuellement le nom du set en texte) tant que le fichier correspondant n'existe pas encore côté serveur, sur les équipements ET les gemmes (même principe, 60 fichiers, section 11). Bascule automatique vers l'image réelle dès qu'elle est déposée, sans redéploiement nécessaire au-delà de l'ajout du fichier.

### Équipements de Combat — 180 fichiers attendus (20 sets × 9 emplacements)

**✅ Complété (01/09/2026) — 180/180 reçus.** Les 36 fichiers manquants (Casque/Gantelets/Bottes, raretés Commun/Rare/Épique, 4 familles) ont été récupérés par le joueur, plus une repasse qualité sur l'ensemble des 180 fichiers Combat existants (meilleure résolution). **Fichiers vérifiés (extraction des 2 zips fournis) : nomenclature exactement conforme à la convention déjà verrouillée en section 12** (`{famille}-{rareté}-{emplacement}.webp`, incluant `gauntlets` au pluriel et `mythical` — déjà les termes documentés, pas un changement de convention). Idem côté Expédition : 120/120 fichiers reçus en repasse qualité (déjà complet avant, mais images de meilleure résolution désormais disponibles). **Remplacement complet des dossiers `public/equipment/combat/` et `public/equipment/expedition/` à effectuer** — voir Bloc à venir.

**⏳ Convention encore en français pour l'instant, bascule anglais prévue plus tard** (décision actée pour Expédition, voir section précédente) — **144 fichiers déjà déposés + toutes les références code** (variables, fonctions, tests) devront être renommés le jour venu. Tâche plus lourde qu'Expédition (rétrofit sur du code déjà en place, pas juste des fichiers statiques) — traitée comme un chantier séparé, pas urgent, pas dans le Bloc 10.

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

**🚨 Convention révisée en anglais** (retour joueur — bascule progressive de tout le projet vers les noms de fichiers en anglais, voir aussi la note équivalente pour Combat, encore en français pour l'instant, section suivante) :

| Segment | Français (abandonné) | Anglais (actuel) |
|---|---|---|
| Famille | `consommables` / `equipement` / `or` / `troupes` | `consumables` / `equipment` / `gold` / `troops` |
| Rareté | `commun` / `rare` / `epique` / `mythique` / `legendaire` | `common` / `rare` / `epic` / `mythic` / `legendary` |
| Emplacement | `boussole` / `cape` / `longue-vue` / `pioche` / `sacoche` / `torche` | `compass` / `cape` / `spyglass` / `pickaxe` / `pouch` / `torch` |

Les noms de fichiers ci-dessous sont déjà à jour avec la convention anglaise.

**Or**

- **Vanna** (Légendaire) : `gold-legendary-cape.webp`, `gold-legendary-spyglass.webp`, `gold-legendary-pouch.webp`, `gold-legendary-compass.webp`, `gold-legendary-torch.webp`, `gold-legendary-pickaxe.webp`
- **Safir** (Mythique) : `gold-mythic-cape.webp`, `gold-mythic-spyglass.webp`, `gold-mythic-pouch.webp`, `gold-mythic-compass.webp`, `gold-mythic-torch.webp`, `gold-mythic-pickaxe.webp`
- **Auric** (Épique) : `gold-epic-cape.webp`, `gold-epic-spyglass.webp`, `gold-epic-pouch.webp`, `gold-epic-compass.webp`, `gold-epic-torch.webp`, `gold-epic-pickaxe.webp`
- **Merchant** (Rare) : `gold-rare-cape.webp`, `gold-rare-spyglass.webp`, `gold-rare-pouch.webp`, `gold-rare-compass.webp`, `gold-rare-torch.webp`, `gold-rare-pickaxe.webp`
- **Prospector** (Commun) : `gold-common-cape.webp`, `gold-common-spyglass.webp`, `gold-common-pouch.webp`, `gold-common-compass.webp`, `gold-common-torch.webp`, `gold-common-pickaxe.webp`

**Équipement**

- **Fyra** (Légendaire) : `equipment-legendary-cape.webp`, `equipment-legendary-spyglass.webp`, `equipment-legendary-pouch.webp`, `equipment-legendary-compass.webp`, `equipment-legendary-torch.webp`, `equipment-legendary-pickaxe.webp`
- **Sundira** (Mythique) : `equipment-mythic-cape.webp`, `equipment-mythic-spyglass.webp`, `equipment-mythic-pouch.webp`, `equipment-mythic-compass.webp`, `equipment-mythic-torch.webp`, `equipment-mythic-pickaxe.webp`
- **Archaeologist** (Épique) : `equipment-epic-cape.webp`, `equipment-epic-spyglass.webp`, `equipment-epic-pouch.webp`, `equipment-epic-compass.webp`, `equipment-epic-torch.webp`, `equipment-epic-pickaxe.webp`
- **Hunter** (Rare) : `equipment-rare-cape.webp`, `equipment-rare-spyglass.webp`, `equipment-rare-pouch.webp`, `equipment-rare-compass.webp`, `equipment-rare-torch.webp`, `equipment-rare-pickaxe.webp`
- **Wanderer** (Commun) : `equipment-common-cape.webp`, `equipment-common-spyglass.webp`, `equipment-common-pouch.webp`, `equipment-common-compass.webp`, `equipment-common-torch.webp`, `equipment-common-pickaxe.webp`

**Consommables**

- **Zephyr** (Légendaire) : `consumables-legendary-cape.webp`, `consumables-legendary-spyglass.webp`, `consumables-legendary-pouch.webp`, `consumables-legendary-compass.webp`, `consumables-legendary-torch.webp`, `consumables-legendary-pickaxe.webp`
- **Loriel** (Mythique) : `consumables-mythic-cape.webp`, `consumables-mythic-spyglass.webp`, `consumables-mythic-pouch.webp`, `consumables-mythic-compass.webp`, `consumables-mythic-torch.webp`, `consumables-mythic-pickaxe.webp`
- **Apothecary** (Épique) : `consumables-epic-cape.webp`, `consumables-epic-spyglass.webp`, `consumables-epic-pouch.webp`, `consumables-epic-compass.webp`, `consumables-epic-torch.webp`, `consumables-epic-pickaxe.webp`
- **Seeker** (Rare) : `consumables-rare-cape.webp`, `consumables-rare-spyglass.webp`, `consumables-rare-pouch.webp`, `consumables-rare-compass.webp`, `consumables-rare-torch.webp`, `consumables-rare-pickaxe.webp`
- **Gatherer** (Commun) : `consumables-common-cape.webp`, `consumables-common-spyglass.webp`, `consumables-common-pouch.webp`, `consumables-common-compass.webp`, `consumables-common-torch.webp`, `consumables-common-pickaxe.webp`

**Troupes**

- **Fulgur** (Légendaire) : `troops-legendary-cape.webp`, `troops-legendary-spyglass.webp`, `troops-legendary-pouch.webp`, `troops-legendary-compass.webp`, `troops-legendary-torch.webp`, `troops-legendary-pickaxe.webp`
- **Connord** (Mythique) : `troops-mythic-cape.webp`, `troops-mythic-spyglass.webp`, `troops-mythic-pouch.webp`, `troops-mythic-compass.webp`, `troops-mythic-torch.webp`, `troops-mythic-pickaxe.webp`
- **Survivor** (Épique) : `troops-epic-cape.webp`, `troops-epic-spyglass.webp`, `troops-epic-pouch.webp`, `troops-epic-compass.webp`, `troops-epic-torch.webp`, `troops-epic-pickaxe.webp`
- **Explorer** (Rare) : `troops-rare-cape.webp`, `troops-rare-spyglass.webp`, `troops-rare-pouch.webp`, `troops-rare-compass.webp`, `troops-rare-torch.webp`, `troops-rare-pickaxe.webp`
- **Initiate** (Commun) : `troops-common-cape.webp`, `troops-common-spyglass.webp`, `troops-common-pouch.webp`, `troops-common-compass.webp`, `troops-common-torch.webp`, `troops-common-pickaxe.webp`

---

## 13. Comptes joueurs — V2, sans deadline

**🚨 Hors périmètre de développement actuel — V2, aucune date engagée.** Cette section documente une évolution future, pas une tâche à envoyer à Codex maintenant. À ne pas confondre avec les comptes **admin** (Super Admin/Admin/Gestion Guides/Gestion Outils/Lecture Seule, section 6 bis) — système entièrement séparé, base d'utilisateurs différente, flux d'authentification différent.

### Objectif

ML-Helper doit **continuer à fonctionner sans compte** — le compte joueur est une fonctionnalité de confort, jamais une obligation. Son rôle principal : **sauvegarder côté serveur et synchroniser entre appareils** les paramètres personnels actuellement stockés en localStorage (section 3.3).

**Données concernées par la synchronisation :**
- Statistiques du joueur ("Statistiques données par l'équipement")
- Points de compétence / configuration ("Distribution des points")
- Templiers
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
