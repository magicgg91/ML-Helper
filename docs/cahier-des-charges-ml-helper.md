# Cahier des charges — ML-Helper (site outils & guides Million Lords)

Statut : brouillon en cours de construction
Dernière mise à jour : 25/08/2026 (clôture Bloc 27 — voir section 3.2)

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

**✅ Décidé — palette de couleurs, commune aux deux univers** (retour joueur, l'accent doré jugé pas assez engageant) : **violet (couleur Mythique) comme accent principal de l'UI** (boutons, liens actifs, focus) — pas le doré, réservé exclusivement à la mise en avant des données de jeu réellement Légendaire (badges de rareté, éléments légendaires dans les référentiels/simulateurs). Cette séparation évite de diluer le signal "Légendaire" en l'utilisant aussi comme couleur d'interface générique. **Mode sombre** : fond bleu-nuit/anthracite, jamais noir pur ni teinte brune. **✅ Livré (Bloc 34, PR #55) — mode sombre légèrement éclairci** (2e retour dans ce sens, après un 1er retour testeur au Bloc 33 jugé alors insuffisant à lui seul pour trancher) : augmenter légèrement la luminosité du fond bleu-nuit/anthracite — ajustement léger, pas un changement de teinte ni un passage à un fond clair, juste un cran de luminosité en plus sur les mêmes couleurs déjà en place. **Mode clair** : fond légèrement teinté (pas de blanc pur), cohérent avec la même famille de couleur que le mode sombre plutôt que deux identités visuelles déconnectées. **Mêmes couleurs sur le site public et l'admin** — un seul système de design, pas deux.

**✅ Livré (Bloc 33, PR #54) — thème par défaut : détection automatique de la préférence système, plus de sombre forcé.** Suite à un retour testeur ("un peu trop sombre", jugé subjectif mais pas assez pour trancher sur un seul retour) : au lieu de démarrer systématiquement en mode sombre, détecter la préférence OS/navigateur de l'utilisateur (`prefers-color-scheme`) et l'appliquer par défaut à la première visite. Le bouton de bascule thème manuel (déjà en place) reste inchangé — l'utilisateur garde la main pour override ce choix automatique, mémorisé ensuite comme aujourd'hui.

### 3.1 Site public

**✅ Décidé — titre d'onglet du navigateur, site public** (nouveau, trouvé "Admin" dans le titre par erreur) : jamais "Admin" dans le titre d'onglet des pages publiques. **Accueil = "ML Helper"** seul, sans suffixe. **Pages listing = nom de la page visitée** (ex: "Guides", "Outils", "Contact") — pas de préfixe/suffixe répétitif type "ML Helper — Guides", juste le nom de la page.

**✅ Précisé — titre d'onglet des pages individuelles (retour joueur, après test)** :
- **Page d'un outil** (`/tools/[slug]`) : `"Outils — [Catégorie]"` — la **catégorie**, pas le nom du simulateur précis (ex: "Outils — Classement", "Outils — Villes" pour Coût de Ville/Niveau Max/Production, qui sont tous les trois en catégorie Villes).
- **Page d'un guide** (`/guides/[slug]`) : `"Guides — [Titre du guide]"` — le **titre précis** du guide cette fois, pas sa catégorie (ex: "Guides — Bien choisir et rejoindre un clan").

**✅ Décidé — barre de navigation publique à mettre en avant** (retour joueur post-Bloc 11) : jugée actuellement trop discrète, à traiter avec un style plus marqué (ex: boutons plutôt que simples liens texte — piste à explorer, pas une contrainte stricte). **Sélecteur de langue public aligné sur le pattern admin** : mêmes boutons FR/EN directement cliquables (composant `AdminLocaleToggle` du Bloc 11bis, à généraliser/dé-scoper de l'admin plutôt que dupliqué), pas de `<select>`/menu déroulant côté public non plus.

**✅ Décidé — état actif sur les boutons de navigation** (nouveau, retour joueur) : le bouton correspondant à la page actuellement affichée doit être visuellement mis en évidence (style distinct des autres liens), cohérent avec le traitement déjà appliqué à la nav admin.

**✅ Décidé — débordement mobile de la barre du haut** : liens de nav + thème + langue passent actuellement sur 2 lignes sur mobile. **Menu hamburger pour les liens de navigation uniquement** (Outils/Guides/etc.) — thème et langue restent visibles hors du hamburger, à côté de l'icône ☰ (déjà en icône-seule, pas de texte, donc peu de largeur prise). Raison de garder thème/langue hors menu : réglages consultés "à la volée", ajouter un clic de menu introduit une friction inutile pour un besoin instantané (ex: basculer le thème en plein soleil).

**Accueil**
- Présentation du site, mise en avant de calculateurs/guides populaires ou récents

**Outils**
- **🚨 Révisé — les Référentiels en sortent, réservé aux vrais calculateurs.** Regroupés par catégorie : **Villes** (inclut désormais Production, Récompenses), Combat, Classement, **Compétences** (Simulateur de Stuff, Comparaison de stuff, Gemmes, Templiers). "Outils" = formulaire de saisie → résultat calculé, exclusivement.
- Chaque simulateur : formulaire de saisie → résultat instantané, **sans titre ni texte d'explication** (décision révisée, voir "Sobriété du texte sur les pages de simulateurs" plus bas) — le nom déjà visible dans la navigation suffit
- Page liste filtrable par catégorie (une carte illustrée par catégorie, avec le nombre de simulateurs qu'elle contient, toute la carte cliquable). **✅ Grille mobile à 2 colonnes (retour joueur, après test)** : 2 catégories par ligne sur mobile, et à l'intérieur d'une catégorie ouverte, 2 outils par ligne également.

**Guides — 🚨 révisé, accueille désormais aussi les Référentiels**
- **Une seule entrée de menu "Guides"**, mais **2 sections distinctes à l'intérieur de la page** : "Guides" (contenu texte/narratif) et "Référentiels" (tables de données consultables — Équipements de Combat, Équipement d'Expédition, **Level Up** (catégorie Combat malgré son statut de référentiel — voir section 7.1), **Consommables**, **Coût des Templiers**). Chaque section garde ses propres cartes de catégorie, son propre système de filtrage — elles ne se mélangent pas, juste co-localisées sous la même entrée de navigation.
- **Section Guides** : liste filtrable par catégorie (Débuter & progresser, Combat & conquête, Défense & territoire, Compétences & builds, Équipement & Templiers, Expéditions, Événements & classement, Clan & stratégie collective — voir section 10), page individuelle (contenu riche, images).

**🚨 Décision révisée — recherche globale, pas limitée aux guides** (retour joueur post-Bloc 13) : la recherche initialement scopée à la section Guides devient une **recherche unique pour tout le site** — guides, référentiels ET outils/simulateurs, avec résultats routés vers le bon endroit selon le type de contenu trouvé. Remplace la recherche locale à la page Guides.

**✅ Ajustement — texte du placeholder de la recherche** : le mécanisme de traduction fonctionne déjà correctement (pas un bug next-intl), juste le texte affiché à changer — "Rechercher" en FR, "Search" en EN.

**✅ Décidé — refonte visuelle des cartes de la section Guides** (jugées trop plates, retour joueur) : image de couverture **pleine largeur en haut de carte** (plus à gauche), **badge de catégorie visible directement sur la carte** (pas seulement dans le filtre), **hover state** (élévation/ombre ou léger zoom de l'image), **filtres en pills/chips cliquables** plutôt qu'en liste ou menu déroulant. Référence visuelle : pattern "responsive card grid" classique (Tailwind), carte = image en haut → titre → résumé, espacement généreux. **Latitude large sur l'implémentation** — pas de contrainte à préserver la structure actuelle si une meilleure approche se présente. **Concerne uniquement la section Guides** — voir note ci-dessous pour les Référentiels.
- **Section Référentiels** : les tableaux filtrables déjà spécifiés (rareté/famille/emplacement/compétence), inchangés dans leur fonctionnement — seul leur emplacement dans la navigation change. **🚨 Précision (retour joueur post-Bloc 13) : pas de filtre par pills au niveau de la page Référentiels elle-même** — contrairement aux Guides, les référentiels n'ont pas de notion de "catégorie" à filtrer (ce sont des items individuels : Équipements de Combat, Équipement d'Expédition, Level Up), et leur nombre reste faible. Simple liste/grille de cartes, sans filtre de premier niveau — les filtres internes (rareté/famille/emplacement/compétence) à l'intérieur de chaque référentiel restent inchangés.
- **✅ Décidé — liens croisés obligatoires** : puisque les référentiels ne sont plus dans la même zone de navigation que les simulateurs qui les utilisent (ex: Simulateur de Stuff ↔ Référentiel Équipements de Combat), chaque simulateur concerné doit avoir un **lien direct** ("Voir le référentiel complet") vers la section/le référentiel pertinent, pour compenser la perte d'adjacence de navigation. Concerne au minimum : Simulateur de Stuff et Comparaison de stuff → Référentiel Équipements de Combat ; tout calculateur d'Expédition futur → Référentiel Équipement d'Expédition.

**✅ Livré (Bloc 39, PR #61) — [Référentiel Équipements de Combat + Référentiel Équipement d'Expédition uniquement, public] refonte complète : passage du tableau à un affichage en tuiles.** Motivation : les Blocs 35/37/38 ont dû corriger de façon répétée des problèmes de largeur de colonnes, scroll horizontal sur les filtres et troncature — symptômes révélateurs que le format tableau n'est pas adapté à ce contenu, surtout sur mobile. **Cette refonte annule et remplace les décisions de mise en forme tabulaire de ces 3 blocs pour ces 2 référentiels spécifiquement** (colonnes image/rareté, alternance de ligne, largeur de colonnes, etc. — obsolètes une fois passé en tuiles ; les décisions équivalentes pour Level Up, Templiers, Gemmes restent inchangées, elles gardent leur format tableau). **Notes de livraison :** le nombre de gemmes par tuile est lu depuis `gemSlotsBase` (admin-editable), pas le champ statique `row.gem_slots` — cohérent avec le tableau récapitulatif du référentiel. Accessibilité : `aria-label` complet par tuile (famille + rareté + set + emplacement) et indice pour lecteur d'écran sur les blocs estompés, sans badge visible — le codage couleur-seule (rareté/famille) est le choix de design assumé de ce bloc, pas un oubli d'accessibilité à corriger visuellement.

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
- `/` — Accueil — **✅ Livré (Bloc 33, PR #54) — refonte suite à un retour testeur.** L'accueil actuelle ne servait à personne en particulier : ni vitrine/pitch construite intentionnellement, ni accès direct aux outils. **Nouvelle structure décidée** : catégories d'outils affichées directement sur l'accueil (accès en 1 clic à un outil précis, pas de détour par `/tools`), **petite section Guides/Référentiels en dessous**. Les pages dédiées `/tools` et `/guides` restent inchangées et toujours accessibles (navigation principale) — l'accueil devient un point d'entrée plus direct, pas un remplacement de ces pages. **✅ Livré (Bloc 34, PR #55) — contenu précis de la section Guides/Référentiels :** **les 3 guides les plus récents** (tri par date de publication, cohérent avec le tri déjà utilisé sur `/guides`) — pas une sélection éditoriale manuelle — **ainsi que les référentiels** (les 4 réellement construits à ce jour : Équipements de Combat, Équipement d'Expédition, Level Up, Coût des Templiers — Consommables une fois ses données collectées). Même logique d'accès direct qu'avec les outils : un clic depuis l'accueil, pas de détour par `/guides`. **✅ Précision discutée en amont du Bloc 36 (référentiel Gemmes, qui portera ce total à 5) : grille qui s'agrandit naturellement, pas de carrousel.** Réutiliser le même composant grille que celui déjà en place pour les catégories d'outils — cohérent avec l'objectif de rapidité qui a motivé toute la refonte de l'accueil (un carrousel réintroduirait une interaction superflue pour voir un référentiel). Scale naturellement avec le temps (5, 6, 7 référentiels à venir) sans retouche nécessaire. **✅ Livré (Bloc 38, PR #60) — précision : grille à 4 colonnes maximum par ligne**, pas un nombre de colonnes variable selon le nombre total de référentiels — avec 5 référentiels (dont Gemmes), ça donne 4 sur la 1ère ligne et 1 sur la 2ᵉ, pas 5 sur une seule ligne compressée. **✅ Livré (Bloc 34, PR #55) — le bloc hero (image défilante/carrousel + accroche "Prépare ta prochaine progression.") reste trop imposant, en contradiction avec l'objectif de rapidité qui a motivé toute la refonte.** Remplacé par **une phrase d'introduction courte** au-dessus de la grille de catégories, sans carrousel/image défilante — juste de quoi dire en une phrase ce que le site propose. Grille de catégories d'outils toujours le contenu principal, visible sans avoir à scroller. **✅ Titre et phrase réels (jamais consignés précisément jusqu'ici) : titre "Décide avec les bons chiffres", phrase d'intro "Explore les coûts, la production, le classement, les compétences et les équipements grâce à des outils conçus pour préparer chaque décision."** — ce couple titre/phrase est désormais aussi réutilisé sur `/tools` (voir décision juste au-dessus).
- `/tools` — Liste des outils *(nommé "Outils" côté public — **🚨 réservé aux vrais simulateurs, plus les référentiels**, voir décision de nommage révisée section 3.1)* — **✅ Livré (Bloc 33, PR #54) — 3 corrections de libellés/mise en page (retour testeur) :** (1) chaque tuile de catégorie affiche titre + nombre d'outils, le texte "Ouvrir la catégorie" est retiré (toute la tuile est déjà cliquable, ce texte est redondant) ; (2) le titre "Outils" en tête de page est retiré ; (3) le sous-titre "Choisis ton domaine" est remplacé par **"Choisis ton outil"**, sur **une seule ligne** (actuellement passe sur 2 lignes selon la largeur d'écran — à corriger, que ce soit par la taille de police ou la largeur du conteneur). **✅ Livré (Bloc 38, PR #60) — unifier le titre et la phrase d'intro avec l'accueil :** "Choisis ton outil" → **"Décide avec les bons chiffres"** (même titre que l'accueil) ; ajouter la même phrase d'introduction que l'accueil sur cette page : **"Explore les coûts, la production, le classement, les compétences et les équipements grâce à des outils conçus pour préparer chaque décision."**
- `/tools/[slug]` — Page d'un simulateur
- `/guides` — **🚨 Révisé — 2 sections distinctes sur la même page** : Guides (contenu texte, filtrable par catégorie) et Référentiels (tables de données, filtrables par rareté/famille/emplacement/compétence) — **recherche incluse dès la V1** (pour la section Guides)
- `/guides/[slug]` — Page d'un guide
- `/guides/referentiels/[slug]` — Page d'un référentiel — **✅ convention confirmée par l'implémentation (Bloc 0, PR #8)** : `/guides/referentiels/combat-equipment`, `/guides/referentiels/expedition-equipment`, `/guides/referentiels/level-up`, `/guides/referentiels/consommables`, `/guides/referentiels/templiers`, `/guides/referentiels/gemmes` — même pattern de slug kebab-case (majoritairement anglais, français pour Consommables/Templiers/Gemmes). **✅ Corrigé (Bloc 38, PR #60) — titres de page tronqués, cause réelle identifiée.** Vraie cause trouvée en investiguant le point R (bandeau de bascule) ci-dessus : une règle CSS générique `.public-main > h1` écrasait par spécificité la taille de police propre aux classes de titre de page, sur `/tools` ET tous les référentiels — pas juste un problème de largeur de bloc comme supposé initialement. Corrigée à la racine.

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
- `/admin/guides` — **🚨 Révisé (suite à la restructuration de navigation, voir section 3.1/3.2) — tableau unique fusionné "Guides"** listant guides ET référentiels (colonne Type : Guide / Référentiel), CRUD complet pour les guides (créer/éditer/activer-désactiver/supprimer), édition des valeurs uniquement pour les référentiels (pas de création/suppression de table)
- `/admin/guides/new` / `/admin/guides/[id]` — Édition d'un guide (Titre + Résumé + éditeur markdown `@uiw/react-md-editor` avec aperçu en direct, pas de WYSIWYG par blocs) ou d'un référentiel (dropdowns rareté/famille/emplacement/compétence, valeur en saisie libre — voir section 3.2)
- `/admin/tools` — **🚨 Révisé — ne liste plus que les simulateurs** (Villes/Combat/Classement/Compétences), les référentiels n'y sont plus (voir ci-dessus) — voir "Gestion des outils" ci-dessus
- `/admin/tools/[id]` — Édition détaillée d'un simulateur (bouton retour vers la liste)
- `/admin/users` — Gestion des utilisateurs admin (créer/modifier/supprimer des comptes, **activer/désactiver un compte sans le supprimer**, assigner un rôle, changer le mot de passe de n'importe quel utilisateur) — **réservé au rôle Super Admin**
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

**🚨 Décidé, pas encore livré (Bloc 31) — chevauchement de rang entre deux plages adjacentes (bug résiduel après le Bloc 28) :** chaque plage (ex: "1-6%", "6-25%") calcule encore sa borne de départ ET sa borne de fin indépendamment depuis son propre seuil de pourcentage brut, ce qui peut faire apparaître le même rang dans deux plages adjacentes (ex: le 10e joueur en fin de "1-6%" ET en début de "6-25%"). Correction actée : seule la **borne de fin** de chaque plage se calcule depuis son pourcentage ; la **borne de départ** de chaque plage (sauf la première, qui démarre toujours à la place 1) = **borne de fin de la plage précédente + 1**, jamais recalculée indépendamment. Si "1-6%" couvre les places 1 à 10, "6-25%" démarre obligatoirement à la place 11.

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

**🚨 Reclassé (retour joueur) — ce n'est pas un outil de calcul, c'est un référentiel** (comme Level Up), pas une "simulation d'achat" avec panier comme envisagé initialement. Rejoint `/guides/referentiels/consommables`, section Référentiels de `/guides` — **jamais dans `/tools`**, même traitement que Level Up (cdc section 3.1, décision équivalente).

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

**🚨 Décidé, pas encore livré (Bloc 31) — nouvelle passe de renommage + suppression :**
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

**✅ Décidé — cette table devient le référentiel "Coût des Templiers"** (retour joueur), `/guides/referentiels/templiers`, section Référentiels de `/guides` — cohérent avec les 3 référentiels **réellement construits** à ce jour (Équipements de Combat, Équipement d'Expédition, Level Up). **Consommables n'est pas encore construit** (reclassé en référentiel dans le cdc, mais la donnée — liste des objets — n'est pas encore collectée, donc pas encore envoyé comme tâche Codex) — Templiers sera donc le 4ᵉ référentiel réellement en place, pas le 5ᵉ. **Liens croisés réciproques** entre le calculateur (`/tools`, catégorie Compétences) et ce référentiel : le calculateur Templiers pointe vers "Voir la table complète" (référentiel), et le référentiel pointe vers "Utiliser le simulateur" (calculateur) — même principe que le lien déjà en place entre Simulateur de Stuff et le référentiel Équipements de Combat (Bloc 0).

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

**Données complètes (180 lignes : 5 raretés × 4 familles × 9 emplacements) sauvegardées dans `reference-data-equipment-sets.csv`** plutôt que reproduites intégralement ici — colonnes : rareté, nom du set, famille, pouciel à la destruction, emplacements gemmes autorisés, type d'emplacement (Arme/Bouclier/.../Bottes), nom de l'objet (rempli seulement pour les armes, ex: "Marteau"), et jusqu'à 4 compétences avec leur % associé. **10 sets (30 lignes) ont leurs valeurs encore explicitement vides** (`skill_1: "Inconnu"`) — voir tableau plus bas, pas de données inventées.

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

**🚨 Décidé, pas encore livré (Bloc 31) — 3 évolutions de compacité/disposition (partiellement obsolètes, voir Bloc 32 ci-dessous) :**
- ~~Colonne récapitulatif (compétences + %) réduite à ~50% de sa largeur actuelle~~ → **obsolète, la restructuration Bloc 32 change la disposition en profondeur, voir plus bas.**
- **Boutons de filtre du bloc/famille : compacts, sur une seule ligne (jamais de retour à la ligne), colorés selon la couleur déjà associée à la famille/compétence concernée** — toujours valable, s'applique maintenant aux nouveaux boutons de filtre de famille du Bloc 32 (voir plus bas) — même exigence sur les boutons de filtre des référentiels Équipements de Combat/Expédition et de Gemmes (cohérence visuelle transverse). **✅ Livré (Bloc 34, PR #55) — précision mobile : "une seule ligne" ne s'applique qu'au desktop.** Sur mobile, la ligne unique déborde et génère un **scroll horizontal indésirable** sur les écrans Équipement de Combat et Équipement d'Expédition. Corriger pour que les boutons de famille **passent sur 2 lignes sur mobile**, sans jamais déclencher de scroll horizontal.
- ~~Bouton de transfert de compétences (Bloc 28, point 5) déplacé sur la ligne de titre~~ — **annulé, voir décision plus récente ci-dessous** (rejoint la nouvelle ligne de boutons de famille à la place).

**✅ Livré (Bloc 32, PR #53) — retour à la disposition de case d'origine :** nom de l'emplacement, puis image, puis niveau d'étoile de l'équipement, puis les gemmes en dessous, sur une seule ligne sans retour à la ligne même à 3 gemmes. Pas de colonnes internes.

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

**🚨 Décidé, pas encore livré (Bloc 31) — 6 évolutions du récapitulatif et du sélecteur :**
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

**✅ Emplacement confirmé (mis à jour) : catégorie "Référentiels"**, distincte de "Compétences" — les Référentiels regroupent les données consultables (Équipements de Combat, Équipement d'Expédition, **Level Up**, **Consommables**, **Coût des Templiers**), séparées des vrais outils de calcul (Équipement de Combat, Équipement d'Expédition, Gemmes, Templiers — ~~Comparateur d'Équipement de Combat, supprimé au Bloc 31~~) qui restent dans Compétences. Cette séparation a été actée après coup : au départ tout était mélangé dans une seule catégorie Compétences, le joueur a demandé à distinguer "outils de calcul" de "données de référence consultables". **Level Up est un cas particulier : sa catégorie thématique est Combat (pas Compétences), mais il reste un référentiel dans sa nature (table consultable, pas de calcul avec input/output) — donc il vit dans la section Référentiels de `/guides`, jamais dans `/tools`, malgré son étiquette de catégorie Combat.**

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

**✅ Livré (Bloc 36, PR #58) — Référentiel "Gemmes"** (`/guides/referentiels/gemmes` — slug français, cohérent avec Consommables/Templiers déjà en français dans ce pattern, pas d'incohérence malgré le `gems` anticipé dans le prompt initial ; section Référentiels de `/guides`, 5ᵉ référentiel réellement construit après Combat/Expédition/Level Up/Templiers) : **1 tableau, 1 colonne par ligue (6 colonnes : Bronze, Argent, Or, Platine, Diamant, Légende), 11 lignes.**
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
5. **🐛 Ne pas simplifier le coût en unité compacte (k/M...) pour ce référentiel précis** — afficher la valeur brute complète (ex: "3000", pas "3K"). Exception au formatage compact habituel des grands nombres (cdc section 3.3) — les valeurs ici restent à 4 chiffres maximum, la compaction n'apporte rien et nuit à la lisibilité d'un prix exact.
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

1. **Équipement d'Expédition** — ✅ 10 stats sur 10 confirmées à la ligue Légendaire (incréments par étoile). Reste : généraliser aux 4 autres raretés (hypothèse par défaut = même incrément, à corriger en admin si écart constaté), coût de fusion en Terradust confirmé pour Mythique/Légendaire seulement (Épique/Rare/Commun en hypothèse). **Nouveau calculateur décidé : Simulateur d'Équipement d'Expédition** (grille 2×3, sans gemmes) — voir détail dans la sous-section Expédition ci-dessus.
2. **Équipements de combat** — reste uniquement les 30 lignes de valeurs de compétences manquantes (10 sets Commun/Rare/Épique) ; tout le reste (formule par étoile, mécanisme de pièces, coût de fusion) est verrouillé
2 bis. ~~**Nouveaux simulateurs "Taux de gain d'XP" et "Troupes max en attaque démo"**~~ → **✅ Les deux sont désormais entièrement résolus** (formules confirmées, voir section 7.1). Prêts à être spécifiés comme tâches Codex.
3. **Combat** — Fight, Enemy Troops toujours non spécifiés. **3 éléments Combat désormais spécifiés/prototypés** : Taux de gain d'XP, Troupes max en attaque démo (simulateurs), et **Level Up** (référentiel — formule troupes ✅ verrouillée pour Légende `32,2 × 1,245^n`, cycle de coffres ✅ confirmé, contenu des coffres couvert par le guide plutôt que la donnée structurée, reste : les 5 autres ligues, formule XP requis par niveau). Voir section 7.1.

3 bis. **⏳ Nouveau chantier en réserve — "Estimation des troupes ennemies" (catégorie Combat)** : idée du joueur, pas encore cadrée, données en cours de vérification.
   - **Principe visé** : à partir de la VP totale d'un ennemi, de son nombre de villes et du niveau moyen de ses villes, déduire la VP apportée par les villes (formule `VP(n) = 20 × 1,115^(n−1)` déjà verrouillée, section 7.1 Villes), soustraire du total pour isoler la VP apportée par les troupes, puis convertir cette VP restante en nombre de troupes via un ratio troupes↔VP à déterminer.
   - **Hypothèse de ratio en cours de calibrage** — 3 points de données désormais rassemblés :
     1. 1 ville niveau 80 (VP≈108 860), troupes totales 114 400 000, VP totale du compte 329 000 → ratio observé ≈ **0,001924 VP/troupe**
     2. Niveau 50, 1 ville niveau 80 (VP≈108 598), troupes totales 143 300 000 (82,2M + 61,1M au récolteur, confirmé additif), VP totale du compte **389 000 (confirmé par le joueur)** → ratio observé ≈ **0,001957 VP/troupe**
     3. Niveau 40, 17 villes (1×niv53, 1×niv80, 7×niv70, 1×niv63, 7×niv60 → VP villes cumulée ≈ 473 473 via la formule verrouillée), troupes totales 6 530 000, VP totale du compte 486 000 → ratio observé ≈ **0,001918 VP/troupe**
   - **Convergence forte entre les 3 points, tous confirmés désormais** (écart max ≈ 2%, moyenne ≈ 0,00193 VP/troupe, soit ≈ 518 troupes/VP) — nettement plus solide qu'avec un seul point, mais **pas encore verrouillé comme formule définitive**. Règle du projet : ne jamais conclure une formule sur un échantillon aussi restreint (précédent Or vs Bronze/Diamant/Légende).
   - **En attente d'exemples supplémentaires**, idéalement à des échelles encore différentes, avant de considérer cadrer ce calculateur comme tâche Codex.
   - Ne pas envoyer de prompt d'implémentation tant que le ratio n'est pas confirmé sur plusieurs points cohérents entre eux.

4. **Référentiel Consommables** — reclassé (n'est plus un simulateur), structure connue (photo/nom/description/coût en saphirs), liste des objets à collecter
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

**🟡 Statut (fourni par le joueur, vérifié) : 144/180 reçus.** Manquants (36, motif systématique) : **Casque, Gantelet et Bottes pour les raretés Commun/Rare/Épique, sur les 4 familles** — Mythique et Légendaire sont complets sur les 9 emplacements. **✅ Confirmé en jeu par le joueur : ces 3 emplacements existent bien à toutes les raretés** (ex. bottes du Chasseur [Hunter, Rare], casque de l'Aventurier [Adventurer, Rare], gantelets du Barde [Bard, Commun], gantelets du Compagnon [Journeyman, Commun]) — ce n'est **pas** une restriction de jeu (contrairement à l'hypothèse initiale), uniquement des captures manquantes côté collecte. Reste à récupérer avant d'intégrer les images au site (Bloc 10) ; pas bloquant pour lancer Bloc 10 sur les 144 déjà disponibles + les 120 Expédition complets.

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
