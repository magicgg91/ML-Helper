# Brief de démarrage — ML-Helper (pour Codex)

Ce document est le point d'entrée pour démarrer le développement. Il résume le plan de travail phasé et le setup technique à mettre en place en tout premier. **Le détail complet des spécifications (formules, modèles de données, décisions produit) est dans `docs/cahier-des-charges-ml-helper.md`, à consulter systématiquement avant d'implémenter chaque brique.**

Domaine cible : `ml-helper.com`.

**📍 État d'avancement (à mettre à jour au fil des tâches) :** Phase 0 (setup) ✅ validée et poussée. Phase 1 (fondations : schéma Prisma, auth, back-office minimal) ✅ validée et mergée. **Phase 2 (site public + tous les simulateurs déjà spécifiés) ✅ entièrement validée et mergée** — Villes, Classement, Compétences (Gemmes/Templiers/Simulateur de Stuff/Comparateur), Référentiels sont tous fonctionnels **(⚠️ mais leur emplacement dans la navigation a changé depuis — voir "Restructuration navigation" en tête de la liste unifiée, section 4)**. **Blocs 0 à 85 (Bloc 10 inclus) de la Liste unifiée (section 4) tous ✅ terminés et mergés sur dev.** L'audit de conformité du 29/08/2026 (bug Platine, Pouciel Combat, Level Up Argent, etc.) est résolu via le Bloc 42. **7 référentiels réels désormais construits** : Équipements de Combat, Équipement d'Expédition, Progression (ex-Level Up, renommé Bloc 67), Templiers (renommé et enrichi d'une présentation en tuiles au Bloc 66), Gemmes, Boutique (ex-Consommables/Bloc 43, enrichi Bloc 46, restructuré et renommé Bloc 48, intro simplifiée en tableau structuré Bloc 58), et **Événement (Bloc 60, construit vide/inactif — le joueur remplira progressivement)**. Site opérationnel en 5 langues (EN/FR/DE/ES/TR), sélecteur de ligue généralisé en boutons sur la plupart des outils/référentiels (Bloc 61/68 — exception assumée : sélecteurs liés aux Gemmes restent en select box), rendu mobile largement retravaillé (Bloc 68). **Images d'équipement Combat/Expédition désormais complètes (180/180 + 120/120, Bloc 82)** — plus aucune image manquante. **Bloc 63 (revue mobile tableaux) en attente de la liste précise des pages avant envoi.** **Il ne reste plus qu'1 seul chantier réellement jamais cadré : Combat (Fight/Enemy Troops)** — le contenu des guides restants est un travail éditorial continu, pas un chantier de cadrage au même sens. **📌 Note de workflow (01/09/2026) : le porteur de projet utilise désormais principalement Claude Code plutôt que Codex** pour l'implémentation — les prompts continuent d'être rédigés de la même façon, terme générique à privilégier dans les échanges futurs.

---


**📦 Archive** : les sections Setup/Phase 0-2 et le détail des Blocs 0 à 59 (tous terminés) ont été déplacés dans `docs/brief-archive-blocs-0-59.md`, pour alléger ce document — l'état d'avancement ci-dessus reste à jour, ce fichier ne contient plus que le travail en cours et les blocs récents (60+).

---

## 3. Phase 3 — Après stabilisation de la phase 2

**⚠️ Ne pas confondre "Phase" (ce document) et "V1/V2" (cahier des charges).** Les "Phases" ici décrivent l'ordre de développement avec Codex sur le périmètre déjà cadré. "V1/V2" (cahier des charges, section 1.1) décrit des versions produit — la V1 correspond à tout ce qui est actuellement en développement (Phases 0-3 ici), la **V2 (comptes joueurs, sans deadline) n'a pas encore de Phase associée**, elle n'entre pas dans le scope Codex actuel.

**📋 Le détail complet du backlog restant (UI/UX, admin, technique) est en section 4 "Liste unifiée"**, organisée par ordre d'implémentation recommandé — pas dupliqué ici.

Pas de zone d'ombre technique, juste du contenu/périmètre pas encore prêt côté produit — **liste à jour dans la section "Gros chantiers en attente de cadrage" en fin de ce document**, pas dupliquée ici pour éviter toute désynchronisation entre les deux.

---

## Rappels transverses à respecter partout

- **Jamais de formule libre éditable en admin** — uniquement des paramètres numériques nommés (décision actée, voir section 6 du cahier des charges)
- **Formatage des grands nombres** : compact par palier (k/M/G/T/P), seuils précis en section 3.3
- **Arrondi** : entier pour les quantités absolues (or, troupes, coûts), décimales conservées pour les pourcentages
- **Formules jamais exposées côté public** — uniquement les résultats, jamais `VP = 20 × 1.115^(n-1)` visible pour un joueur
- Toute donnée encore marquée "non confirmé"/"hypothèse" dans le cahier des charges doit rester **éditable en admin** avec sa valeur actuelle par défaut, pas bloquante pour livrer la fonctionnalité
- **✅ Formule additive par étoile — RÉSOLU** : le helper partagé `valueAtStar(base, increment, star)` est bien extrait de `equipmentValueAtStar()` et réutilisé par Combat et Expédition (voir cahier des charges section 7.1) — plus une zone d'ombre, gardé ici comme rappel de convention de factorisation (AGENTS.md) pour toute future mécanique similaire à partager entre 2+ calculateurs.
- **✅ Règle de rythme (01/09/2026) — ne pas créer de nouveau bloc de mon initiative.** Un nouveau bloc ne se crée que sur demande explicite du porteur de projet, ou tant que le bloc précédent n'est pas au moins envoyé à Codex/Claude Code (en cours ou mergé) — pas de blocs qui s'accumulent en préparation sans être envoyés.

---

## 4. 📋 Liste unifiée — toutes les actions restantes, dans l'ordre d'implémentation recommandé

*Consolidée à partir du backlog UI/UX et du suivi d'implémentation du cahier des charges. **Réorganisée par ordre de dépendance** (fondations avant ce qui en dépend) plutôt que par simple priorité visuelle — voir logique de tri en préambule de chaque bloc. Les numéros entre parenthèses `(point X)` renvoient à la numérotation d'origine, utilisée ailleurs dans ce document et dans le cahier des charges. Mise à jour au fil de l'eau, cocher/rayer au fur et à mesure.*

### Bloc 60 — 7ᵉ référentiel : "Événement" (quêtes personnelles par ligue) ✅ **Terminé** (PR #81, 834 tests)
*Note de livraison : validation locale complète documentée (tsc/eslint clean, Playwright réel). **2 correctifs de review Codex traités avant merge** : localisation FR/EN des paliers, et masquage des référentiels inactifs de la découverte publique (recherche/sitemap) — pas seulement de la nav.*
*Nouveau. Indépendant du reste. Structure discutée en détail, exemple concret fourni (Légende/Recruteur, 7 paliers). Construit vide, toggle inactif par défaut — le joueur remplira progressivement.*

