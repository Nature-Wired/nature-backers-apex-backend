# October 10 readiness: successful Docker smoke, staging not yet approved

This is the current staging handoff, superseding outdated Docker-blocker, private Git dependency, health-endpoint and frontend-version statements in earlier staging documents. Target: October 14 iPhone rehearsal, October 15 OC Sports Summit, America/Los_Angeles. Preparation only; no new resource, image publication, migration or deployment is authorized here.

## Evidence and release identities

Owner-reported AWS CodeBuild build #4 on October 10, 2026, account 296903956631, us-west-2, backend source e088567351ef6b5ef634fe08bb88a03a0f1a7573:

`imageBuilt=true sportsStartup=true liveHTTP=200 readyHTTP=503 cleanup=true lastStage=complete exit=0`

Readiness 503 was expected with empty temporary PostgreSQL. This establishes successful image build and sports startup, not deployed readiness, RDS TLS, OAuth, live AWS Atlas access, load capacity or real iPhone behavior. Evidence is supplied by the owner, not an independently queried AWS build record. Capture full build ID/ARN, buildspec revision, actual archive SHA-256, build timestamps and report in the release receipt. Do not substitute a locally generated ZIP checksum for the one actually tested.

Backend deployment candidate: **e088567351ef6b5ef634fe08bb88a03a0f1a7573**. Later 9ea1f47/dbfaf7e commits correct buildspec documentation only; no application/image changes. Use the corrected inline docs/CODEBUILD_SPORTS_ARCHIVE.yml from dbfaf7eab77746b6022dd9c41d6f5d3ce27cf83c with the original approved source archive/commit/checksum. Backend image uses separate sports manifest/lock, sports-only compiled output, USER node and CMD node dist/src/sports/main.js. No CarbonSustain/Git dependency or keyword SDG mapping exists in this image.

Frontend deployment candidate: **24e0cae485bafb2fac8586bdbc8c6c6c98aa3a94**, Nature-Wired/Nature-Backers, feat/oc-summit-milestone-a. Includes protected dashboard scannable HTTPS QR/download/copy, anonymous fan selection and badge views. Native mobile-browser regression against isolated sports packaging passed locally. Employee wizard/source remain unchanged, but sports-only staging backend does not implement legacy employee API routes: do not describe the old wizard as functional against this backend or route staging legacy mutations to production. Preserve existing employee deployment separately. Fixture tests are not approval of live projects.

## Image publication — completed; exact digest pending receipt

Owner reports release build #5 succeeded October 10 and published to `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging`, source e088567351ef6b5ef634fe08bb88a03a0f1a7573, digestVerified=true. Its smoke report matches build #4: imageBuilt=true, sportsStartup=true, liveHTTP=200, readyHTTP=503, cleanup=true, lastStage=complete, exit=0. Owner subsequently confirmed tag `release-e088567-5`; the supplied digest `sha256:ea7fb45d672129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c` contains 63 hexadecimal characters, so it remains incomplete and must not be padded or used for deployment. Full sha256:64-hex value, tag, build ID, archive checksum and scan results remain to be recorded from ECR/CodeBuild. Do not rebuild or republish solely to obtain those read-only details. Build #4 local image retention is irrelevant now.

Reproduction: export the exact source commit using git archive; compute the actual ZIP SHA-256; use the corrected inline buildspec, managed Linux x86_64, small compute, privileged Docker, 15-minute timeout, no VPC/cache/production secrets. Verify ZIP SHA and embedded commit, lock origins, image CMD/user/architecture, four packaging/plugin tests (lockfile mounted read-only for test only), temporary PostgreSQL liveness/readiness and cleanup report. No migrations in this build.

For future separately approved release builds, use the same checks before an ECR push. Use new private repository nature-backers-sports-staging, immutable commit/release tag, and staging-scoped ECR push permissions. Record the resulting ECR repository manifest digest via ECR image details/API, image URI@sha256:digest, exact source/archive/buildspec/build ID and platform. A local Docker image ID is not the registry manifest digest. Scan findings must be reviewed. Rebuilds can differ because OS packages are fetched at build time; release by the newly tested digest, never claim bit-for-bit identity without evidence. Release #5 was executed by the owner; this document authorizes no further builds, pushes or deployment.

## Minimum isolated topology and configuration

NEW Amplify Next.js SSR application, NEW ECS Express/Fargate service and ALB, NEW private RDS PostgreSQL16, ECR, staging-only roles/secrets/logs, all in Oregon where supported. Existing us-west-1 Amplify, CloudFront, legacy backend, DNS and production VPC/DB stay untouched.

