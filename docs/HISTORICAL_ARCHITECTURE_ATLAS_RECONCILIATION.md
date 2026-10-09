# December 2025 architecture and current Atlas integration

Reviewed 2026-10-09. The attached December 2025 PDF is historical evidence, not implementation instructions or proof of current deployments. No application source was changed for this review. Previously completed implementation was clean and remotely verified at backend `8e305e6749bd0885eea0a2f1900b3ef0afc475a3` and frontend `3e21634e86591645b7ed82bf8c87e0251d27f5fa`, both on `feat/oc-summit-milestone-a`.

## Atlas contract comparison

| Item | Scaffold-HBAR | Apex sports adapter |
| --- | --- | --- |
| Server configuration | `ATLAS_API_KEY`, `ATLAS_API_URL`, consumed by plugin | Same, consumed by plugin |
| Default API base | `https://atlas.xeptagon.com/api/v1` | Same installed plugin default |
| Search | GET `${base}/mainnet/projects`, query parameter `search` | Same |
| Details | Plugin exports GET `${base}/mainnet/projects/${encodeURIComponent(sourceTimestamp)}`; Scaffold UI route does not invoke details | Uses this plugin detail tool during curation |
| Authentication | `x-api-key` request header | Same; no Bearer token |
| Invocation | `searchGuardianProjectsTool({}).coreAction({query,pageSize}, {}, undefined)` | Native ESM import, same factory/action with optional context/client omitted |
| Plugin dependency | `^0.1.0`, Yarn resolves 0.1.0 | `^0.1.0`, npm installed 0.1.0 |
| Response | Search reads `response.data.data` array, returns `raw.projects`; detail exposes `response.data` as `raw.project` | Consumes those same envelopes, validates identity and allowlists snapshot metadata |
| Limit | `pageSize` limits results locally; not sent as upstream pagination | Same; Apex requests 20 results |

Evidence: Scaffold `packages/nextjs/app/api/sustainability/projects/route.ts`; plugin `src/tools/searchGuardianProjects.ts` and `src/tools/getGuardianProject.ts`; Apex `src/sports/atlas.service.ts`. Both installed plugin copies match this request contract. Optional coreAction context/client arguments are unused; omitting them is not a defect. Tool names retain Guardian terminology but their HTTP destination is Sustainability Atlas, not the legacy Indexer.

`ATLAS_API_URL` is an API **base**, not a full project URL, Indexer URL, or campaign API URL. The plugin appends `/mainnet/projects`; an empty value suppresses its default, and a trailing slash produces a double slash. If the default is appropriate, omit the variable. Otherwise use a confirmed HTTPS base ending in `/api/v1` without a trailing slash. Do not guess a replacement host based on a redirect.

## Runtime versus API configuration

This task's actual process has neither `ATLAS_API_KEY` nor `ATLAS_API_URL`. No published Network-secret binding is accessible to the task. This does not establish that the user's saved key is absent, invalid or incorrectly named. Editable draft metadata does not establish publication or runtime injection. No additional live-key retries were attempted in this review.

The missing URL alone is not a blocker because the plugin has a default. Missing key prevents authenticated verification. The earlier unauthenticated 301/redirect loop remains transport evidence, not an authentication result or proof of a wrong endpoint. Confirm the existing secret's published target binding and authorized HTTPS destination; then verify the endpoint with that binding. Do not copy key values into chat, files, bundles, logs or client code.

Two mocked-transport checks exercised actual installed plugin code: search URL/parameter/header, detail URL, timeout, result envelopes and timestamp identity; Apex's compiled adapter also consumed those results successfully. Only synthetic test data and a synthetic test credential were used. An initial Scaffold test mocked a different Axios installation, accidentally producing an HTTP 401 request with the synthetic credential; it was corrected to intercept the plugin's own nested Axios instance and then passed without network requests. This is not a failed real-key authentication test. No live key was used or disclosed.

## Reconciliation with the historical architecture

