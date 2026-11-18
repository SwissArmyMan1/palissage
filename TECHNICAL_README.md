# Technical guide

Palissage `1.1.0` is a B2B wine trading and RWA prototype targeting Avalanche Fuji C-Chain (43113). Gas uses test AVAX and demo settlement uses Palissage tEURe with 18 decimals. Solidity 0.8.28, Cancun, optimizer 200 runs and the IR pipeline are pinned in `foundry.toml`.

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
| PalissageLens | Bounded read aggregation for the interface |
| TestEURe | Valueless 18-decimal test payment token with a daily faucet |

Each lot has one token ID. Full payment mints bottles. Redeemed supply is burned while lifetime mint capacity remains consumed. Secondary sale payments go directly to seller, treasury and winery. Milestones release primary payment escrow. The verifier controls release and cancellation is constrained by funds still backing escrow.

The gateway Admin role grants token verification. Primary milestone verification and redemption dispute verification are separate contract roles, checked separately by the interface. An admin can trust issuers, enable payment assets and enforce transfers. The trust model depends on these privileged accounts.

Signed ClaimIssuer claims use `claimDigest(subject, topic, data)` on the intended chain and issuer address. Clients read that digest before signing. Redemption recovery uses its separate EIP-712 domain and deadline. Keep private shipment details and personal identity data off-chain. Demonstration hashes refer to fictional fixtures.

## Build and check

Install Foundry and initialize the contract dependencies.

```sh
git submodule update --init --recursive lib/forge-std lib/openzeppelin-contracts
forge fmt --check
forge build --sizes
forge test
```

Unit, fuzz and integration tests cover identity, transfers, market accounting, ERC-7943 controls, malicious ERC-20/ERC-1155 callbacks, full payment, royalties, delivery and refunds. The CI profile increases fuzz runs to 1024. [Security review](submission/SECURITY_REVIEW.md) records the release findings, invariants and limitations.

`test/echidna` contains optional harnesses. The [validation record](submission/VALIDATION.md) describes the executed checks and current Fuji deployment status.

## Deploy on Avalanche Fuji

The contract deployment entry point is `script/Deploy.s.sol:Deploy`. Create an encrypted Foundry keystore for a dedicated testnet signer and fund its address with test AVAX. Set `DEPLOYER` to that address. `ADMIN`, `OWNER` and `TREASURY` can specify the protocol operator, gateway owner and fee receiver. Their defaults are defined in the script.

```sh
export FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
cast wallet import palissage-fuji --interactive
export DEPLOYER=$(cast wallet address --account palissage-fuji)
cast chain-id --rpc-url "$FUJI_RPC_URL"
forge build
forge script script/Deploy.s.sol:Deploy --rpc-url "$FUJI_RPC_URL" \
  --account palissage-fuji --sender "$DEPLOYER"
```

The RPC must return chain ID `43113`. The script command above simulates deployment. After reviewing the signer, addresses and simulation, the following command sends public Fuji transactions.

```sh
forge script script/Deploy.s.sol:Deploy --rpc-url "$FUJI_RPC_URL" \
  --account palissage-fuji --sender "$DEPLOYER" --broadcast --slow
```

The script deploys ten protocol contracts, wires their roles and enables tEURe in both markets. It writes draft addresses to `deployments/palissage-43113.addresses.json`. Keep the Foundry broadcast receipts locally and reconcile any pending transaction before resuming a broadcast. Gateway test mode starts disabled and requires the gateway owner's explicit activation.

Before importing addresses into the frontend, verify confirmed creation receipts, runtime bytecode, immutable references, privileged grants, payment metadata and Lens wiring on Fuji. Submit the exact compiler input and constructor arguments to the Fuji explorer and record its source-verification result. The [deployment record guide](deployments/README.md) describes the expected release artifacts.

`script/Seed.s.sol` runs individual fixture stages from a local `SEED_PLAN` for the target chain. Its `runStep(stage, itemIndex)` entry point requires the corresponding operator or actor signer. Retain confirmed fixture IDs and receipts when continuing a seed. The Fuji UI becomes writable after a verified chain ID 43113 record is published into `UI/web/src/chain/deployments.json`.

## Frontend transaction boundary

Use `/app/testnet?chain=43113&asset=eur` for Fuji readiness. The prepared UI checks the RPC chain ID, contract code hashes, Lens wiring and payment metadata before a write, switches the wallet when needed, simulates the exact call, then requests one signature. Successful receipts invalidate both single-contract and batched reads. A submitted hash survives navigation and reload, and another write waits for its outcome.

Tours use local state and a persistent simulation banner. Fuji payment amounts use the tEURe token stored in the offer, with 18-decimal precision. Wallet writes require a verified published deployment and the relevant contract roles. See the frontend's [README](UI/web/README.md) for development and a Fuji-mode build.

## Deployment status

The available Fuji validation is local. Public Fuji creation receipts, a verified deployment manifest, explorer verification and publication of the Fuji-enabled site remain pending in this checkout.
