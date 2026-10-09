# Atlas and application validation — 2026-10-09

Started from backend 6915ba0e2c1e00c258460fe7e7c84efc4d38168a and frontend 3503552334e898b81eed160d156e107c56bedbc8, both on feat/oc-summit-milestone-a. No reimplementation from main, production migration, AWS change or ballot finalization occurred.

## Atlas evidence

| Check | Observed result |
|---|---|
| Runtime ATLAS_API_KEY / ATLAS_API_URL | Both absent; no value inspected or printed |
| Editable configuration metadata | Atlas requirement reports has_saved_binding=false; tool cannot inspect published runtime status or reconcile the user's saved Network secret |
| Guardian plugin verifier | `npm run atlas:verify -- --query mangrove`: ok=false, httpStatus=null, missing-runtime-key/no-request-sent |
| Separate UNAUTHENTICATED transport probe | Default HTTPS search route returned HTTP 301 to HTTPS same host/path; following redirects hit ERR_FR_TOO_MANY_REDIRECTS, without terminal HTTP status. No key sent |
| Runner direct DNS probe | EAI_AGAIN; not proof of a global Atlas outage |
| Credentialed authentication/search/details | Not executed |
| Live sourceTimestamp and metadata agreement | Not verified |
| Three real project candidates / live ballot snapshots | Pending; no fixture or invented records presented as real |

Ensure the selected published environment delivers the existing ATLAS_API_KEY binding to that exact application variable for atlas.xeptagon.com, and confirm the canonical HTTPS API base URL. Do not paste or duplicate the secret in chat. Saving/publishing does not prove propagation to this running task. A fresh task attached to the correct published environment may be required; approved commits are now on GitHub. The unauthenticated redirect might differ with authentication or reflect runner egress, and does not show the key is invalid.

After binding/route work, use the Guardian plugin for nature/community/geographically relevant searches, retrieve candidate details and match each sourceTimestamp exactly. Present three names, locations, type/methodology, timestamps, public source links, ecological/community evidence and limitations for approval BEFORE protected curation/publication. Country/SDGs alone do not establish local/community outcomes. Atlas listing/status does not prove sponsorship availability, credits, legal title, purchase or transfer. Do not finalize the ballot before approval.

## Test results

| Target | Result |
|---|---|
| Normal backend npm run build | PASS, native Prisma 6.19.2 and NestJS; checksum bypass absent |
| test:sports | 17 PASS |
| test:employee-compatibility | Six PASS: employee registration/role, department/reason, duplicates, assigned project and Active status |
| test:atlas-verifier | Four PASS: sanitized failures, public metadata, identity/fixture rejection and missing key |
| test:sports-schema | PASS in own disposable PostgreSQL 16 container: constraints, reconnect persistence and unchanged legacy sentinels/triggers |
| test:sports-integration | PASS, actual HTTP/database/restart contracts with supported test-only WASM adapter |
| test:sports-browser-integration | PASS, unmocked mobile Next.js → NestJS → Postgres journey with WASM adapter |
| test:sports-native-integration | PASS, complete HTTP/mobile journey with native Prisma |
| Frontend npm run build | PASS; existing hook/image warnings remain |
| Frontend test:sports | Eight PASS: six fan/report tests and employee wizard/voting regressions |
| Browser bundle scan | No Atlas/session/badge/admin secret variable references in .next/static |

Integrated tests generate a QR with the landing URL, show exactly three labeled fixtures, submit without auth calls, check mobile overflow at 390px, reload receipt, recover a claim in a clean browser, download SVG and compare protected dashboard counts to Postgres. The report session is signed with an isolated test secret: real session/allowlist/backend-assertion verification, NOT a live Google OAuth handshake. Tests create/remove their own databases and never read application DATABASE_URL. Fixtures are disabled in production and are not live Atlas verification.

Legacy employee pages/wizard/vote implementation are unchanged from original baseline. Six backend rules and two browser workflows pass with controlled legacy data. Existing legacy manual-procedure placeholder tests are not counted as functional verification. Production OAuth, deployed external APIs, SES/Lambda effects and full historical migrations were not tested. Zero sports legacy writes/effects were verified with controlled sentinels, not every deployed trigger definition.

## Changes and release gates

Fixed three defects: (1) simultaneous fan submissions exhausted Serializable retries (20-person burst returned HTTP 500 with P2034); campaign locking now precedes state reads under ReadCommitted, and native/WASM tests accept all 20 with exactly one badge each; (2) the frontend SVG proxy dropped sandbox/default-src policy and now preserves it; (3) malformed badge-key JSON errors could echo secret input, so they now return a fixed sanitized configuration error. Tests verify signing-failure rollback leaves neither selection nor reward, alongside duplicate/restart checks. The test harness now keeps one HTTP listener for concurrent requests and bounds cleanup while preserving failure exit codes. No schema change/new migration or employee/status business-rule change. Generated outputs remain ignored.

Still required: Atlas binding/canonical route and candidate approval; Nature Wired AWS account ID/region/role; exact October 2026 event date; budget/peak traffic/badge retention; approved staging OAuth/admin allowlist; secure AWS-only secret provisioning; supported AWS build/runtime/private Git access and SSR variable injection; staging release approval and real-phone/backup/authorization rehearsal. Use AWS-generated HTTPS URLs. Never make reporting public or bypass authentication if staging OAuth is unavailable. Apply sports SQL only to a NEW approved staging DB. No live demonstration URL exists before deployment approval.

See AWS_STAGING_PLAN.md for resources, costs, known unmapped URLs and release sequence.
