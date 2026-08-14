#!/bin/sh
set -eu

chown nextjs:nodejs /app/data

su-exec nextjs ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
su-exec nextjs node ./bootstrap-superadmin.mjs

exec su-exec nextjs "$@"