Documentation blockers resolved October 10: the owner verified official AWS documentation at https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html. Public subnets enable assignPublicIp for Express tasks; Express provisions an internet-facing ALB with HTTPS443, a generated service domain and ACM certificate. One-task scaling, port8080 and custom readiness paths are supported. This verification was supplied by the owner; the agent did not independently fetch the page through its blocked docs network path. Public-task Atlas egress therefore needs no NAT when IGW routes, DNS, NACLs and outbound security rules are correct. Still inspect selected subnets/security groups, CPU/memory, explicit min/max replicas, staging secret references and IAM in the actual creation form before approval. This is documentation confirmation, not account configuration or deployed connectivity verification.

Proposed VPC: public ALB across two AZs; public-IP tasks for outbound Atlas/ECR/secrets; private DB subnets in two AZs. Task inbound8080 only from ALB SG; DB inbound5432 only from task SG. No public DB, no NAT. Confirm actual generated SG IDs and routes. Task binds0.0.0.0:8080. ALB readiness path /health/sports, expected200, suggested120s grace; never accept503 as deployed healthy. Restrict autoscaling maximum to the approved cost envelope.

Execution role: ECS image-pull/logging and only staging Secrets Manager ARNs (KMS decrypt if applicable). Task role: no application AWS permissions required. Express infrastructure role: review wizard-required trust/policy and scope. Operator PassRole restricted to these new roles. No production roles or static access keys.

Backend secret references: DATABASE_URL, ATLAS_API_KEY, SPORTS_PARTICIPANT_SECRET, SPORTS_CLAIM_KEYS, SPORTS_ADMIN_JWT_SECRET. Stable32+ character signing values, versioned claim JSON map retained across restarts. Nonsecret env: NODE_ENV=production, SPORTS_HOST=0.0.0.0, SPORTS_PORT=8080, SPORTS_ALLOW_FIXTURES=false, SPORTS_CLAIM_KEY_VERSION=v1, explicit SPORTS_ADMIN_EMAILS, ATLAS_API_URL=https://atlas.xeptagon.com/api/v1. No Hedera keys. Verify live search/detail from AWS before curation; preserve Atlas identities/SDGs/provenance, do not treat listings as funding availability.

Frontend server-runtime config: SPORTS_BACKEND_URL=new trusted HTTPS backend, SPORTS_PUBLIC_ORIGIN=exact new HTTPS Amplify origin, matching SPORTS_ADMIN_JWT_SECRET/SPORTS_ADMIN_EMAILS, AUTH_SECRET, AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET, AUTH_URL and NEXTAUTH_URL=new origin. Review actual Amplify SSR secret delivery; ordinary build env or a literal Secrets Manager ARN is not proof of runtime availability. No NEXT_PUBLIC secrets or client-bundle injection. New Amplify SSR source connection/artifact pipeline requires separate access review; S3 manual static ZIP hosting is not a substitute for this Next.js SSR app.

## Database and protected administration

Private encrypted Single-AZ RDS db.t4g.micro,20GB gp3,7-day backups, DB sports_staging; confirm regional availability and storage limits. Separate migration owner and least-privilege CRUD app user, bounded Prisma pool. Validate native Prisma TLS with trusted RDS CA; public CA delivery/ssl parameters remain a concrete predeployment gate. No disable-verification workaround.

Only separately approved SQL: prisma/migrations/20261009000000_add_isolated_sports_demo/migration.sql, SHA256 f7d72678b92feb0e937c2882c8166ded44bcff283713326becdb959e29eb4b7a. Creates sports enum/five tables and constraints; no legacy tables/triggers/seeds. Use a reviewed VPC-connected one-off migration job with transactional stop-on-error, not a public DB or full historical Prisma migrate/db push/reset. Review job IAM/image/network and app grants first. Readiness must become200 after schema setup.

Administration requires staging Google OAuth, exact callback https://<frontend>/api/auth/callback/google, verified-email allowlist and matching frontend/backend assertion secret. Nonallowlisted users denied; no publicly accessible report/create/publish endpoints. New client preferred, with consent/test users configured. Do not alter employee OAuth without approval. Fans provide no login, email or wallet.

Create DRAFT via protected existing sports admin API/operator tool; assign exactly three approved Atlas sourceTimestamps, retrieve details and persist immutable campaign snapshots. The employee wizard is not the sports configuration tool. Publish only after explicit project/copy/window/publication approval and availability checks. DRAFT public404 and disabled QR are intentional. Commitment optional, labelled illustrative/not disbursed.

## Console sequence and approval gates

