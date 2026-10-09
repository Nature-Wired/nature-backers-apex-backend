# Isolated AWS staging plan — review only

**Superseded compute/network/cost proposal:** account is now confirmed as `296903956631`, staging region `us-west-2`, existing Amplify applications `us-west-1`. App Runner is not assumed available to new customers. Use `OCTOBER_15_ECS_STAGING_REVISION.md` for the current proposed backend architecture, costs and approval gates; the App Runner tables below are historical and must not be provisioned.

Prepared 2026-10-09 (America/Los_Angeles). No AWS resources, infrastructure, production databases or deployments were changed. This extends the approved feature branches. Updated target: OC Sports Summit October 15, 2026; event time still needed. Use the existing Nature Wired AWS account, with account ID/region/role unconfirmed. Cost scenario uses us-west-2, not a discovered deployment region. AWS-generated staging HTTPS URLs are acceptable. Budget and badge-retention owner remain unconfirmed. The three-project shortlist is explicitly pending approval; keep any live campaign DRAFT and never run auto-publishing configure:sports before separate publication authorization.

## Existing resources: known URLs, unverified mapping

| User-provided URL | Known purpose | Metadata needed before any reuse |
|---|---|---|
| https://main.d2falv1xg02otc.amplifyapp.com/ | Existing frontend | Amplify application/branch, account/region, connected repository/branch/commit, build/runtime/environment and deployed artifact |
| https://d5p35cby3bgug.cloudfront.net/ | Existing backend endpoint | CloudFront distribution ID/account, origin domain/path/type, behaviors, upstream service and deployed commit/image/version |
| https://d3chyxfaxhbtc9.cloudfront.net/ | Existing campaign API endpoint | Distribution/origin metadata plus API Gateway/service routes, database and legacy notification/Lambda wiring |

These URLs do not establish that the Apex backend or preserved Next.js commit is deployed behind them. No account inspection or origin mapping has been completed. Do not reuse databases, change origins, repoint main or overwrite deployed branches based on URL similarity. New resources avoid that dependency; original employee services stay intact.

## Recommended resources

| Resource | Proposed isolated configuration | Purpose |
|---|---|---|
| Amplify Hosting | NEW Next.js SSR application `nature-backers-sports-staging`, connected only to the frontend feature branch; automatic deployment disabled initially | Mobile fan, claim/download proxy and protected reporting pages; default HTTPS Amplify domain is sufficient initially |
| ECR | NEW private image repository `nature-backers-sports-staging` with immutable tags and digest-pinned release | Backend container built from the reviewed feature commit |
| App Runner | NEW container service `nature-backers-sports-staging`; start command `node dist/src/sports/main.js`, port 8080, 0.5 vCPU/1 GB, min/max instances 1 initially; TCP health check for initial deployment | Dedicated sports API; NEVER use default `start:prod` or legacy AppModule entrypoint |
| RDS PostgreSQL | NEW PostgreSQL 16 Single-AZ db.t4g.micro, 20 GB encrypted gp3; database `sports_staging`, no public access, separate migration/app users; seven-day backup retention | Persistent campaign, snapshots, anonymous selections and badges; no shared employee DB |
| VPC | NEW staging-only VPC, private subnets in two AZs, RDS subnet group and App Runner VPC connector | DB security group allows 5432 only from the connector security group |
| Internet egress | One public subnet, Internet Gateway and one NAT Gateway/EIP; private subnet routes through NAT | Required for backend live Atlas retrieval when using App Runner VPC egress; NOT needed for fans reading already-stored snapshots, but still needed for protected curation |
| Secrets Manager/IAM | Separate staging secrets, App Runner instance role scoped to its secrets; ECR access role, narrow build/deploy role | Server-only database credentials, Atlas and signing keys; no static AWS access keys in application env |
| CloudWatch | Seven-day staging log retention; alarm for 5xx, DB connection failures and memory pressure; budget alert | Operational checks with no API keys, authorization headers, request bodies or claim URLs logged |

App Runner provides HTTPS and load balancing; no additional ALB, CloudFront distribution, Lambda or API Gateway is needed. The dedicated API is a public TLS service with verified authorization on every administrative/reporting route; the database is private. Amplify SSR cannot be assumed to reach a private App Runner ingress endpoint. Use the public HTTPS API with server-only assertions. Fans use same-origin Next.js routes; admin mutations are not exposed by that proxy.

