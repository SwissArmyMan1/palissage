# 01 — Information architecture

## 1. Object model

These nouns come from the contracts. They become component names, route segments and token
scopes. They are the only words used for these things anywhere — in code, in Figma, in UI copy
and in this package. A synonym is a bug.

```
Producer ──< Lot ──< Offer ──< Allocation >── Buyer
                │                  │
                │                  └── Settlement ──< Milestone
                ├──< Listing >── Seller/Buyer
                ├──< Redemption >── Buyer
                ├──< Position (per wallet: balance / frozen / transferable)
                └──── Passport (public projection of a Lot)

Participant ── claims (KYC 1, KYB 2, Winery 3, B2B 4, Verifier 5)
            └─ gateway role (Admin 1, Winery 2, Shop 3, Collector 4)
            └─ per-contract capabilities (verifier / enforcer / pauser / admin, per contract)
```

| Noun | Definition the UI must hold to | Source |
|---|---|---|
| **Producer** | A winery. Identified by wallet; displayed by name. Called *Producer* in buyer-facing copy, *Winery* in role names and in the contract. | `LotView.winery` |
| **Lot** | One batch of wine. One `tokenId`. Quantity is **bottles**, always integers. | `LotView` |
| **Offer** | The terms of a primary sale of a lot: price, quantity, window, deposit, deadline, kind (standard or En Primeur). A lot may have several. | `OfferView` |
| **Allocation** | One buyer's position in one offer: quantity, total due, paid, remaining, state, deadline. | `AllocationView` |
| **Listing** | A secondary offer of bottles the seller already holds. Lazy — tokens stay in the seller's wallet. | `ListingView` |
| **Position** | What a wallet holds of a lot right now: `balance`, `frozen`, `transferable`. Three numbers, never collapsed into one. | `PositionView` |
| **Redemption** | A request to convert bottles into physical delivery. Escrows tokens; burns them on confirmed delivery. Called **Delivery request** in buyer copy. | `RedemptionView` |
| **Settlement** | The escrow state of one offer: settled funds, released bps, withdrawable, fee. | `SettlementView` |
| **Milestone** | A production checkpoint that unlocks a share (bps) of escrow when a verifier confirms it. | `MilestoneView` |
| **Participant** | A wallet plus its registry state, claims, gateway role and per-contract capabilities. | `ParticipantView` |
| **Passport** | The public, wallet-free read of a lot reached from a bottle QR code. | derived |

### Words that are forbidden

`asset`, `NFT`, `investment`, `yield`, `return`, `APY`, `portfolio value`, `token holder` in
buyer-facing copy, `status` as a universal field name. A lot has a **lot state**, a lot has a
**production stage**, an offer has a **phase**, an allocation has an **allocation state**, a
redemption has a **redemption state**. Five different things; five different words.

### The enumerations, as the UI shows them

| Enum | Contract values | UI label |
|---|---|---|
| Lot state | Draft, Verified, Suspended, Closed | Draft · Verified · Suspended · Closed |
| Production stage | Announced → Growing → Harvested → Vinification → Aging → Bottled → ReadyForDelivery | Announced · In the vineyard · Harvested · Vinification · Ageing · Bottled · **Ready for delivery** |
| Offer phase | 0 Scheduled, 1 Open, 2 SoldOut, 3 Ended, 4 Cancelled | Opens {date} · Open · Sold out · Closed · Cancelled |
| Allocation state | Reserved, Paid, Defaulted, Cancelled | Deposit paid · Paid in full · Defaulted · Cancelled |
| Redemption state | Requested, Shipped, Completed, Refunded | Requested · Shipped · Delivered · Returned |

Production stages move **forward only**. The UI must never render a control that implies going
back.

## 2. Origin and zone model — a change from v1

The live site serves each role from its own subdomain (`winery.`, `shop.`, `admin.`,
`app.palissage.net`) with a path-prefix fallback in dev — `UI/web/src/lib/zone.ts`.

**Decision: single origin, path-based.** `palissage.net` serves the public site and
`palissage.net/app/<role>/…` serves the cabinets. Existing subdomains become 301 redirects.

Reasons, in order of weight:

1. **Role is on-chain, not in the hostname.** `RoleGateway` decides what a wallet is. One
   wallet can legitimately be both a winery and a shop. A hostname cannot express that, so the
   subdomain model has to guess, and it guesses before the chain has answered.
2. **Wallet session does not cross subdomains cleanly.** WalletConnect sessions, RainbowKit
   state and any pending-transaction record are per-origin. A role switch mid-transaction on
   the subdomain model loses the pending transaction.
3. **The demo has to switch roles in one session.** That is the core of the guided demo.
4. It removes four deploy targets and four TLS certificates from an MVP.

Cost accepted: a slightly longer URL, and `/app` becoming a single bundle boundary. Mitigated
by route-level code splitting per role (doc 06 §3).

