#!/usr/bin/env bash
# Fresh isolated install/build; never modifies shared node_modules or runs migrations.
set -Eeuo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary/src" "$temporary/prisma"
cp "$root"/packaging/sports/package*.json "$root"/tsconfig.json "$root"/tsconfig.sports.json "$temporary/"
cp -R "$root/src/sports" "$temporary/src/"
cp "$root"/prisma/schema.prisma "$root"/prisma/prisma.module.ts "$root"/prisma/prisma.service.ts "$temporary/prisma/"
cd "$temporary"
npm ci --ignore-scripts --no-audit --no-fund
npm run build
SPORTS_PACKAGE_TEST_DIR="$temporary" node --test "$root/scripts/test-sports-packaging.cjs"
npm prune --omit=dev --ignore-scripts --no-audit --no-fund
SPORTS_PACKAGE_TEST_DIR="$temporary" node --test "$root/scripts/test-sports-packaging.cjs"
