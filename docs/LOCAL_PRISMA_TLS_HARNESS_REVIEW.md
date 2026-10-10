# Local native Prisma TLS harness — prepared, not executed

Execution requires separate approval. No certificates generated, containers started, images pulled/built/published, database SQL migrations run or AWS settings changed during preparation. This is a test-only harness, not an application TLS configuration change. Express deployment remains blocked pending AWS support case179166963600053.

## Proposed files

- scripts/test-sports-prisma-tls.cjs: host orchestrator using Node, Docker and OpenSSL; disposable CA/server certificates, internal network, three PostgreSQL16 containers, seven native-client scenarios, cleanup.
- scripts/sports-prisma-tls-client.cjs: read-only mounted test runner that loads /app/node_modules through /app/package.json and checks Prisma6.19.2/native engine c2990dca591cba766e3b7ef5d9e8a84796e47ab7. Never imported by sports source.
- This document and a preparation-status note in RELEASE_5_MINIMUM_STAGING_GATE.md.

Root manifests/locks, Prisma schema, Dockerfile.sports, sports/employee source, image entrypoint and reference repositories are unchanged. No production dependency added. The existing image is tested, not rebuilt; its USER must be node and its default CMD must remain node dist/src/sports/main.js. Only test runs override the invocation to run the mounted client.

## Approved artifact and prerequisites

Expected local image reference:

```text
296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c
```

The exact image and PostgreSQL16 image must ALREADY exist on the execution host. The harness inspects them and uses --pull=never. Any authenticated ECR pull or image transfer is a separate action needing review/authorization; do not implicitly download it. The Intel Mac currently lacks Docker, so this is not directly executable there without a separately approved supported Docker host. Codex Docker availability does not prove it has this ECR image or pull authorization. A future managed test worker also needs separate approval, credentials/network/cost review and source delivery; this document does not authorize one.

Supported host Node24, Docker with LinuxAMD64 image support, and OpenSSL supporting req -addext are required. PostgreSQL test image defaults to postgres:16; record its actual digest before executing. SPORTS_TLS_POSTGRES_IMAGE can name an already-local approved PostgreSQL16 digest. No harness command pulls/builds an image.

## Review-only command (do not execute yet)

From the Apex feature-branch checkout:

```bash
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

Expected negative error classification is P1011 (TLS error). Unknown error codes, DNS/authentication/timeout failures, missing native engine, or successful negative-case connection fail the harness. Do not automatically expand accepted codes to make a run pass; review sanitized classification first. Source evidence suggests P1011 but execution has not confirmed every failure path.

## Materials and cleanup

Host creates a mode0700 temporary directory. Private keys/env files are mode0600. Test runner, CA files and scenario configs are individually read-only mounted into the node container; configs contain only disposable passwords and are readable inside that isolated container. Their host parent remains0700. Server private keys go only to their PostgreSQL container, never to the Prisma client. Standard PostgreSQL entrypoint copies its test key into container-local storage with owner postgres/mode0600; application containers never run as root. No host ports are published. --internal network blocks external access; only test server aliases are reachable.

Ordinary success/failure and SIGINT/SIGTERM cleanup removes tracked containers (including anonymous PostgreSQL volumes), the internal network, certificates/keys/configs and temporary directory. All scenario clients --rm and disconnect. Cleanup verifies named objects are absent and sets nonzero status on incomplete cleanup. Final PASS appears only after successful cleanup. SIGKILL/host failure cannot guarantee a trap runs; use a disposable worker where possible, and review/remove only the harness's recorded UUID-named objects/temporary directory if interrupted. Docker images are retained, not deleted or rebuilt. No claim of execution/cleanup success is made before running.

Output consists of scenario names, sanitized pass/fail, expected TLS classification, encrypted/no-table assertions and cleanup status. Never print Prisma exceptions, passwords, private keys, DATABASE_URL, raw Docker inspect/env/config or server logs. A failed run must be reviewed before retrying.

## Official RDS CA bundle — separate checks, not fetched by this harness

1. After approval, download the public Oregon bundle from https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem with verified HTTPS; record checksum/source/date and inspect all public certificates' subject/issuer/validity/fingerprints. Never substitute generated test CAs for RDS trust.
2. Review exactly which certificate the native connector loads: the inspected implementation calls Certificate::from_pem, not an established multi-root loader. OpenSSL parsing of the entire bundle does not prove Prisma loaded every root. Compare bundle versus selected RSA2048 material explicitly.
3. A separately reviewed extension can mount candidate RDS public material read-only into the existing image and use a controlled server to inspect load-versus-chain failure, without treating a generated server as RDS. Distinguishing those failures must be deliberate; this draft does not claim to do it.
4. A real RDS-trusted success requires an authorized RDS endpoint. The RDS CA private key is unavailable locally, so the current generated fixtures cannot prove an RDS server chain is trusted. Public CA delivery into a deployed image/volume remains a separate packaging review; no new image is prepared here.

## Later authorized RDS integration gate

New isolated PostgreSQL16.15/rds-ca-rsa2048-g1, private subnet/SG configuration, rds.force_ssl1 and approved VPC-connected runner. Mount reviewed RDS trust material; use actual endpoint DNS and strict native parameters. Connect/SELECT1/pg_stat_ssl, inspect effective force_ssl, and confirm plaintext client rejection. No schema migrations are needed for TLS tests. Validate a reviewed hostname-mismatch test with reachable DNS alias and wrong trust material without broadening DB ingress. Protect credentials through staging secret delivery and sanitize output. AWS infrastructure, CA packaging, secret/role changes and execution each need separate approval.

## Uncertainties before execution

Draft harness syntax and runtime behavior have NOT been executed or checked with Node/Docker/OpenSSL. Exact native rejection codes, OpenSSL host compatibility, local availability of approved images, non-root mount permissions, TLS hostname behavior and cleanup under failures require test execution. Certificate parsing of the official bundle and real RDS trust remain distinct open tests. Engine/CA metadata compatibility alone does not satisfy these gates.
