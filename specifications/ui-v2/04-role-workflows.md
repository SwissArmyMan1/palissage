# 04 — Role workflows

Four roles, end to end. Every step names the screen, the contract call behind it, the
capability required, and what the user sees when they do not have it. Capability names are the
fields of `PalissageLens.ParticipantView` — the interface reads them and disables accordingly.
A UI role never grants a permission; the contract is the only authority.

Reading key:

- **Screen** — the ID from doc 01 §3.
- **Chain** — the write call, or `read` for a pure read, or `offchain`.
- **Requires** — the `ParticipantView` field(s) that must be true.
- Steps marked **⚠ money** use `Modal dialog` (SYS-03) with an explicit review and never an
  optimistic update.

---

## 1. Winery — *Producer: publish lots, run En Primeur, follow finance*

The winery's job is to turn a future or finished vintage into money, earlier than the
traditional channel would. Everything in this cabinet answers one of three questions:
*what needs my attention*, *how far along is this lot*, *how much can I take out today*.

### WF-W0 · Onboarding

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | APP-02 | Connect wallet, confirm chain is Base Sepolia 84532 | read | — |
| 2 | APP-02 | Claim `Winery` role. In test mode any wallet may self-assign; otherwise an operator assigns it. | `RoleGateway.setRole` | `testMode` **or** operator |
| 3 | APP-02 | Identity registered and KYB + Winery claims issued by the operator | `IdentityRegistry.register`, `ClaimIssuer` | operator side |
| 4 | WIN-10 | See qualification: registered, `isVerified`, `kyb`, `wineryClaim`, `canSend`, `canReceive` | read | — |

Until step 3 completes, WIN-01 shows a **first-run empty state that is an onboarding
checklist**, not an error — three items, each with its current state and the one action that
advances it. This is the winery's actual first screen and it is a designed screen, not a
fallback.

### WF-W1 · Create a lot and get it verified

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | WIN-02 → WIN-03 | Start the create-lot wizard | — | `wineryClaim` |
| 2 | WIN-03 step 1 | **Wine**: name, vintage, region, grapes, bottle size (default 750 ml) | draft, offchain | |
| 3 | WIN-03 step 2 | **Quantity**: total bottles. Immutable after creation — stated at the field, not in a tooltip. | draft | |
| 4 | WIN-03 step 3 | **Terms**: royalty bps (secondary resale royalty to the producer), export allowed | draft | |
| 5 | WIN-03 step 4 | **Evidence**: production declaration, analysis, label. Upload → `docsHash` | draft | |
| 6 | WIN-03 review | Full review, then create | `WineLotToken.createLot` ⚠ | `wineryClaim` |
| 7 | WIN-04 | Lot exists in state **Draft**. Banner: *Awaiting verification.* | read | |
| 8 | — | Operator verifies (see WF-A2). Lot state → **Verified**, `docsHash` and `verifier` are set. | — | operator |
| 9 | WIN-04 | Lot is **Verified**. `Publish an offer` becomes available. | read | |

Each wizard step is its own URL. The draft persists locally, survives refresh, and shows
`Unsaved changes` with a leave-confirmation. WCAG 2.2 SC 3.3.7: nothing already entered is
asked for twice.

**Rule the UI must not break:** `docsHash` is set at verification and is not changed by later
metadata updates. Editing the wine's description after verification must therefore *not* imply
the evidence was re-checked. The evidence panel shows the verification date and the hash as
of verification, separately from the editable metadata.

### WF-W2 · Publish an offer — standard or En Primeur

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | WIN-04 → WIN-05 | Choose offer kind: **Current release** or **En Primeur** | — | `wineryClaim`, lot Verified |
| 2 | WIN-05 | Quantity offered (≤ total − already offered), price per bottle in EURe | — | |
| 3 | WIN-05 | Window: `startTime`, `endTime` | — | |
| 4 | WIN-05 | Payment: full, or deposit `depositBps` + `fullPaymentDeadline` | — | |
| 5 | WIN-05 | Milestones: description + bps per milestone, summing to 10 000 | — | |
| 6 | WIN-05 review | Shows: gross at full sale, protocol fee at `primaryFeeBps`, net to the winery, and **when each part becomes withdrawable** | — | |
| 7 | SYS-03 | Confirm | `PrimaryMarket.createOffer` ⚠ | `wineryClaim` |
| 8 | WIN-06 | Offer phase becomes `Scheduled` or `Open` | read | |