## 3. Route inventory

`Mode` column: `D` reachable in demo, `T` reachable in testnet, `P` public/no wallet.

### Public

| ID | Route | Job it serves | Mode |
|---|---|---|---|
| PUB-01 | `/` | Answer "what is this and who is it for" in one screen; route to the right audience | P |
| PUB-02 | `/lots` | Browse and filter the catalogue | P D T |
| PUB-03 | `/lots/:lotId` | Understand one lot: wine, producer, terms, production stage, evidence | P D T |
| PUB-04 | `/producers` | See who is on the platform | P |
| PUB-05 | `/producers/:slug` | Read one producer and their lots | P |
| PUB-06 | `/for-wineries` | Convince a producer; route to `/pilot` | P |
| PUB-07 | `/for-buyers` | Convince a shop or importer; route to `/lots` | P |
| PUB-08 | `/how-it-works` | Explain the lifecycle from lot to bottle | P |
| PUB-09 | `/network` | Explain what is on Base and what is not; link the manifest and the verified contracts | P |
| PUB-10 | `/pilot` | Collect a pilot enquiry | P |
| PUB-11 | `/legal/:slug` | privacy · terms · prototype-disclosure · credits | P |
| PUB-12 | `/demo` | Choose a role and start the guided demo | P |
| PAS-01 | `/p/:passportId` | Read a bottle's origin after scanning. **No wallet, no account.** | P |

### App shell

| ID | Route | Job | Mode |
|---|---|---|---|
| APP-01 | `/app` | Resolve the wallet's role(s); if several, choose | D T |
| APP-02 | `/app/testnet` | Deployment health, wallet readiness, faucet, role self-assignment in test mode | T |
| SYS-01 | any unknown route | A specific 404 that names what was not found | P D T |
| SYS-02 | protected route, insufficient capability | Say which claim or role is missing and the safe next step | D T |
| SYS-03 | action review dialog (no URL) | Confirm object, amount, consequence — then execute | D T |

### Winery — `/app/winery`

| ID | Route | Job |
|---|---|---|
| WIN-01 | `` | Next action, lots needing attention, money available now |
| WIN-02 | `/lots` | All lots with state and production stage |
| WIN-03 | `/lots/new` | Create-lot wizard |
| WIN-04 | `/lots/:lotId` | Manage one lot: metadata, evidence, production stage, its offers |
| WIN-05 | `/lots/:lotId/offers/new` | Publish an offer (standard or En Primeur) |
| WIN-06 | `/offers/:offerId` | One offer: allocations, settlement, milestones |
| WIN-07 | `/finance` | Escrow across offers, withdrawable now, withdrawal history, royalties |
| WIN-08 | `/deliveries` | Redemption queue |
| WIN-09 | `/deliveries/:redemptionId` | Attach shipment documents, mark shipped |
| WIN-10 | `/account` | Identity, claims, capabilities, appearance, language |

### Shop — `/app/shop`

| ID | Route | Job |
|---|---|---|
| SHO-01 | `` | What needs paying, what is arriving, what can be listed |
| SHO-02 | `/market` | Catalogue in the selected environment |
| SHO-03 | `/market/:offerId` | Offer terms and the reserve entry point |
| SHO-04 | `/reserve/:offerId` | Reserve: quantity, deposit or full, approval, confirm |
| SHO-05 | `/allocations` | All allocations, grouped by what they need |
| SHO-06 | `/allocations/:allocationId` | One allocation: paid, remaining, deadline, next step |
| SHO-07 | `/portfolio` | Positions per lot: balance / frozen / transferable |
| SHO-08 | `/portfolio/:lotId` | One holding: how it was acquired, what can be done with it |
| SHO-09 | `/secondary` | Active listings + my listings |
| SHO-10 | `/secondary/:listingId` | Buy a listing: price, fee, royalty, seller proceeds |
| SHO-11 | `/secondary/new/:lotId` | Create a listing from a transferable balance |
| SHO-12 | `/deliveries` | Delivery requests |
| SHO-13 | `/deliveries/:redemptionId` | One delivery: shipment documents, confirm receipt |
| SHO-14 | `/account` | Identity, claims, eligibility, appearance, language |

### Admin — `/app/admin`

| ID | Route | Job |
|---|---|---|
| ADM-01 | `` | Four queues with counts, and what this wallet may actually act on |
| ADM-02 | `/participants` | Participants and their qualification state |
| ADM-03 | `/participants/:address` | Review one participant; register, issue claims, set gateway role |
| ADM-04 | `/lots` | Lots awaiting verification, and verified lots |
| ADM-05 | `/lots/:lotId` | Evidence and the verify / suspend decision |
| ADM-06 | `/milestones` | Milestones awaiting confirmation, by offer |
| ADM-07 | `/redemptions` | Redemption queue and exceptions |
| ADM-08 | `/redemptions/:redemptionId` | One redemption case: refund, recovery, resolve |
| ADM-09 | `/settings` | Fees, treasuries, payment token allowlist, trusted issuers, pauses, test mode |
| ADM-10 | `/account` | This wallet's per-contract capabilities, read from the chain |

