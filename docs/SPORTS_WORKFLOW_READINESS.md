# Sports workflow readiness — 2026-10-09

Nature Wired curates campaign projects. Atlas is an authoritative source for Atlas-linked records, not the only possible future evidence provider. No expanded discovery, AI recommendations, keyword SDG mapping, or alternative-provider implementation is part of the October 12 milestone. Current code still requires Atlas sourceTimestamp identities for its three ballot entries; a future provider requires a separate reviewed contract rather than fake Atlas identities or provenance.

Implemented the approved country presentation correction in Apex only: public campaign and reward-claim responses omit the unusable `"-2"` country value, while stored Atlas-linked ballot/reward snapshots retain the original string. Normal supplied country names pass through; nothing infers geography or changes native SDGs/provenance. The working Atlas adapter is unchanged.

Validation completed:
- Normal native Prisma/Nest build passed.
- Sports unit tests: 19 passed, including source-preserving country presentation.
- Existing employee compatibility: 6 passed.
- Real mobile Next.js → NestJS → disposable PostgreSQL native integration passed: preconfiguration/three-project curation/publication of a labeled fixture test campaign, QR URL, anonymous selection, idempotent retries, 20 concurrent distinct submissions, persistent claim and actual download, restart persistence, protected reporting and aggregate counts/illustrative funding, rollback/rate controls, and zero legacy writes/automation effects.
- Integration explicitly verifies public country suppression and original ballot/reward DB country retention.

These are fixture-backed isolated tests, not an approved live ballot or AWS deployment. Owner-reported Mac verification separately established live Atlas search/details through the compiled adapter. The current fixture tests publish only their own disposable campaign; no real or production campaign is published.

Remaining release gates: owner-approved three project names/exact timestamps and relevant evidence limitations; protected DRAFT live curation and stored snapshot verification following LIVE_PROJECT_CURATION_REVIEW.md in an explicitly isolated development environment; AWS account/region/role, OAuth/admin allowlist, budget and concrete deployment authorization; reviewed sports-only SQL in a new staging database; mandatory start:sports; real-phone HTTPS rehearsal. No legacy Campaign/Project writes or production infrastructure reuse is authorized by this document.

Scaffold-HBAR and Guardian plugin remain read-only and unchanged. No Hedera signing or alternative verification resources are needed for current wallet-free badges. Existing AWS_STAGING_PLAN.md remains the deployment proposal; resource creation and staging rollout require separate approval.
