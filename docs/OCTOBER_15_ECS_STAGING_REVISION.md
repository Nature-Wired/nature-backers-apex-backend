# October 15 staging revision: ECS instead of App Runner

Review only, October 9, 2026. Account Nature Wired `296903956631`; NEW isolated staging in Oregon `us-west-2`. Existing Amplify apps are in N. California `us-west-1`; do not modify them. Owner reports AWS's April 30, 2026 App Runner new-customer cutoff. No App Runner availability assumed. No AWS resource, deployment or migration action was taken.

AWS documentation/pricing retrieval failed from this runner. ECS Express Mode's exact current console defaults, regional/account eligibility, generated HTTPS domain, task sizing, replica minimum, secrets configuration and network controls require read-only confirmation in the owner's console before approving the final resource manifest. Estimates below are transparent planning assumptions, not live quotes. Do not treat an unknown setting as supported merely because standard ECS supports it.

## Preferred path and alternatives

**First choice: ECS Express Mode** deploying an ECR image of the existing sports backend onto Fargate with an ALB, HTTPS, IAM and service health/logging. Use its managed setup where it supports the required settings; it still creates billable AWS resources. It is the least complex proposed route for this existing containerizable NestJS application, conditional on console confirmation of HTTPS and private DB connectivity. Use the generated HTTPS endpoint if offered; otherwise an approved staging domain and ACM certificate are required. Never assume an ordinary ALB DNS name provides trusted HTTPS automatically.

**Fallback: standard ECS Fargate service** with the same task/ALB/VPC/RDS architecture, explicitly defined rather than Express-managed. It avoids application rewrites but requires more infrastructure wiring, including a validated HTTPS origin name/certificate if no managed domain is available. Prefer this to changing the backend to fit an unsupported Express setting, if an approved deployment workflow/HTTPS domain is already available.

**Simpler runtime alternative: Elastic Beanstalk Node.js, load-balanced environment**, one EC2 instance, ALB, private RDS, IAM instance profile and explicit server-only secret injection. Preserve `npm run start:sports` as the web process, PORT routing to 8080 and binding to 0.0.0.0. Validate native Prisma/runtime packaging and the supported Node platform first. This avoids writing ECS resource definitions but retains ALB/HTTPS configuration and EC2 management; it is not clearly simpler than Express Mode for the phone rehearsal. Do not use Beanstalk's coupled database lifecycle for persistent badges; provision RDS separately.

Single-instance Beanstalk without ALB could be cheaper, but its default HTTP URL does not meet end-to-end HTTPS/admin-secret requirements; operating TLS on the VM needs an approved domain/certificate and more manual work. Lightsail/self-managed PostgreSQL changes backup/security responsibilities. Lambda requires a new Nest hosting adapter/cold-start testing. None is recommended as a deadline-driven shortcut. No such source changes are proposed.

## Resource manifest and network proposal

- NEW Amplify Next.js SSR application/feature branch in us-west-2 if the supported SSR platform is available. Default HTTPS fan hostname. Never repoint the existing us-west-1 app. Region/account support must be confirmed read-only before provisioning.
- NEW private ECR repository and digest-pinned backend image. Container command MUST be `node dist/src/sports/main.js` (equivalent to start:sports), production NODE_ENV, SPORTS_HOST=0.0.0.0, SPORTS_PORT=8080. No AppModule/start:prod, legacy listeners, Lambda calls or Hedera keys.
- ECS Express Mode/service and Fargate task: cost sizing scenario 0.5 vCPU/1 GB Linux x86_64, one task for rehearsal ONLY if supported; budget two tasks if Express minimum/default requires it. This memory size is not a load-tested production guarantee. Verify health check route/port, process restart and smoke-test DB connectivity; do not assume a TCP-only App Runner check translates into ALB health checks. If an isolated health route is required, review that small Apex-only addition separately.
- NEW VPC with public subnets in two AZs, Internet Gateway and private DB subnets in two AZs. Public ALB; public-IP Fargate tasks with inbound 8080 restricted exclusively to the ALB security group. Tasks reach ECR/Secrets Manager/Atlas over normal verified outbound connections using public IPv4; DB traffic stays inside VPC. No NAT Gateway or VPC endpoints are needed for this topology. Public task IPs do not make task ingress open; verify no 0.0.0.0/0 inbound task rule.
- Private encrypted PostgreSQL 16 RDS db.t4g.micro Single-AZ, 20 GB gp3, seven-day backups, no public DB endpoint; DB security group allows 5432 only from task security group. Separate sports_staging migration/application users and TLS verification. Apply only reviewed sports SQL, never historical migrations/db push/reset or production bindings.
- If Express mandates private tasks/NAT or cannot express the restricted public-task topology, either use standard Fargate or revise/approve networking costs FIRST. NAT estimate adds $36–42/month plus data processing; for about seven days $8–10 plus traffic. Two NAT gateways cost more; do not silently accept a generated multi-NAT topology.
- Separate task execution role for image pull/logging/secret injection, minimal task role, and Express infrastructure role as required by its documented workflow. Reference only staging secret ARNs, no broad production access. CloudWatch staging log retention/budget alarm and RDS backups. ALB access/application logs must not expose claim tokens/credentials.

