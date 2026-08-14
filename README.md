# ML-Helper

Technical foundation for the ML-Helper community site. This stage contains no functional calculator or administration feature.

## Local development

Requires Node.js 22 and pnpm. Copy `.env.example` to `.env`, then run:

```sh
pnpm install
pnpm prisma:generate
pnpm prisma db push
SUPER_ADMIN_USERNAME=rootadmin SUPER_ADMIN_PASSWORD='replace-with-a-strong-password' pnpm prisma db seed
pnpm dev
```

## Validation

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Docker

```sh
docker build -t ml-helper:dev .
docker run --rm -p 3000:3000 --mount type=bind,src="$PWD/data",dst=/app/data ml-helper:dev
```

The image uses Next.js standalone output and persists SQLite data in `/app/data` through a host bind mount.

Set `DATABASE_URL=file:/app/data/ml-helper.db`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and the bootstrap Super Admin variables in the runtime environment. The bootstrap password must contain at least 12 characters.
