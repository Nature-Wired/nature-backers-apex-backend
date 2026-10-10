# Local native Prisma TLS harness — prepared, not executed

Execution requires separate approval. Syntax-only node --check validation passed on both JavaScript files after approved test-only hardening. No TLS scenarios executed, certificates generated, containers started, images pulled/built/published, database SQL migrations run or AWS settings changed during preparation. This is a test-only harness, not an application TLS configuration change. Express deployment remains blocked pending AWS support case179166963600053.

## Proposed files

- scripts/test-sports-prisma-tls.cjs: host orchestrator using Node, Docker and OpenSSL; disposable CA/server certificates, internal network, three PostgreSQL16 containers, seven native-client scenarios, cleanup.
- scripts/sports-prisma-tls-client.cjs: read-only mounted test runner that loads /app/node_modules through /app/package.json and checks Prisma6.19.2/native engine c2990dca591cba766e3b7ef5d9e8a84796e47ab7. Never imported by sports source.
- This review document (the earlier staging preparation note remains unchanged during hardening).

Root manifests/locks, Prisma schema, Dockerfile.sports, sports/employee source, image entrypoint and reference repositories are unchanged. No production dependency added. The existing image is tested, not rebuilt; its USER must be node and its default CMD must remain node dist/src/sports/main.js. Only test runs override the invocation to run the mounted client.

## Approved artifact and prerequisites

Expected local image reference:

```text
296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c
```

The exact image and PostgreSQL16 image must ALREADY exist on the execution host. The harness inspects them and uses --pull=never. Any authenticated ECR pull or image transfer is a separate action needing review/authorization; do not implicitly download it. The Intel Mac currently lacks Docker, so this is not directly executable there without a separately approved supported Docker host. Codex Docker availability does not prove it has this ECR image or pull authorization. A future managed test worker also needs separate approval, credentials/network/cost review and source delivery; this document does not authorize one.

Supported host Node24, Docker with LinuxAMD64 image support, and OpenSSL supporting req -addext are required. There is no mutable PostgreSQL default. SPORTS_TLS_POSTGRES_IMAGE is REQUIRED and must identify an explicitly reviewed postgres@sha256:64-hex image (docker.io/library/postgres prefix also accepted). Preflight requires matching local RepoDigests, Linux/AMD64, PG_MAJOR=16 and a valid local image ID. It records those public identifiers; it never prints the image environment. No harness command pulls/builds an image.

## Review-only command (do not execute yet)

From the Apex feature-branch checkout:

```bash
SPORTS_TLS_POSTGRES_IMAGE='postgres@sha256:<reviewed-64-hex-digest>' \
node scripts/test-sports-prisma-tls.cjs \
  '296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c'
```

If needed on an approved host, set DOCKER_CONFIG to its authorized writable configuration directory; never copy registry credentials into the harness or source. No ATLAS, Hedera, AWS or production DB credentials are passed into the test containers. Generated PostgreSQL credentials are random, disposable and delivered by restricted temporary env/config files, not CLI arguments.

## Scenarios and expected results

| Scenario | Setup | Required outcome |
| --- | --- | --- |
| trusted-valid-ca | CA A signs pg-trusted DNS SAN; client trusts A | Connect; SELECT1 succeeds; pg_stat_ssl for own backend shows ssl=true; zero public tables |
| second-ca-baseline | CA B signs pg-untrusted; client trusts B | Same encrypted success; confirms server B works before rejection test |
| untrusted-chain | Server B; client trusts A only (plus normal OS roots) | Native TLS rejects; generated CA B is not publicly/system trusted |
| hostname-mismatch | Trusted server A reached through pg-wrong-host alias absent from SAN | Native TLS rejects despite valid trusted chain |
| tls-disabled | PostgreSQL server configured ssl=off | sslmode=require rejects; no plaintext fallback |
| missing-ca-file | Correct server, sslcert points to nonexistent mounted path | Native client rejects loading/trust setup |
| malformed-ca-file | Correct server, sslcert points to non-PEM content | Native client rejects certificate parsing |

