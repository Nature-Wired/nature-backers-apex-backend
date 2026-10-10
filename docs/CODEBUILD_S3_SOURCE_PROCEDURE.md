# Temporary CodeBuild using a pinned S3 source archive

Account 296903956631, Oregon us-west-2. Preparation only: creating/uploading resources and running the build require separate approval. No GitHub App, GitHub token or CarbonSustain credential is needed for the isolated sports image. It uses public npm artifacts, including the published Guardian plugin and Agent Kit.

## Prepare the source locally (Mac; Docker not needed)

After receiving the final full backend commit from this change, fetch the feature branch and verify the commit. Set approved_commit to that exact 40-character SHA, never a moving branch name. Export tracked files only:

```bash
git fetch origin feat/oc-summit-milestone-a
approved_commit=REPLACE_WITH_REVIEWED_FULL_COMMIT
git show --no-patch --format='%H %s' "$approved_commit"
git archive --format=zip --output=nature-backers-sports.zip "$approved_commit"
shasum -a 256 nature-backers-sports.zip
```

Record the commit and SHA-256 independently of the S3 object. git archive ZIP includes the commit in its archive comment; the build validates it. An archive hash proves integrity against the approved artifact, not an independent proof of GitHub authorship. Use a trusted checkout/export and verify the feature-branch commit first. Do not zip the working directory, secrets, local databases or generated builds.

## Console sequence — confirm one step at a time

1. Select account/region and inspect CodeBuild Create project. Do not create it yet.
2. Review a dedicated private S3 source bucket/object in Oregon: Block Public Access, server-side encryption with S3-managed keys, no public access, no production bucket. Use a unique key containing the commit. Upload only after approval. Record the ZIP checksum; do not overwrite the approved object.
3. Review a dedicated CodeBuild role trusted by codebuild.amazonaws.com, scoped to this account/project. Permissions: s3:GetObject on this exact source object, and logs:CreateLogGroup/CreateLogStream/PutLogEvents limited to /aws/codebuild/nature-backers-sports-smoke. No S3 write/list, GitHub connection, Secrets Manager, ECR, ECS or RDS rights are required. SSE-KMS would require scoped KMS decrypt; avoid it for this small temporary test unless required by account policy. The operator needs scoped resource creation and iam:PassRole for this role, not those powers on the build role.
4. Source type S3, exact bucket/key. Managed on-demand Linux x86_64 standard image, BUILD_GENERAL1_SMALL, privileged Docker enabled, no VPC, no cache, no artifacts, no webhook. Timeout 15 minutes, concurrency limit 1. No production secret environment variables.
5. Inline buildspec: docs/CODEBUILD_SPORTS_ARCHIVE.yml. Set four non-secret plaintext variables: PINNED_SOURCE_COMMIT (full approved SHA), SOURCE_ARCHIVE_SHA256 (64-character checksum), SOURCE_BUCKET, SOURCE_KEY. The build independently downloads the object, validates its checksum and embedded commit, and builds that verified extraction. It does not trust an unchecked source checkout or mutable branch. Review before creating anything.
6. After separate approval, create only the agreed resources and run one build. Review SMOKE_REPORT; no ECR push or ECS deployment occurs.
7. After review and cleanup approval, remove temporary resources or set short log retention. Do not delete shared resources.

## Pass/fail checklist

- Archive SHA-256 and embedded commit match the approved values.
- Sports lock contains no CarbonSustain/Indexer/Git artifacts; all resolved artifacts are npm registry HTTPS.
- Docker build succeeds; image is amd64, USER=node and exact CMD=node dist/src/sports/main.js.
- Packaging tests receive the verified sports lockfile through a read-only test-only mount at /app/package-lock.json. The production image and subsequent application health container do not contain/mount this file; it is a build/test input, not a runtime dependency.
- Actual sports startup uses only temporary PostgreSQL and random test signing values.
- GET /health/sports/live returns 200 with exactly {"status":"ok"}.
- GET /health/sports returns 503 because no tables or migrations exist.
- Temporary PostgreSQL has zero public tables.
- SMOKE_REPORT shows imageBuilt=true, sportsStartup=true, liveHTTP=200, readyHTTP=503, cleanup=true, lastStage=complete, exit=0.
- Any missing report, timeout, mismatched checksum/commit, failed command or incomplete cleanup is a failure/incomplete result, never a pass.

EXIT/termination traps remove containers, anonymous DB volume, network and temporary files on ordinary success/failure; post_build adds backup cleanup. A forced worker termination cannot guarantee shell cleanup runs, but the managed build worker/local storage is disposable and no persistent cache/artifact is configured.

Budget approximately $0.025–$0.075 compute for a 5–15 minute small Linux build at a planning rate of $0.005/minute; confirm current Oregon pricing. Allow $0.10 per attempt plus small S3/CloudWatch retention and requests. No ALB/NAT/Fargate/RDS/badge retention cost applies. Stop and review failures before retrying.
