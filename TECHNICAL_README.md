**Base Sepolia address draft.** Chain id `84532`, protocol version `1.0.0-mvp`.
These addresses come from a local draft record. Treat them as unverified until receipts, source code, and live wiring have been checked independently.

| Contract | Address |
| --- | --- |
| `TrustedIssuersRegistry` | [`0x798Cc1a405Eb3bC6179Db81De5a9d1e5b2349201`](https://sepolia.basescan.org/address/0x798Cc1a405Eb3bC6179Db81De5a9d1e5b2349201) |
| `IdentityRegistry` | [`0x313d7a63c717ad25a0c49BFBaa8fe142CD28E0bd`](https://sepolia.basescan.org/address/0x313d7a63c717ad25a0c49BFBaa8fe142CD28E0bd) |
| `WineLotToken` | [`0x0fef031115E60105c09458E4e28031DaF62D1AbD`](https://sepolia.basescan.org/address/0x0fef031115E60105c09458E4e28031DaF62D1AbD) |
| `PrimaryMarket` | [`0x98EDC97B03Ae9901D4Af73F62dbF3C10F3927fA1`](https://sepolia.basescan.org/address/0x98EDC97B03Ae9901D4Af73F62dbF3C10F3927fA1) |
| `SecondaryMarket` | [`0x4F0862a4346A3EB88545F66B3E0b423966F6aCe0`](https://sepolia.basescan.org/address/0x4F0862a4346A3EB88545F66B3E0b423966F6aCe0) |
| `RedemptionManager` | [`0x67C05db79223707635f9F386C57227AFe1C782aE`](https://sepolia.basescan.org/address/0x67C05db79223707635f9F386C57227AFe1C782aE) |
| `ClaimIssuer` | [`0xD05a0B4B5Cd522Cc175C1eB0DA857212b42E1074`](https://sepolia.basescan.org/address/0xD05a0B4B5Cd522Cc175C1eB0DA857212b42E1074) |
| `RoleGateway` | [`0x23083F4d7048B31627631510DC73a5a56D630840`](https://sepolia.basescan.org/address/0x23083F4d7048B31627631510DC73a5a56D630840) |
| `PalissageLens` | [`0x36C5f43919CB220A7368c2E3bC373B378D0eE7B6`](https://sepolia.basescan.org/address/0x36C5f43919CB220A7368c2E3bC373B378D0eE7B6) |

Deployer, admin, owner and treasury are all
[`0xDCf00f1A5600c6191Fbc8d333A4C004903580A85`](https://sepolia.basescan.org/address/0xDCf00f1A5600c6191Fbc8d333A4C004903580A85).
The local address draft is excluded from Git. A published manifest requires separate verification.

The intended settlement token is **EURC**, Circle's euro stablecoin, at its Base Sepolia address
[`0x808456652fdb597867f38412077A9182bf77359F`](https://sepolia.basescan.org/address/0x808456652fdb597867f38412077A9182bf77359F)
(6 decimals). The deployment script also deploys and allowlists a freely mintable **TestEURe** test token. Do not confuse test token trades with real payment or infer live EURC configuration from this draft.

# Palissage

Palissage is an ERC-7943-focused RWA protocol for tokenized wine lots. The core
design goal is compliant real-world asset transfer: only verified participants
can hold or move wine-lot tokens, protocol-controlled transfer agents enforce
market and redemption rules, and verifier/enforcer roles can freeze or resolve
restricted assets when required.

`WineLotToken` uses ERC-1155 only as the underlying multi-token accounting
primitive: one `tokenId` represents one verified wine lot, and balances are
denominated in bottles. The compliance model itself is ERC-7943-style, backed by
a dedicated identity and claims layer. Wineries can create and sell lots,
verified B2B buyers can reserve or resell allocations, and token holders can
redeem bottles against physical delivery once the lot is ready.

I structured the repository so reviewers can inspect the protocol without going
through the frontend first: the Solidity system lives in `src/`, tests live in
`test/`, deployment is in `script/Deploy.s.sol`, and the UI is isolated under
`UI/web`.

## Architecture

The protocol is split into five main layers.

### Identity and claims

`src/identity/` implements the identity and claims layer used by the ERC-7943
transfer checks.

- `Identity` is an ERC-734/735 key and claim holder for a participant.
- `ClaimIssuer` validates issuer-signed claims and supports signature
  revocation.
- `TrustedIssuersRegistry` stores which claim issuers are trusted for each topic.
- `IdentityRegistry` binds wallets to identity contracts and answers
  `isVerified` / `hasValidClaim` queries.
- `RoleGateway` is the testnet/on-chain role gateway used by the UI. In test
  mode any wallet can self-assign a role; when test mode is off, only the owner
  or a gateway admin can assign roles.

The canonical claim topics are in `src/libraries/ClaimTopicsLib.sol`:

| Topic | Meaning |
| --- | --- |
| `1` | KYC |
| `2` | KYB |
| `3` | Winery |
| `4` | B2B buyer / shop |
| `5` | Verifier / warehouse partner |

### Wine lot token

`src/token/WineLotToken.sol` is the core ERC-7943-style RWA token. It exposes
the restricted-token compliance surface (`canSend`, `canReceive`,
`canTransfer`, freezing, and forced transfer) while using ERC-1155 internally
for multi-lot bottle accounting:

- one lot per `tokenId`;
- lot states: `Draft`, `Verified`, `Suspended`, `Closed`;
- production states progress forward from `Announced` to `ReadyForDelivery`;
- minting is capped by `totalBottles`;
- `docsHash` is set at verification and is not changed by metadata updates;
- transfers are only allowed through whitelisted transfer agents;
- both sender and recipient must be compliant, except protocol system addresses;
- frozen balances and forced transfers are available to `ENFORCER_ROLE`.

Note to reviewers: ERC-1155 is the storage/accounting primitive here; ERC-7943 is
the protocol-facing compliance model.

The main transfer choke point is `WineLotToken._update`, which handles mint,
burn, and transfer restrictions in one place.

### Primary market

`src/market/PrimaryMarket.sol` handles direct winery-to-B2B sales.

- Wineries create standard or En Primeur (wine futures) offers for verified lots.
- Buyers reserve allocations with full payment or a deposit.
- Tokens are minted only when an allocation is fully paid.
- Buyer funds are escrowed in the market contract.
- Winery withdrawals are gated by verifier-confirmed milestones.
- Protocol fees are sent to the treasury.
- Unsettled allocations can be refunded or defaulted with explicit accounting.

### Secondary market

`src/market/SecondaryMarket.sol` handles B2B resale.

- Listings are lazy: tokens stay in the seller wallet until purchase.
- Sellers must be verified and hold the listed balance.
- Buyers must hold the B2B buyer claim.
- Purchases split payment into protocol fee, winery royalty, and seller proceeds.
- Buyer-side price and deadline bounds protect against simple listing
  front-running.

### Redemption

`src/redemption/RedemptionManager.sol` handles physical delivery.

- Redemption is allowed only once the lot production status is
  `ReadyForDelivery`.
- Tokens are escrowed in the manager when a redemption is requested.
- The winery attaches shipment document hashes.
- The buyer confirms delivery after shipment, or a verifier can resolve a
  dispute.
- Successful delivery burns the escrowed tokens and increments redeemed bottle
  accounting.
- Verifier recovery supports EIP-712 buyer authorization when a buyer loses
  compliance before escrow is returned.

## Repository map

```text
src/
  identity/        Identity, claim issuer, trusted issuers registry, role gateway
  token/           WineLotToken ERC-7943-style RWA token over ERC-1155 accounting
  market/          PrimaryMarket and SecondaryMarket
  redemption/      RedemptionManager
  periphery/       PalissageLens, the read-only projection the interface reads
  testing/         TestEURe, the faucet payment token used on local chains
  interfaces/      Protocol interfaces, including ERC-734/735/7943 surfaces
  libraries/       Claim topic constants

test/
  unit/            Forge unit tests per contract
  integration/     End-to-end En Primeur lifecycle test
  echidna/         Echidna property harnesses
  mocks/           MockEURe payment token
  utils/           Shared deployment and onboarding fixtures

script/
  Deploy.s.sol     Full protocol deployment and role wiring
  Seed.s.sol       One canonical seed transaction per invocation

deployments/
  schema/          JSON Schema of the published deployment manifest
  abis/            Generated ABI JSON; their digests go into the manifest
  fixtures/        Seed plan template
  README.md        Draft → receipts → verification → seed → published manifest

UI/web/
  React + TypeScript + Vite frontend, with its own README and env example
```

Generated directories such as `out/`, `cache/`, `broadcast/`, and
`crytic-export/` are build, deployment, or fuzzing artifacts.

## Tests

### Forge

The deterministic test suite is written with Foundry.

```bash
forge build
forge test
```

Useful targeted runs:

```bash
forge test --match-path test/unit/WineLotToken.t.sol -vvv
forge test --match-path test/unit/PrimaryMarket.t.sol -vvv
forge test --match-path test/integration/FullFlow.t.sol -vvv
```

The current Forge suite covers:

- `Identity.t.sol`: ERC-734/735 keys, claims, issuer validation, revocation.
- `IdentityRegistry.t.sol`: wallet registration, country storage, trusted issuer
  checks, claim topic checks.
- `RoleGateway.t.sol`: test-mode role assignment, admin assignment, claim
  replacement, verifier role grants and revokes.
- `WineLotToken.t.sol`: lot creation, verification, production state progression,
  mint caps, ERC-7943 transfer eligibility, transfer-agent restrictions, frozen
  balances, forced transfers, and compliance views.
- `PrimaryMarket.t.sol`: offer creation, oversell protection, full/deposit
  reservations, payment deadlines, milestones, escrow release, refunds,
  defaults, fee accounting, pause behavior.
- `SecondaryMarket.t.sol`: listing rules, purchases, fee and royalty splits,
  seller balance checks, price/deadline protections, cancellation.
- `RedemptionManager.t.sol`: redemption request, shipment, burn-on-delivery,
  buyer cancellation, verifier refunds, suspended-lot escrow returns, EIP-712
  recovery.
- `FullFlow.t.sol`: a complete En Primeur lifecycle from lot creation through
  primary sale, secondary resale, delivery readiness, and redemption.

`foundry.toml` uses Solidity `0.8.28`, optimizer enabled, `via_ir = true`, and
Foundry fuzzing with `256` runs by default.

### Echidna

The Echidna harnesses live in `test/echidna/`. They are property-mode harnesses,
not unit tests. Run them one at a time because Echidna/crytic writes shared
artifacts under `crytic-export/`.

Full-style commands:

```bash
echidna test/echidna/WineLotTokenEchidna.sol \
  --contract WineLotTokenEchidna \
  --test-mode property

echidna test/echidna/PrimaryMarketEchidna.sol \
  --contract PrimaryMarketEchidna \
  --test-mode property

echidna test/echidna/SecondaryMarketEchidna.sol \
  --contract SecondaryMarketEchidna \
  --test-mode property

echidna test/echidna/RedemptionManagerEchidna.sol \
  --contract RedemptionManagerEchidna \
  --test-mode property
```

For a quick smoke run, add:

```bash
--test-limit 200 --seq-len 20 --format text
```

The properties currently checked are:

- `WineLotTokenEchidna`: supply accounting, tracked holder balances, and frozen
  account transfer limits.
- `PrimaryMarketEchidna`: offer bounds, escrow balance vs accounting,
  withdrawal entitlement limits, allocation accounting vs minted supply.
- `SecondaryMarketEchidna`: token supply conservation, EURe conservation, and
  active listing term validity.
- `RedemptionManagerEchidna`: escrow equals open redemptions, completed
  redemptions match burned supply, and buyer + escrow + redeemed bottles equal
  the initial mint.

## Deploying locally

The target network is **Base Sepolia (84532)**; a local Anvil chain (31337) is the only other
network the deploy script accepts. On Base Sepolia the markets settle in Circle's EURC. The
script also deploys `TestEURe`, a faucet token used for local Anvil runs, where no EURC exists.

If Foundry is installed but not in `PATH`, export it first:

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

Start Anvil in one terminal:

```bash
anvil --chain-id 31337
```

Deploy from another terminal. Set `ANVIL_TEST_PRIVATE_KEY` to the first local Anvil
account key printed in that terminal. Actor addresses are passed as addresses only; the signer
comes from `--private-key` locally, and from a Foundry keystore (`--account <alias>`) on a public
network:

```bash
export DEPLOYER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
export ADMIN=0x70997970C51812dc3A010C7d01b50e0d17dc79C8   # operator: verifier, pauser, gateway admin
export OWNER=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC   # the only account that may open test mode
export TREASURY=0x90F79bf6EB2c4f870365E785982E1f101E93b906

forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key "$ANVIL_TEST_PRIVATE_KEY" \
  --sender $DEPLOYER --broadcast
```

The script deploys and wires ten contracts:

1. `TrustedIssuersRegistry`
2. `IdentityRegistry`
3. `WineLotToken`
4. `PrimaryMarket`
5. `SecondaryMarket`
6. `RedemptionManager`
7. `TestEURe`
8. `ClaimIssuer`
9. `RoleGateway`
10. `PalissageLens`

It grants the market and redemption roles on `WineLotToken`, gives the operator the three
separate verifier roles and both market pausers, allowlists the local faucet token, makes the
operator a gateway admin, and hands ownership to `OWNER`/`ADMIN`. `testMode` stays **off**: the
sandbox opens only at the end of the seed, so no public self-service window exists between the
deployment transactions.

Everything the script writes to `deployments/` is a **draft**, never a manifest.

### Seeding and verifying

`script/Seed.s.sol` executes one seed step per invocation. The deployment script writes only
an address draft. Before publishing a manifest, check the broadcast receipts, deployed
bytecode, contract source verification, role wiring, payment-token allowlists and seed
post-state against the chain. The schema and ABI files under `deployments/` describe
the intended published format; their presence does not prove a live deployment.

The frontend is maintained as a separate repository linked at `UI/web`. Its scripts and
network setup must be checked there for the current UI revision.

## Frontend

The frontend is linked at `UI/web` as a submodule of
[SwissArmyMan1/palissage_ui](https://github.com/SwissArmyMan1/palissage_ui). See its README for
its current routes, dependencies and network behavior.
