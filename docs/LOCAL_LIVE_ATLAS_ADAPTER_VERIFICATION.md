# Mac verification of the Apex sports Atlas adapter

Use the existing `feat/oc-summit-milestone-a` branch, not main. No Scaffold/plugin changes, database, migration, API server, campaign publication or Hedera credentials are required. This runs the **compiled SportsAtlasService** used by NestJS, using the installed Guardian plugin and real Atlas search/detail responses. It is not just curl or the standalone plugin verifier.

## What remains to establish with live data

- Search HTTP 200 must contain an object with `data` as an array. Plugin search otherwise silently returns an empty list. It maps the first 20 rows, not provider pagination.
- Details must be an unwrapped project object: plugin exposes `response.data` as `raw.project`. A `{ data: project }` wrapper would fail current adapter validation.
- `sourceTimestamp` must be a string containing decimal digits, a dot and fractional digits. The adapter preserves it exactly, compares detail identity with the requested value, and rejects fixtures. Never convert it to a JS number. This identifies the source record, not necessarily a unique real-world project.
- `name` must be nonblank. Optional country, registryName, developer, methodology, category, sector, status and lifecycleStage must be strings/null/absent; current projection turns other types into null and clips strings at 1,000 characters. The verification detects those losses rather than declaring compatibility merely because a response normalized.
- `sdgs` currently expects integer arrays 1–17. Strings/objects/out-of-range values are currently dropped. Detect actual differences before changing interpretation; preserve native Atlas associations, never infer them from keywords.
- Snapshots retain an allowlist, not the complete provider record. Plugin search itself drops other fields. Missing narrative, links or additional provider fields need a separately reviewed Apex-only extension if required; do not call this complete metadata archival. Provenance/retrieval time are downstream annotations; provider status/SDGs are not independent verification or funding eligibility.
- After adapter verification, still test protected campaign curation with the approved three timestamps against an isolated disposable/staging DB, compare stored snapshots and exercise public selection/claim/reporting. This script deliberately does not do that before project/deployment approval.

## Minimal procedure

Use Node 24.19.0 (the tested version), npm and Python 3. A Mac must have access to the private repository and the locked GitHub dependency `hedera-global-indexer`. If install fails, report a sanitized error; do not change the lockfile.

```sh
git clone --branch feat/oc-summit-milestone-a https://github.com/Nature-Wired/nature-backers-apex-backend.git
cd nature-backers-apex-backend
# For an existing checkout: preserve local changes, fetch and fast-forward this branch.
git status --short
npm ci --ignore-scripts --no-audit --no-fund
DATABASE_URL='postgresql://unused:unused@127.0.0.1:1/not_used' npm run build
node --test scripts/verify-sports-atlas.test.mjs
```

The dummy build URL is not a database to connect to; Prisma generation/Nest compilation do not migrate or bootstrap the app. No production dotenv file is needed. Preserve native-engine checksum/TLS verification. Never run default start:prod, deploy scripts, migrations or configure:sports here.

Run the following without shell tracing. Python prompts without echo and passes the key only to the child process; no credential is written to a file or put in a command argument. Alternatively use an already configured trusted local secret manager to provide the child's environment. Never paste values/results containing credentials into chat.

```sh
python3 - <<'PY'
import getpass, os, subprocess
env = os.environ.copy()
env['ATLAS_API_KEY'] = getpass.getpass('Atlas API key (hidden): ')
env['ATLAS_API_URL'] = 'https://atlas.xeptagon.com/api/v1'
env['SPORTS_ALLOW_FIXTURES'] = 'false'
raise SystemExit(subprocess.call(['node', 'scripts/verify-sports-atlas.mjs', 'mangrove'], env=env))
PY
```

Repeat with `forest` or another nature term if no candidates; do not repeatedly retry HTTP errors. The script fetches details for up to three search results by default. To check specific candidates after inspecting results, append their exact source timestamps to the subprocess argument list. Those are public identifiers, not credentials. No candidate is automatically approved or published.

Successful output has `ok: true`, `adapterExecuted: true`, search/detail observations with HTTP statuses and compatible field types, normalized public candidates/details, `databaseAccessed: false`, `campaignPublished: false`. If `ok: false`, share only the sanitized output. Contract failure reports field names/types, not raw bodies; do not share Axios errors or environment dumps. Authentication HTTP 200 alone is insufficient.

The shape observer wraps the same Axios instance used by the installed plugin and forwards the original request unchanged. It does not replace credentials, disable TLS, bypass configured proxies or modify plugin files. Native adapter catches HTTP failures with sanitized status; setup/dependency failures also receive a fixed message. Cloud proxy routing remains a separate issue; run this on the Mac where the owner has already confirmed HTTP 200.

## Follow-up gates

Send the sanitized output and reviewed public project information. Propose Apex-only corrections with focused tests if live shapes differ. Obtain owner approval of three real projects before a protected DRAFT campaign is curated/published. AWS staging must use start:sports, server-only Secrets Manager injection, a new isolated PostgreSQL database and verified admin authorization. No production or staging deployment is authorized by this procedure.
