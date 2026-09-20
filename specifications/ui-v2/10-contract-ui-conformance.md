# 10 — Contract ↔ UI conformance

Verified 8 September 2026 against `src/` at the working-tree revision, by reading the
contracts and running the suite — not from the design documents.

## 1. Deployment readiness

| Check | Result |
|---|---|
| `forge build` | passes; only `modifier-used-only-once` lint notes |
| `forge test` | **176 tests, 12 suites, 0 failures** |
| Chain guard in `script/Deploy.s.sol` | Base Sepolia `84532` or Anvil `31337`; anything else reverts `UnsupportedChain` |
| EIP-170 | every contract fits |

**Standing constraint — `PalissageLens` runtime size is 24 023 B against the 24 576 B limit,
leaving 553 B.** The Lens is the interface's only read model. Any new read the frontend needs
may not physically fit; adding one means removing another or introducing a second lens
contract. Do not plan frontend features that assume the Lens can grow.

`RoleGateway.testMode` defaults to **false**. `script/Seed.s.sol` stage 9 opens it via
`setTestMode(true)`, executed by `OWNER` **after** the seed is verified — so no public
self-service window exists between deployment and verification.

## 2. Actions on built screens that map correctly

| Screen action | Contract function | Caller restriction |
|---|---|---|
| SHO-04 approve → reserve | `PrimaryMarket.reserve(offerId, quantity, payNow)` | `TOPIC_B2B_BUYER` |
| WIN-04 advance production | `WineLotToken.setProductionStatus(lotId, status)` | lot's winery; **forward only**, enforced on-chain |
| WIN-09 mark shipped | `RedemptionManager.markShipped(redemptionId, shipmentDocsHash)` | lot's winery |
| SHO-13 confirm receipt | `RedemptionManager.confirmDelivery(redemptionId)` | buyer, or verifier as dispute fallback |
| ADM-05 verify | `WineLotToken.verifyLot(lotId, docsHash)` | `VERIFIER_ROLE` |
| ADM-05 suspend | `WineLotToken.suspendLot(lotId)` | `VERIFIER_ROLE` |
| ADM milestone confirm | `PrimaryMarket.confirmMilestone(offerId, index)` | `VERIFIER_ROLE` |
| WIN-03 create lot | `WineLotToken.createLot(WineLotInput)` | `TOPIC_WINERY` |
| APP-02 self-assign role | `RoleGateway.assumeRole(Role)` | test mode only; **not Admin** |

## 3. Mismatches found — fix before implementation

### M1 · `withdrawReleased` is per offer, not global — **WIN-07 is wrong**

`PrimaryMarket.withdrawReleased(uint256 offerId)`, callable only by that offer's winery.
WIN-07 currently shows a single headline `Withdraw €12 480.00`, implying one action for the
whole balance. A producer with three funded offers must send three transactions.

*Fix:* the headline stays a **sum**, but the action moves to a per-offer row, or becomes an
explicit multi-transaction flow that names how many transactions it will send.

### M2 · `payRemainder` accepts a partial amount — **SHO-06 hides it**

`PrimaryMarket.payRemainder(uint256 allocationId, uint256 amount)`. The buyer may pay part of
the outstanding balance. SHO-06 offers a single fixed-amount button.

*Fix:* an editable amount defaulting to the full remainder, with the remaining balance and the
deadline recalculated as the buyer types.

### M3 · `exportAllowed` is a boolean — **WIN-03 promises a market list**

`WineLotInput.exportAllowed` is a single `bool`. The WIN-03 wizard shows
`Export eligibility: EU, UK, CH`, and `UI/web/src/lib/mock.ts` carries `exportTo: [...]`.
A per-market list has no on-chain representation; it could only live in `metadataURI`.

*Fix:* either reduce the field to the boolean the contract stores, or keep the list and label
it explicitly as off-chain metadata. Doc 04's rule stands: the interface may not promise a
distinction the contracts do not make.

### M4 · deposit is bps, and the deadline is constrained — **WIN-05 states neither**

`createOffer(lotId, paymentToken, pricePerBottle, quantity, startTime, endTime, depositBps,
fullPaymentDeadline, kind)` enforces `endTime > startTime`, `fullPaymentDeadline >= endTime`
and `depositBps < 10000`. WIN-05 shows `Deposit 30` labelled "Percent" and says nothing about
the deadline ordering.

*Fix:* show the bps conversion next to the field, and validate the deadline ordering inline
rather than at submit.

