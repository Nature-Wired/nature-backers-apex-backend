# Hedera signing configuration review

Reviewed 2026-10-09. Read-only application/infrastructure review; no secret values retrieved, account creation, key rotation or transactions. This document does not authorize HCS implementation or deployment. Wallet-free Milestone A badges do not require Hedera signing.

## Current source configuration

| Flow | Required names | Signing and network behavior |
| --- | --- | --- |
| Apex campaign voting and payout signing | `PRIVATE_KEY_HEDERA`, `HEDERA_TESTNET_RPC_URL` | ethers ECDSA Wallet; removes optional 0x prefix then constructs EVM signer. Contract voting uses `src/contracts/VotingStorageDeployment.json`. Voting signer address is derived from the key; no operator account ID is used in that path. |
| Apex NFT mint and transfer | `HEDERA_OPERATOR_ID`, `PRIVATE_KEY_HEDERA`, `HEDERA_NFT_TOKEN_ID` | Native Hedera SDK `PrivateKey.fromStringECDSA`, `Client.forTestnet().setOperator`; the same configured operator signs mint and outgoing transfer. Code assumes it can satisfy token supply-key and treasury transfer authorization. |
| Apex NFT metadata | `NFT_BADGE_FIRST_VOTE`, `NFT_BADGE_PROJECT_PIONEER`, `NFT_BADGE_GLOBE_TROTTER` | Public HIP-412 metadata URLs stored in token metadata, maximum 100 bytes; not signing secrets. |
| Apex Hardhat networks | `PRIVATE_KEY_HEDERA`; `HEDERA_MAINNET_RPC_URL`, `HEDERA_TESTNET_RPC_URL`, `HEDERA_PREVIEWNET_RPC_URL` | Config declares all three EVM networks. Variable naming alone does not constrain every deployment to testnet. Do not run deploy scripts to verify configuration. |
| Scaffold HCS selections | `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HCS_TOPIC_ID` | SDK ECDSA operator signs TopicMessageSubmitTransaction. Route explicitly uses `Client.forTestnet()`; configured `HEDERA_NETWORK` is currently not read by that route. |
| Atlas discovery plugin | `ATLAS_API_KEY`, optional `ATLAS_API_URL` | HTTP project discovery/details; no signing account, HCS write, wallet or NFT key required. |

Evidence: Apex `src/vote/vote.service.ts` near 258 (EVM voting), 645 (other contract signing), 827–909 (NFT configuration/mint/transfer); `hardhat.config.js`; Scaffold `packages/nextjs/app/api/sustainability/select/route.ts`.

Apex NFTs are HTS NFTs, whereas campaign voting/payout contracts use the EVM interface. Scaffold HCS writes an auditable message to a topic; it neither mints NFTs nor invokes VotingStorage. None is needed for sports selection/reward persistence. NFT recipients may need token association; a wallet-free fan should not be sent down the old NFT claim flow.

## Account identity and loading evidence

No concrete `HEDERA_OPERATOR_ID` or NFT token ID was established from the inspected application configuration. The NFT path reads those at runtime. Contract deployment JSON records contract addresses/ABI, not an operator account or signer key. Payout deployment metadata names `hederaTestnet`; it does not establish which signer was used. No signing key was read to derive an address. Thus the repository proves configuration contracts, not the deployed March account identity or live credential availability.

Apex Hardhat uses `require('dotenv').config()`. The legacy PostgreSQL listener calls `dotenv.config()` during module loading; the dedicated sports entrypoint independently imports `dotenv/config`. Application signing paths read `process.env`. No explicit AWS Secrets Manager GetSecretValue client, secret ARN/name, deployed Lambda environment mapping, or infrastructure template establishing Hedera secret injection was found in Apex's reviewed source/configuration. Environment injection by AWS remains possible but unverified.

The repository's PostgreSQL listener invokes `campaign-status-actions-handler` asynchronously in hardcoded `us-west-1`; campaign-status endpoints handle automation and call vote services. This establishes a legacy integration reference, not that the Lambda holds the signing key or which secret it references. Deployment account/region and Lambda implementation remain unmapped. Do not launch the legacy AppModule to discover them.