Valid CA loading is demonstrated by both positive encrypted connections, not by OpenSSL alone. Each scenario runs a fresh native Prisma client with sslmode=require, sslaccept=strict, sslcert=/tmp/test-root.pem (or deliberately missing path), connection_limit1 and connect_timeout5. No JavaScript pg adapter, migration or table creation is used. Positive query verifies pg_stat_ssl on the actual query session. The tests do not invoke SportsModule/bootstrap, Atlas or Hedera.

Expected negative error code is P1011 AND a scenario-matching fixed category (untrusted-chain, hostname-mismatch, tls-disabled, missing-ca or malformed-ca). Message text is inspected only in memory, never emitted. Unknown TLS categories, mismatched categories, DNS/authentication/timeouts, failed Docker invocation or unexpected success fail the scenario. Recognized diagnostic codes are P1000/P1001/P1002/P1003/P1010/P1011/P1012/P1013/P1017/P2010/P2024; inclusion permits reporting only, not acceptance. Unknown codes become unknown. The host validates structured records and prints only scenario/status/phase/code/category; arbitrary stdout/stderr is discarded. Configuration parsing and native-client loading are inside sanitized handling. Actual native messages/codes have not been confirmed; unrecognized platform wording deliberately fails pending review, not weaker criteria.

## Materials and cleanup

Host creates a mode0700 temporary directory. Private keys/env files are mode0600. Test runner, CA files and scenario configs are individually read-only mounted into the node container; configs contain only disposable passwords and are readable inside that isolated container. Their host parent remains0700. Server private keys go only to their PostgreSQL container, never to the Prisma client. Standard PostgreSQL entrypoint copies its test key into container-local storage with owner postgres/mode0600; application containers never run as root. No host ports are published. --internal network blocks external access; only test server aliases are reachable.

Ordinary success/failure and SIGINT/SIGTERM cleanup removes tracked containers (including the run-specific named PostgreSQL data volumes), the internal network, certificates/keys/configs and temporary directory. All scenario clients --rm and disconnect before PASS. Cleanup verifies absence using SUCCESSFUL daemon listings; daemon, permission, timeout and other listing failures count as unknown/FAIL, never absence. Re-entry is prevented, each child command is limited to at most5seconds and the overall cleanup command budget is45seconds. Child timeout uses SIGKILL to bound Docker CLI waiting; containers created by those CLIs remain tracked for teardown. Metadata/filesystem operations still depend on host responsiveness; no guarantee is possible for a stuck kernel/filesystem. Final PASS appears only after successful cleanup. SIGKILL/host failure cannot guarantee a trap runs; use a disposable worker where possible, and review/remove only the harness's recorded UUID-named objects/temporary directory if interrupted. Docker images are retained, not deleted or rebuilt. No claim of execution/cleanup success is made before running.

Output consists of scenario names, sanitized pass/fail, expected TLS classification, encrypted/no-table assertions and cleanup status. Never print Prisma exceptions, passwords, private keys, DATABASE_URL, raw Docker inspect/env/config or server logs. A failed run must be reviewed before retrying.

## Official RDS CA bundle — separate checks, not fetched by this harness

1. After approval, download the public Oregon bundle from https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem with verified HTTPS; record checksum/source/date and inspect all public certificates' subject/issuer/validity/fingerprints. Never substitute generated test CAs for RDS trust.
2. Review exactly which certificate the native connector loads: the inspected implementation calls Certificate::from_pem, not an established multi-root loader. OpenSSL parsing of the entire bundle does not prove Prisma loaded every root. Compare bundle versus selected RSA2048 material explicitly.
3. A separately reviewed extension can mount candidate RDS public material read-only into the existing image and use a controlled server to inspect load-versus-chain failure, without treating a generated server as RDS. Distinguishing those failures must be deliberate; this draft does not claim to do it.
4. A real RDS-trusted success requires an authorized RDS endpoint. The RDS CA private key is unavailable locally, so the current generated fixtures cannot prove an RDS server chain is trusted. Public CA delivery into a deployed image/volume remains a separate packaging review; no new image is prepared here.