En Primeur differs from a current release in exactly two ways the UI must make explicit: the
lot's production stage is early (Announced / In the vineyard), and delivery is not available
until the stage reaches *Ready for delivery*. The interface says so on the offer form, on the
public offer, and in the buyer's review — three places, same sentence.

**Never displayed:** an implied discount as a "return", a projected release price, or any
percentage framed as a gain. The comparison the UI may show is factual: *offer price €6.10 ·
producer's stated release price €7.20*, both labelled as stated, neither as a forecast.

### WF-W3 · Follow production

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | WIN-04 | `Trellis lifecycle`, static variant, showing `LotView.production` | read | |
| 2 | WIN-04 | Advance to the next stage. **Forward only** — no control implies reversal. | `WineLotToken.setProduction` | `wineryClaim` |
| 3 | WIN-04 | Reaching **Ready for delivery** unlocks redemption for holders — stated on the confirm dialog, because it is irreversible and it changes what buyers may do | ⚠ | |

### WF-W4 · Get paid

The finance screen answers one question first: **how much can I take out right now.**

| # | Screen | Shows | Source |
|---|---|---|---|
| 1 | WIN-07 | `Withdrawable now` — the headline number | `SettlementView.withdrawable` |
| 2 | WIN-07 | Per offer: settled funds, released %, withdrawn to date, fee rate | `SettlementView` |
| 3 | WIN-07 | Milestones: description, bps, released or awaiting a verifier | `MilestoneView[]` |
| 4 | WIN-07 | Royalties received from secondary sales | `SecondaryMarket` events |
| 5 | SYS-03 | Withdraw ⚠ | `PrimaryMarket.withdraw` · requires `wineryClaim` |

The relationship the screen must teach in one glance: **buyers paid → funds settle in escrow →
a verifier confirms a milestone → that milestone's share becomes withdrawable.** A producer
seeing €40 000 settled and €12 000 withdrawable must be able to see *why* without asking. The
milestone list is therefore on the same screen as the number, not behind a tab.

### WF-W5 · Ship the wine

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | WIN-08 | Redemption queue, filtered to this winery | read | |
| 2 | WIN-09 | Buyer, lot, quantity, requested date, delivery data hash | read | |
| 3 | WIN-09 | Upload shipment documents → `shipmentDocsHash`, mark shipped | `RedemptionManager.markShipped` ⚠ | `wineryClaim` |
| 4 | WIN-09 | Buyer confirms delivery → tokens burn, redeemed count rises | — | buyer |
| 5 | WIN-09 | If the buyer does not confirm, the case goes to the operator (WF-A4). The winery sees the state; it does not resolve it. | read | |

### Winery exception states

| Condition | Screen behaviour |
|---|---|
| Lot **Suspended** | Offers cannot be created; existing allocations explained; redemption escrow handling stated. Only dependent actions are blocked. |
| Primary market **paused** | Offer creation and withdrawal read-only, with which market is paused; deliveries are *not* blocked automatically. |
| Milestone not yet released | `Withdrawable now` is smaller than settled; the difference is explained inline, not as an error. |
| No lots | Onboarding checklist empty state (WF-W0). |

---

## 2. Shop — *Shop or importer: buy verified lots, track your portfolio*

The buyer's job is to secure inventory at a known price and date, and eventually receive
bottles. The cabinet's organising question is **what needs money, and when**.

