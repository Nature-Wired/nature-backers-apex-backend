# Isolated sports packaging

The shared package.json/package-lock.json, employee modules, Prisma schema and normal Nest build are unchanged. Dockerfile.sports installs packaging/sports/package.json and its own lockfile at /app, generates the existing Prisma client, and compiles tsconfig.sports.json. The compiler follows imports from src/sports/main.ts into sports modules and prisma/prisma.module.ts/prisma.service.ts only. It does not compile AppModule, employee modules, Indexer, listeners or blockchain automation. The image still starts node dist/src/sports/main.js as non-root and retains both sports health endpoints.

The isolated manifest pins direct versions to the versions resolved in the shared lockfile at introduction. It explicitly retains @nature-wired/hedera-guardian-agent-plugin and its @hashgraph/hedera-agent-kit peer dependency. The separate transitive lock is its own reproducibility contract; it need not mirror every shared transitive version. All resolved artifacts must come from the npm registry, with integrity values. No CarbonSustain/Git dependency is allowed. This is packaging isolation, not a rewrite of Atlas or an attempt to remove every Hedera-related library from the Agent Kit.

## Reproduce without changing the shared install

With supported Node 24/npm, Bash and normal secure npm/Prisma network access:

```bash
bash scripts/test-sports-package-install.sh
```

If the default npm cache is not writable, set npm_config_cache to a writable temporary path. The runner creates and removes its own temporary build directory, runs npm ci with install scripts disabled, generates Prisma, compiles sports, tests actual plugin HTTP calls using controlled loopback responses, prunes development dependencies and repeats the tests. It never migrates a database or uses live Atlas credentials. Registry integrity and Prisma engine checks remain enabled.

Do not run the isolated tsc directly against the shared node_modules and treat that as proof of isolation. The Dockerfile and fresh-install runner intentionally place the sports manifest at the build root, preserving TypeScript and Node module resolution and the existing dist/src/sports/main.js path.

## Updating dependencies

1. Propose dependency updates in packaging/sports/package.json separately from the shared application contract. Preserve compatible Nest major versions, identical Prisma CLI/client versions, and the Guardian plugin's Agent Kit peer range.
2. Use the supported Node/npm version to regenerate only the sports lock: npm install --package-lock-only --ignore-scripts --prefix packaging/sports. Review the lock diff, registry origins, integrity values, peer resolution and advisories; do not automatically upgrade the shared lock.
3. Run the fresh-install runner, normal application build, sports unit tests and employee compatibility tests. Run native persistence/browser regression tests only with authorization for their disposable database schema setup.
4. Build and smoke-test Dockerfile.sports with temporary empty PostgreSQL, without migrations. Liveness must be 200; readiness must be 503 until a separately approved isolated schema exists.
5. Review image contents, default CMD, non-root user and healthcheck. Commit the separate manifest/lock together. Source archives and CodeBuild commit/checksum settings must be regenerated for that new commit.

The shared dependency contract still includes the legacy Indexer for employee workflows. No production infrastructure, reference repository or live project metadata changes are part of this packaging change.

## Native regression against an isolated artifact

For a retained fresh sports build directory (before pruning its development dependencies), set SPORTS_PACKAGE_TEST_DIR to its absolute path when invoking npm run test:sports-native-integration from the repository. The harness uses that artifact's Prisma client, SportsModule and Nest testing package. Nest testing is development-only and is removed from the production image. Using the shared testing factory with another install's exception classes can produce misleading HTTP failures; the harness now deliberately keeps those classes together.

This existing integration test applies sports SQL only to its own disposable Docker PostgreSQL database and creates legacy sentinel triggers there. Obtain test-only schema authorization first. It must never point at staging/production. It verifies anonymous persistence, idempotency, concurrency, rollback, immutable snapshots, badge retrieval/download, reporting authorization and mobile Next.js participation, with zero sentinel legacy writes.

Without schema setup, a separate check is available:

```bash
SPORTS_PACKAGE_TEST_DIR=/absolute/path/to/built-sports-package node scripts/test-sports-empty-db.cjs
```

It starts native Prisma against an empty disposable PostgreSQL instance, checks liveness 200/readiness 503/Indexer route 404, and removes the container and anonymous volume. It does not execute SQL migrations.
