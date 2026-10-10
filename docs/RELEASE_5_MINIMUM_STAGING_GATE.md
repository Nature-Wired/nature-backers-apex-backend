# Release #5: staging approval preparation

October10,2026; rehearsal October14/event October15, America/Los_Angeles. Owner reports release#5 successful in account296903956631/us-west-2. Backend e088567351ef6b5ef634fe08bb88a03a0f1a7573; frontend24e0cae485bafb2fac8586bdbc8c6c6c98aa3a94.

Repository: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging`. Owner reports digestVerified=true and smoke built/startup=true,live200,ready503,cleanup=true,complete,exit0. Image tag confirmed by owner: `release-e088567-5`. Tag URI: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging:release-e088567-5`. Full digest confirmed by the owner from ECR: `sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c` (64 hexadecimal characters, syntax validated). Digest-pinned staging image: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c`. Use this exact image reference in the future Express image field, not the mutable selection of a tag. Evidence is owner-provided, not an independent AWS read by the agent. Build ARN/source archive checksum/image size/scan findings remain to be recorded; no rebuild is required. Backend source and frontend pins remain unchanged.

## Cleanup warning

The build works in mktemp/source and its EXIT trap deletes that directory. CodeBuild can then try entering the now-deleted working directory for post_build. The warning is consistent with this lifecycle, not a runtime-image defect; exact warning text would confirm it. Future inline buildspecs now change back to CODEBUILD_SRC_DIR (fallback /tmp) before removing temporary files. This preserves the original exit status/cleanup checks and does not alter application/user/security. No retry needed for this successful release. Test-only documentation change; existing image, approved source ZIP/checksum/pin stay unchanged.

## Minimum-cost candidate for approval

### Inspected network and proposed database subnets

Owner-confirmed read-only inventory: VPC `vpc-0fb4c77da1221cbe3`, Oregon, IPv4 `172.31.0.0/16`. Main route table `rtb-029a2752cb5cc9e7b` has `172.31.0.0/16 → local` and `0.0.0.0/0 → igw-037e361cf3ba929ce`. Owner also confirmed VPC DNS resolution and DNS hostnames are both Enabled from the earlier VPC Details screenshot; these requirements are satisfied without configuration changes. Keep this route table, its routes, DNS settings and existing subnet associations unchanged.

| Availability Zone | Existing public subnet | Proposed NEW private DB subnet |
| --- | --- | --- |
| us-west-2a | 172.31.32.0/20 | 172.31.64.0/27 |
| us-west-2b | 172.31.16.0/20 | 172.31.64.32/27 |
| us-west-2c | 172.31.0.0/20 | None |
| us-west-2d | 172.31.48.0/20 | None |

Python ipaddress validation confirms both proposed CIDRs are inside the VPC, do not overlap each other, and do not overlap any of the four inspected subnets. Their ranges are `172.31.64.0–172.31.64.31` and `172.31.64.32–172.31.64.63`. Each /27 has 32 addresses, 27 usable after AWS reservations. These are proposed allocations, not reserved addresses; recheck current inventory immediately before authorized creation. Monitor available IP capacity before later scaling or restore operations.

After separate approval, create a NEW dedicated route table with **only `172.31.0.0/16 → local`**, and explicitly associate BOTH new DB subnets before provisioning RDS. Do not attach Internet Gateway, NAT, peering or transit default/remote routes to it. New subnets initially inherit the main route table until explicitly associated; this association verification is a mandatory gate. Disable automatic public IPv4 assignment for the DB subnets and set RDS public access to No. Create a new DB subnet group containing just these two subnets and a new DB security group.

Owner-confirmed public task/ALB subnet candidates: us-west-2a `subnet-0a25137ba653e1e9f` (`172.31.32.0/20`) and us-west-2b `subnet-00b0c95fa99997bac` (`172.31.16.0/20`). Each had 4,091 available IPv4 addresses at read-only inspection, sufficient for the proposed small staging topology. Owner also confirmed both selected subnets actually use `rtb-029a2752cb5cc9e7b`, with `172.31.0.0/16 → local` and active `0.0.0.0/0 → igw-037e361cf3ba929ce`; automatic public IPv4 assignment is Yes. Public subnet routing is satisfied. Counts are point-in-time and should be rechecked before creation. VPC DNS settings and existing subnet NACL associations/rules are confirmed. Owner verified official AWS docs: public subnets enable public task IP, Express supplies internet-facing ALB/HTTPS443/generated domain/ACM certificate. Atlas HTTPS egress uses IGW/public IP and outbound rules, not NAT. No changes to existing subnet routes, security groups or NACLs are authorized.

Sharing the VPC is not complete network isolation: the local route still permits VPC communication. Enforce new ALB/task/DB security groups: task port8080 only from the ALB SG, DB port5432 only from the sports task SG and an explicitly approved temporary migration-runner SG. Remove temporary migration access after setup. Do not allow the entire VPC CIDR or reuse the default/production DB security group. Owner confirmed default NACL `acl-00556915d256e4a43` is associated with all four existing public subnets, including both selected staging candidates. Inbound rule100 allows all protocols/ports from `0.0.0.0/0`; outbound rule100 allows all protocols/ports to `0.0.0.0/0`; each direction has the terminal wildcard deny. Rule100 matches first, so HTTPS, PostgreSQL and ephemeral return traffic are permitted. This satisfies the existing public-subnet ACL check, not authorization of ingress: dedicated ALB/task/DB security groups must enforce access restrictions. Leave the shared default ACL unchanged. Verify the ACL association of the proposed DB subnets after separately authorized creation; default association is expected but not yet observed.

Express/Fargate: one task, explicit min=max1, LinuxAMD64, initial0.5vCPU/1GB subject to staging memory tests,port8080,unchanged non-root sports CMD. HTTPS443 ALB ingress; task8080 only from ALB SG, DB5432 only from taskSG; no direct internet task ingress. Outbound HTTPS/DNS as required and private DB traffic. Readiness /health/sports must200 after schema setup; liveness /health/sports/live200; sensible startup grace. No NAT/endpoints/WAF/extra replicas unless separately reviewed. One-task deployment is for demonstration, not HA; deployment replacement may temporarily overlap tasks.

Private RDS PostgreSQL16 SingleAZ micro,20GB encryptedgp3,7-day backups,public accessNo; DBsports_staging. Separate migration owner and least-privilege CRUD app user. Explicit connection pool bounds. Trusted RDS CA delivery and native Prisma certificate verification must be reviewed/tested before deployment; do not weaken TLS to make readiness pass. One reviewed private-VPC migration runner applies only sports enum/five-table SQL, transactionally, after separate approval. No historical migrations/dbpush/reset, legacy tables/triggers, production URLs or public DB workaround.

IAM execution role limited ECRpull/logs/stagingsecretrefs; minimal task role, Express infrastructure role reviewed separately; operator scopedPassRole. Backend staging secrets: DATABASE_URL,ATLAS_API_KEY,SPORTS_PARTICIPANT_SECRET,SPORTS_CLAIM_KEYS,SPORTS_ADMIN_JWT_SECRET. Stable signing secrets/version map retained. Nonsecretenv:NODE_ENVproduction,SPORTS_HOST0.0.0.0,SPORTS_PORT8080,SPORTS_ALLOW_FIXTURESfalse,SPORTS_CLAIM_KEY_VERSIONv1,ATLAS_API_URLhttps://atlas.xeptagon.com/api/v1,explicitadminemailallowlist. No Hedera keys, no legacy Indexer, no project-classification logic.

Separate new Amplify Next.js SSR app at pinnedfrontend; review source-access mechanism and supported runtime secrets delivery before creation. Configure SPORTS_BACKEND_URL newHTTPS,SPORTS_PUBLIC_ORIGIN exactAmplifyHTTPS,matchingadminJWTsecret/adminemails,AUTH_SECRET,AUTH_GOOGLE_ID/SECRET,AUTH_URL/NEXTAUTH_URL. Dedicated stagingGoogleOAuth callback /api/auth/callback/google,verified-emailadminallowlist and consent/testusers. Protected create/publish/reporting remains locked if OAuth missing. Fans require no email/login/wallet. Existing employee deployment stays untouched; its wizard is preserved, not connected to sports-only backend.

## Cost and duration

Planning, not current pricing quote: one0.5vCPU/1GB task18/month,ALB17–23,threepublicIPv411,RDS/storage15–25,Amplify1–10,supportingsecrets/ECR/logs4–9: **66–96/month,16–28/seven days**. Existing image storage is included in supporting-cost planning; actual size/scan tier to verify. If1vCPU/2GB needed: **84–114/month**. Recommended approved ceiling120/month equivalent for one-task staging; not a hard automatic cap. Budget alerts,maxreplicas1,logs7-dayretention,basicECRscan,limitedAmplifybuilds,noNAT. No credit/free-tier assumptions. Confirm exact rates/configuration before resource approval.

Target setup October11–13 only after approvals; October14 phone rehearsal,October15event. No approved projects means keepcampaignDRAFT/public404. Three approved nativeAtlas sourceTimestamps and reviewed metadata/copy/window/publication are still required. Publication is separate from infrastructure/migration authorization.

## Console sequence, one step at a time

1. Digest/tag recorded. Remaining ECR read-only receipt: image size and scan status, cross-check full build ID/source archive checksum. No changes.
2. VPC CIDR/subnet ranges/main routes inspected; proposed DB CIDRs validated above. DNS resolution/hostnames confirmed Enabled. Public subnet IDs and available IP counts are recorded above. Existing public-subnet default NACL associations/rules are confirmed as permissive. Both selected public subnets’ actual route associations, IGW routes and public-IP assignment are confirmed. Existing-network read-only prerequisites are satisfied. Next staging prerequisite is review/approval of the NEW security-group rule matrix and infrastructure resource scope, followed by RDS TLS/private migration access, IAM/secrets and administrator/SSR configuration. No creation is authorized. No creation.
3. IAM/Express/Secrets/RDS/Amplify read-only settings review; settle migration-network/RDSCA/adminOAuth/server-secret delivery and budget/retention. Review exact resource manifest for explicit creation approval.
4. After approval only: create agreed newnetwork/roles/secrets/privateDB resources; separate approval for SQLjob; verify RDS/TLS/schema.
5. After deployment approval only: create Express using exact verifieddigest, testreadiness200/unauthorized401/legacy404/Atlas; separateAmplify deployment/config and allowed/deniedadminchecks.
6. Approvedthree-projectDRAFT snapshots; separatepublicationapproval, thenreal iPhoneQR/privateSafari/select/retry/claim/download/cleansessionretrieval/dashboard/restart tests. Commitmentoptional/illustrative/notdisbursed; anonymousselectionsnotverifieduniquefans.

## Retention and cleanup decisions

Before any infrastructure creation, settle these remaining decisions:

- VPC DNS resolution and DNS hostnames are confirmed Enabled. Public subnet IDs/free IPs are recorded above. Existing public-subnet NACL compatibility is confirmed. Selected-subnet route-table associations and IGW routes are confirmed. Review the new security-group rule matrix and resolve Express generated-ALB/custom-task-SG behavior before authorizing creation. Explicitly approve the new private CIDRs, dedicated local-only route table and new security groups; no existing network edits.
- Confirm one-task CPU/memory and maximum scaling, actual Express role/secret settings and readiness configuration. Public task IPs are for egress, not direct inbound application access.
- Select PostgreSQL class/version, encryption/backups/deletion policy, least-privilege application grants, trusted RDS CA delivery and private migration runner. Schema setup remains separately approved.
- Establish staging OAuth owner/client, verified administrator allowlist and Amplify SSR source/runtime secret delivery. Never expose administration/reporting when OAuth is unavailable.
- Approve the resource manifest, estimated cost ceiling, monitoring/cleanup owner and online badge-retention period. Budget alerts are not hard spending caps. Subnets, route tables and security groups have no separate hourly charge; no NAT is proposed. Existing compute/ALB/RDS/Amplify estimates remain unchanged.
- Record remaining ECR scan/size/build receipt; obtain three approved exact Atlas sourceTimestamp records and campaign copy/window. Campaign publication remains a separate approval, not a consequence of infrastructure creation.

Existing temporaryCodeBuild/source/logs may be cleaned up only with scoped cleanup approval; retain release evidence and ECRimage, remove unnecessary pushpermissions. A confirmed full digest does not require another build. No ECS/RDS/Amplify resources yet.

Afterevent retain livefrontend/backend/DB/claimkeys/hostname for agreedbadgelinkduration, costingongoingstackrates. DeleteALB/tasks toreducecost only after acknowledgingclaimoutage; RDSstopauto-restartsafter7days andstorage/secretscontinuebilling. Snapshot/exportplusstableversionedkeysretainabilitytorecover, notonlineclaims. Further ECRlifecycle/deletion requires review of deployed/rollbackdigests. A future labelledstaticconceptualdemo can cost~0–3/month but neither persists real selections nor automatically serves existing claimlinks; separateimplementationapproval required.

## Next approval prerequisite: new staging security groups

Review only; no security group is created or edited by this plan. Use new dedicated groups in the inspected VPC, with actual generated group IDs recorded before use:

| Group | Inbound rule | Outbound requirement |
| --- | --- | --- |
| Sports ALB | TCP443 from internet for public HTTPS (IPv4; IPv6 only if deliberately enabled) | TCP8080 to sports task SG |
| Sports task | TCP8080 from sports ALB SG only | TCP5432 to sports DB SG; verified HTTPS443 egress for Atlas/ECR/secrets/logs and required DNS |
| Sports DB | TCP5432 from sports task SG; separately approved temporary migration-runner SG | Retain reviewed default outbound unless a tested stricter rule is approved; stateful reply traffic requires no separate reply rule |
| Temporary migration runner | No public inbound; controlled one-off task/job access | TCP5432 to sports DB SG; required image/secret/log egress |

No inbound TCP5432 from internet or whole VPC CIDR; no direct internet TCP8080; no shared/default production SG reuse. The task's public IP is for egress through the confirmed IGW. HTTPS to Atlas may require outbound443 to public destinations because its addresses are not established as stable; a security-group rule cannot restrict by hostname. Use security-group references for internal traffic. Ordinary Amazon-provided VPC DNS has special SG filtering behavior; validate actual resolver usage rather than assuming a DNS rule alone controls it. Leave existing SGs and shared NACL unchanged.

Express manages ALB resources/groups: inspect its creation configuration to establish how its generated ALB SG and selected task SG will be linked, without opening task8080 publicly as a bootstrap workaround. Review the required staging-only execution/infrastructure roles separately. This rule matrix review is a prerequisite, not permission to create groups or services.

After network-rule agreement, settle RDS CA/TLS delivery and migration runner, PostgreSQL credentials/app grants, stable reward signing secrets, new Amplify SSR secret/source configuration and staging Google OAuth. Explicit resource creation, database SQL, deployment and campaign publication remain separate approvals.

## Unresolved Express security-group behavior — deployment blocker

Owner inspected the Console read-only: Customize networking is available; VPC vpc-0fb4c77da1221cbe3, custom subnets and custom security groups are selectable. Only existing group offered is VPC default sg-0de6b03a7901c97ab. No tooltip explains generated ALB-to-task group linkage. No resource or security-group changes occurred. Do not select/reuse this default group as a shortcut.

The agent inspected AWS's current published ECS API model (boto/botocore develop, ecs/2014-11-13/service-2.json) and current Terraform resource documentation. AWS CreateExpressGatewayService describes networkConfiguration as configuring task subnets/security groups; its infrastructure role may provision/manage ALBs and security groups. Neither retrieved source explicitly promises an ALB-source-only inbound rule on a supplied group, identifies which groups are additionally attached, or states whether customer rules are mutated. Terraform similarly describes the group field as task-associated, without resolving generated linkage. The official Developer Guide request remains blocked by this environment's network proxy (HTTP403); no direct guide verification is claimed. Ability to manage SGs is not proof of the actual rule behavior.

Sources:
- https://github.com/boto/botocore/blob/develop/botocore/data/ecs/2014-11-13/service-2.json
- https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_express_gateway_service.html.markdown
- Official guide for owner-side verification: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html

Required supported behavior must be established before recommending deployment:
1. Which SGs Express attaches to the generated ALB versus task ENIs when custom securityGroups are supplied.
2. Whether Express adds/changes inbound rules on the supplied task SG, and the exact source of the TCP8080 permission.
3. Whether any additional generated task SG permits broader ingress. Attached SG permissions are additive; one restricted group does not negate another broader rule.
4. Supported method to make task8080 reachable only from the ALB SG, while preserving managed updates/deletion and avoiding direct internet/VPC-wide task ingress.
5. Whether generated ALB SG identity can be determined/configured before task ingress is established without a temporary broad access rule.

Next prerequisite: obtain explicit official guide text or an AWS support answer for those questions. No service creation solely to discover behavior is authorized. Existing-network routing/DNS/NACL/IP capacity checks remain satisfied, but security-group wiring is unresolved. The default group's own rules have not been inspected here and its name does not establish suitability.

If Express cannot provide the required linkage, review standard ECS/Fargate with explicitly controlled ALB/task/DB SG references as a separately approved alternative. It preserves the image/entrypoint and has similar base resource costs, but requires its own trusted HTTPS/domain/certificate design; do not assume Express's generated domain transfers to standard ECS. No architecture pivot or resources are authorized. PostgreSQL5432 must remain limited to approved task/migration groups regardless of the Express choice.

## AWS support case — Express gate remains blocked

Owner submitted AWS Technical Support case **179166963600053** on October 10, 2026 (America/Los_Angeles). Subject: **ECS Express Mode security-group behavior with custom task security groups**. Service: Container Service (ECS). Category: General Guidance. Severity: General guidance. Reported status at submission: **Unassigned**. This is owner-provided case metadata, not an independently queried live status.

The case asks which security groups are attached to the Express-managed ALB and tasks, whether customer-supplied groups are modified, and how to guarantee task TCP8080 is accessible only from the generated ALB security group. The Express deployment gate stays **BLOCKED pending an authoritative AWS response** that satisfies the documented rule matrix, including any additional attached groups. Submitting the case does not resolve the behavior or authorize resources. No support-case messages were sent by the agent. No AWS infrastructure changes are authorized.

## Parallel read-only preparation: RDS TLS

Owner inspected the RDS Certificate update Console in Oregon: databases requiring update=0, no database records displayed, update controls disabled. That page does not enumerate regional certificate authorities. No certificate rotation, database or AWS resource creation occurred. RDS CA selection and native Prisma certificate-verification compatibility remain OPEN.

Use the read-only RDS DescribeCertificates API, which does not require an existing database. In an existing authenticated AWS CLI session, or standard Console CloudShell (not a newly created VPC CloudShell environment), run:

```bash
aws rds describe-certificates \
  --region us-west-2 \
  --query 'Certificates[].{CA:CertificateIdentifier,ValidFrom:ValidFrom,Expires:ValidTill}' \
  --output table