The single NAT Gateway, Single-AZ database and one API instance are deliberate demonstration limits, not a high-availability design. Increase only after budget/traffic approval. App Runner VPC egress also affects other application outbound requests; Secrets Manager env injection is by the service instance role, not by browser code. Never omit the NAT route and assume Atlas calls will continue working.

## Environment configuration

Backend server:

| Name | Value/type and handling |
|---|---|
| NODE_ENV | production |
| SPORTS_HOST / SPORTS_PORT | 0.0.0.0 / 8080; localhost default would prevent App Runner ingress |
| DATABASE_URL | Staging DB ONLY; secret; require TLS with trusted RDS CA and strict certificate validation supported by the native Prisma connector; limited connection pool |
| ATLAS_API_KEY | Staging AWS secret, securely provisioned by owner; never copy the Codex proxy placeholder or print/reuse its value in scripts |
| ATLAS_API_URL | Confirmed HTTPS Atlas base URL; implementation default https://atlas.xeptagon.com/api/v1 |
| SPORTS_PARTICIPANT_SECRET | Stable 32+ character secret for this campaign; keep across deployments |
| SPORTS_CLAIM_KEYS | Secret JSON map of versioned 32+ character signing keys; retain every version used by issued rewards |
| SPORTS_CLAIM_KEY_VERSION | v1 initially; change only through a reviewed rotation retaining old keys |
| SPORTS_ADMIN_JWT_SECRET | 32+ character shared frontend/backend secret; stable for the demo |
| SPORTS_ADMIN_EMAILS | Explicit lowercase verified Google email allowlist; sponsor operators must be authorized by owner |
| SPORTS_ALLOW_FIXTURES | false; live staging ballot must not contain DEVELOPMENT_FIXTURE records |

Frontend SSR server (reporting stays protected if OAuth is unavailable):

| Name | Value/type and handling |
|---|---|
| SPORTS_BACKEND_URL | New App Runner HTTPS URL; not either existing campaign CloudFront origin |
| SPORTS_PUBLIC_ORIGIN | Exact new Amplify HTTPS origin, or approved custom staging domain; required for POST origin check |
| SPORTS_ADMIN_JWT_SECRET / SPORTS_ADMIN_EMAILS | Match backend; server-only |
| AUTH_SECRET | New staging NextAuth session-signing secret; server-only |
| AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET | Separate or explicitly approved Google OAuth client; secret stays server-only |
| NEXTAUTH_URL / AUTH_URL | Exact staging HTTPS origin; register `/api/auth/callback/google` on that origin with Google |
| NEXT_PUBLIC_NATUREWIRED_API | Only a separate approved legacy staging API if exercising employee features; NEVER point test mutations at production |

Existing employee Google OAuth credentials exist, but staging access/callback registration is unconfirmed. Prefer a separate staging OAuth client or explicitly approved callback addition by its owner. If unavailable, keep reporting locked and mark the complete sponsor demonstration blocked; do not ship a public dashboard, impersonate a user, put tokens in URLs or use caller-provided IDs as a fallback. Fans remain anonymous without OAuth.

Amplify build environment values must not be assumed to propagate automatically to SSR runtime. Use the supported server-runtime injection for the selected Amplify platform, and verify server API routes can read the required variables before rehearsal. If an approved pipeline must write `.env.production`, whitelist only required server variables into an ignored, nonpublic server deployment artifact; never dump the process environment, commit the file, echo secrets or inject them via next.config.env/NEXT_PUBLIC. Check built browser chunks for test sentinels and secret references.

Original employee production frontend/backend remain untouched. The isolated sports runtime has no legacy routes. Employee/wizard source remains in the new frontend, but an end-to-end legacy staging rehearsal requires a separately isolated legacy API; pointing its public API variable at the sports-only backend will not make those routes work. Current regression checks use controlled legacy responses. Live OAuth, historical triggers, campaign emails and deployed employee contracts still need an owner's test environment; no claims of a full production regression test are made.

## Database and release procedure after approval