To resolve the deployed identity, request a **redacted, allowlisted metadata inventory** from the AWS owner: backend service/task/Lambda names and regions, variable names, Secrets Manager secret names/ARNs or ECS/App Runner secret-reference mappings, IAM role references, and separately the nonsecret testnet account ID/token ID/topic ID. Do not request GetSecretValue, secret dumps or raw `get-function-configuration` output, which can expose plaintext environment values. Owners must validate the key/account match within their trusted environment without exporting the key.

## Reuse decision

An existing testnet ECDSA account can technically pay for HCS and sign submissions if its active account key is supported by the chosen SDK path, the owner authorizes that use, it has sufficient testnet HBAR, and the topic permits its submission. `HEDERA_OPERATOR_ID` would map to `HEDERA_ACCOUNT_ID`; the existing signer would be provisioned securely under `HEDERA_PRIVATE_KEY`. Different variable names do not prove different accounts. Do not copy or print the old key to perform that mapping. Confirm serialization compatibility (Apex explicitly strips an optional 0x prefix; Scaffold does not) through a secure configuration path, not logs.

Reuse is **not yet confirmed** because the deployed account/key provenance, account public key, balance and topic metadata were not supplied or queried. A separate already-existing testnet account with limited funds and no treasury/supply authority is preferable to reusing an NFT treasury signer. Do not create one or rotate anything without approval. HCS requires no NFT token, NFT supply key, EVM RPC URL or VotingStorage contract. A restricted topic may require a separate submit key or multisignature that the current Scaffold route does not support; inspect public topic metadata before deciding account-key reuse is sufficient.

## Safest optional AWS staging enablement, after approval

1. Keep `start:sports` mandatory and leave HCS disabled for the October 12 core demo. No key is needed to unblock Atlas or wallet-free badges. Obtain separate authorization for optional testnet evidence, including account/topic, fee budget and proposed source changes.
2. Owner confirms the existing testnet account and topic, key type/authorization and public metadata through read-only checks. Choose an existing limited-authority signer where available. Never use mainnet treasury credentials or legacy Campaign approval triggers.
3. Provision the approved signer directly into a staging-only AWS Secrets Manager secret using the owner's secure mechanism. Inject it as server-only `HEDERA_PRIVATE_KEY`, with nonsecret `HEDERA_ACCOUNT_ID`, `HCS_TOPIC_ID`, and explicit `HEDERA_NETWORK=testnet`. Scope the service role to that secret ARN and any required KMS decrypt access. No GetSecretValue logging, browser exposure, committed dotenv values or static AWS access keys. A Codex Network-secret proxy placeholder cannot perform local cryptographic signing; local SDK signing requires a supported secure runtime binding or AWS secret injection.
4. Add only an isolated, opt-in HCS evidence worker/service if approved. Reuse Scaffold's SDK transaction structure, not its public handler unchanged: the current handler accepts caller-supplied project metadata and has no sports authentication, DB identity validation or deduplication. Use approved Atlas ballot snapshots and a server event identifier, no employee identity/email, claim URL/token or browser participant ID. Persist selections/badges first; HCS failures must not revoke or delay successful fan participation. Track pending/submitted evidence and handle ambiguous retries without claiming guaranteed on-chain exactly-once delivery.
5. Fail closed on non-testnet configuration. Configure appropriate Hedera testnet network egress; do not assume the existing Atlas HTTPS proxy allowlist suffices for SDK transport. Sanitize transaction errors, record only allowed receipt/transaction metadata, and close clients in finally blocks.
6. Test SDK calls with mocks and disposable storage first. Only after explicit transaction authorization submit one controlled testnet event and check receipt/HashScan. No NFT mint, transfer, contract deployment or legacy campaign mutation is part of that check.

There is no need to populate missing HEDERA variables to publish an Atlas-only development environment or run the current wallet-free sports demo. Remove unused requirements rather than inventing signing values. No application code or AWS service was changed during this review.