1. Read-only: confirm Express settings, Amplify SSR availability/source access, IAM operator, Google owner, RDS TLS approach, actual build #4 receipt and approved budget/retention.
2. Approval A: one release build and new ECR repo/push; record tested manifest digest. No service creation yet.
3. Approval B: fixed resource manifest/cost ceiling for new VPC/SGs/IAM/RDS/secrets/logs/ECS/Amplify. Confirm no NAT or extra replicas; review creation summary before execution.
4. Approval C: sports-only SQL into the new DB via reviewed private job. Validate schema/grants/TLS and readiness200.
5. Authorized deployment: backend digest with sports CMD and HTTPS; inspect401/403 admin denial and absent legacy routes. Configure separate frontend/auth, validate SSR secrets and allowed/denied administrators. Do not use production APIs for legacy smoke checks.
6. Approved project curation: retrieve three exact timestamps, review native snapshots and limitations in DRAFT. No fixture records passed off as live. Publication remains a separate approval.
7. Approval D: publish approved campaign/window, then October14 iPhone rehearsal. Freeze release after successful rehearsal; October15 event, monitor errors/cost and retain stable URLs/keys.

## iPhone rehearsal (actual device, not automated evidence)

- Use Safari private browsing, cellular plus venue Wi-Fi; scan dashboard/downloaded/printed QR with Camera. Exact HTTPS ballot, no Google/email/wallet prompt; exactly three approved records, safe country display and source wording.
- Back one project; clear successful receipt, stable claim URL and SVG download/share via iOS Files/Share Sheet. Save URL externally; verify clean browser can reopen it. Record Safari download UX, not assumed from Chromium.
- Refresh/retry/double-tap: one accepted selection and one badge per idempotent request. New private sessions may submit again; no verified-unique-fan claim.
- Allowlisted admin sees accepted selections, project totals, rewards issued and optional illustrative commitment/not disbursed. Fan/nonallowlisted admin reporting denied.
- Verify DRAFT/closed/outside-window QR inactive and selection blocked. Use separately approved rehearsal fixture campaign/isolated test data for state transitions; do not mutate approved live snapshots casually.
- After approved service restart, saved claims still work and counts persist. Verify logs exclude secrets/bearer claim URLs; prepare rollback to prior tested digest, never legacy AppModule.

## Conservative costs and lifecycle

Planning estimates, not live AWS quotes, excluding existing AWS spend/credits/tax; confirm Oregon Pricing Calculator and actual Express provisioning before approval. Low traffic/no NAT,730h month,168h week:

| Resource | Monthly USD | Seven days USD |
|---|---:|---:|
| One Fargate0.5vCPU/1GB |18|4.15|
| ALB + low LCU usage |17–23|4–6|
| Public IPv4:2ALB+1task |11|2.52|
| RDS micro+20GB |15–25|3.5–6|
| Amplify build/SSR/delivery |1–10|1–5|
| Secrets/ECR/logs/backups |4–9|1–4|
| One-task total |66–96|16–28|
| Two-task total |88–118|21–33|

0.5vCPU/1GB is not load-validated. Conservative authorization envelope: $120/month for one task with possible1vCPU/2GB sizing; $160/month if two such tasks are required. Rough1vCPU/2GB totals84–114/month one,124–154 two. NAT would add about36–42/month each plus processing and is not approved by default. Amplify retries/builds and retained resources make a week's bill nonlinear; set budget alerts (not a hard spending cap), log retention7days, max replicas and a cleanup owner.

Schedule: October10–12 approvals/artifact/OAuth/config review; October13 authorized staging/schema/DRAFT validation; October14 separately approved publication/device rehearsal; October15 event. If projects/auth/TLS cannot be ready in time, use an explicitly labelled conceptual presentation, not an insecure public report or fixture-funded campaign.

Postevent choose retention before teardown: continuing live claims needs backend/frontend/DB/keys/hostname and the ongoing stack cost. Stopping RDS is temporary (automatic restart after7days); ALB/storage/secrets can keep charging. Stop/delete unnecessary services/ALB/task resources only after separate cleanup approval; snapshot/export DB and retain versioned signing keys/claim hostname strategy before promising recovery. Data-only retention roughly17–30/month does not keep online claim links working. No wallet/email recovery exists; fans must save their claim URL.

Longer-term cheapest conceptual demo: separately reviewed static S3/CloudFront experience, approximately0–3/month low traffic, explicitly illustrative choices/counts/rewards, no persistent real selections or protected operational reporting claims. It does not host the current dynamic badge claims automatically and is not being implemented now. Sponsor-funded pilot should cover continuous infrastructure, moderation/support/security, real evidence review and badge retention; do not equate a configured commitment with funds disbursed.

## Outstanding decisions

Three approved project records with exact sourceTimestamp, project wording/limitations and approval to publish; sponsor/event/league/team/venue fields and campaign window; staging OAuth owner/allowlist; actual Express sizing/subnet/security-group/secret configuration and Amplify source/runtime secret configuration; validated RDS TLS/migration job; budget/replica ceiling and online badge retention; explicit sequential AWS/migration/publication approvals. Successful smoke resolves image-build/startup risk only.
