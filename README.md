# ML-Helper

ML-Helper is the administration foundation for the future community site. Phase 1 contains the Prisma data model, admin authentication, user management, and audit logs; it does not expose any public calculator yet.

## Quick Docker test

1. Copy the environment template and replace `NEXTAUTH_SECRET` with a secure random value.

   ```sh
   cp .env.example .env
   ```

2. Pull and start the `ghcr.io/magicgg91/ml-helper:dev` image. The container applies all committed Prisma migrations automatically.

   ```sh
   docker compose up
   ```

3. Open [http://localhost:3000/admin](http://localhost:3000/admin). At first launch, create the initial Super Admin directly in the one-time setup form, then sign in.

SQLite data persists in the local `data/` directory mounted at `/app/data`. Later starts retain the database and apply only pending migrations. Once a Super Admin exists, the setup form is disabled and redirects to the login page.

## Automated validation

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Vérification visuelle du prototype

Le projet ne dispose pas encore d'un service de snapshots visuels avec images de référence. Avant validation d'une modification d'interface, vérifier manuellement les points suivants dans les deux thèmes :

1. Ouvrir `/`, puis utiliser le bouton de thème dans l'en-tête et recharger la page pour contrôler sa persistance.
2. Ouvrir `/tools/villes` et vérifier les encarts de résultat, les valeurs en JetBrains Mono et les steppers `−/+`.
3. Ouvrir `/tools/competences` et vérifier la bascule de mode Gemmes, ainsi que les quatre blocs du Simulateur de Stuff.
4. Ouvrir `/tools/referentiels` et contrôler les badges de rareté Gris, Vert, Bleu, Violet et Or.
5. Contrôler à largeur mobile que les panneaux, tableaux et champs restent utilisables sans modifier le comportement des calculateurs.

La référence visuelle est `docs/prototype-ml-helper-unifie.html` : titres Cinzel, texte IBM Plex Sans, valeurs numériques JetBrains Mono, palette sombre et composants `.total-box`, `.mode-switch`, `.num-stepper` et `.rarity-badge`.
