# Milestone A staging review

Development branch: `feat/oc-summit-milestone-a` in both repositories. No push, AWS deployment or production database operation is authorized by this checklist.

## Current validation and limitations

The standalone sports entrypoint (`src/sports/main.ts`) imports only SportsModule/PrismaModule. It never starts legacy PostgreSQL listeners, campaign-status Lambdas, SES, payments or scheduled jobs. Full AppModule keeps the original employee modules and adds sports routes; expose the dedicated sports runtime for this demonstration.

The SQL and HTTP tests start and remove their own PostgreSQL 16 containers, never read DATABASE_URL, and test representative legacy sentinels. They do not reproduce the deployed legacy schema or establish deployment mappings. Native Prisma download is currently denied by the environment proxy. Schema WASM validation, full NestJS compilation and actual HTTP/database integration passed using packaged Prisma tooling and its supported test-only PostgreSQL driver adapter. This does not validate the production native-engine artifact or AWS deployment.

Fan browser tests use explicitly labeled mocked development responses. They validate frontend behavior, not backend persistence. Separate real NestJS/Prisma/PostgreSQL HTTP tests cover anonymous selections, concurrent retries, reward persistence across application restart, protected reports, funding labels, rate limits, closed campaigns and zero legacy writes/trigger effects. A browser-to-real-backend staging smoke and original employee/wizard regressions remain required.

## Server configuration

Backend only: `DATABASE_URL`, `ATLAS_API_KEY`, `ATLAS_API_URL` (default https://atlas.xeptagon.com/api/v1), `SPORTS_PARTICIPANT_SECRET` (32+ characters), `SPORTS_CLAIM_KEYS` (JSON object of versioned 32+ character signing keys), `SPORTS_CLAIM_KEY_VERSION` (default v1), `SPORTS_ADMIN_JWT_SECRET` (32+ characters), and explicit `SPORTS_ADMIN_EMAILS` allowlist. Retain all claim key versions used by issued rewards. Changing participant secret allows the same browser identity to be counted again; preserve it through the event.

Frontend server only: `SPORTS_BACKEND_URL`, matching `SPORTS_ADMIN_JWT_SECRET` and `SPORTS_ADMIN_EMAILS`, `SPORTS_PUBLIC_ORIGIN`, existing Google provider credentials and `AUTH_SECRET`. Fans never need Google credentials, wallet, email or registration. Atlas credentials must never be supplied through NEXT_PUBLIC variables, next.config.env, props, browser requests or committed dotenv files. Request/error logging must redact authorization/API-key headers and badge claim URLs.

Development only: `SPORTS_ALLOW_FIXTURES=true` enables visibly labeled fixtures; production rejects them. Production badge/ballot snapshots must have `SUSTAINABILITY_ATLAS` provenance. No payment, HCS, wallet or Hedera signing credentials are required for Milestone A.

## Before requesting staging approval

1. Confirm AWS account/region, Amplify application/branch/repository/commit/build environment, CloudFront distribution origin, API Gateway/Lambda or service deployment and actual database/migration history.
2. Review the additive SQL and actual staging schema diff, including existing triggers and table-name collisions. Provision an isolated staging database and an approved backup/rollback plan; never run prisma reset/db push on production.
3. Restore the Atlas runtime binding. Run `npm run atlas:verify -- --query mangrove`; search other nature/community keywords and evaluate returned methodology, location and developer data. SDGs alone do not prove local/community benefits. Verify each chosen detail sourceTimestamp matches search identity. Curate exactly three real projects after review. `--select timestamp1,timestamp2,timestamp3 --output /tmp/atlas-selected.json` saves allowlisted fetched snapshots; configuring a campaign retrieves them again through protected curation and stores immutable ballot snapshots.
4. Run backend build, sports unit tests, disposable SQL tests and full real NestJS/Postgres HTTP tests: anonymous success/retry/races, cross-ballot rejection, closed/draft rejection, badge atomicity and restart persistence, report authorization, rate limits, and zero legacy notifications. Then run the frontend build/browser tests and legacy employee/campaign wizard regression checks.
5. Configure the fictional sponsor/event through verified administration; operator script requires a short-lived `SPORTS_ADMIN_TOKEN` issued after server-side authorization. Funding is optional. If included, label it illustrative commitment/allocation, not disbursement.
6. Configure HTTPS, private backend/database network access and no public legacy administrative endpoints. The new allowlist/signed assertions protect sports administration only; they do not repair original legacy API authorization. Ensure unauthenticated access is limited to public sports reads, selections and claim/download endpoints. Admin Google sessions must include the new verified-email flag; existing sessions require reauthentication.
7. Configure edge rate limits for the deployment topology. Current app limits are per instance, keyed to socket peer and browser identifier; behind the frontend proxy all requests share a peer, and multiple instances have independent windows. Browser IDs can be reset/spoofed. Accepted selections are not verified unique fans.
8. Disable caching of reports and claim responses. Verify claim URL survives browser/server restart, QR opens the correct campaign on real phones, download works and dashboard counts match storage. Confirm no credential appears in client bundles or logs. Use a staging domain, retain badge data/signing keys and obtain explicit deployment approval.