### Collector — `/app/collector`

| ID | Route | Job | Backing |
|---|---|---|---|
| COL-01 | `` | The shelf: bottles this person has scanned | Local + passport reads |
| COL-02 | `/passport/:passportId` | Same passport, in the signed-in shell | Real |
| COL-03 | `/rewards` | Loyalty programme | **Roadmap — not implemented** |
| COL-04 | `/quests` | Quests and progress | **Roadmap — not implemented** |
| COL-05 | `/drops` | Producer drops and club releases | **Roadmap — not implemented** |
| COL-06 | `/account` | Appearance, language, saved producers | Real |

Roadmap screens are fully designed, visibly labelled, and **unreachable in testnet mode**.
See doc 04 §4 for the exact labelling contract.

### Route rules

- The screen ID and the route are a contract with the E2E suite. Add both together or neither.
- An unknown `lotId` renders SYS-01 with the id echoed. It never falls back to the first lot.
- Filters, sort and search live in the query string so results are shareable and Back works.
  Nothing sensitive goes in a URL.
- Mode is explicit in the URL (`?mode=demo` / `?mode=testnet`) and survives refresh. A testnet
  route never substitutes a demo object with the same id.
- Deep links into `/app/*` without a resolved role land on APP-01, then continue to the
  original destination.

## 4. Navigation model

### Public — `Top navigation bar`

Logo · For wineries · For buyers · How it works · Lots · **[ Explore the demo ]** · EN/FR ·
theme toggle.

One CTA. `Connect wallet` is **not** in the public header — it is inside `/app` and
`/app/testnet`, because the public site's job is comprehension, not connection. This is a
change from the live site, where the header's only CTA is `Connect wallet` and a first-time
visitor is asked for a wallet before being told what the product does.

Below 1024 px the links collapse into a `Bottom sheet` menu; the CTA stays visible in the bar.

### App desktop — `App shell` + `Sidebar navigation`

```
┌──────────────────────────────────────────────────────────────┐
│ ⌂ mark   Domaine de Cazaban ▾    Base Sepolia ·  test assets  │  56px top bar
├────────────┬─────────────────────────────────────────────────┤
│ Overview   │  breadcrumb                                     │
│ Lots       │  H1 + identity + state                          │
│ Finance    │                                                 │
│ Deliveries │  content                                        │
│            │                                                 │
│ ─────────  │                                                 │
│ Account    │                                                 │
│ ⓘ Help     │                                                 │
└────────────┴─────────────────────────────────────────────────┘
   240px
```

The organisation switcher in the top bar is the role switcher. In demo it lists all four
personas; in testnet it lists only the roles this wallet actually holds, read from
`ParticipantView.gatewayRole` plus claims.

Sidebar item counts per role: Winery 4 + account, Shop 5 + account, Admin 5 + account,
Collector 4 + account. All within the 5–15 range the sidebar entry requires.

### App mobile — `Mobile bottom tab bar` + drawer

Tabs are co-equal destinations only, 3–4 per role, always with labels:

| Role | Tabs |
|---|---|
| Winery | Overview · Lots · Finance · Deliveries |
| Shop | Market · Allocations · Portfolio · Deliveries |
| Admin | Queues · Participants · Lots · More |
| Collector | Shelf · Scan · Rewards · Profile |

Account, settings and secondary sections live in a drawer from the top bar, not in a "More"
tab — except Admin, whose fifth and sixth sections genuinely are secondary.

Admin on mobile is **read-only by design**. Every write control is replaced by a line saying
the decision is made on a larger screen. Stated in doc 06 §2 as a deliberate omission, not a
gap.

### Entry and exit points

| Screen | Arrives from | Leaves to |
|---|---|---|
| PUB-01 | search, pitch deck, QR, direct | `/lots`, `/for-wineries`, `/for-buyers`, `/demo` |
| PUB-03 | `/lots`, `/producers/:slug`, a shared link, a passport | `/app/shop/reserve/:offerId`, `/producers/:slug`, back to `/lots` |
| PAS-01 | **a QR code on a physical bottle** | `/producers/:slug`, `/lots/:lotId`, `/app/collector` (opt-in) |
| SHO-04 | SHO-03, PUB-03 | SHO-06 on success; SHO-03 on cancel — never a dead end |
| WIN-03 | WIN-02 | WIN-04 on save; the draft survives a refresh |
| ADM-05 | ADM-04, ADM-01 | back to the queue with the row resolved and focus preserved |

Every flow that can be abandoned returns the user to the collection they came from, with their
scroll position and their filters intact.
