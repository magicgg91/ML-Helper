# AGENTS.md — ML-Helper

Instructions permanentes pour tout agent (Codex ou autre) travaillant sur ce repo. Lu automatiquement à chaque tâche — pas besoin de les rappeler dans chaque prompt.

**Contexte :** ML-Helper est un site communautaire d'outils (simulateurs) et de guides pour le jeu mobile *Million Lords*. Stack : Next.js/TypeScript, Prisma + SQLite, NextAuth, next-intl (EN/FR). Le détail fonctionnel complet est dans `docs/cahier-des-charges-ml-helper.md` — à consulter avant d'implémenter toute fonctionnalité qui n'est pas déjà en cours.

**Le code produit ici est relu par une autre IA après chaque livraison**, indépendamment de l'agent qui l'a écrit. Il doit donc être compréhensible par un tiers sans connaître l'historique des échanges qui ont produit les specs — pas seulement fonctionnel.

---

## Référence UI/logique — le prototype fait foi

Un **prototype HTML/JS autonome** (`docs/prototype-ml-helper-unifie.html`) implémente déjà l'intégralité des calculateurs de la Phase 2, avec toute la logique, les formules, les restrictions et les comportements d'UI validés au fil de nombreuses itérations avec le porteur de projet.

**Consigne pour tout agent travaillant sur la Phase 2 : porter la logique du prototype, pas la redéduire à partir du seul texte du cahier des charges.** Le prototype est plus précis et plus à jour que le texte sur de nombreux détails fins (ex: les listes blanches de compétences par bloc/famille d'équipement, la formule additive de progression par étoile, le système de distribution de points avec prérequis, l'algorithme d'optimisation des gemmes). En cas de divergence entre le texte du cahier des charges et le comportement réel du prototype, **le prototype prime** — c'est le dernier état validé par le porteur de projet.

Ce que ça veut dire concrètement :
- Reprendre les noms de variables/constantes/fonctions du prototype comme base (déjà en anglais pour la plupart, cohérent avec les conventions de nommage ci-dessous)
- Porter les structures de données telles quelles (ex: `SKILL_ALLOWLIST_BY_BLOCK`, `EQUIP_STAR_INCREMENT`, `GEM_VALUES_FR`, `STUFF_BLOCK_DEFS`) en les adaptant au schéma Prisma / `formula_params` plutôt que de les recréer de zéro
- Reproduire le comportement d'UI (mise en page, interactions, messages d'erreur, styles) sauf si le cahier des charges précise explicitement une évolution prévue non encore intégrée au prototype (ex: Combat, guides — absents du prototype, à construire à partir du texte uniquement)
- Le prototype n'a pas de tests — les tests réels sont à écrire pour la vraie implémentation, mais leurs cas doivent couvrir le comportement déjà observable dans le prototype

---

## Convention de nommage — cohérence stricte, sans exception

- **Code (variables, fonctions, champs DB, clés techniques) toujours en anglais**, même quand le libellé public est en français. Exemple déjà établi : le simulateur affiché "Coût de Ville" a pour clé technique `city-cost`.
- **Terme englobant public et admin : "Outils"** (pas "Simulateurs", pas "Calculateurs"). "Simulateur" et "Référentiel" restent les termes justes au niveau d'un item individuel, mais la catégorie/section qui les regroupe tous les deux s'appelle "Outils" partout où elle apparaît (navigation publique, page admin `/admin/tools`, rôle "Gestion Outils"). "Calculateur" ne doit apparaître nulle part côté utilisateur, uniquement dans la documentation technique interne.
- **Tout texte visible par l'utilisateur passe par next-intl**, jamais codé en dur dans une langue — y compris erreurs, placeholders, tooltips. **Aucun traitement spécial pour l'admin** : les labels internes admin (ex: nom d'une formule) suivent exactement le même mécanisme que le texte public — un seul système de fichiers de traduction statiques pour tout le texte fixe, pas de cas particulier. Seul le contenu éditorial dynamique (guides, mentions légales) reste en JSON par locale en base. **Repli sur l'anglais si une traduction manque**, jamais un vide ou une erreur.
- Une seule casse par contexte, appliquée partout sans exception :
  - `camelCase` — variables et fonctions TypeScript
  - `PascalCase` — composants React
  - `kebab-case` — routes et noms de fichiers
  - `snake_case` — colonnes Prisma (si c'est la convention retenue au démarrage du schéma — une fois choisie, ne pas dévier)
- Les clés techniques déjà établies dans le cahier des charges sont **réutilisées telles quelles**, jamais réinventées : compétences (`prosperous`, `recruiter`, `striker`, `guardian`, `scavenger`, `salvager`, `rusher`, `fearless`, `brave`, `cautious`), ligues (`bronze`, `silver`, `gold`, `platinum`, `diamond`, `legend`), familles d'équipement (`Or`, `Troupes/Vitesse`, `Défense`, `Attaque`).

## Qualité de code

- TypeScript strict, pas de `any` sans justification commentée
- ESLint + Prettier respectés à chaque commit
- Pas de valeur magique codée en dur dans la logique métier : tout paramètre de jeu passe par `formula_params`/`lookup_table` (voir modèle de données, section 6 du cahier des charges) ; tout paramètre technique (timeouts, pagination...) est une constante nommée
- Gestion d'erreur explicite — jamais de `catch` vide ni d'échec silencieux, en particulier autour de Prisma/SQLite et NextAuth
- Pas de `console.log` oublié dans le code livré
- Secrets et config sensible via variables d'environnement, jamais en dur ni commit dans le repo
- Commits atomiques, message clair sur le quoi/pourquoi — pas de gros commit fourre-tout

## Structure et review

- Structure de dossiers prévisible, une seule logique appliquée partout (par feature ou par type de fichier — choisie une fois, jamais mélangée)
- `README.md` tenu à jour : lancer le projet en local, lancer les tests, builder l'image Docker
- Factoriser la logique partagée entre calculateurs plutôt que dupliquer (ex: la mécanique de fusion par étoiles est commune aux gemmes et aux équipements)

## Règles produit non négociables

- **Jamais de formule libre éditable en admin** — uniquement des paramètres numériques nommés, quelle que soit la complexité du calculateur
- **Formules jamais exposées côté public** — seuls les résultats sont visibles, jamais l'expression du calcul
- Formatage des grands nombres : compact par palier k/M/G/T/P (seuils exacts en section 3.3 du cahier des charges)
- Arrondi entier pour les quantités absolues (or, troupes, coûts) ; décimales conservées pour les pourcentages
- Toute donnée encore marquée "non confirmé"/"hypothèse" dans le cahier des charges reste éditable en admin avec sa valeur actuelle par défaut — ne bloque pas la livraison de la fonctionnalité

## Git

- Travail exclusivement sur la branche `dev`
- Ne jamais pousser directement sur `main` — PR obligatoire, avec suite de tests complète comme garde-fou avant merge
- Tests écrits en même temps que le code, jamais ajoutés après coup : Vitest (unitaires), React Testing Library (composants), Playwright (e2e)