- **Frontend:** the PDF's React description remains compatible with the actual Next.js 15 Pages Router/React 19 employee application. Google/NextAuth sessions, departmental campaign wizard, project assignment and employee votes remain. Legacy discovery uses `NEXT_PUBLIC_NATUREWIRED_API` and `/project/filter` / `/recommend-projects/final-recommendations`. The PDF records the CloudFront campaign API URL historically; it cannot prove today's distribution origins, deployed repository or commit.
- **Legacy cache:** PostgreSQL `Project`, `ProjectSDG` and SDG joins still exist. `ProjectService.filterProjects` queries local records. `RecommendProjectsService` enriches/upserts Indexer records. Current full resync also mixes hardcoded records and additional SDG-discovered records; not every cache entry is independently verified live data. Cache clearing resets rich fields on referenced projects and deletes SDG associations, so it must not be reused for immutable sports ballots.
- **Legacy discovery changed:** the document describes `cs-indexer-hedera` and testnet. Current Apex uses `hedera-global-indexer`, defaults `INDEXER_URL` to the Guardian mainnet API, and separately uses `INDEXER_API_URL` (default localhost:8080) for a project/search helper service. Those defaults and `BEARER_TOKEN` are legacy configuration, unrelated to Atlas's `x-api-key` contract. No complete Elsevier/Auckland `SDG_KEYWORDS` taxonomy was found in the reviewed current source. The external helper's implementation and original package/taxonomy would be needed to verify the PDF's semantic-search claims.
- **Identities:** legacy `Project.id` is a local integer, `uniqueId` is unique, and `consensusTimestamp` is separate/nullable. Current enrichment uses relationships, UUIDs or timestamps and later deduplicates by project name. Atlas sports identity is the exact string `sourceTimestamp`, not the legacy integer/UUID, not a numeric JavaScript conversion, and not a project title. It identifies the listed source record; multiple records could still describe one underlying real-world project. Curators must check substantive distinctness before approving the three-project ballot.
- **Sports cache:** `AtlasProject` holds the latest allowlisted metadata plus fetch time; `SportsBallotProject.snapshot` freezes the curated campaign record, and `RewardIssuance.snapshot` freezes issued badge content. Shared Atlas cache refreshes do not rewrite published ballots or issued rewards. Published ballots cannot be edited. Only source identity, retrieval provenance and public fields are retained; this is a demo snapshot, not a full raw VC/archive or independent verification proof.
- **Campaigns:** legacy Campaign/Department/Project links and Created/Active/Pending/Approved workflows remain. Sports uses its own DRAFT/PUBLISHED/CLOSED status, optional league/team/sponsor/venue/partners/commitment and anonymous FanSelection constraints. Anonymous accepted selections are not verified unique people. Illustrative commitment remains distinct from disbursement.
- **Hedera:** current legacy code has individual EVM `VotingStorage.castVote` submissions, recovery/deduplication, Merkle proof generation and optional token-related workflows. After successful vote pushes, `vote.service.ts` stores a computed Merkle root in `Campaign.tx_hash`, rather than simply the final transaction hash described in the PDF. The inspected VotingStorage contract records individual votes; do not claim the displayed root itself is committed through that contract without further evidence. Scaffold's separate selection route directly submits HCS on testnet using server operator credentials; the discovery plugin does not transact. Sports badges have no blockchain dependency.

## Legacy isolation evidence and deployment condition

`src/sports/main.ts` creates only `SportsModule`, which imports Prisma and sports providers/controllers. Prisma connection lifecycle contains no listener, cron or Lambda initialization. Sports services write only SportsCampaign, AtlasProject, SportsBallotProject, FanSelection and RewardIssuance.

Historical insert/status triggers attach to `Campaign` or `Project`, not sports tables. Sports SQL creates no such triggers and no relations to legacy Campaign/Project/User/Vote. The native integration test uses disposable PostgreSQL, installs legacy sentinel triggers, executes the public journey, and asserts zero legacy writes/effects. It does not execute live AWS Lambdas or Hedera transactions.

