# ECR publication gate — preparation only

Account296903956631, us-west-2. No resources or builds are authorized by this document. Keep backend source **e088567351ef6b5ef634fe08bb88a03a0f1a7573**, frontend **24e0cae485bafb2fac8586bdbc8c6c6c98aa3a94**. Later documentation commits do not replace the approved source archive.

Express networking/HTTPS documentation blockers are resolved by the owner's verification of https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html. Actual staging resource creation, RDS TLS/schema, Google admin authorization, frontend configuration, Atlas verification and project/publication approval remain separate gates.

## Exact release inputs

- Inline buildspec: CODEBUILD_SPORTS_ECR_RELEASE.yml. This is the successful smoke specification plus account/pin checks and ECR push/digest verification after all tests pass. Do not use the older buildspec embedded in the e088 source ZIP.
- Same approved S3 archive, actual SHA-256 and embedded e088 commit. Four plaintext variables: PINNED_SOURCE_COMMIT, SOURCE_ARCHIVE_SHA256, SOURCE_BUCKET, SOURCE_KEY. Retain the actual successful build #4 checksum; it has not been provided here. Never substitute a different archive hash.
- Managed Linux x86_64, small on-demand compute, privileged Docker,15-minute timeout,concurrency1,no VPC/cache/S3 artifacts/webhooks/production credentials. Maintain CloudWatch report retention for review.
- Existing corrected read-only test script and lock mounts; no lockfile added to runtime image. Mandatory USER node/CMD sports main unchanged. Controlled plugin tests and empty PostgreSQL live200/ready503/no-table checks precede publication. No migrations or Atlas/Hedera credentials.

## ECR and minimum IAM

New PRIVATE repository `nature-backers-sports-staging`, URI `296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging`. Immutable tags with no exclusions, AES256 service-managed encryption unless account policy requires otherwise. Review registry basic scan-on-push settings; do not enable paid enhanced scanning silently. No public repository or cross-account access. Do not add automatic lifecycle deletion that could remove a release needed for staging/rollback.

Build-role policy: CODEBUILD_ECR_IAM_POLICY.template.json. Replace only source bucket/object placeholders with the exact approved object. Logs remain scoped to the temporary project's log group. ECR authorization token requires Resource=* but is region-conditioned. Layer upload/PutImage plus DescribeImages/BatchGetImage are scoped only to this repository. No CreateRepository, DeleteRepository/DeleteImage, ECS, RDS, Secrets Manager or production rights. STS GetCallerIdentity identifies the executing account and needs no new Allow grant. Existing service-role trust/account/project restrictions remain in force.

The human provisioning operator separately needs approved ECR CreateRepository/registry scan configuration access, scoped build-role policy update, CodeBuild project update/start/read and any required PassRole. These do not belong on the build role. Repository and role changes must be authorized before the build; the script cannot create the repo.

## Console sequence — confirm each step, do not execute before approval

1. Read-only: select account296903956631/Oregon; open ECR > Private registry > Repositories. Confirm whether the proposed repository name already exists. Do not create or modify it yet.
2. Review the proposed private/immutable/encryption/basic-scan settings and exact role-policy additions. Inspect existing temporary CodeBuild source/checksum/buildspec/timeout settings. Obtain approval for repo creation, narrow IAM/project changes and one release build. This approval does not include ECS or migrations.
3. Once authorized, create only the agreed repository; update the dedicated CodeBuild role with the reviewed policy. Do not alter production roles or shared registry policies. If the name exists, review ownership/configuration instead of treating it as a new resource.
4. Update the temporary CodeBuild project's INLINE buildspec to CODEBUILD_SPORTS_ECR_RELEASE.yml. Preserve S3 source object and actual checksum/e088 pin. Region Oregon,15-minute timeout,small compute,one concurrent build,no cache/artifacts,VPC or new application secrets. Review the complete form before saving.
5. Start exactly one build after authorization. No automatic retry. It builds/tests one image and pushes that same local image only after passing tests. Tag is `release-e088567-<CodeBuild build number>`; no mutable latest tag. Docker authentication is short-lived and stored only inside the restricted temporary directory removed by the cleanup trap.
6. Review both SMOKE_REPORT and RELEASE_REPORT. Required smoke result: built/startup true,live200,ready503,cleanup true,stage complete,exit0. Required release result: exact e088 source,actual archive hash,build ID,image URI,sha256 manifest digest,digestVerified=true. Verify matching tag/digest in ECR Console image details. Do not deploy on a tag alone. Record image size/scan findings/full build ID/buildspec revision/platform/Node version in the release receipt.
7. Stop for staging approval. Revoke the temporary role's ECR push rights when release work is complete. Retain approved ECR image/digest for deployment; do not delete it as smoke-test cleanup. Remove temporary build/source/log resources only after cleanup approval and retention review.

## Digest verification and failure handling

After push, the build compares Docker RepoDigests to ECR DescribeImages, retrieves that digest with BatchGetImage and independently hashes the exact returned manifest. The registry manifest digest, not the local image ID, is the deployment identifier. All checks must pass. Digest syntax errors, API failures or mismatches fail the build.

If push succeeds but a later verification/report/cleanup step fails, an image may already exist in ECR. Stop, inspect the specific tag/digest and reason; do not overwrite/delete/retry automatically. Immutable tags prevent overwrite. Preserve the failed-build receipt. The build's image layers/tags may remain even after local container cleanup; AWS cleanup is never performed by the failure trap.

CodeBuild #4's worker-local image is not assumed recoverable. This is a new validated build of the same source/lock/base recipe; apt package repositories can change, so do not claim identical bytes to #4. The newly tested registry digest is authoritative for the release.

## Costs and cleanup

Planning small Linux rate approximately$0.005/minute: a15-minute attempt about$0.075 compute plus logs/source storage/requests. Confirm Oregon pricing and timeout before authorization. Recommend a$1 incremental budget for one build and short-term low-volume storage, excluding existing AWS usage; it is not an automatic hard AWS spending cap. A large push could hit the15-minute timeout; review evidence before changing the timeout or retrying.

ECR private storage planning rate about$0.10/GB-month; measure actual image size, do not assume it. Example2GB image about$0.20/month before other charges. Private ECR, S3 source object and CloudWatch logs persist after the worker terminates. Same-region transfer/basic scanning pricing must be confirmed; avoid paid enhanced scanning unless approved. No Fargate/ALB/NAT/RDS costs occur at this gate.

Local containers/anonymous DB volume/network/auth files are removed by EXIT/post_build cleanup; forced worker termination relies on disposal of local worker storage. The release image is intentionally retained in ECR. Later cleanup requires separately approved image/repository deletion or lifecycle policy, with release/rollback retention considered. Do not delete a shared bucket, log group, role or connection. GitHub is not connected and no token is needed.