- Structure à 3 niveaux : Ligue (sélecteur synchronisé Paramètres joueur) → liste d'Events **entièrement indépendante par ligue** (ordre + durée compris) → chaque event a un nom, un jour de début/fin, et un bloc repliable listant ses Paliers (nombre variable par event) → chaque palier = 2 champs texte libre (Objectif, Récompense), même principe que les récompenses de palier du référentiel Classement.
- Admin : sélecteur de ligue, puis CRUD complet sur les events (ajout/suppression/réordonnancement, pattern Boutique) + CRUD imbriqué sur les paliers de chaque event (ajout/suppression/édition).
- Slug : `/referentiels/events` (anglais). Libellé public : "Événement" (nom de travail, risque de confusion avec les events spéciaux de saison — à reconsidérer plus tard).
- Rôle `references_manager` a accès complet, comme les 6 autres référentiels.
- **Construit vide (aucune donnée de départ), toggle actif/inactif laissé sur inactif** — masqué du public jusqu'à ce que le joueur ait assez de contenu pour l'activer lui-même.

### Bloc 61 — Sélecteur de ligue en boutons : référentiel Level Up + outil Classement ✅ **Terminé** (PR #80)
*Nouveau. Indépendant du reste.*

### Bloc 62 — Admin Boutique (alignement + gras) + tri alphabétique admin + retours Classement + image Événement + bandeau référentiels/outils ✅ **Terminé** (PR #82, 862 tests)
*Nouveau. Indépendant du reste. Fusionne l'ancien Bloc 63.*

