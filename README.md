# ML-Helper

ML-Helper is the administration foundation for the future community site. Phase 1 contains the Prisma data model, admin authentication, user management, and audit logs; it does not expose any public calculator yet.

## Quick Docker test

1. Copy the environment template, then replace the secret and bootstrap password with secure values. The password must contain at least 12 characters.

   ```sh
   cp .env.example .env
   ```

2. Pull and start the `ghcr.io/magicgg91/ml-helper:dev` image. The container applies all committed Prisma migrations and creates the bootstrap Super Admin only when that username does not already exist.

   ```sh
   docker compose up
   ```

3. Open [http://localhost:3000/admin](http://localhost:3000/admin) and sign in with `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` from `.env`.

SQLite data persists in the local `data/` directory mounted at `/app/data`. Later starts retain the database, apply only pending migrations, and leave an existing bootstrap account unchanged.

## Automated validation

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```
