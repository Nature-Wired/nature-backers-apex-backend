# Milestone A migration impact review

The sports migration creates five sports-only tables and one enum. It does not alter legacy Campaign, Project, Vote, User, department tables, triggers, listeners or data. There are no foreign keys to legacy models. Consequently sports inserts/updates cannot invoke the legacy campaign_inserted, campaign_status_updated or project_created triggers.

New constraints enforce ballot membership, positions 1–3, unique campaign/browser and campaign/idempotency combinations, one issuance per selection, valid windows, nonnegative optional commitments with currency, and supported badge type. Exactly three distinct snapshots and ballot immutability are enforced by publication/curation services.

Apply only to a new disposable local PostgreSQL database for initial tests. The disposable tests create representative legacy sentinel tables and automation probe triggers, then apply ONLY this reviewed sports SQL migration. They verify legacy tables/data/triggers unchanged and zero sports-triggered automation effects. HTTP tests use Prisma's supported test-only PostgreSQL driver adapter with a generated WASM client. These checks do not prove a historical fresh migration replay, preservation of every original employee behavior, or production migration compatibility.

Before AWS staging: obtain actual schema, trigger definitions and Prisma migration history; diff against this baseline; check table-name collisions and PostgreSQL version; inspect migration SQL; take an approved backup; run in separate staging database. Never reset or migrate production as part of tests. Rollback application exposure before considering table removal; retain selections/rewards. Deployment authorization is separate.
