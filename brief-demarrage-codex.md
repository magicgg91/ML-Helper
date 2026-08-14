# Brief de démarrage — ML-Helper (pour Codex)

Ce document est le point d'entrée pour démarrer le développement. Il résume le plan de travail phasé et le setup technique à mettre en place en tout premier. **Le détail complet des spécifications (formules, modèles de données, décisions produit) est dans `cahier-des-charges-ml-helper.md`, à consulter systématiquement avant d'implémenter chaque brique.**

Domaine cible : `ml-helper.com`.

---

## 0. Setup à faire avant tout développement fonctionnel

### Repo & branches
1. Créer le repo GitHub **privé**, aucune licence pour l'instant
2. Créer la branche `dev` (branche de travail active — tout le développement s'y passe)
3. Créer la branche `prod`, la **protéger** : PR obligatoire pour merger, même en solo (le garde-fou est la CI, pas la review humaine)
4. Ne jamais pousser directement sur `prod`

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
| PR vers `prod` (ouverture/mise à jour) | Suite de tests complète, obligatoire avant d'autoriser le merge |
| Merge vers `prod` | Build + push de l'image Docker taguée `:latest` sur ghcr.io |

Déploiement réel (pull + relance du conteneur sur le serveur) reste **manuel**, pas d'outil d'auto-déploiement à mettre en place.

### Dockerfile
Multi-stage : une étape dépendances + build, image finale minimale avec le build Next.js compilé en mode `standalone`, base `node:alpine`. Persistance via bind mount (`/app/data` ← dossier hôte), pas de volume Docker nommé.

---

## 1. Phase 1 — Fondations (avant tout calculateur public)

- Schéma Prisma complet : Guide, Calculateur, Formule (paramètres numériques nommés — **pas de champ formule libre éditable**, voir cahier des charges section 6), Table de référence (`lookup_table`), Utilisateur, Log, Contenu statique
- Auth admin (NextAuth, 4 rôles : Super Admin / Admin / Gestion Guides / Gestion Calculateurs — droits détaillés section 3.2 du cahier des charges)
- Back-office minimal : `/admin` (dashboard vide), `/admin/users` (CRUD, Super Admin uniquement), `/admin/logs` (lecture + purge manuelle par plage de dates)
- Système de logs (qui a fait quoi, quand, sur quoi — voir section 6 bis)

**Definition of done phase 1 :** un Super Admin peut se connecter, créer un compte Admin, et voir les logs de cette création. Rien de public encore.

---

## 2. Phase 2 — Site public + calculateurs déjà spécifiés

C'est la plus grosse phase. Tout ce qui suit est **déjà entièrement spécifié** dans le cahier des charges (section 7) — pas de zone d'ombre fonctionnelle, uniquement de l'implémentation.

### Pages publiques
`/`, `/tools`, `/tools/[slug]`, `/guides`, `/guides/[slug]` (contenu réel pas encore rédigé, structure suffit), `/contact`, `/legal`, `/login`

### Paramètres du joueur (localStorage, pas de compte joueur nécessaire)
- Niveau, ligue, VP
- **"Compétences avec équipement"** : 10 % éditables directement (stuff seul, sans les points — voir note ci-dessous)
- **"Distribution des points"** : outil de planification séparé, calcule le % à partir de points investis (base par ligue + taux par point, plafonds, prérequis avec auto-remplissage et blocage si budget insuffisant)
- Templiers personnels (5 types, 0-20 chacun)
- Bonus de Temple du Clan (5 champs, saisie directe, minimums = base du temple)
- Sélecteur d'unité (k/M/G/T/P) sur les grands champs numériques
- Stepper −/+ sur tous les champs nombre (pas les flèches natives du navigateur)

**⚠️ Point de modélisation à garder en tête :** "Compétences avec équipement" et "Distribution des points" sont volontairement **indépendants** — le premier est la valeur réellement utilisée par tous les calculateurs, le second est un outil de simulation qui n'écrit pas dans le premier automatiquement.

### Catégorie Villes
- **Coût de Ville** (City Cost) — formules villes section 7.1, ligue Légende confirmée
- **Niveau Max Atteignable** (City Max Level) — nécessite une recherche itérative, pas une formule directe (codé en dur, pas éditable en admin — voir section 7.1)
- **Production** (fusion de 3 anciens calculateurs) — production par ville, production totale détaillée (base/dont stuff/dont temple), récompenses (heures de production → bonus), et case "reskill full-prod"

### Catégorie Classement
- **Ranking** — convertisseur position ↔ pourcentage, seuils et récompenses par ligue (Légende/Diamant/Argent complets, Bronze/Or/Platine partiels — à compléter en admin une fois les données confirmées)

### Catégorie Compétences
- **Simulateur de Stuff** — 4 blocs (Attaque/Défense/Or/Vitesse), grille 3×3 par bloc, catalogues mixtes pour Or (Or+Troupes-Vitesse) et Défense (Défense+Or)
- **Comparaison de stuff** — 2 équipements côte à côte
- **Gemmes** — 3 modes (répartition égale / optimisation coût / budget disponible), formule et algorithmes entièrement spécifiés section 7.1
- **Templiers** — table de coût exacte (pas une formule), 5 types indépendants

### Catégorie Référentiels
- **Équipements de Combat** — tableau filtrable, formule de progression par étoile **100% confirmée** (additive, incrément par compétence — table complète en section 7.1), 30 lignes de valeurs encore vides à laisser éditables en admin
- **Équipement d'Expédition** — tableau filtrable, formule par étoile confirmée pour 2 stats sur 10 seulement (repli sur hypothèse non fiable pour les 8 autres, à garder visible comme tel dans l'UI)

**Definition of done phase 2 :** un visiteur peut utiliser tous les calculateurs ci-dessus sans compte, avec persistance de ses paramètres en localStorage, en EN et FR.

---

## 3. Phase 3 — Après stabilisation de la phase 2

Pas de zone d'ombre technique, juste du contenu/périmètre pas encore prêt côté produit :
- **Combat** (Level Up, Fight, Enemy Troops) — catégorie non spécifiée, à cadrer avec le porteur de projet avant de coder
- **Contenu des guides** — le modèle est prêt, aucun guide rédigé
- **Simulateur d'achat de consommables** — pas encore spécifié
- **ES/DE** — prévu dans l'architecture i18n mais pas prioritaire

---

## Rappels transverses à respecter partout

- **Jamais de formule libre éditable en admin** — uniquement des paramètres numériques nommés (décision actée, voir section 6 du cahier des charges)
- **Formatage des grands nombres** : compact par palier (k/M/G/T/P), seuils précis en section 3.3
- **Arrondi** : entier pour les quantités absolues (or, troupes, coûts), décimales conservées pour les pourcentages
- **Formules jamais exposées côté public** — uniquement les résultats, jamais `VP = 20 × 1.115^(n-1)` visible pour un joueur
- Toute donnée encore marquée "non confirmé"/"hypothèse" dans le cahier des charges doit rester **éditable en admin** avec sa valeur actuelle par défaut, pas bloquante pour livrer la fonctionnalité

---

## Bonnes pratiques, conventions de nommage et règles produit non négociables

**→ Voir `AGENTS.md` à la racine du repo** — lu automatiquement par Codex à chaque tâche, pas besoin de le rappeler ici. Le committer dès la création du repo, avant la première tâche de setup.