```

This lists the available regional CA identifiers and validity periods only; it does not retrieve database data, credentials or private keys and does not modify certificates/resources. IAM permission is rds:DescribeCertificates (Resource=*; restrict aws:RequestedRegion to us-west-2 if provisioning a scoped read policy). An AccessDenied response should be reported rather than granting broad access; any IAM change requires separate approval. The agent has not executed this AWS request.

Reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-certificates.html. Certificate expiration is CA validity, not proof of the future database leaf-certificate lifetime or automatic rotation behavior. Subsequent read-only DescribeDBEngineVersions for the selected PostgreSQL16 minor can confirm SupportedCACertificateIdentifiers and rotation support. No CA is selected yet; do not assume availability alone proves engine/client compatibility. Do not rotate certificates, create a database or change parameter groups.

The pinned image includes ca-certificates/openssl but does not bundle an RDS regional CA file. Generic OS trust is not evidence of successful native Prisma/RDS certificate verification. Before deployment, review a supported public CA delivery mechanism and the exact native Prisma6.19.2 trust/hostname verification settings, then validate them against the separately approved isolated database. Do not use sslaccept=accept_invalid_certs or disable TLS verification. Any image/source change required for public CA delivery must be separately reviewed; no rebuild is authorized now.

Follow-on read-only preparation can review PostgreSQL16 rds.force_ssl settings, the private migration-runner design (new DB subnet association required first; no public DB), staging-only IAM/secret ARN scopes, and current Pricing Calculator assumptions. These are independent of the AWS support response, but actual IAM/secrets/network creation, migration and service deployment require separate approval. Existing production resources and reference repositories remain untouched.

## Regional CA inventory and native Prisma TLS assessment

Owner ran read-only RDS DescribeCertificates in account296903956631/us-west-2. Available regional authorities:

| CA identifier | Valid from (UTC) | Expires (UTC) |
| --- | --- | --- |
| rds-ca-ecc384-g1 | 2021-05-24T22:06:59+00:00 | 2121-05-24T23:06:59+00:00 |
| rds-ca-rsa4096-g1 | 2021-05-24T22:03:20+00:00 | 2121-05-24T23:03:20+00:00 |
| rds-ca-rsa2048-g1 | 2021-05-24T21:59:00+00:00 | 2061-05-24T22:59:00+00:00 |

Initial candidate: rds-ca-rsa2048-g1, not yet selected/provisioned. Regional availability is verified by owner; exact PostgreSQL16 minor-version support remains open. Next read-only CloudShell command:

```bash
aws rds describe-db-engine-versions \
  --region us-west-2 \
  --engine postgres \
  --query 'DBEngineVersions[?starts_with(EngineVersion, `16.`)].{Version:EngineVersion,CAs:SupportedCACertificateIdentifiers,RotationWithoutRestart:SupportsCertificateRotationWithoutRestart}' \
  --output json
