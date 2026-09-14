# ML-Helper

ML-Helper is the administration foundation for the future community site. Phase 1 contains the Prisma data model, admin authentication, user management, and audit logs; it does not expose any public calculator yet.

## Deployment with Docker Compose

### Configuration

Copy the environment template and replace every example secret before starting
the service:

```sh
cp .env.example .env
```

The application and Compose deployment use the following variables:

| Variable          | Required                        | Description                                                                                                                                                                                                               |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Yes outside the published image | Prisma SQLite connection URL. `.env.example` uses `file:./dev.db` for local development. Compose deliberately overrides it with `file:/app/data/database.db`; do not point a container at a database outside `/app/data`. |
| `NEXTAUTH_URL`    | Yes                             | Exact public origin used for authentication callbacks and cookies, including the port (for example `http://192.168.10.145:3000`) or the HTTPS reverse-proxy URL.                                                          |
| `NEXTAUTH_SECRET` | Yes                             | Long, random, stable secret that signs sessions and derives the TOTP encryption key. Generate one with `openssl rand -base64 32`; changing it invalidates sessions and existing TOTP enrollment data.                     |
| `SMTP_HOST`       | Required for contact sending    | SMTP server hostname. The code uses separate host and port values; it does **not** read an SMTP URL variable.                                                                                                             |
| `SMTP_PORT`       | Required for contact sending    | Numeric SMTP port. Port `465` enables implicit TLS; other ports use the transport defaults (commonly STARTTLS on `587`).                                                                                                  |
| `SMTP_USER`       | Required for contact sending    | SMTP account and sender address.                                                                                                                                                                                          |
| `SMTP_PASSWORD`   | Required for contact sending    | Password or provider-issued credential for `SMTP_USER`.                                                                                                                                                                   |
| `CONTACT_EMAIL`   | Required for contact sending    | Destination mailbox that receives messages submitted through `/contact`.                                                                                                                                                  |
| `ML_HELPER_IMAGE` | Compose only                    | Container image reference. It defaults to `ghcr.io/magicgg91/ml-helper:dev`; set `ghcr.io/magicgg91/ml-helper:latest` for the stable deployment channel or another fully qualified image tag for local testing.           |

When any SMTP value is absent, the contact form reports that sending is not
configured instead of failing the rest of the site. Keep `.env` private; only
`.env.example` belongs in version control.

There are intentionally **no Super Admin username or password environment
variables**. Create the first administrator through the one-time `/admin/setup`
flow. After that account exists, the setup route redirects to login. Do not add
bootstrap credentials to `.env`, Compose, or container images.

### Start and persistence

Pull and start the configured image; the entrypoint applies all committed Prisma
migrations automatically:

```sh
docker compose pull
docker compose up -d
```

Open [http://localhost:3000/admin](http://localhost:3000/admin), or the origin
configured in `NEXTAUTH_URL`. On first launch, use `/admin/setup` to create the
initial Super Admin.

Compose bind-mounts the host `./data` directory at `/app/data`. The SQLite file
is `/app/data/database.db`, so both the database and any data-directory content
(such as future persisted uploads) survive container replacement. The current
application does not read a separate upload-path variable. To relocate storage,
change only the host side of `./data:/app/data`; keep the container path fixed.

When upgrading an installation that still has `data/ml-helper.db`, stop the
container and rename it to `data/database.db` before starting the new image.
Otherwise the application creates a new, empty database at the fixed path.

Docker Compose checks `http://127.0.0.1:3000/api/health` every 30 seconds with
the Node.js script included in the image. It does not depend on `curl`, `wget`,
`NEXTAUTH_URL`, or the host port mapping. A 60-second startup grace period
allows migrations and application startup to complete. The container is only
reported healthy after the application responds and Prisma can query SQLite.

### Build the image locally

```sh
docker build -t ml-helper:local .
ML_HELPER_IMAGE=ml-helper:local docker compose up -d
```

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
