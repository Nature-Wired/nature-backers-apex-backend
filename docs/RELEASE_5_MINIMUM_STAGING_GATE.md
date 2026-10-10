# Release #5: staging approval preparation

October10,2026; rehearsal October14/event October15, America/Los_Angeles. Owner reports release#5 successful in account296903956631/us-west-2. Backend e088567351ef6b5ef634fe08bb88a03a0f1a7573; frontend24e0cae485bafb2fac8586bdbc8c6c6c98aa3a94.

Repository: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging`. Owner reports digestVerified=true and smoke built/startup=true,live200,ready503,cleanup=true,complete,exit0. Image tag confirmed by owner: `release-e088567-5`. Tag URI: `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging:release-e088567-5`. Full valid digest is **pending**: the subsequently supplied `sha256:ea7fb45d672129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c` contains only 63 hexadecimal characters. Do not pad or guess the missing character. No validated image URI@digest can be recorded yet. Evidence is owner-provided, not an AWS read by the agent. Obtain tag/full digest/build ARN/source archive checksum/platform/scan findings before deployment approval; do not invent them or repeat the build.

## Cleanup warning

The build works in mktemp/source and its EXIT trap deletes that directory. CodeBuild can then try entering the now-deleted working directory for post_build. The warning is consistent with this lifecycle, not a runtime-image defect; exact warning text would confirm it. Future inline buildspecs now change back to CODEBUILD_SRC_DIR (fallback /tmp) before removing temporary files. This preserves the original exit status/cleanup checks and does not alter application/user/security. No retry needed for this successful release. Test-only documentation change; existing image, approved source ZIP/checksum/pin stay unchanged.

## Minimum-cost candidate for approval

Use the existing VPC vpc-0fb4c77da1221cbe3 only after read-only CIDR/routes/DNS/NACL inspection. New sports resources only; no existing route/SG/application updates. Select two of its public subnets across AZs for Express. Owner verified official AWS docs: public subnets enable public task IP, Express supplies internet-facing ALB/HTTPS443/generated domain/ACM certificate. Atlas HTTPS egress uses IGW/public IP and outbound rules, not NAT.

Create two NEW private DB subnets with available non-overlapping CIDRs, a NEW route table with local route only and associations only to these DB subnets, NEW DB subnet group and SG. Existing public subnet route table remains unchanged. A separate new VPC is an equally free VPC-level alternative if shared-network isolation is unacceptable; do not silently choose or modify existing network resources.

Express/Fargate: one task, explicit min=max1, LinuxAMD64, initial0.5vCPU/1GB subject to staging memory tests,port8080,unchanged non-root sports CMD. HTTPS443 ALB ingress; task8080 only from ALB SG, DB5432 only from taskSG; no direct internet task ingress. Outbound HTTPS/DNS as required and private DB traffic. Readiness /health/sports must200 after schema setup; liveness /health/sports/live200; sensible startup grace. No NAT/endpoints/WAF/extra replicas unless separately reviewed. One-task deployment is for demonstration, not HA; deployment replacement may temporarily overlap tasks.

Private RDS PostgreSQL16 SingleAZ micro,20GB encryptedgp3,7-day backups,public accessNo; DBsports_staging. Separate migration owner and least-privilege CRUD app user. Explicit connection pool bounds. Trusted RDS CA delivery and native Prisma certificate verification must be reviewed/tested before deployment; do not weaken TLS to make readiness pass. One reviewed private-VPC migration runner applies only sports enum/five-table SQL, transactionally, after separate approval. No historical migrations/dbpush/reset, legacy tables/triggers, production URLs or public DB workaround.

IAM execution role limited ECRpull/logs/stagingsecretrefs; minimal task role, Express infrastructure role reviewed separately; operator scopedPassRole. Backend staging secrets: DATABASE_URL,ATLAS_API_KEY,SPORTS_PARTICIPANT_SECRET,SPORTS_CLAIM_KEYS,SPORTS_ADMIN_JWT_SECRET. Stable signing secrets/version map retained. Nonsecretenv:NODE_ENVproduction,SPORTS_HOST0.0.0.0,SPORTS_PORT8080,SPORTS_ALLOW_FIXTURESfalse,SPORTS_CLAIM_KEY_VERSIONv1,ATLAS_API_URLhttps://atlas.xeptagon.com/api/v1,explicitadminemailallowlist. No Hedera keys, no legacy Indexer, no project-classification logic.

Separate new Amplify Next.js SSR app at pinnedfrontend; review source-access mechanism and supported runtime secrets delivery before creation. Configure SPORTS_BACKEND_URL newHTTPS,SPORTS_PUBLIC_ORIGIN exactAmplifyHTTPS,matchingadminJWTsecret/adminemails,AUTH_SECRET,AUTH_GOOGLE_ID/SECRET,AUTH_URL/NEXTAUTH_URL. Dedicated stagingGoogleOAuth callback /api/auth/callback/google,verified-emailadminallowlist and consent/testusers. Protected create/publish/reporting remains locked if OAuth missing. Fans require no email/login/wallet. Existing employee deployment stays untouched; its wizard is preserved, not connected to sports-only backend.

## Cost and duration

Planning, not current pricing quote: one0.5vCPU/1GB task18/month,ALB17–23,threepublicIPv411,RDS/storage15–25,Amplify1–10,supportingsecrets/ECR/logs4–9: **66–96/month,16–28/seven days**. Existing image storage is included in supporting-cost planning; actual size/scan tier to verify. If1vCPU/2GB needed: **84–114/month**. Recommended approved ceiling120/month equivalent for one-task staging; not a hard automatic cap. Budget alerts,maxreplicas1,logs7-dayretention,basicECRscan,limitedAmplifybuilds,noNAT. No credit/free-tier assumptions. Confirm exact rates/configuration before resource approval.

Target setup October11–13 only after approvals; October14 phone rehearsal,October15event. No approved projects means keepcampaignDRAFT/public404. Three approved nativeAtlas sourceTimestamps and reviewed metadata/copy/window/publication are still required. Publication is separate from infrastructure/migration authorization.

## Console sequence, one step at a time

1. ECR read-only: open repository > release#5image; copy full sha256digest/tag/size/scanstatus. Cross-check release report. No changes.
2. VPC read-only: confirm VPC CIDR/subnets/AZs/routes/DNS/NACLs and propose available DB CIDRs. No creation.
3. IAM/Express/Secrets/RDS/Amplify read-only settings review; settle migration-network/RDSCA/adminOAuth/server-secret delivery and budget/retention. Review exact resource manifest for explicit creation approval.
4. After approval only: create agreed newnetwork/roles/secrets/privateDB resources; separate approval for SQLjob; verify RDS/TLS/schema.
5. After deployment approval only: create Express using exact verifieddigest, testreadiness200/unauthorized401/legacy404/Atlas; separateAmplify deployment/config and allowed/deniedadminchecks.
6. Approvedthree-projectDRAFT snapshots; separatepublicationapproval, thenreal iPhoneQR/privateSafari/select/retry/claim/download/cleansessionretrieval/dashboard/restart tests. Commitmentoptional/illustrative/notdisbursed; anonymousselectionsnotverifieduniquefans.

## Retention and cleanup decisions

Existing temporaryCodeBuild/source/logs may be cleaned up only with scoped cleanup approval; retain release evidence and ECRimage, remove unnecessary pushpermissions. A confirmed full digest does not require another build. No ECS/RDS/Amplify resources yet.

Afterevent retain livefrontend/backend/DB/claimkeys/hostname for agreedbadgelinkduration, costingongoingstackrates. DeleteALB/tasks toreducecost only after acknowledgingclaimoutage; RDSstopauto-restartsafter7days andstorage/secretscontinuebilling. Snapshot/exportplusstableversionedkeysretainabilitytorecover, notonlineclaims. Further ECRlifecycle/deletion requires review of deployed/rollbackdigests. A future labelledstaticconceptualdemo can cost~0–3/month but neither persists real selections nor automatically serves existing claimlinks; separateimplementationapproval required.