### WF-S0 · Onboarding

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | APP-02 | Connect, confirm chain | read | — |
| 2 | APP-02 | Claim `Shop` role | `RoleGateway.setRole` | `testMode` or operator |
| 3 | — | Operator registers identity and issues KYC (1), KYB (2) and B2B buyer (4) claims | operator | |
| 4 | APP-02 | Get test EURe from the faucet | `TestEURe` faucet | testnet only |
| 5 | SHO-14 | Qualification: `isVerified`, `kyc`, `kyb`, `b2bClaim`, `canReceive` | read | |

`canReceive` is the gate that matters, and the interface says so in those words: without it a
reservation can be made but tokens cannot be minted to this wallet. Showing `Reserve` as
available and failing at mint is the single worst failure this cabinet can have.

### WF-S1 · Find and reserve

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | SHO-02 | Browse; filter by region, vintage, offer kind, price, availability | read | — |
| 2 | SHO-03 | Offer: price/bottle, available, window, payment terms, production stage, producer, evidence | read | — |
| 3 | SHO-04 step 1 | Quantity — integer bottles, max `OfferView.available`, ± and typed entry | — | |
| 4 | SHO-04 step 2 | Payment: **Pay in full** or **Pay a deposit** (only if `depositBps > 0`) | — | |
| 5 | SHO-04 step 3 | Review: `quantity × price = total`, due now, remaining, absolute deadline with timezone, protocol fee disclosure, and what is *not* included (shipping, duties, taxes, gas) | — | |
| 6 | SYS-03 | **Approve** EURe for the exact amount | `TestEURe.approve` ⚠ | |
| 7 | SYS-03 | **Reserve** | `PrimaryMarket.reserve` ⚠ | `b2bClaim`, `canReceive` |
| 8 | SHO-06 | Allocation created. Deposit → `Deposit paid`; full → `Paid in full` | read | |

Approve and reserve are **two transactions inside one review dialog**, with a two-step progress
line. In the live implementation (`UI/web/src/pages/shop/ReserveFlow.tsx:68-78`) the live branch
calls `eure.approve` and then moves straight to the success step; `PrimaryMarket.reserve` is
never called, and the dialog title reads `Allocation reserved ✓` in both modes — only the inner
heading distinguishes `approved` from `reserved`. A buyer who reads the title believes they own
bottles they have not bought. This is the most important correctness fix in the buyer flow.

### WF-S2 · Deposit, balance, ownership

The concept most likely to be misunderstood, so it is stated on every surface that touches it:

> **A deposit reserves bottles. Tokens are minted only when the allocation is paid in full.**

| # | Screen | State | What the buyer holds |
|---|---|---|---|
| 1 | SHO-06 | `Deposit paid` · remaining due · deadline | **0 bottles.** `PositionView.balance` for this lot is 0 |
| 2 | SHO-01 | Task: *Pay the balance on {lot} by {date}* | — |
| 3 | SYS-03 | Pay balance ⚠ | `PrimaryMarket.payBalance` |
| 4 | SHO-06 | `Paid in full` | Bottles minted; `balance` rises |
| 5 | SHO-06 | Past deadline → `overdue` is shown with the offer's stated consequence | Default requires a separate contract action; the clock alone does not create it, and the UI must not claim it does |

There is **no** universal buyer refund button. Cancellation and refund are governed by the
contract and by who may call them; a buyer's request is an off-chain case. The UI must never
show `Cancel and refund` as if the buyer controls it. A fully-paid allocation offers no money
refund via `cancelAllocation`, and the interface promises nothing after a suspension.

### WF-S3 · Portfolio and resale