- **A** — 🐛 Boutons de la colonne Actions (Bloc 53) actuellement empilés verticalement — doivent être alignés horizontalement, côte à côte.
- **B** — Support d'un texte en gras dans les champs Nom/Description des tableaux (Intro + 4 catégories) — syntaxe `**gras**`, via un simple regex dédié à ces champs (pas la bibliothèque markdown complète/`rehype-raw` du Bloc 58/56, juste le gras). Rendu identique admin/public.
- **C** — Tri alphabétique (par nom affiché, langue active EN/FR) des entrées sur `/admin/tools` ET `/admin/referentiels` — remplace l'ordre actuel (probablement ordre d'insertion), pour un repérage plus rapide.
- **D** — [Outil Classement, retour post-Bloc 61] Barre de filtre/saisie : label "Ligue" manquant au-dessus des boutons de ligue. 2 options, au choix de l'implémentation la plus cohérente avec l'existant : (a) ajouter le label "Ligue" au-dessus des boutons, pour matcher les 2 autres champs (% et rang) ; (b) retirer tout label au-dessus des 3 champs, et à la place mettre le libellé de chaque champ juste avant le champ lui-même (inline), de façon cohérente sur les 3.
- **E** — [Outil Classement] Renommer "Nombre total de joueurs (déduit)" → "Nombre total de joueurs" (retirer le qualificatif — confirmé malgré la marge d'erreur trouvée au point G).
- **F** — [Outil Classement] Badge conservé, mais intégré visuellement à l'échelle visuelle existante plutôt que d'occuper un espace dédié séparé (pas de solution précise imposée, au choix de l'implémentation la plus naturelle). Retirer aussi le titre "Échelle visuelle" (`visual-scale`) — la zone reste, seul le titre disparaît.
- **G** — 🐛 Règle d'arrondi précisée par le joueur (corrige le diagnostic initial) : toutes les lignes de palier utilisent l'arrondi vers le bas SAUF la ligne 100% (nombre total de joueurs), qui doit utiliser `Math.ceil` (arrondi vers le haut) — actuellement elle utilise aussi l'arrondi vers le bas, à tort. Exemple exact : rang 137, 86,71% → brut 157,998 → attendu 158 (ceil), affiché 157 (bug). Corriger uniquement la ligne 100%, ne pas toucher aux autres lignes (déjà correctes). Le badge "total calculé" doit utiliser la même règle `Math.ceil` (pas `Math.round`, les deux coïncident dans cet exemple mais divergeraient ailleurs).
- **H** — `referential-events.webp` déposée dans `public/referentials/` (même dossier que les 7 autres images de référentiel) — remplacer le placeholder actuel de la tuile Événement (accueil + page `/referentiels`) par cette image, même traitement que les autres (`aspect-ratio: 1`, repli si fichier absent).
- **I** — Bandeau de bascule référentiels (nav de section, Bloc 50) trop chargé avec 7 référentiels. [Desktop uniquement, mobile déjà OK] 4 référentiels par ligne max, 2ᵉ ligne au-delà. Ordre alphabétique. **⚠️ Nuance avec la règle du Bloc 60** (masquage complet de la découverte externe/SEO) : ce bandeau doit au contraire afficher aussi les référentiels inactifs, avec astérisque de couleur + "Bientôt disponible" en couleur — visible mais non cliquable (cohérent avec le pattern outils, point J).
- **J** — Renforcer le pattern "Bientôt disponible" (Bloc 33) : tous les outils désactivés/pas encore disponibles affichent un astérisque de couleur en plus du texte "Bientôt disponible", lui aussi en couleur (au lieu du texte simple actuel) — même traitement que le bandeau référentiels (I), partout où le pattern Bloc 33 s'applique déjà (nav, dashboard, `/tools`).

### Bloc 63 — Revue mobile d'autres pages à tableaux (hors outils Villes) ⏳ **En attente de la liste précise des pages, pas encore prêt à envoyer**
*Périmètre resserré (01/09/2026) — les outils Villes sont traités séparément (voir "Gros chantiers en attente", refonte tuiles Villes, qui couvre aussi bien desktop que mobile).*

- Sans impact sur le rendu desktop. **✅ Confirmé : Templiers, Gemmes et Boutique sont OK desktop ET mobile**, sortent de cette liste.
- Reste potentiellement : référentiel Level Up/Progression, et/ou des écrans admin à tableaux.
- **Pas encore assez d'information pour envoyer ce bloc** — liste précise toujours en attente du joueur.

### Bloc 64 — Tri public référentiels/outils + Boutique en tuiles + retrait aperçu admin + Level Up/Templiers + revirements Classement ✅ **Terminé** (PR #83, 871 tests)
*Notes de livraison : **G** — bug caché trouvé uniquement par capture d'écran réelle, pas par les tests (largeur `13rem` figée du Bloc 62 qui écrasait le stepper % à 6px une fois le label passé inline) — corrigé, 84px à toutes les largeurs testées (1400→375px). **B** — retrait complet du point d'extension `EditableColumn.preview`, pas juste ses 2 usages. **D/E** — réutilisation propre : `.split-reference-tables` partagée plutôt que dupliquer la grille Level Up, sélecteur `nav-button` étendu plutôt que recopié. **A** — le tri couvre aussi les sections teaser de l'accueil, composants partagés avec les pages dédiées.*
*Nouveau. Indépendant du reste.*

- **A** — Tri alphabétique des tuiles côté public, sur `/tools` ET `/referentiels` (complète le tri admin du Bloc 62).
- **B** — [Admin Boutique] Retirer l'aperçu rendu affiché sous les champs Nom/Description (gras, Bloc 62/B) — prend de la place inutilement, vérification faite directement sur la page publique.
- **C** — Remplacer les 4 tableaux de catégorie Boutique (public uniquement, pas l'admin ni le tableau Intro) par des grilles de tuiles : 2 de large sur desktop, 1 colonne mobile. Image à gauche (5rem, Bloc 46), à droite nom en gras puis description. **✅ Tarif confirmé : badge en haut à droite de la tuile, aligné avec le nom.**
- **D** — [Référentiel Level Up] Styliser les contrôles de pagination (Précédent/Suivant/page) comme les boutons de navigation déjà utilisés ailleurs sur le site (ex: sélecteur de ligue en boutons, Bloc 61) — remplace le rendu par défaut actuel.
- **E** — [Référentiel Templiers] Afficher le tableau en 2 colonnes × 10 lignes, dans le style déjà utilisé par Level Up (2 paires de colonnes Niveau/Valeur), mais figé à 10 lignes par colonne, pas de pagination (20 lignes au total).
- **F** — [Tuiles Boutique] Couleur des tuiles en gris, tarif en saphirs en violet (couleur d'accent du site).
- **G** — 🚨 [Outil Classement] Revirement : "Nombre total de joueurs" → "Nombre estimé de joueurs" (annule le renommage du Bloc 62, réintroduit un qualificatif différent).
- **H** — 🚨 [Outil Classement] Confirmation : option (b) du Bloc 62/D retenue — libellé de chaque champ (Ligue, %, rang) placé juste avant le champ lui-même, pas de label au-dessus. Corriger si l'option (a) a été implémentée à la place.

### Bloc 65 — Boutique (Intro en tuiles + largeur admin + images 6rem) + refonte Gemmes en tuiles ✅ **Terminé** (PR #84)
*Nouveau. Indépendant du reste.*

- **A** — Le tableau "Intro" (Image/Nom/Description, Bloc 58) passe aussi en tuiles comme les 4 tableaux de catégorie (Bloc 64) — mais sans aucun badge tarif (entrées informatives, pas des objets à prix).
- **B** — [Admin Boutique] Élargir encore la colonne/le champ Description — il reste de la marge inutilisée, les colonnes doivent occuper toute la largeur disponible du tableau. Toujours aucun scroll horizontal (contrainte inchangée).
- **C** — Images du référentiel Boutique : 5rem → 6rem (tuiles de catégorie + tuiles Intro une fois livrées).
- **D** — Refonte du référentiel Gemmes en tuiles, remplace le tableau 11×7 (illisible mobile, serré desktop). 1 tuile par compétence (couleur = couleur déjà associée à la compétence), mini-tableau interne 3 lignes (ligues / % / image gemme), colonnes égales, contenu centré. Comparaison multi-ligues préservée (contrairement au pattern mono-ligue de Level Up/Classement/Troupes attaque démo, pas adapté ici). Même design desktop et mobile, confirmé. **+ Tuile "Coût" supplémentaire, en premier avant les compétences, pleine largeur sur desktop, couleur grise** — 2 lignes (ligues / coût en saphirs pour 1 gemme), pas d'image.
- **E** — [Outil Classement] La barre boutons de ligue + % + rang (Bloc 61) doit prendre toute la largeur du bloc — complète la contrainte "une seule ligne" du Bloc 61, désormais aussi "pleine largeur".

### Bloc 66 — Référentiel Templiers : renommage + présentation en tuiles + harmonisation titre + coût ✅ **Terminé** (PR #85, 901 tests)
*Nouveau. Indépendant du reste.*
*Note de livraison : correctif additionnel apporté — titre de section du tableau de coût simplifié dans les 5 langues ("Table de coût exacte" → "Table de coût", et équivalents EN/DE/ES/TR), "exacte" jugé redondant.*

- **A** — Renommer "Coût des Templiers" → "Templiers" (titre, nav, tuile accueil/`/referentiels`, bandeau de bascule). Penser à corriger le lien croisé réciproque depuis l'outil Templiers, qui référence probablement encore l'ancien nom. ⚠️ Conséquence attendue et automatique : le tri alphabétique (Blocs 62/64) repositionne "Templiers" (T) après tout ce qui commence par une lettre antérieure, au lieu de sa position sous "Coût des Templiers" (C) — comportement attendu partout où ce tri s'applique (accueil, `/referentiels`, bandeau, admin), pas un bug.
- **B** — Nouvelle section de présentation en tuiles, insérée avant le tableau de coût (structure 2×10 du Bloc 64 inchangée) : 5 templiers (associés chacun à une compétence — Attaque, Défense, Or, Recruteur, Vitesse).
  - Admin : même pattern que Boutique (tableau simple). Champs : Image, Nom, Description, Base Temple, Bonus. Pas de boutons d'action (jeu fixe de 5 templiers, ordre alphabétique déjà défini).
  - Public : tuile colorée selon la compétence associée (palette déjà en place, même principe que Gemmes/Bloc 65). Image à gauche 6rem (cohérent Boutique/Bloc 65). Titre "Templier [Compétence]" (ex: "Templier Recruteur"). En dessous : Base Temple, puis Bonus donné par 1 templier.
- **C** — Titre des tuiles harmonisé à 1.1rem, sur les 3 référentiels à tuiles : Boutique, Gemmes, Templiers.
- **D** — 🐛 Tableau de coût Templiers : (1) ne jamais compacter le chiffre en k/M, valeur complète affichée (ex: 21929 pour le 20ᵉ niveau) ; (2) afficher la devise Pouciel, actuellement absente — en-tête "Coût (Pouciel)" attendu.

### Bloc 67 — Renommer Level Up → Progression + retours référentiel Templiers ✅ **Terminé** (PR #86, 906 tests)
*Nouveau. Indépendant du reste.*
*Notes de livraison : A vérifié en live FR (captures à l'appui), source unique `references.catalog.level-up`, cohérent avec le pattern Boutique/Templiers. **Trouvaille en auditant les liens croisés : le sens outil→référentiel (Taux de gain d'XP → Progression) était carrément absent**, pas juste mal ciblé — ajouté, cohérent avec toutes les autres paires référentiel/outil. **C — cause racine confirmée** : Base Temple/Bonus avaient été rendus lecture seule/calculés pendant la review Codex du Bloc 66 (PR #85) — reverti, éditable et persisté à nouveau, vérifié en live pour les 5 templiers (admin → sauvegarde → reflet public). Valeur vide affiche désormais "—" côté public plutôt qu'un "%" cassé.*

- **A** — Renommer "Level Up" → "Progression" (nom pas français). Titre, nav, tuile accueil/`/referentiels`, bandeau de bascule, texte des liens croisés réciproques (calculateur Combat ↔ ce référentiel). Slug d'URL inchangé (`/referentiels/level-up`) — même principe que Boutique/Templiers, libellé public en français découplé de l'identifiant technique en anglais.
- **B** — Images `templar-striker.webp`, `templar-guardian.webp`, `templar-prosperous.webp`, `templar-recruiter.webp`, `templar-rusher.webp` déposées dans `public/templars/` — à intégrer sur les 5 tuiles Templiers (remplace tout placeholder utilisé à la livraison du Bloc 66).
- **C** — 🐛 Écart signalé : Base Temple et Bonus doivent être éditables en admin — déjà spécifié au Bloc 66 (déjà mergé), retour testeur suggérant que ce n'est pas le cas en pratique. Vérifier et corriger, pas une nouvelle fonctionnalité.
- **D** — Renommer le libellé "Bonus donné par 1 templier" → "Bonus par templier" (raccourci).

### Bloc 68 — Templiers + Boutique mobile + couleur titre + Paramètres joueur + généralisation boutons de ligue + grilles mobile référentiels ✅ **Terminé** (PR #87, 938 tests)
*Note de livraison : les 14 points (A-N) vérifiés visuellement en live (desktop + mobile). Non-régressions explicitement confirmées : sélecteurs Gemmes (Simulateur Combat + outil Gemmes) toujours en select box, ordre de rareté inversé (Légendaire→Commun) préservé sur la grille mobile Combat/Expédition.*
*Nouveau. Indépendant du reste.*

- **A** — Grille de tuiles Templiers (Bloc 66) : 3 colonnes sur desktop (5 templiers = 3+2), au lieu du nombre non explicitement fixé à la livraison (probablement 2 par défaut). Mobile inchangé (1 colonne).
- **B** — [Tuiles Boutique, mobile uniquement] Tarif en saphirs repositionné sous le titre au lieu du badge en haut à droite. Desktop inchangé (badge en haut à droite, Bloc 64).
- **C** — [Outil Templiers] Refonte complète mobile + desktop. Mobile : champs Niveau départ/cible empilés verticalement. Desktop : fusionner le bloc de saisie et le bloc "Coût total" en un seul bloc compact, 3 colonnes égales (Niveau départ | Niveau cible | Coût total). Desktop et mobile identiques : résultats en tuiles plutôt qu'en tableau, mêmes caractéristiques que le référentiel Templiers (tuile colorée, image 6rem, titre nom du Templier) — contenu : Bonus par templier, Bonus total donné par le nombre de templiers, Gain départ-cible (3 valeurs déjà spécifiées, juste un changement de mise en forme).
- **D** — 🐛 Titre/phrase `/tools` et `/referentiels` en violet, mais pas sur l'accueil malgré le même texte réutilisé (Bloc 38/53). Aligner l'accueil sur le violet des pages dédiées.
- **E** — [Paramètres du joueur] Libellé "Ligue non définie" au lieu de "— Choisir —" quand aucune ligue n'est choisie.
- **F** — [Paramètres du joueur] Sélecteur de ligue en boutons plutôt qu'en select box, même principe que Classement/Level Up (Bloc 61).
- **G** — [Paramètres du joueur, mobile uniquement] Le résumé (ligue · niveau · VP · nombre de templiers) doit apparaître en dessous du titre "Paramètres".
- **H** — [Paramètres du joueur, mobile uniquement] Champs Niveau et VP/unité sur la même ligne.
- **I** — [Paramètres du joueur, mobile uniquement] Saisie compétences/points/templiers/bonus de temple en 2 colonnes (2 compétences par ligne).
- **J** — [Outil Troupes en attaque démo] Sélecteur de ligue en boutons plutôt qu'en select box, même principe que Level Up/Classement (Bloc 61) — étend le pattern à ce 3ᵉ outil.
- **K** — [Outils Villes : Coût de Ville, Niveau Max Atteignable, Production] Sélecteur de ligue en boutons plutôt qu'en select box. ⚠️ Pas une généralisation universelle — le pattern boutons ne s'applique QUE là où c'est explicitement indiqué. **Exclusion explicite : les sélecteurs de ligue liés aux Gemmes (Simulateur d'Équipement de Combat + outil Gemmes) restent en select box**, ne pas y toucher.
- **L** — [Référentiel Boutique, mobile uniquement] Boutons de filtre catégorie (Conseillers/Équipement/Expédition/Inventaire) en grille 2×2, prenant toute la largeur disponible — au lieu de leur disposition actuelle.
- **M** — [Référentiels Équipement de Combat et Équipement d'Expédition, mobile uniquement] Même traitement grille pleine largeur. Filtre famille (4 chacun) : grille 2×2. Filtre rareté (5 raretés) : 2 lignes réparties 2+3 — ligne 1 Légendaire/Mythique, ligne 2 Épique/Rare/Commun. ⚠️ Ordre du plus rare au plus commun, volontairement inversé par rapport à l'ordre standard Commun→Légendaire utilisé ailleurs — pas une erreur à corriger.
- **N** — [Référentiels Événement et Progression, mobile uniquement] Boutons de sélection de ligue en 2 lignes de 3 boutons, prenant toute la largeur disponible (6 ligues = 3+3) — au lieu de leur disposition actuelle.

### Bloc 69 — Bandeau + outil Templiers + Paramètres joueur + outil Villes (boutons de ligue) ✅ **Terminé** (PR #88, 954 tests + nouveau test e2e permanent anti-régression scroll)
*Nouveau. Indépendant du reste.*

- **A** — 🐛 Mobile, bandeau de bascule référentiels : le bouton "Équipement d'Expédition" passe sur 2 lignes (OK), mais "Boutique" (même ligne de grille) hérite de cette hauteur sans être centré verticalement dedans. Corriger : centrage vertical du contenu de bouton, généralisé à tous les bandeaux du site (référentiels ET outils), pas juste ce cas précis.
- **B** — 🐛 [Outil Templiers] Unité redondante après la valeur "Bonus par templier" — le libellé du champ indique déjà l'unité de contexte, pas la peine de la répéter après le chiffre (ex: "0,25%" seul, pas de texte redondant après).
- **C** — [Outil Templiers] Ajouter un contrôle de validation : niveau cible doit être au minimum niveau départ + 1. Comportement identique à celui déjà en place sur l'outil Villes — appliqué après la saisie, au relâchement/perte de focus du champ, pas en temps réel.
- **D** — [Paramètres du joueur] Desktop : ajouter le titre "Ligue" au-dessus des boutons (absent à la livraison du Bloc 68), réduire les champs Niveau et VP à 25% chacun. Mobile : réduire le champ Niveau de 10%, largeur libérée redistribuée au champ VP (toujours sur la même ligne). 🚨 Nouvelle contrainte universelle (voir F) : pas de scroll vertical pour les boutons de ligue.
- **E** — [Outil Villes : Coût de Ville/Niveau Max/Production, ET Troupes en attaque démo] Desktop : ajouter le titre "Ligue" au-dessus des boutons, positionner ce bloc sur la même ligne que les autres champs de saisie. Mobile : boutons de ligue en 2 lignes de 3, pleine largeur (même pattern qu'Événement/Progression, Bloc 68/N). ⚠️ **Classement N'EST PAS concerné** — confirmé explicitement, garde son style actuel (label inline, Bloc 64 inchangé).
- **F** — 🚨 Nouvelle contrainte universelle, tous les sélecteurs de ligue en boutons : pas de scroll vertical. S'applique à Paramètres joueur (D), outils Villes + Troupes attaque démo (E), et tous les autres déjà livrés au Bloc 68 (Level Up/Progression, Classement — celui-ci inclus dans cette contrainte malgré son exclusion du point E, Événement) — vérifier/corriger partout.
- **G** — [Outil Classement, mobile uniquement] Refonte différente du desktop (qui reste inchangé, label inline — Bloc 64). Titre au-dessus de chaque section ("Ligue", "Pourcentage actuel", "Rang actuel"). Boutons de ligue en 2 lignes de 3, pleine largeur. Champs de saisie (% et rang) en pleine largeur.

### Bloc 70 — Largeur bloc ligue à 50% + libellés tuiles Templiers raccourcis ✅ **Terminé** (PR #89, 958 tests)
*Note de livraison : ratio 50% vérifié précisément via `getBoundingClientRect` sur les 4 outils, Paramètres joueur confirmé non affecté (périmètre respecté), libellés tuiles Templiers confirmés raccourcis.*
*Nouveau. Indépendant du reste.*

- **A** — Le bloc de sélection de ligue (titre + boutons, Bloc 69/E) occupe 50% de la largeur de sa ligne partagée avec les autres champs de saisie, sur les outils Villes (Coût de Ville/Niveau Max/Production) et Troupes en attaque démo. ✅ Périmètre confirmé par le joueur — uniquement ces outils modifiés au Bloc 69, pas une généralisation.
- **B** — [Outil Templiers, contenu des tuiles] "Bonus total au niveau X" → "Bonus total" ; "Gain départ-cible" → "Gain".

### Bloc 71 — Niveau Max Atteignable (largeur) + Classement (boutons ligue) + Paramètres joueur (mise en ligne) ✅ **Terminé** (PR #90, 969 tests)
*Note de livraison : point B — mobile Classement confirmé inchangé (non-régression). Point C — correctif du gras confirmé appliqué uniformément sur tous les emplacements de boutons de ligue, pas seulement Classement.*
*Nouveau. Indépendant du reste.*

- **A** — [Outil Niveau Max Atteignable, desktop] Réduire de 30% chacun : champ Nombre de villes, champ Niveau de départ, sélecteur d'unité du champ Or disponible (×1/k/M/G/T). Espace libéré donné au champ Or disponible lui-même.
- **B** — 🚨 Revirement : Classement rejoint le traitement Villes/Troupes attaque démo (annule l'exclusion explicite du Bloc 69). Desktop : titre "Ligue" au-dessus des boutons + 50% de largeur (Bloc 69/70). Ne pas confondre avec le point mobile spécifique de Classement (Bloc 69/G), qui reste inchangé.
- **C** — Le texte des boutons de sélection de ligue ne doit pas être en gras (contrairement au rendu actuel) — aligner le style sur les boutons déjà utilisés dans Paramètres du joueur.
- **D** — [Paramètres du joueur, desktop] Ligue, Niveau et VP passent sur la même ligne, répartition à 4 : Ligue 50%, Niveau joueur 20%, VP 20%, unité VP 10%. Remplace la répartition "25% chacun" du Bloc 68 (qui ne prévoyait pas Ligue sur la même ligne).

### Bloc 72 — Retouches mobile : Gemmes (Simulateur Combat + Optimisation) + Équipement Combat/Expédition ✅ **Terminé** (PR #91, 980 tests)
*Nouveau. Indépendant du reste.*

- **A** — [Mobile uniquement, Simulateur d'Équipement de Combat] Ligne de configuration d'une gemme (Compétence + Étoiles + Ligue, 3 champs) : le label "Gemme X" passe au-dessus des 3 champs au lieu de rester en début de ligne, pour libérer toute la largeur. Desktop inchangé.
- **B** — [Mobile uniquement, outil Optimisation Gemmes] Boutons de sélection de famille/compétence : pleine largeur, tout en restant sur une seule ligne.
- **C** — [Mobile uniquement, Simulateur d'Équipement de Combat] Boutons de sélection compétence (filtre famille) en pleine largeur, toujours sur une seule ligne. Le bouton "Transférer en Paramètres joueur" prend aussi toute la largeur, sur la 2ᵉ ligne.
- **D** — [Mobile uniquement, Simulateur d'Équipement d'Expédition] Boutons de filtre famille en pleine largeur — 1ʳᵉ ligne 3 boutons, 2ᵉ ligne 2 boutons (5 filtres : Personnalisé, Or, Équipement, Consommables, Troupes).

### Bloc 73 — 🐛 Régressions boutons ligue 50% + hauteur champs + révision disposition case équipement ✅ **Terminé** (PR #92)
*Nouveau. Indépendant du reste.*

- **A** — 🐛 [Paramètres du joueur, desktop] Le ratio 50% pour les boutons de ligue (Bloc 71) n'est pas correct en pratique malgré la livraison — régression confirmée, à corriger.
- **B** — [Paramètres du joueur] Les champs Niveau et VP sont trop grands en hauteur — doivent faire la même hauteur que les autres champs de saisie du panneau (référence : Compétences ou Points).
- **C** — 🐛 [Outil Classement, desktop] Le ratio 50% pour les boutons de ligue (Bloc 71) n'est pas correct en pratique malgré la livraison — régression confirmée, à corriger.
- **D** — 🚨 [Simulateur d'Équipement de Combat] RÉVISION MAJEURE de la disposition de case, remplace le Bloc 32. Gemmes passent à droite de l'image (empilées en colonne) au lieu d'en dessous. Nouveau système d'étoiles visuelles (icônes, jamais de texte "3★") pour équipement ET gemmes : 1-4★ = étoiles blanches, 5-8★ = conversion complète en étoiles jaunes (5★=1 jaune, 8★=4 jaunes). Plafond pratique à 8, pas de palier au-delà du jaune pour l'instant. Composant de rendu d'étoiles partagé entre équipement et gemmes. **Conserver le rendu actuel facilement récupérable (historique Git propre, `git revert` simple) au cas où le joueur voudrait revenir en arrière une fois le changement vu en pratique.**
- **E** — [Simulateur d'Équipement de Combat] Images d'équipement agrandies à 2.8rem (classe CSS `.stuff-slot-image`).

### Bloc 74 — 🐛 2 bugs de couleur des étoiles (Simulateur Équipement Combat) ✅ **Terminé** (PR #93, 1002 tests)
*Note de livraison : blanc via token adaptatif `--foreground` (réagit au thème). Jaune en littéral fixe, **ajusté en review à `#a8710a`** (la valeur reprise du thème sombre avait un contraste insuffisant en thème clair — corrigé pour un contraste équilibré ~3,5:1 sur les 2 thèmes) — vérifié en live sur les 2 thèmes × 8 paliers d'étoile.*
*Nouveau. Indépendant du reste.*

- **A** — Étoiles blanches (1-4★, Bloc 73) illisibles en thème clair, bon en thème sombre. Passer en gris foncé pour le thème clair uniquement (étoiles jaunes 5-8★ non concernées). ⚠️ Précédent connu (Bloc 22/24) : ajuster juste la luminosité s'était révélé insuffisant, il avait fallu changer de teinte — bien tester le rendu réel, pas se fier au seul contraste WCAG calculé.
- **B** — 🐛 Bug distinct : les étoiles jaunes (5-8★) changent de teinte entre thème sombre et thème clair (deviennent plus foncées en clair) — probablement liées par erreur à une variable de thème. Corriger pour une couleur jaune fixe, identique dans les deux thèmes.

### Bloc 75 — Fusion tableaux secondaires par rareté (Combat + Expédition) + parité admin incréments Combat ✅ **Terminé** (PR #93)
*Note de livraison : A — tableau fusionné Combat (Fusion/Gemmes/Destruction) public+admin. B — tableau fusionné Expédition (Fusion/Destruction), coût de fusion enfin visible côté public. C — 10 compétences Combat éditables en admin, câblées dans le calcul du Simulateur de Stuff, vérifié de bout en bout (persistance DB, décalage du calcul). CI : une assertion e2e obsolète cassée par la fusion, rattrapée avant merge.*
*Nouveau. Indépendant du reste.*

- **A** — [Référentiel Équipements de Combat] 3 tableaux (Pouciel fusion, Gemmes par rareté, Pouciel destruction) fusionnés en 1 seul : colonnes = raretés, 3 lignes = Fusion/Gemmes/Destruction. Public ET admin.
- **B** — [Référentiel Équipement d'Expédition] Même principe, 2 lignes (pas de gemmes) : Fusion/Destruction. Le coût de fusion Terradust existe déjà en admin (`expeditionMergeCost()`) mais n'est pas affiché côté public — corriger en même temps, donnée déjà existante, pas de nouveau calcul.
- **C** — 🐛 [Référentiel Équipements de Combat, admin] Écart de parité : les incréments par étoile/compétence sont éditables en admin pour Expédition (grille dédiée), mais codés en dur pour Combat (`equipmentValueAtStar()`). Ajouter une grille admin éditable équivalente pour Combat.

### Bloc 76 — Tableaux fusionnés Bloc 75 (admin) : largeur des champs + libellé de ligne éditable ✅ **Terminé** (PR #94, 1005 tests)
*Note de livraison : aucun débordement horizontal vérifié à 4 largeurs d'écran ; édition des libellés persistée et reflétée côté public, testé sur les 2 tableaux (Combat et Expédition).*
*Nouveau. Indépendant du reste.*

- **A** — [Admin, tableaux fusionnés du Bloc 75 : Terradust Expédition, Pouciel+Gemmes Combat] Champs de saisie en pleine largeur disponible, sans scroll horizontal.
- **B** — L'indicateur de ligne (libellé "Fusion"/"Gemmes"/"Destruction" en tête de ligne) devient éditable en admin, texte ajustable librement.

### Bloc 77 — Référentiel Événement : révision structure (Description + Durée + visuel timeline) ✅ **Terminé** (PR #95, 1018 tests)
*Note de livraison : vérifié en live avec l'exemple exact Diamant/Légende du cdc (6 events, 336h) — remplit la barre à exactement 100%, segments proportionnels corrects.*
*Nouveau. Indépendant du reste. Référentiel construit vide/inactif (Bloc 60), aucune donnée réelle à migrer.*

- Ajouter un champ **Description** (texte libre) au niveau de chaque event.
- **Retirer "Jour de début/jour de fin"**, remplacé par un champ **Durée** seul (24h/48h/72h).
- **Ajouter un champ "Durée de la saison" éditable, au niveau de chaque ligue** (pas 14 jours figé en dur) — sert de dénominateur au visuel.
- La position de chaque event dans le cycle se calcule par cumul des durées des events précédents dans l'ordre (pas de saisie de jour de début).
- **Visuel** : barre horizontale façon "échelle visuelle" du Classement (Bloc 62/F) — cycle de la durée de saison de cette ligue, chaque event = segment proportionnel à sa durée, positionné par cumul. **Montre uniquement nom + durée de l'event, jamais les paliers ni récompenses** — le détail complet reste dans les blocs repliables déjà prévus (Bloc 60), en dessous, 2 zones distinctes.

### Bloc 78 — Images Combat 3.2rem + extension Expédition + retouche gris étoiles ✅ **Terminé** (même PR #95 que le Bloc 77)
*Nouveau. Indépendant du reste.*

- **A** — Images d'équipement du Simulateur d'Équipement de Combat (`.stuff-slot-image`, fixées à 2.8rem au Bloc 73) agrandies à 3.2rem.
- **B** — Étendre au Simulateur d'Équipement d'Expédition : même système de rendu d'étoiles que Combat (Bloc 73, 1-4★ blanc/5-8★ jaune) + même taille d'image 3.2rem. ⚠️ Pas de gemmes sur l'équipement d'Expédition (Bloc 75) — seul le rendu de l'étoile de l'équipement est concerné.
- **C** — 🐛 Le gris des étoiles blanches en thème clair (Bloc 74) est trop foncé, se confond avec du noir. Éclaircir légèrement — s'applique partout où ce système est en place (Combat + Expédition une fois B livré).

### Bloc 79 — Étoile Expédition + retours référentiel Événement (Bloc 77) ✅ **Terminé** (PR #96)
*Note de livraison : vérifié en live, cas Architecte 72h→24h (couleurs partagées), correctif texte tronqué, mise en page mobile des badges.*
*Nouveau. Indépendant du reste.*

- **A** — 🐛 [Simulateur Équipement Expédition] L'étoile affichée en dessous de l'image d'équipement (Bloc 78) doit être centrée horizontalement.
- **B** — [Admin référentiel Événement] Sélection de la durée (24h/48h/72h) en boutons, pas en select box.
- **C** — [Admin référentiel Événement] Champ Description agrandi ×3 en largeur.
- **D** — [Public référentiel Événement] Ajouter une échelle avec traits fins tous les 24h sur le visuel timeline (Bloc 77), calée sur la fin de saison (fixe) plutôt que le début (variable). Repères : J0 = début saison, J+3 = début event suivant, ..., J13/J14 = fin.
- **E** — 🐛 [Public référentiel Événement] Nom d'event tronqué sur le visuel timeline si trop long pour son segment (ex: "Enrôleur de troupes" sur 72h) — corriger.
- **F** — [Public référentiel Événement] Description de l'event affichée à côté du nom, même bloc repliable fermé.
- **G** — Un même nom d'event peut apparaître plusieurs fois dans une saison (durées/objectifs différents, ex: "Architecte" 72h en début + 24h en fin) — 2 events distincts en base, mais couleur dérivée automatiquement du champ Nom sur le visuel timeline, pour que les occurrences d'un même type d'event partagent la même couleur sans saisie manuelle.
- **H** — [Admin] Indicateur de position numérique (1, 2, 3...), non éditable, calculé automatiquement selon la position dans la liste (réordonnancement par flèches déjà existant). Purement informatif, jamais affiché côté public.
- **I** — 🚨 RÉVISION : affichage public en tuiles, remplace le "bloc repliable" simple. Visuel timeline inchangé en haut. En dessous : grille de tuiles 2/ligne desktop (1 mobile), ordre chronologique, tuiles grises (comme Boutique, pas de couleur par nom ici). Contenu : titre + description (pas d'image), 2 badges = objectif du dernier palier + Durée de l'event — côte à côte en desktop, en dessous du titre en mobile. Clic sur la tuile = déplie/replie tous les paliers.

### Bloc 80 — Référentiel Événement : alignements admin + tailles champs + sélecteur de couleur ✅ **Terminé** (PR #97, 1061 tests)
*Note de livraison : F — palette 5 teintes × 2 nuances, nouveau token `--ember-bright` (évite le token réservé `--gold`). G — vraie régression trouvée en vérification live (label s'effondrant sur son mot le plus long, indépendamment de la largeur) — corrigée avant merge, capture d'écran + mesure DOM à l'appui.*
*Nouveau. Indépendant du reste.*

- **A** — [Admin] Label "Ligue" au-dessus des boutons de sélection de ligue.
- **B** — [Admin] "Durée de la saison" alignée sur la même ligne que les boutons de ligue.
- **C** — [Admin] Aligner par event : numéro d'event, Nom, Description, Durée, sélecteur de couleur (point F), boutons d'action.
- **D** — [Admin] Champ Description agrandi de +50% supplémentaire (s'ajoute au ×3 du Bloc 79).
- **E** — [Admin] Champ Récompense (paliers) agrandi ×3.
- **F** — 🚨 RÉVISION : sélecteur de couleur manuel par event (~10 options), remplace l'auto-dérivation par nom du Bloc 79. Timeline : segment coloré. Tuiles publiques : fond reste gris, titre écrit dans la couleur choisie.
- **G** — [Public, visuel timeline] Affiner le correctif du texte tronqué (Bloc 79) : retour à la ligne limité à 2 lignes max, mais pas la solution privilégiée en premier — pour un segment large (ex: 72h), 1 ligne devrait suffire, privilégier l'agrandissement de la zone de texte plutôt que de passer sur 2 lignes dès que possible.

### Bloc 81 — Référentiel Événement : visuel + palette + alignement admin fin ✅ **Terminé** (PR #98, 1066 tests)
*Note de livraison : tests d'alignement CSS admin et de vivacité de palette ajoutés spécifiquement, assertion e2e obsolète corrigée.*
*Nouveau. Indépendant du reste. ⚠️ Dépend du Bloc 80 (PR #97) — vérifier son merge avant de démarrer.*

- **A** — [Public, visuel timeline] Ne plus afficher la durée sur le segment — devenue redondante depuis que les tuiles (Bloc 79) l'affichent déjà en badge. Le segment n'affiche plus que le nom de l'event.
- **B** — [Admin] Remplacer la palette de couleur (10 options, Bloc 80) par 5 couleurs × 2 nuances, plus vives et moins sombres que la palette livrée.
- **C** — [Admin] 3 correctifs d'alignement : champ "Durée de la saison" réduit à 1/4 de sa taille actuelle ; numéro d'event aligné avec les champs de saisie (pas le titre des colonnes) ; titres "Durée" et "Couleur" mal alignés avec les autres titres de colonne — corriger. Si besoin pour l'alignement d'ensemble, réduire le champ Description de 10%.
- **D** — [Public, visuel timeline] Vérifier/corriger que le nom de l'event écrit sur le segment est bien dans la couleur choisie pour cet event (pas une couleur de texte fixe indépendante).
- **E** — [Public, visuel timeline, desktop ET mobile] Règle finale : n'afficher un repère que là où un changement d'event a lieu (fin/début), pas un repère systématique tous les 24h — ex: J0, J3, J6..., adapté aux durées réelles de la ligue. Remplace la règle "tous les 24h" du Bloc 79, sans distinction desktop/mobile.
- **F** — [Public, tuiles] Le badge Durée intègre aussi les jours de début/fin : format "Jx-Jy (durée)", ex: "J0-J3 (72h)".

### Bloc 82 — Visuel timeline Événement + retrait coût Pouciel + sélecteur compétence Gemmes + remplacement images équipement ✅ **Terminé** (PR #99, 1073 tests)
*Note de livraison : C — badge "320 gemmes" confirmé présent en production avant merge (capture d'écran), retrait à vérifier concrètement post-merge (voir cdc). E — vraie trouvaille : décalage de nommage entre le code (attendait une forme différente de troop/consumable) et les fichiers fournis, aurait cassé 25-50% de chaque set — signalé et corrigé après confirmation du joueur, pas détectable depuis une vérification texte du cdc seule.*
*Nouveau. Indépendant du reste.*

- **A** — 🐛 Le dernier repère (fin de saison, ex: J14) ne s'affiche pas sur le visuel timeline (Bloc 81). La fin du dernier event = fin de saison, c'est une transition comme les autres — corriger pour qu'il apparaisse comme les repères intermédiaires.
- **B** — Pour les jours qui ne sont pas une transition d'event (sans label Jx), afficher malgré tout un fin trait vertical à cette position (effet règle graduée continue) — seuls les jours de transition affichent le texte du label, les autres n'ont qu'un simple trait sans valeur d'axe écrite.
- **C** — 🐛 [Référentiel Équipements de Combat, pas le simulateur — correction de portée] Retirer le coût en Pouciel affiché en haut à droite des tuiles principales (Bloc 39, ajout jamais demandé) — fusion ET destruction, à retirer tous les deux. L'info reste disponible dans le tableau dédié plus bas sur la même page (Bloc 75), pas besoin de la dupliquer ici.
- **D** — [Calculateur Gemmes, 2 modes : Optimisation et Budget disponible] Le sélecteur de compétence ne doit avoir aucune valeur par défaut — remplacer par "— Choisir —" (placeholder générique déjà utilisé ailleurs sur le site).
- **E** — Remplacer intégralement `public/equipment/combat/` (180 fichiers) et `public/equipment/expedition/` (120 fichiers) par le nouveau jeu fourni par le joueur (36 fichiers Combat manquants récupérés + repasse qualité sur l'ensemble des 2 dossiers). Nomenclature vérifiée conforme à la convention déjà en place (cdc section 12) — aucun changement de convention, juste un remplacement de fichiers. ⚠️ Fichiers à fournir directement à Claude Code (zips), pas transférables depuis cette conversation.

### Bloc 83 — 🐛 RÉGRESSION : badge Pouciel/"gemmes" toujours présent malgré le Bloc 82 ✅ **Terminé** (PR #100)
*Cause racine confirmée : le test du Bloc 82 cherchait le texte littéral "Pouciel" — absent, donc test vert à tort. Le vrai badge visible était `.reference-tile-gems` ("X gemmes"), une donnée légitime mais affichée là où elle ne devait pas l'être, avec un libellé "gemmes" (jamais "Pouciel") qui expliquait pourquoi l'ancien test ne l'attrapait jamais — exactement ce que le joueur avait repéré sur sa capture. Correctif : retrait complet (valeur, libellé, prop, CSS morte, clé de traduction orpheline sur les 5 langues) — le vrai tableau "Pouciel & Gemmes" plus bas reste intact (vérifié : 320 pour la fusion Légendaire toujours affiché). Vérification en Playwright réel sur `/referentiels/combat-equipment` : 0 badge sur les 180 tuiles rendues, captures d'écran du set "Spirit Fyra" exact du rapport joueur (badge disparu) + du tableau dédié (toujours là). Nouveau test de régression basé sur la structure DOM réelle, pas juste une recherche de texte.*
*Nouveau. Indépendant du reste. Reprise d'un point supposé fermé — vérification visuelle réelle obligatoire avant de reclore.*

- Le badge (affichant "320 gemmes" — valeur + libellé tous les deux à corriger, voir historique complet dans le cahier des charges) est **toujours visible sur les tuiles du référentiel Équipements de Combat après le merge de la PR #99**, malgré la fermeture du Bloc 82/C et un test de non-régression censé couvrir son absence.
- **Ne pas se fier à une inspection de code seule** — le diagnostic précédent ("aucun badge dans le code") s'est révélé faux. **Vérification visuelle réelle en navigateur obligatoire avant de considérer ce point résolu**, capture d'écran ou description précise de ce qui a été vu à l'appui.
- **⚠️ Confirmé par le joueur : il s'agit bien du RÉFÉRENTIEL Équipements de Combat** (`/referentiels/combat-equipment`) — **pas le Simulateur de Stuff**. Ne pas confondre les deux composants, qui partagent une disposition de tuile visuellement proche.
- Objectif inchangé : **retirer entièrement ce badge** (valeur + libellé), sur toutes les tuiles, toutes raretés/familles/sets. L'info Pouciel reste disponible dans le tableau dédié (Bloc 75) plus bas sur la même page.

### Bloc 84 — 🐛 Titre tronqué en mobile sur /referentiels et /tools ✅ **Terminé** (PR #102)
*Cause racine : le CSS nowrap+shrink-to-fit ne prenait pas en compte la largeur réelle de la police Cinzel en taille mobile. Trouvaille au passage : un bug d'ordre de cascade CSS qui aurait silencieusement empêché le correctif de s'appliquer sur `/referentiels`, corrigé aussi.*
*Nouveau. Indépendant du reste.*

- [Mobile uniquement] Le titre est tronqué sur `/referentiels` ("Retrouve les données clés") ET sur `/tools` ("Décide avec les bons chiffres") — doit passer à la ligne au lieu d'être coupé.

### Bloc 85 — Simulateurs Combat + Expédition : icône par emplacement vide ✅ **Terminé** (PR #103)
*Note de livraison : écart de nommage trouvé entre les slugs attendus (`amulet`/`gauntlets`, cdc section 12) et les fichiers réellement livrés (`pendant`/`gloves`) — contourné via une table de correspondance dédiée, aucun 404.*
*Nouveau. Indépendant du reste.*

- **A** — [Simulateur Combat] Remplacer le texte "Vide" par l'icône `item-{emplacement}.webp` (9 fichiers déposés dans `public/equipment/combat/`) quand aucun équipement n'est sélectionné pour cet emplacement.
- **B** — [Simulateur Expédition] Même traitement : icône `item-exped-{emplacement}.webp` (6 fichiers déposés dans `public/equipment/expedition/`).

### Gros chantiers en attente de cadrage (pas prêts pour Codex)
- **Combat — Fight, Enemy Troops** *(reste du point 18)* — non spécifiés, à cadrer avec toi avant de coder.
- **Contenu des guides** *(point 19)* — modèle et éditeur prêts, rédaction en cours (via ChatGPT) — voir `docs/cahier-des-charges-ml-helper.md` section 10 (56 guides, 8 catégories, suivi ✅/⬜).
- **Langue Polonaise (PL)** *(point 21)* — seule langue encore non construite (DE/ES/TR livrés et en prod depuis le Bloc 44), pas prioritaire.
- **Refonte visuelle en tuiles des outils Villes** (Coût de Ville, Niveau Max Atteignable, Production) — idée du joueur (01/09/2026), pas encore cadrée. Objectif : harmoniser avec le reste de l'app (référentiels + Boutique/Templiers/Gemmes déjà en tuiles), améliorer la lisibilité, n'afficher que l'info utile. **Portée confirmée : desktop ET mobile**, ces 3 outils sont jugés moyens aux deux largeurs, pas juste un souci mobile. Rien de précis pour l'instant, nécessite une vraie session de cadrage avant prompt.
- **Question en attente — l'outil Templiers est-il redondant avec le référentiel Templiers ?** Discussion du 01/09/2026 : le référentiel affiche déjà coût unitaire ET cumulé par niveau (soustraction suffit pour un coût départ→cible), et le bonus/gain personnalisé reste facile à calculer soi-même selon le joueur. **Décidé pour l'instant : l'outil est conservé**, question ouverte pour plus tard. Si retrait futur : impact sur `/tools`, les liens croisés réciproques (Bloc 53/54/67), et tout travail en cours sur cet outil au moment de la décision.
- **🚩 Configurateur d'avatar joueur, comme dans le jeu — explicitement V2** (décision du joueur : priorité à la finition de la V1). Mécanique envisagée : composition en calques (cheveux/visage/barbe/yeux/bouche, un bouton de défilement par composant, aperçu recomposé en temps réel). Assets déjà disponibles. Reste à trancher : mécanisme technique de composition, cohérence des calques entre races/genres. Session de cadrage reportée après V1.
- **🚩 Configurateur de bannière de clan, comme dans le jeu — explicitement V2**, même décision. Même principe que le configurateur d'avatar. Session de cadrage reportée après V1.

### Résolu (gardé pour traçabilité)
- ~~Renommage de la catégorie "Classement"~~ *(point 33)* → **✅ Résolu : on garde "Classement"**, pas de renommage prévu.

---

## Bonnes pratiques, conventions de nommage et règles produit non négociables

**→ Voir `AGENTS.md` à la racine du repo** — lu automatiquement par Codex à chaque tâche, pas besoin de le rappeler ici. Le committer dès la création du repo, avant la première tâche de setup.