## Later authorized RDS integration gate

New isolated PostgreSQL16.15/rds-ca-rsa2048-g1, private subnet/SG configuration, rds.force_ssl1 and approved VPC-connected runner. Mount reviewed RDS trust material; use actual endpoint DNS and strict native parameters. Connect/SELECT1/pg_stat_ssl, inspect effective force_ssl, and confirm plaintext client rejection. No schema migrations are needed for TLS tests. Validate a reviewed hostname-mismatch test with reachable DNS alias and wrong trust material without broadening DB ingress. Protect credentials through staging secret delivery and sanitize output. AWS infrastructure, CA packaging, secret/role changes and execution each need separate approval.

## Uncertainties before execution

Both JavaScript files passed node --check; no runtime behavior or Docker/OpenSSL operation has been executed. Exact native rejection codes, OpenSSL host compatibility, local availability of approved images, non-root mount permissions, TLS hostname behavior and cleanup under failures require test execution. Certificate parsing of the official bundle and real RDS trust remain distinct open tests. Engine/CA metadata compatibility alone does not satisfy these gates.

## PostgreSQL digest review before execution

After separate approval for read-only Docker inspection on the intended host, inspect the already-present PostgreSQL image:

```bash
docker image inspect postgres:16 \
  --format '{{json .RepoDigests}} {{.Os}}/{{.Architecture}} {{.Id}}'
```

Do not pull if absent. Record a reviewed repository digest, not just image ID or tag, then set SPORTS_TLS_POSTGRES_IMAGE to that digest. The eventual harness independently checks the local digest/platform/PG_MAJOR before certificate generation. Neither this inspection command nor a pull was run during hardening. No digest has been invented or selected automatically.

## Manual recovery after SIGKILL, host failure or cleanup FAIL

Use the exact UUID run ID and temporaryDirectory printed in TLS_RUN. Do not infer ownership from a broad sports prefix, remove unrelated objects or dump Docker env/inspect/config/private files. First restore reliable Docker daemon access; listing/permission failures are unresolved, not evidence of cleanup. Review these commands before recovery execution:

```bash
run_id='sports-tls-<exact UUID from TLS_RUN>'
docker container ls --all --filter "name=$run_id" --format '{{.Names}}'
docker volume ls --filter "name=$run_id" --format '{{.Name}}'
docker network ls --filter "name=$run_id" --format '{{.Name}}'
```

Confirm every returned name belongs to the exact recorded run. Remove each reviewed container with docker rm -fv <exact-name>; remove each run-specific data volume with docker volume rm <exact-name>; remove the exact run network with docker network rm <run-id>. The three named data volumes are <run-id>-trusted-data, <run-id>-untrusted-data and <run-id>-plaintext-data. No other volumes or images should be removed. Do not use system prune or wildcard deletion.

After containers are gone, remove only the exact recorded mode0700 temporaryDirectory (expected basename sports-prisma-tls-*), using a carefully verified path, never /tmp or a broad glob. This directory contains disposable private keys/password files; do not read or publish their contents. Re-run successful container/volume/network listings and verify the directory is absent. Recovery is incomplete until all checks succeed. Preserve sanitized run/outcome evidence.

SIGINT/SIGTERM handlers mark interruption and prevent duplicate teardown; synchronous work can delay delivery until its bounded command finishes. Repeated signals do not start parallel cleanup. SIGKILL/power loss bypass handlers entirely; the manual procedure or disposal of the dedicated worker is required. An interrupted or uncertain-cleanup run is never an overall PASS.