| # | Screen | Shows | Source |
|---|---|---|---|
| 1 | SHO-07 | Per lot: **balance**, **frozen**, **transferable** — three columns, never merged | `PositionView` |
| 2 | SHO-08 | How this holding was acquired (primary allocations, secondary purchases) and what may be done with it | read |
| 3 | SHO-11 | Create a listing: quantity ≤ `transferable`, price/bottle | |
| 4 | SYS-03 | Approve the market as operator, then list ⚠ | `SecondaryMarket.list` · requires `sellerApproved` |
| 5 | SHO-09 | My listings. **Tokens stay in the seller's wallet** — the UI must not call them escrowed | `ListingView` |
| 6 | SHO-10 | Buy someone's listing: price, protocol fee, producer royalty, seller proceeds, all four itemised | `ListingView.feeBps`, `.royaltyBps` |
| 7 | SYS-03 | Approve + buy ⚠ | `SecondaryMarket.buy` · requires `b2bClaim`, `canReceive` |

A frozen balance is shown as owned and non-transferable. Hiding it would misstate ownership;
merging it into `transferable` would offer a listing that reverts.

### WF-S4 · Get the bottles

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | SHO-08 | `Request delivery` — **only** when `LotView.production == ReadyForDelivery`. Before that the control states the stage and what must happen first. | — | |
| 2 | SHO-12 | Quantity, delivery details → `deliveryDataHash` | — | |
| 3 | SYS-03 | Request ⚠ | `RedemptionManager.request` | `canSend` |
| 4 | SHO-13 | State `Requested`. **Tokens are now in escrow** — stated plainly, with the balance reflecting it | read | |
| 5 | SHO-13 | Winery ships → `Shipped`, shipment documents available | read | |
| 6 | SYS-03 | Confirm receipt ⚠ → tokens burn | `RedemptionManager.confirm` | buyer |
| 7 | SHO-13 | `Delivered`. The lot's redeemed count rises. | read | |
| — | SHO-13 | Something is wrong → open a case; a verifier resolves it (WF-A4). The buyer sees the state, not a resolve button. | | |

### Buyer exception states

| Condition | Screen behaviour |
|---|---|
| Not `canReceive` | Reserve disabled with the missing claim named and a route to SHO-14. Not "retry". |
| Insufficient EURe | Which amount is missing, current balance, and the faucet route in testnet. |
| Offer `SoldOut` / `Ended` | Reserve disabled, the absolute reason shown, route back to the catalogue. No phantom restock. |
| Price or availability changed between review and submit | Old and new terms side by side; explicit re-confirmation. Quantity and total are never changed silently. |
| Lot `Suspended` | Only dependent actions blocked; redemption escrow handling stated separately. |
| Secondary market paused | Listing and buying read-only for that market only. |

---

## 3. Admin — *Protocol operator: verify lots, manage members and settings*

The operator's job is to clear queues with the evidence and the authority visible. This
cabinet's defining requirement is **capability honesty**: the wallet holds an unpredictable
subset of `tokenVerifier`, `tokenEnforcer`, `tokenAdmin`, `primaryVerifier`, `primaryPauser`,
`secondaryPauser`, `redemptionVerifier`, `primaryAdmin`, `gatewayAdmin`, `gatewayOwner`. The
screen reads them and renders what this wallet may actually do.

### WF-A1 · Queues

ADM-01 is a `Split view`: four queues on the left, the selected case on the right.

| Queue | Source | Requires to act |
|---|---|---|
| Participants awaiting qualification | registry + claims | `gatewayAdmin`, claim issuer |
| Lots awaiting verification | `LotView.status == Draft` | `tokenVerifier` |
| Milestones awaiting confirmation | `SettlementView.milestones[].released == false` | `primaryVerifier` |
| Redemptions needing action | `RedemptionView.state` | `redemptionVerifier` |

Each queue header shows its count and, when this wallet lacks the capability, a single line:
*You can review these; confirming a milestone needs the primary verifier role.* Reviewing is
never blocked — only acting.

