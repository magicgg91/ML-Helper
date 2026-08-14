# ML-Helper

Technical foundation for the ML-Helper community site. This stage contains no functional calculator or administration feature.

## Local development

Requires Node.js 22 and pnpm. Copy `.env.example` to `.env`, then run:

```sh
pnpm install
pnpm prisma:generate
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