```

This requires rds:DescribeDBEngineVersions and changes nothing. Choose a supported16 minor after inspecting its CA list; rotation behavior/leaf-certificate validity is distinct from CA expiry. Do not create a DB to discover compatibility.

### Actual pinned client implementation

Sports PrismaService extends PrismaClient without a driver adapter. Sports manifest pins @prisma/client and prisma6.19.2. Its generated client reports native engine commit **c2990dca591cba766e3b7ef5d9e8a84796e47ab7**. The production implementation is native Rust Quaint → tokio-postgres → postgres-native-tls/native-tls, not the test-only PrismaPg/node-pg adapter. Exact engine source inspected read-only:

- https://github.com/prisma/prisma-engines/blob/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/quaint/src/connector/postgres/url.rs
- https://github.com/prisma/prisma-engines/blob/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/quaint/src/connector/postgres/native/mod.rs

URL parser defaults sslmode=prefer and sslaccept=accept_invalid_certs. Therefore do not assume TLS/certificate security from the default Prisma client or from sslmode=require alone. Staging DATABASE_URL must explicitly use **sslmode=require&sslaccept=strict&sslcert=/app/certs/rds-us-west-2-rsa2048-g1.crt** (proposed public CA path; not present in the pinned image). Use the actual RDS endpoint hostname as the URL host, not an IP/custom hostname; URL-encode credentials securely. Do not print the connection URL. This connector's parameter is sslcert, not an assumed libpq sslrootcert/verify-full parameter. sslidentity is a separate client identity and is not required for ordinary password-authenticated RDS.

Source reads sslcert as PEM, adds the parsed certificate to native TLS root trust, and disables invalid-certificate acceptance in strict mode. It does not enable invalid-hostname acceptance; standard native TLS hostname validation applies through the PostgreSQL TLS connector. This is implementation evidence, not an executed RDS TLS/negative test. Strict mode retains system roots as well as the supplied root; it does not pin the leaf certificate. The code parses a Certificate::from_pem object; do not assume passing an arbitrary multi-certificate regional bundle loads every root. Review/extract the intended regional RSA2048 CA certificate(s) and test actual trust handling rather than silently relying on bundle order.

### Proposed public CA delivery — approval required

Safest reproducible candidate: obtain AWS's public Oregon CA bundle from https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem via verified HTTPS; verify the selected CA subject/issuer/validity/fingerprint against the authoritative source, select the correct PEM root material, and record its checksum. No private key or credential is part of a public CA certificate. A separately reviewed packaging change can copy the approved public .crt into /app/certs with readable, non-writable permissions for node; it must remain separate from credentials and must not generally relax .dockerignore exclusions. This would require a new reviewed source commit/build/digest; the current e088 image has no explicit RDS CA artifact. No such code/image changes are authorized or made now. A controlled read-only runtime public-CA volume is an alternative requiring reviewed ECS support/lifecycle; do not add an unaudited startup download or put credentials into image layers.

### Required verification and server enforcement

Before RDS deployment approval, preserve these open tests: trusted chain + correct hostname succeeds; unrelated/self-signed certificate fails; hostname mismatch fails; missing/wrong CA fails where the chain is not otherwise system-trusted; require mode cannot fall back to plaintext. Use the actual native Prisma client, not pg-only tests. A production-like trusted public certificate might already be system-trusted, so omission of an extra CA file is not in itself a universal negative test. No verification-bypass flags.

For server-side enforcement, inspect the PostgreSQL16 engine-default rds.force_ssl value read-only, then propose a new staging-only postgres16 parameter group with rds.force_ssl=1 explicitly. Review application/reboot behavior before creating/attaching it; do not alter existing/default/production groups. After separately authorized setup, verify the effective setting is1, app session pg_stat_ssl.ssl=true, and a connection with TLS disabled is rejected. Enforce the same TLS verification for the private migration runner. Security groups alone do not enforce encrypted transport.

CA candidate inventory is recorded; engine compatibility, final CA material/delivery, native negative TLS tests and server enforcement remain OPEN. Express deployment remains blocked on support case179166963600053. No AWS resources, application code, root dependencies, reference repositories or database schemas changed.