1. Freeze frontend/backend feature commit hashes and image digest; confirm private Git dependency/build access, tested Node/runtime version and Amplify SSR compatibility. Local testing used Node 24.19.0. If AWS uses a different supported Node version, repeat CI checks on it. Build with NORMAL `npm run build`/`prisma generate`, not engine-free test types. Native Prisma/PostgreSQL/browser tests now pass locally with checksum bypass absent.
2. Provision only the new resources above after explicit approval. Confirm account ID, region, resource tags, isolated DB endpoint, role permissions and rollback owner. Add no references to production database or legacy status Lambda/SES/wallet secrets.
3. Review/apply only `20261009000000_add_isolated_sports_demo/migration.sql` to the new sports DB through a migration job in its VPC, in a single transaction with stop-on-error. Record SQL SHA256 and release receipt. Do not replay the entire historical Prisma migration directory, run db push/reset, or mark legacy migration history as applied. Generate the full Prisma client; only sports tables are queried by the dedicated runtime.
4. Start the dedicated API and frontend. Verify TCP health plus actual protected DB-backed API requests; health alone does not establish DB or Atlas readiness. Verify SSL, secrets, origin checks, public route isolation and all admin/reporting 401/403 cases.
5. Run live Guardian-plugin search/details with the correct credential/base URL. Prepare three candidate records with matched sourceTimestamp, retrieved metadata and evidence of nature/community relevance. Atlas listing/status is not proof of funding eligibility, credit availability, title, partnership or transferable rights. Obtain project-shortlist approval before curation/publication.
6. Create a fresh DRAFT sports campaign with approved fictional/configurable event/partners/window and optional illustrative commitment. Curate the three approved timestamps through protected administration; check stored metadata snapshots/provenance. Then review and publish. `configure:sports` immediately publishes after curation, so do not use it while shortlist/ballot approval is pending. Never insert into legacy Campaign/Project tables.
7. Generate QR for `https://<new-amplify-host>/fan/<approved-slug>` and provide that HTTPS URL. Reporting is `https://<new-amplify-host>/admin/sports/<approved-slug>`; claims use the same host `/rewards/<token>`. Keep the hostname stable after badge issuance; a later domain move needs a redirect retaining old claims.
8. Rehearse iOS/Android camera scan, three live project cards, one tap selection, unstable-network retry, duplicate conflict, claim in a clean browser, actual download and protected dashboard matching DB counts. Check a server restart and an approved DB backup/restore test. Do not run destructive failure tests in a DB containing real demo participation without separate approval.

## Tests and operations

Predeploy local/CI sequence: backend `npm run build`, `npm run test:sports`, `npm run test:employee-compatibility`, `npm run test:atlas-verifier`, `npm run test:sports-schema`; frontend `npm run build`, `npm run test:sports`; backend `npm run test:sports-native-integration`. The native integration creates/removes a disposable PostgreSQL container and runs a real Next.js → NestJS → PostgreSQL mobile flow, including dashboard authorization, QR URL generation and download. It never reads application's DATABASE_URL. Fixtures are explicitly labeled and are not live Atlas tests.

Use one backend instance initially because in-memory rate limits are per instance and socket peers aggregate fans behind the Next.js proxy. Existing DB uniqueness/idempotency remains authoritative across instances, but neither random browser IDs nor IP limits verify unique people. If expected throughput exceeds this limit, approve an edge/shared limiter and load rehearsal before the event; do not silently trust forwarded IP headers.

Keep signing keys, snapshots, DB and claim hostname after the event if rewards are promised to persist. Stopping the service makes claims unavailable; deleting the DB/key makes them unrecoverable. Define retention/hosting budget before teardown. Rollback uses a prior compatible image/frontend commit and retains sports rows/keys; no DROP tables or production reset. Event owner must decide retention period and provide support contact.

## Indicative cost budget, USD

