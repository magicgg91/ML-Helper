# ML-Helper

ML-Helper is the administration foundation for the future community site. Phase 1 contains the Prisma data model, admin authentication, user management, and audit logs; it does not expose any public calculator yet.

## Quick Docker test

1. Copy the environment template, set the public URL of the instance and replace `NEXTAUTH_SECRET` with a secure random value.

   ```sh
   cp .env.example .env
   ```

   Both settings are deliberately visible in the `environment:` section of `docker-compose.yml`, with development defaults/examples:

   - `NEXTAUTH_URL` is the external URL used by NextAuth for authentication callbacks and cookies. Set it to the exact address used to access the application, including its port, or to the HTTPS URL exposed by your reverse proxy (for example `http://192.168.10.145:43000` or `https://ml-helper.example.com`).
   - `NEXTAUTH_SECRET` signs and encrypts authentication data and sessions. Replace the example value with a long, random, private value and keep it stable between container restarts.

   You can edit the defaults directly in `docker-compose.yml`, or define `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in `.env`. Compose interpolation gives values from `.env` (or the shell environment) priority over the defaults written in the Compose file.

2. Pull and start the `ghcr.io/magicgg91/ml-helper:dev` image. The container applies all committed Prisma migrations automatically.

   ```sh
   docker compose up
   ```

3. Open [http://localhost:3000/admin](http://localhost:3000/admin). At first launch, create the initial Super Admin directly in the one-time setup form, then sign in.

SQLite always uses `/app/data/database.db` inside the image; `DATABASE_URL` is therefore not configurable and is not needed in `.env`. By default, data persists in the local `./data` directory. To store it elsewhere, change only the host side of the bind mount in `docker-compose.yml` (the value before `:/app/data`). Later starts retain the database and apply only pending migrations. Once a Super Admin exists, the setup form is disabled and redirects to the login page.

When upgrading an existing installation that still has `data/ml-helper.db`, stop the container and rename that file to `data/database.db` before starting the new image. Otherwise the application correctly creates a new, empty database under the new fixed name.

Docker Compose checks the internal URL `http://127.0.0.1:3000/api/health`
every 30 seconds with a small Node.js script included in the image. The check
does not depend on `curl`, `wget`, `NEXTAUTH_URL`, or the host port mapping. A
60-second startup grace period leaves time for Prisma migrations and the
application startup. The container is reported healthy only when the
application responds and Prisma can query the SQLite database.

## Administration security

The login endpoint allows five consecutive failures for one normalized
username, then blocks that identifier for 15 minutes. The counter and lock are
stored in SQLite, so restarting the container does not bypass the protection.
Authentication failures deliberately use one generic message, whether the
username, password, TOTP code, or rate limit caused the rejection.

Each administrator can enable TOTP two-factor authentication from the account
menu. The setup displays a QR code compatible with common authenticator apps
and requires a valid six-digit code before activation. TOTP secrets are
encrypted at rest with a key derived from `NEXTAUTH_SECRET`; keep that value
private and stable, because changing it invalidates existing TOTP enrollments
as well as active sessions.

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