Milestones are **not** part of `createOffer` — they are a separate
`setMilestones(offerId, bps[], descriptions[])` call. WIN-05's "Continue to milestones" is
structurally right, but must say that publishing an offer is two transactions.

### M5 · KYB is displayed but never enforced — **APP-02 and SHO-04 overstate it**

`TOPIC_KYB` (2) appears in exactly one place: `PalissageLens.participant()` reads it into
`view_.kyb`. **No contract function requires it.** `IdentityRegistry` requires only
`TOPIC_KYC`. `RoleGateway._setRole` issues KYC, Winery and B2B — never KYB.

Consequence: in test mode `kyb` is always `false`, while APP-02 currently prints
*"KYC · KYB · B2B buyer — all three issued"* and SHO-04 prints *"KYC, KYB and B2B buyer claims
verified"*. Both are false on a self-assigned wallet.

*Fix:* the eligibility line must state the claims that actually gate the action —
`TOPIC_B2B_BUYER` for buying, `TOPIC_WINERY` for publishing. KYB may be shown as an
operator-issued attestation, clearly separated from what the contract checks.

`TOPIC_VERIFIER` (5) is likewise never read by any contract, although `README.md` describes it
as the verifier/warehouse-partner topic.

## 4. Contract capabilities with no screen yet

Not defects — these screens are unbuilt — but they must not be forgotten.

| Function | Caller | Where it belongs |
|---|---|---|
| `cancelAllocation(allocationId)` | **winery or admin, never the buyer** | WIN-06 offer detail |
| `claimDefault(allocationId)` | winery, only after `fullPaymentDeadline` | WIN-06 offer detail |
| `cancelOffer(offerId)` | winery | WIN-06 |
| `updateListingPrice`, `cancelListing` | seller | SHO-09 secondary |
| `unsuspendLot` | `VERIFIER_ROLE` | ADM-05 |
| `closeLot` | `DEFAULT_ADMIN_ROLE` | ADM-04 |
| `refundRedemption` | `VERIFIER_ROLE` | ADM-08 |
| `recoverEscrow` (EIP-712 buyer signature) | `VERIFIER_ROLE` | ADM-08 |
| `cancelRedemption` | buyer | SHO-13 |
| `setFrozenTokens`, `forcedTransfer` | `ENFORCER_ROLE` | ADM-08, shown as a limitation per doc 04 |
| `setPaymentTokenAllowed`, `setTreasury`, `setPrimaryFeeBps`, `setSecondaryFeeBps` | `DEFAULT_ADMIN_ROLE` | ADM-09 |
| `pause` / `unpause` | `PAUSER_ROLE`, per market | ADM-09 |
| `setTestMode` | `onlyOwner` | ADM-09 |

The first two matter conceptually: **cancelling a reservation and refunding the buyer is a
winery or admin action, not a buyer action.** Doc 04 already says so; the winery cabinet has
no screen for it.

## 5. Demo / sandbox mode — what actually exists

### On-chain sandbox: real, and it works end to end

With `testMode` open, `RoleGateway.assumeRole(Role)` does more than set a label. `_setRole`
provisions a gateway-owned `Identity` contract for the wallet, registers it in
`IdentityRegistry`, and issues the claims that role needs:

| Self-assigned role | Claims issued | What the wallet can then really do |
|---|---|---|
| `Winery` | KYC + Winery | `createLot`, `createOffer`, `setProductionStatus`, `markShipped`, `withdrawReleased` |
| `Shop` | KYC + B2B buyer | `reserve`, `payRemainder`, `list`, `buy`, `requestRedemption` |
| `Collector` | KYC | hold nothing; read the passport |
| `Admin` | — | **blocked**: `AdminRoleNotSelfAssignable` |

Admin is excluded deliberately: it carries the token's `VERIFIER_ROLE`, so a self-assignable
admin could suspend a live lot. Admins are onboarded through `assignRole`, which is
`onlyGatewayAdmin` and works in any mode.

So **three of the four roles are genuinely self-service on testnet; the operator role is not.**

### Off-chain demo: specified, not yet built

Doc 00 §6 defines DEMO as a separate deterministic simulator with **no wallet at all**, distinct
from testnet. That is the mode that lets a grant reviewer try every role, including operations,
without a chain. `PUB-12 /demo` and the persona switcher are in build tier T6 and are **not
built yet**. `APP-01` exists but is the testnet role resolver, not the demo persona chooser.

**Gap to close:** without the demo mode, the only way to see the operator cabinet is for a
gateway admin to grant the role. The wallet-free demo is what makes "anyone can try any role"
true, and it is still outstanding.
