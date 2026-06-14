# Palissage

Palissage is an ERC-7943-focused RWA protocol for tokenized wine lots. The core
design goal is compliant real-world asset transfer: only verified participants
can hold or move wine-lot tokens, protocol-controlled transfer agents enforce
market and redemption rules, and verifier/enforcer roles can freeze or resolve
restricted assets when required.

`WineLotToken` uses ERC-1155 only as the underlying multi-token accounting
primitive: one `tokenId` represents one verified wine lot, and balances are
denominated in bottles. The compliance model itself is ERC-7943-style, backed by
an ERC-3643 / OnchainID-inspired identity and claims layer. Wineries can create
and sell lots, verified B2B buyers can reserve or resell allocations, and token
holders can redeem bottles against physical delivery once the lot is ready.

I structured the repository so reviewers can inspect the protocol without going
through the frontend first: the Solidity system lives in `src/`, tests live in
`test/`, deployment is in `script/Deploy.s.sol`, and the UI is isolated under
`UI/web`.

## Architecture

The protocol is split into five main layers.

### Identity and claims

`src/identity/` implements an ERC-3643 / OnchainID-inspired compliance layer
used by the ERC-7943 transfer checks.

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

deployments/
  arbitrum-sepolia.md
                   Current Arbitrum Sepolia deployment notes and addresses

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

## Deploying to Anvil

The recommended local end-to-end setup is an Anvil fork of Arbitrum Sepolia. It
lets the deployment use the existing EURe test token that the UI is already
configured to understand.

If Foundry is installed but not in `PATH`, export it first:

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

Start Anvil in one terminal:

```bash
anvil --fork-url https://sepolia-rollup.arbitrum.io/rpc --chain-id 421614
```

Deploy from another terminal with the first default Anvil account:

```bash
export RPC_URL=http://127.0.0.1:8545
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
export OWNER=$ADMIN
export TREASURY=$ADMIN
export PAYMENT_TOKEN=0xFdEed5cE7E281B4e0F163B70eBe2Cf0B10803b7B

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --broadcast
```

The deploy script creates and wires:

1. `TrustedIssuersRegistry`
2. `IdentityRegistry`
3. `WineLotToken`
4. `PrimaryMarket`
5. `SecondaryMarket`
6. `RedemptionManager`
7. `ClaimIssuer`
8. `RoleGateway`

It also grants the market and redemption roles on `WineLotToken`, allowlists
`PAYMENT_TOKEN` on both markets when provided, seeds the admin role through the
`RoleGateway`, and registers claim topics `1..5` for the claim issuer/gateway.

To connect the frontend to the fork:

```bash
cd UI/web
cp .env.example .env.local
```

Fill `.env.local` with the printed deployment addresses:

```env
VITE_CHAIN_ID=421614
VITE_ARBITRUM_RPC_URL=http://127.0.0.1:8545
VITE_EURE_ADDRESS=0xFdEed5cE7E281B4e0F163B70eBe2Cf0B10803b7B
VITE_WINE_LOT_TOKEN_ADDRESS=<WineLotToken>
VITE_PRIMARY_MARKET_ADDRESS=<PrimaryMarket>
VITE_SECONDARY_MARKET_ADDRESS=<SecondaryMarket>
VITE_REDEMPTION_MANAGER_ADDRESS=<RedemptionManager>
VITE_IDENTITY_REGISTRY_ADDRESS=<IdentityRegistry>
VITE_TRUSTED_ISSUERS_REGISTRY_ADDRESS=<TrustedIssuersRegistry>
VITE_CLAIM_ISSUER_ADDRESS=<ClaimIssuer>
VITE_ROLE_GATEWAY_ADDRESS=<RoleGateway>
```

Then run the UI:

```bash
npm install
npm run dev
```

In the browser wallet, add `http://127.0.0.1:8545` as a local RPC for chain id
`421614`, import the Anvil private key above, connect, and use the RoleGateway
test-mode role picker.

For a contracts-only local chain without an Arbitrum fork, deploy `MockEURe`
first and pass its address as `PAYMENT_TOKEN`. The UI path is still expected to
use the Arbitrum Sepolia fork because its chain config intentionally supports
Arbitrum One and Arbitrum Sepolia only.

## Existing testnet deployment

The current Arbitrum Sepolia deployment is documented in
`deployments/arbitrum-sepolia.md`, including contract addresses, explorer links,
payment token, wiring checks, and broadcast file location.

## Frontend

The frontend is in `UI/web`. It is a React + TypeScript + Vite app with
role-aware zones for public, winery, shop, admin, and consumer flows. Contract
integration lives in `UI/web/src/contracts/`, and the frontend README explains
environment variables, ABI generation, and local fork verification.
