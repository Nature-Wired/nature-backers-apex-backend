# Release #5: staging approval preparation

October10,2026; rehearsal October14/event October15, America/Los_Angeles. Owner reports release#5 successful in account296903956631/us-west-2. Backend e088567351ef6b5ef634fe08bb88a03a0f1a7573; frontend24e0cae485bafb2fac8586bdbc8c6c6c98aa3a94.

Repository: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging`. Owner reports digestVerified=true and smoke built/startup=true,live200,ready503,cleanup=true,complete,exit0. Image tag confirmed by owner: `release-e088567-5`. Tag URI: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging:release-e088567-5`. Full digest confirmed by the owner from ECR: `sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c` (64 hexadecimal characters, syntax validated). Digest-pinned staging image: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c`. Use this exact image reference in the future Express image field, not the mutable selection of a tag. Evidence is owner-provided, not an independent AWS read by the agent. Build ARN/source archive checksum/image size/scan findings remain to be recorded; no rebuild is required. Backend source and frontend pins remain unchanged.

## Cleanup warning

The build works in mktemp/source and its EXIT trap deletes that directory. CodeBuild can then try entering the now-deleted working directory for post_build. The warning is consistent with this lifecycle, not a runtime-image defect; exact warning text would confirm it. Future inline buildspecs now change back to CODEBUILD_SRC_DIR (fallback /tmp) before removing temporary files. This preserves the original exit status/cleanup checks and does not alter application/user/security. No retry needed for this successful release. Test-only documentation change; existing image, approved source ZIP/checksum/pin stay unchanged.

## Minimum-cost candidate for approval

### Inspected network and proposed database subnets

Owner-confirmed read-only inventory: VPC `vpc-0fb4c77da1221cbe3`, Oregon, IPv4 `172.31.0.0/16`. Main route table `rtb-029a2752cb5cc9e7b` has `172.31.0.0/16 → local` and `0.0.0.0/0 → igw-037e361cf3ba929ce`. Keep this route table, its routes and existing subnet associations unchanged.

| Availability Zone | Existing public subnet | Proposed NEW private DB subnet |
| --- | --- | --- |
| us-west-2a | 172.31.32.0/20 | 172.31.64.0/27 |
| us-west-2b | 172.31.16.0/20 | 172.31.64.32/27 |
| us-west-2c | 172.31.0.0/20 | None |
| us-west-2d | 172.31.48.0/20 | None |

Python ipaddress validation confirms both proposed CIDRs are inside the VPC, do not overlap each other, and do not overlap any of the four inspected subnets. Their ranges are `172.31.64.0–172.31.64.31` and `172.31.64.32–172.31.64.63`. Each /27 has 32 addresses, 27 usable after AWS reservations. These are proposed allocations, not reserved addresses; recheck current inventory immediately before authorized creation. Monitor available IP capacity before later scaling or restore operations.

After separate approval, create a NEW dedicated route table with **only `172.31.0.0/16 → local`**, and explicitly associate BOTH new DB subnets before provisioning RDS. Do not attach Internet Gateway, NAT, peering or transit default/remote routes to it. New subnets initially inherit the main route table until explicitly associated; this association verification is a mandatory gate. Disable automatic public IPv4 assignment for the DB subnets and set RDS public access to No. Create a new DB subnet group containing just these two subnets and a new DB security group.

Select existing public subnets across two AZs for Express only after recording their subnet IDs, DNS settings and NACLs. Owner verified official AWS docs: public subnets enable public task IP, Express supplies internet-facing ALB/HTTPS443/generated domain/ACM certificate. Atlas HTTPS egress uses IGW/public IP and outbound rules, not NAT. No changes to existing subnet routes, security groups or NACLs are authorized.

Sharing the VPC is not complete network isolation: the local route still permits VPC communication. Enforce new ALB/task/DB security groups: task port8080 only from the ALB SG, DB port5432 only from the sports task SG and an explicitly approved temporary migration-runner SG. Remove temporary migration access after setup. Do not allow the entire VPC CIDR or reuse the default/production DB security group. Inspect NACLs for required bidirectional database/HTTPS traffic and ephemeral return ports; do not edit a shared NACL as a shortcut.

Express/Fargate: one task, explicit min=max1, LinuxAMD64, initial0.5vCPU/1GB subject to staging memory tests,port8080,unchanged non-root sports CMD. HTTPS443 ALB ingress; task8080 only from ALB SG, DB5432 only from taskSG; no direct internet task ingress. Outbound HTTPS/DNS as required and private DB traffic. Readiness /health/sports must200 after schema setup; liveness /health/sports/live200; sensible startup grace. No NAT/endpoints/WAF/extra replicas unless separately reviewed. One-task deployment is for demonstration, not HA; deployment replacement may temporarily overlap tasks.

Private RDS PostgreSQL16 SingleAZ micro,20GB encryptedgp3,7-day backups,public accessNo; DBsports_staging. Separate migration owner and least-privilege CRUD app user. Explicit connection pool bounds. Trusted RDS CA delivery and native Prisma certificate verification must be reviewed/tested before deployment; do not weaken TLS to make readiness pass. One reviewed private-VPC migration runner applies only sports enum/five-table SQL, transactionally, after separate approval. No historical migrations/dbpush/reset, legacy tables/triggers, production URLs or public DB workaround.

IAM execution role limited ECRpull/logs/stagingsecretrefs; minimal task role, Express infrastructure role reviewed separately; operator scopedPassRole. Backend staging secrets: DATABASE_URL,ATLAS_API_KEY,SPORTS_PARTICIPANT_SECRET,SPORTS_CLAIM_KEYS,SPORTS_ADMIN_JWT_SECRET. Stable signing secrets/version map retained. Nonsecretenv:NODE_ENVproduction,SPORTS_HOST0.0.0.0,SPORTS_PORT8080,SPORTS_ALLOW_FIXTURESfalse,SPORTS_CLAIM_KEY_VERSIONv1,ATLAS_API_URLhttps://atlas.xeptagon.com/api/v1,explicitadminemailallowlist. No Hedera keys, no legacy Indexer, no project-classification logic.

Separate new Amplify Next.js SSR app at pinnedfrontend; review source-access mechanism and supported runtime secrets delivery before creation. Configure SPORTS_BACKEND_URL newHTTPS,SPORTS_PUBLIC_ORIGIN exactAmplifyHTTPS,matchingadminJWTsecret/adminemails,AUTH_SECRET,AUTH_GOOGLE_ID/SECRET,AUTH_URL/NEXTAUTH_URL. Dedicated stagingGoogleOAuth callback /api/auth/callback/google,verified-emailadminallowlist and consent/testusers. Protected create/publish/reporting remains locked if OAuth missing. Fans require no email/login/wallet. Existing employee deployment stays untouched; its wizard is preserved, not connected to sports-only backend.

## Cost and duration

Planning, not current pricing quote: one0.5vCPU/1GB task18/month,ALB17–23,threepublicIPv411,RDS/storage15–25,Amplify1–10,supportingsecrets/ECR/logs4–9: **66–96/month,16–28/seven days**. Existing image storage is included in supporting-cost planning; actual size/scan tier to verify. If1vCPU/2GB needed: **84–114/month**. Recommended approved ceiling120/month equivalent for one-task staging; not a hard automatic cap. Budget alerts,maxreplicas1,logs7-dayretention,basicECRscan,limitedAmplifybuilds,noNAT. No credit/free-tier assumptions. Confirm exact rates/configuration before resource approval.

Target setup October11–13 only after approvals; October14 phone rehearsal,October15event. No approved projects means keepcampaignDRAFT/public404. Three approved nativeAtlas sourceTimestamps and reviewed metadata/copy/window/publication are still required. Publication is separate from infrastructure/migration authorization.

## Console sequence, one step at a time

1. Digest/tag recorded. Remaining ECR read-only receipt: image size and scan status, cross-check full build ID/source archive checksum. No changes.
2. VPC CIDR/subnet ranges/main routes inspected; proposed DB CIDRs validated above. Remaining read-only inspection: existing public subnet IDs, VPC DNS resolution/hostnames, subnet NACLs and available IP counts. No creation.
3. IAM/Express/Secrets/RDS/Amplify read-only settings review; settle migration-network/RDSCA/adminOAuth/server-secret delivery and budget/retention. Review exact resource manifest for explicit creation approval.
4. After approval only: create agreed newnetwork/roles/secrets/privateDB resources; separate approval for SQLjob; verify RDS/TLS/schema.
5. After deployment approval only: create Express using exact verifieddigest, testreadiness200/unauthorized401/legacy404/Atlas; separateAmplify deployment/config and allowed/deniedadminchecks.
6. Approvedthree-projectDRAFT snapshots; separatepublicationapproval, thenreal iPhoneQR/privateSafari/select/retry/claim/download/cleansessionretrieval/dashboard/restart tests. Commitmentoptional/illustrative/notdisbursed; anonymousselectionsnotverifieduniquefans.

## Retention and cleanup decisions

Before any infrastructure creation, settle these remaining decisions:

- Confirm VPC DNS resolution and DNS hostnames, actual public subnet IDs/free IPs, and NACL compatibility. Explicitly approve the new private CIDRs, dedicated local-only route table and new security groups; no existing network edits.
- Confirm one-task CPU/memory and maximum scaling, actual Express role/secret settings and readiness configuration. Public task IPs are for egress, not direct inbound application access.
- Select PostgreSQL class/version, encryption/backups/deletion policy, least-privilege application grants, trusted RDS CA delivery and private migration runner. Schema setup remains separately approved.
- Establish staging OAuth owner/client, verified administrator allowlist and Amplify SSR source/runtime secret delivery. Never expose administration/reporting when OAuth is unavailable.
- Approve the resource manifest, estimated cost ceiling, monitoring/cleanup owner and online badge-retention period. Budget alerts are not hard spending caps. Subnets, route tables and security groups have no separate hourly charge; no NAT is proposed. Existing compute/ALB/RDS/Amplify estimates remain unchanged.
- Record remaining ECR scan/size/build receipt; obtain three approved exact Atlas sourceTimestamp records and campaign copy/window. Campaign publication remains a separate approval, not a consequence of infrastructure creation.

Existing temporaryCodeBuild/source/logs may be cleaned up only with scoped cleanup approval; retain release evidence and ECRimage, remove unnecessary pushpermissions. A confirmed full digest does not require another build. No ECS/RDS/Amplify resources yet.

Afterevent retain livefrontend/backend/DB/claimkeys/hostname for agreedbadgelinkduration, costingongoingstackrates. DeleteALB/tasks toreducecost only after acknowledgingclaimoutage; RDSstopauto-restartsafter7days andstorage/secretscontinuebilling. Snapshot/exportplusstableversionedkeysretainabilitytorecover, notonlineclaims. Further ECRlifecycle/deletion requires review of deployed/rollbackdigests. A future labelledstaticconceptualdemo can cost~0–3/month but neither persists real selections nor automatically serves existing claimlinks; separateimplementationapproval required.
