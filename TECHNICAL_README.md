# Technical guide

Palissage `1.1.0` is an EVM testnet prototype with separate deployments on Arbitrum Sepolia and Robinhood Testnet. Solidity 0.8.28, Cancun, optimizer 200 runs and the IR pipeline are pinned in `foundry.toml`.

## Architecture

| Contract | Responsibility |
| --- | --- |
| WineLotToken | ERC-1155 bottle balances, lot metadata, verification, lifetime supply cap, restricted transfers, freezes and enforcement |
| IdentityRegistry | Wallet-to-identity registry and trusted-issuer claim checks |
| TrustedIssuersRegistry | Issuer addresses and permitted claim topics |
| ClaimIssuer | Owner-issued signed claims, with chain and issuer bound into the signature digest |
| RoleGateway | Managed identity claims and explicitly enabled test-role self-service |
| PrimaryMarket | Primary offers, deposits, full settlement, escrow, milestones, withdrawal, cancellation and default |
| SecondaryMarket | Non-custodial listings, payment checks, platform fees and winery royalties |
| RedemptionManager | Bottle escrow, shipment, delivery burn, cancellation, verifier refund and signed recovery |
| PalissageLens | Bounded read aggregation for the interface; it performs no writes |
| TestEURe | Valueless 18-decimal test payment token with a daily faucet |

Each lot has one token ID. Full payment mints bottles; a deposit alone does not. Redeemed supply is burned and does not restore lifetime mint capacity. Secondary sale payments go directly to seller, treasury and winery. Milestones release primary payment escrow; the verifier controls release and cancellation is constrained by funds still backing escrow.

The gateway Admin role grants token verification. Primary milestone verification and redemption dispute verification are separate contract roles, checked separately by the interface. An admin can trust issuers, enable payment assets and enforce transfers. These privileges are part of the trust model, not permissionless guarantees.

Signed ClaimIssuer claims use `claimDigest(subject, topic, data)` on the intended chain and issuer address. Clients must read that digest rather than reproduce an old domain-free message. Redemption recovery uses its separate EIP-712 domain and deadline. Do not put private shipment details or personal identity data directly on-chain; demonstration hashes refer to public fixtures.

## Build and check

Install Foundry, Node.js 22+ and the frontend dependencies:

```sh
git submodule update --init --recursive
npm ci --prefix UI/web
forge fmt --check
forge build --sizes
forge test
npm run lint --prefix UI/web
npm run build --prefix UI/web
```

Unit, fuzz and integration tests cover identity, transfers, market accounting, ERC-7943 controls, malicious ERC-20/ERC-1155 callbacks, full payment, royalties, delivery and refunds. The CI profile increases fuzz runs to 1024. [Security review](submission/SECURITY_REVIEW.md) records the release findings, invariants and limitations.

`test/echidna` contains optional harnesses. Their presence is not evidence of an executed Echidna campaign; release validation uses the reported Foundry runs and on-chain receipts.

## Deploy a testnet release

Only chain IDs 421614, 46630 and local 31337 are permitted by the Solidity deployment/faucet scripts. The resumable Node release runner permits only the two public testnets.

```sh
cp .env.example .env
# Export PRIVATE_KEY or MNEMONIC in a private local shell.
# Set FORGE if the forge executable is outside PATH.
forge build
node script/release.mjs preflight 421614
node script/release.mjs deploy 421614
node script/demo.mjs 421614
node script/verify-sources.mjs 421614
node script/verify-arbiscan.mjs
```

Use `46630` for Robinhood. `RPC_URL` can select an endpoint; its actual chain ID is checked. `MAX_TEST_ETH_SPEND` bounds one runner invocation. The demo funds three controlled test actors and performs the documented fixture trades. Review these scripts before running against a new account.

A local, ignored journal stores transaction hash, sender, nonce and receipt before proceeding. A resumed step checks its receipt; it never silently submits a duplicate create, mint or purchase. An uncertain transaction must be reconciled before continuing. Private keys and signed raw transactions are never journalled. Preserve the journal locally: it is needed to reproduce the current release verification and to resume safely.

The verifier compares creation calldata and runtime bytecode against current compiler artifacts, masks only declared immutable slots, checks immutable references and role wiring, and observes the Lens at a fresh block. Publication updates the public manifest, ABIs and `UI/web/src/chain/deployments.json`. Rebuilding changed source does not update a live deployment: a new deployment and new journal are required.

Explorer source verification is tracked separately from receipt/runtime/wiring verification. `verify-arbiscan.mjs` publishes the Arbitrum Sepolia release to Arbiscan through Etherscan V2, using `ETHERSCAN_API_KEY` or the existing `API_KEY` in the local `.env`. It sends the exact standard JSON compiler input and constructor arguments, waits for verification, then reads back the published sources and compiler settings. The key is never logged or copied into the public manifest.

`verify-sources.mjs 421614` separately publishes to Arbitrum Blockscout; `verify-sources.mjs 46630` publishes to the official Robinhood explorer. Verification on one explorer does not establish verification on another. A manifest field is set only after that explorer confirms the source record, and a runner's final count includes only confirmations obtained in the current run.

The fixture participants also have dynamically created Identity contracts. `node script/collect-identities.mjs <chainId>` confirms their registration receipts, exact runtime and gateway management key, then writes `palissage-<chainId>.identities.json`. Verify those addresses with `node script/verify-arbiscan.mjs --identities` and `node script/verify-sources.mjs 46630 --identities` respectively. Collection is read-only on-chain; explorer verification submits source, not a transaction.

## Frontend transaction boundary

Read queries and receipts are pinned to the selected chain. The UI checks the actual RPC chain ID, contract code hashes, Lens wiring and payment metadata before a write, switches the wallet when needed, simulates the exact call, then requests one signature. Successful receipts invalidate both single-contract and batched reads. A submitted hash survives navigation and reload; another write waits for its outcome. Network/asset switching discards prepared forms and starts a fresh page.

Tours have their own local state and persistent simulation banner. They never use the live write path. Unsupported chains and unpublished deployments fail closed. USDG amounts retain dollar denomination and 6 decimals; tEURe amounts retain euro denomination and 18 decimals. Different networks and payment assets are not interchangeable balances.