### WF-A2 · Qualify a participant

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | ADM-02 | Table: wallet, name, country, gateway role, claims, `canSend`/`canReceive` | read | |
| 2 | ADM-03 | Full `ParticipantView` plus the submitted evidence | read | |
| 3 | ADM-03 | Register the identity contract | `IdentityRegistry.register` | `gatewayAdmin` |
| 4 | ADM-03 | Issue claims — KYC 1, KYB 2, Winery 3, B2B 4, Verifier 5 | `ClaimIssuer` ⚠ | trusted issuer |
| 5 | ADM-03 | Set the gateway role | `RoleGateway.setRole` ⚠ | `gatewayAdmin` |
| 6 | ADM-03 | Result: the derived `isVerified`, `canSend`, `canReceive` update visibly | read | |

The decision panel always shows *what this changes*: which actions the participant gains.
Issuing a claim is not a checkbox; it is what lets someone move money.

### WF-A3 · Verify a lot, release a milestone

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | ADM-04 | Lots in Draft, oldest first | read | |
| 2 | ADM-05 | Evidence: document type, name, issuer, date, size, preview, and the hash under a disclosure | read | |
| 3 | ADM-05 | **Verify** — sets `docsHash` and `verifier`, moves the lot to Verified | `WineLotToken.verifyLot` ⚠ | `tokenVerifier` |
| 4 | ADM-05 | **Suspend** — with a reason. Destructive confirmation naming the lot. | `WineLotToken.suspend` ⚠ | `tokenVerifier` |
| 5 | ADM-06 | Milestones by offer: description, bps, released state, and the amount it releases | read | |
| 6 | ADM-06 | **Confirm milestone** — the dialog states the euro amount this makes withdrawable | `PrimaryMarket.releaseMilestone` ⚠ | `primaryVerifier` |

Verification copy never says "approved", "certified" or "guaranteed". It says **verified**, and
the passport and lot detail always expose *what* was verified, *by whom*, *on what date* and
*against which documents* — the four facts that make the word mean something.

### WF-A4 · Resolve redemptions

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | ADM-07 | Every redemption, with age and state | read | |
| 2 | ADM-08 | Case: buyer, winery, lot, quantity, hashes, timeline | read | |
| 3 | ADM-08 | Refund the buyer — returns escrowed tokens | `RedemptionManager.verifierRefund` ⚠ | `redemptionVerifier` |
| 4 | ADM-08 | Recovery when the buyer lost compliance — EIP-712 buyer authorisation | `RedemptionManager.recover` ⚠ | `redemptionVerifier` |
| 5 | ADM-08 | Forced transfer / freeze — **`tokenEnforcer` only.** If absent, the screen explains the limitation and the available path, and offers no control. | `WineLotToken` | `tokenEnforcer` |

### WF-A5 · Settings

ADM-09, read from `ProtocolView`, each field with its current value, its authority and its blast
radius:

| Field | Source | Requires |
|---|---|---|
| Primary / secondary fee bps | `primaryFeeBps`, `secondaryFeeBps` | `primaryAdmin` |
| Treasuries | `primaryTreasury`, `secondaryTreasury` | admin |
| Payment token allowlist | `paymentAllowedPrimary`, `paymentAllowedSecondary`, `paymentMetadataOk` | admin |
| Trusted issuers per topic | `TrustedIssuersRegistry` | admin |
| Pause / unpause each market | `primaryPaused`, `secondaryPaused` | `primaryPauser` / `secondaryPauser` |
| **Test mode** | `testMode` | `gatewayOwner` |

Test mode gets the strongest treatment on the screen: while it is on, **any wallet may
self-assign any role**. The toggle sits in its own bordered block with that sentence next to
it, and turning it on requires a destructive-style confirmation.

---

## 4. Collector — *Wine lover: scan bottles, loyalty passport and rewards*

### The honesty line

Per the owner's decision, the full loyalty cabinet is designed now and shipped labelled. This
table is the contract; nothing outside it may be presented as working.

| Screen | Backing | Label | Testnet |
|---|---|---|---|
| PAS-01 passport | Real — `LotView` + producer content | none | Available |
| COL-01 shelf | Real — local scan history + passport reads | none | Available |
| COL-02 passport in-shell | Real | none | Available |
| COL-03 rewards | **None** | `Roadmap · not implemented` | **Hidden** |
| COL-04 quests | **None** | `Roadmap · not implemented` | **Hidden** |
| COL-05 drops | **None** | `Roadmap · not implemented` | **Hidden** |
| COL-06 account | Real | none | Available |