**Use `node dist/src/sports/main.js` / `start:sports` for isolated staging.** The legacy `AppModule` also imports SportsModule but retains `PgListenerService`, CampaignStatus and other legacy modules. Launching the general legacy entrypoint would initialize the listener, which invokes `campaign-status-actions-handler` in hardcoded `us-west-1` on legacy status notifications. No AWS mapping is established by that hardcoded region. Never replay historical migrations or point the test service at the production DB.

## Reuse and smallest corrections

1. **P0 before live verification:** fix publication/runtime availability of the existing Atlas secret binding; confirm the canonical API base if authenticated requests still redirect. No demonstrated variable/header/tool mismatch requires a new Apex adapter.
2. **P1 concrete Scaffold defect:** its search route logs the complete caught error. Axios errors can include credential-bearing headers. Replace this with a fixed message plus allowlisted HTTP status; reuse Apex's sanitization pattern. This review did not change Scaffold source or create a new development branch there.
3. **P1 shared hardening:** plugin search turns a malformed/non-array `response.data.data` into a successful empty result. Validate the envelope and emit a sanitized contract error. Normalize/validate the optional HTTPS base (nonempty, no credentials/query, trim trailing slash). Apex plugin import happens outside its catch, so a missing/unsupported dependency can escape its sanitized Atlas error; move import into the guarded block. These are small follow-up changes, not grounds to replace Atlas with Indexer.
4. **P1 pending live schema evidence:** Apex accepts only integer SDGs 1–17; strings/objects are omitted, consistent with current tests. Do not silently infer new formats without actual response evidence. Detail currently expects an unwrapped object; if the authenticated API returns a wrapper, correct the plugin extraction centrally and test both callers. Numeric dotted sourceTimestamp validation is stricter than Scaffold's mocked `"123"`; that mock is not evidence for the live API schema.
5. **P2 presentation-only reuse:** existing mobile card layouts, campaign UI conventions and SDG label rendering can be reused where they display Atlas-provided values without changing associations. Do not port, recreate or retain cs-indexer-hedera keyword taxonomies, legacy VC enrichment or any inferred SDG classification in the sports experience. Atlas is the source for structured discovery, native filtering, metadata and SDGs. Do not import legacy Indexer/RecommendProjects/ProjectSDG services into SportsModule: they connect to legacy stores, helper APIs and automation. Legacy name deduplication can collapse different projects and should not replace source identities. Leave the employee application's existing discovery logic intact.

The present plugin exposes keyword search and details, but does not expose Atlas's broader native filter interface. When richer discovery is needed, add only documented Atlas-native filters to the existing plugin and test the actual provider contract; do not rebuild legacy semantic filtering. The sports adapter currently projects an allowlist and accepts numeric SDGs only. Check that projection against the live response before claiming complete metadata preservation; retain approved Atlas public metadata/provenance and native SDGs without inferring or reclassifying them.

The current allowlisted Atlas snapshots do not include a human-readable ecological/community narrative or supporting links. Their absence is a presentation limitation, not evidence of missing live API fields: the plugin also omits such fields. During live curation, use supported public source fields or a small explicitly labeled curator-written campaign blurb/source link; do not invent community benefits or funding availability from names, categories or SDGs.

## Independent validation in this review

- Apex sports: 17 tests passed; employee compatibility: 6 passed; Atlas verifier: 4 passed.
- Scaffold API suite: 4 mocked tests passed, including HCS mocks; no on-chain transaction was sent.
- Actual installed-plugin HTTP contract mocks: both callers passed; compiled Apex adapter passed.
- Native Prisma / real mobile Next.js → NestJS → disposable PostgreSQL integration passed, including selection/reward persistence, download, protected reporting, concurrency/idempotency, restart and legacy sentinel isolation.
- No production database/migration, AWS change, real Hedera transaction, live-key verification or approved live project ballot occurred. Prior normal builds remain verified; no application source changed in this review.
