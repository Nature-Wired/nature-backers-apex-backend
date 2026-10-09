# Live project curation gate, 2026-10-09

Owner reports Mac verification passed using compiled SportsAtlasService: search/detail HTTP 200, exact sourceTimestamp identity, compatible metadata/SDGs, no oversized fields. This is owner-provided live evidence; Codex Cloud's transport remains blocked. No real ballot has been approved/published.

## Country provenance

Plugin search assigns `country: project.country ?? null`; detail returns the provider response unchanged. Apex assigns `country: text(project.country)`, where text only retains strings and clips at 1,000 characters. Neither introduces codes or converts geography. Given reported successful type validation, `"-2"` is an upstream Atlas field value passed through unchanged, not a country inferred by Apex/plugin. The provider's deeper decoding source and meaning of -2 remain unknown. Do not infer a country from the project title.

Current fan UI renders country directly. Proposed Apex-only correction: preserve `country` in AtlasProject/ballot/reward snapshots, but project the public fan response's country as null for known unusable values such as `"-2"`. Add a separate explicit display-availability indicator if needed; do not write a guessed country or new classification into source snapshots. Use the same public presentation boundary for claim metadata if rendered geographically. The verified metadata remains available to authorized curators. No application correction applied before this review.

Focused tests: raw `"-2"` retained in normalization and stored snapshots; public presentation omits it; ordinary Atlas country strings pass through; public projection never mutates stored objects; sourceTimestamp/SDGs/provenance unchanged. This is display validation, not geographic classification or provider metadata repair.

## Evidence needed for three candidates

BlueMX Aztlán Blue Carbon Project v2 is the only named live result supplied so far. Its exact timestamp, registry, methodology, native SDGs and reliable location were not supplied. Treat it as a provisional candidate, not a complete shortlist or an approved project. No supported location/community/funding claims can be made from its name.

On the Mac checkout at the current feature tip, use LOCAL_LIVE_ATLAS_ADAPTER_VERIFICATION.md and the existing hidden-key Python wrapper. Run queries `mangrove`, `restoration`, `biodiversity`, and `forest` by replacing the query argument in the subprocess list; stop on HTTP errors. Share only the verifier's public candidates/details and sanitized shape diagnostics, never request headers/environment dumps. The same public records may appear under multiple queries: deduplicate by exact sourceTimestamp and inspect whether versions represent the same real-world project. Choose three substantively distinct projects, not three versions.

The verifier returns registryName/methodology/country/native SDGs/developer/status/lifecycleStage where supplied. It does not expose arbitrary raw response fields, descriptive community evidence or source links. If community benefits cannot be established from supported public evidence, mark them unverified rather than inventing them. Any additional provider fields needed for curation should be explicitly allowlisted in Apex only after observing their actual response contract, preserving Atlas values and provenance. No legacy keyword SDG inference is authorized.

## Isolated database curation/persistence plan (not executed with live projects)

1. Obtain review of the three exact detail-verified timestamps and metadata limitations. Campaign remains unconfigured until approval.
2. Review the sports-only SQL `20261009000000_add_isolated_sports_demo/migration.sql`; use a fresh disposable PostgreSQL 16 container with a clearly identified isolated URL. No production env/dotenv/database or historical migrations. Record migration checksum and apply transactionally with stop-on-error.
3. Use locally generated test signing secrets and an explicitly authorized test admin assertion; start only start:sports. Confirm unauthorized admin and reporting requests fail. No AWS/Hedera/legacy credentials.
4. Create a fictional sports campaign as DRAFT, then protected PUT ballot with the approved three timestamps. Do not call configure:sports (auto-publishes) or the publish endpoint.
5. Check exactly three AtlasProject identities, three ordered SportsBallotProject snapshots, matching Atlas native metadata/SDGs/provenance and retrieval timestamps. Verify `"-2"` remains intact in source storage. Restart/reconnect and confirm all rows unchanged. Refreshing shared Atlas cache must not rewrite campaign snapshots.
6. Inject a failed detail retrieval or identity mismatch and verify no partially replaced ballot; reject two/duplicate timestamps; verify DRAFT not publicly visible, zero FanSelection/RewardIssuance and zero legacy Campaign/Project/Vote writes/trigger effects. Use mocks for failure cases, not production API/data mutations.
7. Actual fan selection/reward persistence needs a separate explicitly approved published **disposable** test campaign or existing fixture integration suite. Keep the reviewed live campaign DRAFT unless owner authorizes publication. Existing native/mobile disposable suites already test atomic badges, idempotency/concurrency/restart and protected report counts; rerun after any approved display correction.
8. Remove only the disposable DB when review artifacts are saved. AWS resource creation, staging SQL application, publication and deployments require their separate approvals.

Outstanding gates: additional public live search/detail results from the working external environment, three-project approval, display correction review, isolated live curation verification, and existing AWS account/region/OAuth/admin/budget/release approval. Listing is not evidence of funding eligibility or disbursement.