The roadmap label is a **persistent element of the screen**, not a dismissible banner: a
`--color-info` bordered strip directly under the page title, reading *Roadmap — this programme
is not implemented. Nothing on this screen is recorded on Base.* Every control on those screens
is `disabled` with an accessible name that includes the reason. Sample figures are visibly
sample. `Roadmap` never appears inside a required path in another role's flow.

### WF-C1 · Scan a bottle — the real path

| # | Screen | Action | Chain | Requires |
|---|---|---|---|---|
| 1 | — | Scan the QR on the bottle | — | **no wallet, no account** |
| 2 | PAS-01 | Passport: producer, wine, vintage, region, grapes, lot state, production stage, verification date and verifier, bottle count redeemed, `docsHash`, link to the record on Base | read | — |
| 3 | PAS-01 | Continue to the producer, or to the lot | — | — |
| 4 | PAS-01 | *Optional:* `Keep this bottle` → COL-01 | local | — |

PAS-01 is mobile-only in its design intent, single column, no shell, and must render usefully
on a slow connection in a shop or a restaurant. It is the one screen most likely to be seen by
someone who has never heard of the product.

**What the passport must not claim.** It identifies the *lot*, not the individual bottle. It
does not prove the bottle is genuine, that it has not been refilled, or that the scanning
person owns it. One sentence says so, plainly, near the verification block — the credibility of
everything else on the page depends on that sentence being there.

### WF-C2 · The shelf — real

| # | Screen | Shows |
|---|---|---|
| 1 | COL-01 | Bottles scanned, newest first: image, wine, producer, scan date |
| 2 | COL-01 | Empty state: what a scan gets you, and where the code is on the bottle |
| 3 | COL-06 | Saved producers, language, theme |

Scan history is local to the device unless the user connects a wallet, and the screen says so.

### WF-C3 · Loyalty — roadmap, designed

The design exists so the programme can be built and so the concept can be shown; it ships
labelled per the table above.

- **COL-03 Rewards** — a producer-run programme. Progress toward a reward, the reward, and
  **which producer is offering it**. Designed around producer-issued rewards rather than
  protocol-issued points, because that is what the contracts could plausibly support and what
  a winery would actually fund.
- **COL-04 Quests** — bounded, verifiable goals (*collect three vintages from one producer*).
  No streaks, no daily logins, no artificial scarcity timers.
- **COL-05 Drops** — limited releases from producers the collector follows. Reuses the public
  offer components; buying still requires a qualified B2B buyer, and the screen says so rather
  than implying a consumer checkout that does not exist.

**Not designed, and out of scope:** a points token, a marketplace for rewards, a social feed,
leaderboards, referral rewards. Each would imply an economic mechanism the protocol does not
have.

---

## 5. Cross-role invariants

1. **One shared state.** In demo, all four cabinets read one deterministic scenario. A buyer
   reserving in the Shop cabinet changes what the Winery cabinet shows. Separate mock arrays
   per page — what v1 shipped — is forbidden.
2. **Role switching preserves mode.** Switching role never changes network. Connecting a wallet
   never enables testnet by itself.
3. **Every action shows its capability.** A disabled control always names what is missing and
   the safe next step. Never a bare disabled button, never "retry" for a missing claim.
4. **No dead CTAs.** A control either works, or explains the specific unavailable integration.
   `Coming soon` inside a required path is forbidden; `Roadmap` outside one is allowed, per §4.
5. **Off-chain and on-chain state are visually distinct and may combine.** `Shipped · support
   case open` is legitimate; presenting an off-chain workflow state as a contract state is not.
6. **Pending transactions survive navigation.** Closing the review dialog does not cancel a
   submitted transaction; it continues to be tracked, and it is visible from any screen.
