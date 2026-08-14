# ML-Helper

ML-Helper is the administration foundation for the future community site. Phase 1 contains the Prisma data model, admin authentication, user management, and audit logs; it does not expose any public calculator yet.

## Quick manual test

### Environment

Requires Node.js 22 and pnpm. Copy the provided environment template:

```sh
cp .env.example .env
```

The required values are:

```dotenv
DATABASE_URL="file:./data/ml-helper.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-secret"
SUPER_ADMIN_USERNAME="rootadmin"
SUPER_ADMIN_PASSWORD="replace-with-a-strong-password"
```

Replace `NEXTAUTH_SECRET` with a long random value and use a unique password containing at least 12 characters. Do not commit the resulting `.env` file.

### Install and initialize Prisma

```sh
pnpm install
pnpm prisma:generate
pnpm prisma db push
pnpm prisma db seed
```

`prisma db push` applies the current schema to SQLite. The seed reads `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` from `.env` and upserts the first user with the `super_admin` role. It is safe to run it again to restore that account's role or change its password.

### Start locally

```sh
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login), sign in with the bootstrap credentials, then:

1. open **Users** and create a user with the `admin` role;
2. open **Logs**;
3. verify that the account creation appears in the audit log;
4. optionally delete the test Admin account.

This validates the Phase 1 definition of done: a Super Admin can sign in, create an Admin, and see the corresponding log.

## Test with the `:dev` Docker image

The production image does not contain the Prisma CLI. Before its first start, initialize a host directory from the checked-out project and bootstrap the Super Admin:

```sh
pnpm install
pnpm prisma:generate
mkdir -p data
DATABASE_URL="file:$PWD/data/ml-helper.db" pnpm prisma db push
DATABASE_URL="file:$PWD/data/ml-helper.db" pnpm prisma db seed
```

Then pull and run the development image:

```sh
docker pull ghcr.io/magicgg91/ml-helper:dev
docker run --rm \
  --name ml-helper \
  -p 3000:3000 \
  --mount type=bind,src="$PWD/data",dst=/app/data \
  -e DATABASE_URL="file:/app/data/ml-helper.db" \
  -e NEXTAUTH_URL="http://YOUR_SERVER_HOST:3000" \
  -e NEXTAUTH_SECRET="replace-with-the-same-long-random-secret" \
  ghcr.io/magicgg91/ml-helper:dev
```

Replace `YOUR_SERVER_HOST` with the hostname or IP address used in the browser. The SQLite database and bootstrap account persist in the host `data` directory. For a private GitHub Container Registry package, run `docker login ghcr.io` before `docker pull` with a token allowed to read packages.

## Automated validation

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```