Assumptions: us-west-2, 730 hours/month, one small API instance, about 20 active CPU-hours/month, fewer than 1,000 demo sessions, 20 GB DB, low logs/egress, no free-tier credits. These are planning estimates, NOT a live AWS quotation; pricing endpoint retrieval was unavailable. Recheck the official [AWS calculator](https://calculator.aws/) and [App Runner](https://aws.amazon.com/apprunner/pricing/), [RDS](https://aws.amazon.com/rds/postgresql/pricing/), [VPC](https://aws.amazon.com/vpc/pricing/), [Amplify](https://aws.amazon.com/amplify/pricing/) rates for the confirmed region.

| Component | Approximate monthly cost |
|---|---:|
| App Runner 0.5 vCPU/1 GB, low active time | $6–12; about $29 if continuously CPU-active all month |
| RDS db.t4g.micro + 20 GB gp3 | $15–25 |
| One NAT Gateway + EIP | $36–42 plus traffic; usually the largest baseline cost |
| Amplify build/SSR/hosting/delivery | $1–10 at demonstration traffic |
| Staging Secrets Manager, ECR, logs/alarms and small backup excess | $4–9 |
| TOTAL low-use month | $62–98 |

A seven-day rehearsal/event allocation is roughly $15–30 with setup/build overhead, assuming resources are removed promptly except the badge-retention service/DB/key. A continually active API increases the estimate; NAT/data-transfer, backup retention and extra instances also add cost. Custom domain registration, WAF/shared rate limiting, tax and a separate legacy staging service are excluded. Use default Amplify/App Runner HTTPS domains to avoid domain work initially. Lower-cost VM/self-managed Postgres alternatives trade away managed backups/operations and are not the recommended fast path for this demo.

## Deadline and information/approval needed

October 9: source and isolated testing are complete; owner reports live compiled-adapter verification passed on Mac. Codex proxy routing remains separate and should not drive API/plugin changes. October 10–12: target AWS/OAuth/retention decisions and explicit staging provisioning approval, then isolated provisioning/build/authentication checks. October 13: target approved live DRAFT curation and stored snapshot verification. October 14: target separately authorized campaign publication and real-phone/backup/authorization rehearsal. October 15: demonstration. These are readiness targets, not permission to deploy or a delivery promise while prerequisites remain unresolved. Do not substitute fixtures for real projects or expose reporting publicly.

## Fresh-task handoff: next action for the owner

In Codex environment settings, confirm that the existing Network secret is bound to the application variable `ATLAS_API_KEY` for the confirmed Atlas HTTPS hostname (currently `atlas.xeptagon.com`). Review/save the environment changes and publish the environment using the available UI. Do not paste or duplicate the key in chat. A saved draft does not inject it into this running task.

Start a new task using that published environment and select `feat/oc-summit-milestone-a` in both primary repositories. Read `docs/RESUME_TESTING.md`, this plan and `docs/HISTORICAL_ARCHITECTURE_ATLAS_RECONCILIATION.md`. Verify the remote feature tips and preserve changes; never reset to main. Check variable presence only. If the new task still lacks the binding, report that once and stop credential-dependent requests; do not assume publication succeeded merely because settings were saved.

With the binding accessible, run backend `npm run atlas:verify -- --query mangrove`, then nature/community searches and detail retrieval through the installed Guardian plugin. Validate identities, native SDGs and metadata/provenance, and present three real candidates plus evidence and limitations for owner approval. Do not publish or configure an auto-publishing campaign before that approval; do not claim funding availability from listing. Keep credentials server-side and sanitize errors. No legacy SDG keyword mapping or classification is authorized.

Staging startup is a mandatory release gate: `npm run start:sports` (equivalently `node dist/src/sports/main.js`), `SPORTS_HOST=0.0.0.0`, `SPORTS_PORT=8080`. Never use `start:prod` or `dist/src/main.js`. Owner approval must name the target account/region, new resources and budget, reviewed sports-only SQL against the new isolated DB, release commits/image and OAuth/admin configuration before any AWS changes. Campaign project approval is separate from deployment approval.

AWS account ID and deployment role; region; event/rehearsal date; approved budget and badge retention; OAuth client/admin allowlist; desired domain; expected peak traffic; owner to securely provision staging secrets; and, for legacy live regression, separate legacy staging API/database details. Existing Amplify/CloudFront IDs and origin mappings are only needed if reusing resources; this plan intentionally creates isolated services. Approve the three real project candidates and then the concrete staging release before any resource creation/deployment.