An ALB uses HTTP target health checks, not generic TCP checks. Review whether an existing public sports route offers a stable 200 without a published campaign (it currently does not provide a dedicated health endpoint). Prefer an explicit small readiness/health route design, without disclosing secret/configuration data, rather than treating arbitrary 404s as full readiness. This is a concrete implementation prerequisite before deployment, not a reason to load the legacy health controller/AppModule.

## Authentication and secret handling

Carry forward AWS_STAGING_PLAN.md's server-only configuration names and verified administrator rules. Backend DATABASE_URL/ATLAS_API_KEY/participant and claim signing keys/admin assertion secret come from staging Secrets Manager references in the task definition. Google OAuth credentials, AUTH_SECRET and the shared assertion key must reach Amplify SSR through a supported reviewed mechanism, not just build environment or a literal secret ARN. Match SPORTS_BACKEND_URL to the new verified HTTPS endpoint and SPORTS_PUBLIC_ORIGIN to the new Amplify origin. Configure staging Google callback and allowlist; reporting stays locked if absent. Do not place secret values in source, logs, client bundles or chat. Atlas is still HTTPS/x-api-key with the working plugin unchanged.

Optional sponsor commitment may be omitted; any configured allocation is illustrative and not disbursed. Keep the live campaign DRAFT pending project approval and separate publication authorization. No new recommendation engine or alternative evidence-provider model is required now.

## Estimated costs, USD

Assume 730 hours/month, 168 hours/seven days, Oregon, Linux x86_64 on-demand, low traffic, no free-tier credits, one ALB with two public IPv4 addresses, public task IP per task, and no NAT. Illustrative Fargate rates: about $0.04048/vCPU-hour and $0.004445/GB-hour, giving ~$18/month or ~$4.15/seven days for 0.5 vCPU/1 GB. ALB ~$0.0225/hour plus variable LCU usage; IPv4 ~$0.005/address-hour. Confirm rates in AWS Pricing Calculator before approval.

| Component | Monthly estimate | Seven-day estimate |
| --- | ---: | ---: |
| Fargate one 0.5 vCPU/1 GB task | $18 | $4.15 |
| ALB hours + low LCU usage | $17–23 | $4–6 |
| Three public IPv4 addresses (2 ALB + 1 task) | $11 | $2.52 |
| Private RDS micro + 20 GB storage | $15–25 | $3.50–6 |
| Amplify builds/SSR/delivery | $1–10 | $1–5 |
| Secrets Manager, ECR, logs/alarms/backup excess | $4–9 | $1–4 |
| TOTAL one-task scenario | $66–96 | $16–28 |
| TOTAL two-task scenario (extra compute/IP) | $88–118 | $21–33 |

No separate Express management charge is included; confirm current pricing terms before approval. Outbound data transfer, unexpected LCU/log volume, burst CPU credits, extra ALB AZ/IP usage and additional replicas increase costs. Domain registration/tax/WAF/extra legacy staging service are excluded. Networking public IPv4 costs are separate from ALB service pricing. If default task sizing is larger, recalculate rather than using these totals.

Beanstalk load-balanced one-instance planning estimate: EC2 t3.small around $15–20/month, EBS $1–3/month, same ALB/public IPv4/RDS/Amplify/secrets footprint: approximately $64–101/month, $16–30 for seven days. Exact platform support and cost/runtime memory need verification. Standard Fargate with the same topology has the same resource cost scenario as Express.

**Badge retention:** a seven-day allocation is not a lifetime reward-hosting budget. Keeping claims available on this stack continues approximately $66–96/month (one task) or $88–118/month (two tasks), with actual traffic. Stopping compute/ALB makes claims unavailable even if DB/keys remain. Data-only retention of RDS/keys/backup storage is roughly $17–30/month but is NOT persistent online claim availability. A cheaper long-term claim host is a separate project, not an unapproved event teardown. Confirm the promised hosting period and keep hostname/DB/key versions stable.

## Minimum decisions and authorization

1. Confirm read-only console evidence for ECS Express Mode in us-west-2: HTTPS endpoint, actual minimum/sizing, network/SG controls, secret references and IAM roles. Approve Express as first choice, standard Fargate/Beanstalk only as explicit fallback with updated manifest.
2. Approve the selected topology, replica count and cost ceiling, expected peak participation, online badge retention duration, support/rollback owner. Do not authorize unlimited generated Express resources.
3. Confirm authorized deployment role/access path in account 296903956631; staging-only IAM/resource scope. Confirm staging Google OAuth owner/client/admin allowlist; credentials supplied securely. Approve DNS/certificate work only if a generated secure backend endpoint is unavailable.
4. Review container/build/ALB health configuration and feature commits before approving resource creation, deployment and the sports-only SQL in the new isolated DB. No migration or deployment now.
5. Separately approve exactly three project identities and campaign text/window, then publication after DRAFT snapshot verification. Infrastructure can be provisioned before this, but DRAFT fan URL returns 404 and is not a complete public demonstration.

Target October 10–12: confirm settings/OAuth and approvals, prepare artifact/health checks; October 13: authorized staging build/configuration and DRAFT snapshot verification; October 14: separately authorized publication and real-phone/auth/claim/restart rehearsal; October 15: event. These remain conditional milestones. No production origin, employee service, reference repository, live campaign or AWS resource is changed by this plan.
