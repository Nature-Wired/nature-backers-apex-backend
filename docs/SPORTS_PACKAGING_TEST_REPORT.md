# Sports packaging verification — October 10, 2026

Development branch: feat/oc-summit-milestone-a. Shared package.json/package-lock.json, Prisma schema, employee source and SportsAtlasService are unchanged. Guardian Agent plugin and Scaffold-HBAR remain unchanged.

Passed:

- Normal shared npm run build, including native Prisma generation.
- Sports unit tests: 21; employee compatibility tests: 6.
- Fresh isolated npm ci and sports-only TypeScript build, using the separate committed manifest/lock.
- Four packaging tests before production pruning, and the same four after pruning: npm-only lock/no Indexer resolution, compiled output isolation, actual published plugin search/detail HTTP behavior, identity mismatch and sanitized upstream errors.
- Controlled loopback requests verified x-api-key behavior, search data envelope, raw detail envelope, native timestamps, metadata, integer SDGs and Atlas provenance. No live Atlas credentials or project records used.
- Native sports entrypoint with empty disposable PostgreSQL: liveness 200, readiness 503, legacy Indexer route 404, zero public tables. No schema setup for this check.
- Full native PostgreSQL/mobile-browser regression against both the shared compiled artifact and isolated compiled artifact. This included test-only sports SQL and sentinel legacy triggers in disposable databases, explicitly authorized by the user. Anonymous selections, concurrency/idempotency, rollback, claims/download, dashboard authorization/counts and no legacy writes/automation passed.
- Revised S3 buildspec YAML/Bash syntax and IAM policy JSON validation.

Remaining validation:

- Full Docker image build is blocked in Codex: Docker RUN cannot resolve Debian repository hosts, causing apt installation failure. The native isolated build passed, but this does not establish that the final Docker image builds or runs. No TLS, checksum or package verification was disabled.
- Run the reviewed temporary CodeBuild build after separate resource/execution approval. Its checksum/commit checks, container plugin tests and health responses must pass before ECR/ECS work.
- No AWS resources, ECR publication, staging/production migration or deployment occurred. Real iPhone staging verification and approved live three-project ballot remain separate prerequisites.

Transitive installation reports a crypto-js deprecation from the retained Agent Kit dependency tree. No automatic upgrades or plugin changes were introduced; review upstream maintenance separately from this packaging change.
