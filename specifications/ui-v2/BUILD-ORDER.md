# Build order — phase 2 (Figma) execution checklist

> **Phase 3 is complete.** The React implementation of every screen ticked below,
> plus the screens needed to close each role's loop, is in
> `SwissArmyMan1/palissage_ui` at `994b6ab`. See
> [11 — Implementation report](11-implementation-report.md) for what was built,
> what was skipped and the measured gate results. The unticked Figma items below
> were not built in Figma; where the code needed them, they were composed from
> patterns doc 03 had already approved, and doc 11 lists which.

Tracking document. Ticked as each item is verified with a screenshot, not when the script
returns success. Every screen is done at **four frames** unless the "frames" column says
otherwise: desktop 1440 × {light, dark} and mobile 390 × {light, dark}.

Dark is produced by applying the Dark mode to the frame, never by hand-painting. If a dark
frame needs manual colour work, the variable binding is wrong — fix the binding.

State ledger: `/tmp/design-system-state-palissage-v2.json`

---

## T0 — Foundations (done)

- [x] `T0.1` 4 variable collections, 6 modes, 106 variables, scopes + code syntax on all
- [x] `T0.2` 8 text styles bound to Typography variables; 3 two-layer effect styles
- [x] `T0.3` 8-page file skeleton
- [x] `T0.4` Foundations page: ramps, semantic tokens both themes with measured contrast,
      type specimen, spacing, radius, elevation
- [x] `T0.5` Brand: real logo artwork extracted to RGBA, uploaded, `Logo` component
      (mark | lockup × light | dark)

## T1 — Component library

- [x] `T1.1` Button — kind × state, 20 variants
- [x] `T1.2` Icons — 6 Lucide components, 24px / 1.5px
- [x] `T1.3` StatusBadge — 6 tones, icon + text always
- [x] `T1.4` TrellisLifecycle — 7 stages
- [x] `T1.5` TextField — 5 states
- [x] `T1.6` NetworkChip — demo | testnet
- [x] `T1.7` StatTile — with / without delta
- [x] `T1.8` LotCard — standard | En Primeur | sold out
- [x] `T1.9` EmptyState — first-run | filtered-to-zero
- [x] `T1.10` Logo — mark | lockup × light | dark
- [x] `T1.11` DataTable — header, row, sorted header, selected row, compact + comfortable
- [x] `T1.12` Dialog / ActionReview (SYS-03) — review, approving, submitted, confirmed, reverted
- [x] `T1.13` BottomSheet — the mobile form of Dialog
- [x] `T1.14` FeeBreakdown — quantity × price, due now, remaining, fee, royalty, excluded costs
- [x] `T1.15` EvidencePanel — document row with issuer, date, hash disclosure
- [x] `T1.16` PositionSummary — balance / frozen / transferable, three values, never merged
- [x] `T1.17` Toast — status | alert, with and without action
- [x] `T1.18` Tabs — 2–6, with travelling indicator
- [x] `T1.19` Sidebar + TopBar (app shell chrome)
- [x] `T1.20` MobileTabBar — 4 tabs per role
- [x] `T1.21` Breadcrumb
- [x] `T1.22` FilterToolbar — search, chips, result count, clear
- [x] `T1.23` Skeleton — geometry-matched loaders for card, row, tile, detail
- [x] `T1.24` RoadmapStrip — the Collector honesty banner
- [x] `T1.25` Pagination / cursor control

## T2 — Patterns page

- [ ] `T2.1` App shell assembled (desktop + mobile)
- [ ] `T2.2` Public page shell (nav + footer, desktop + mobile)
- [ ] `T2.3` Detail shell — breadcrumb, identity header, summary column
- [ ] `T2.4` Form layout — single column, section grouping, sticky action bar
- [ ] `T2.5` Queue split view
- [ ] `T2.6` Transaction flow — the two-step approve → execute inside one dialog

## T3 — Motion

Figma cannot run scroll-driven animation. It carries the specification three ways, and the
real implementation lands in phase 3 with `animation-timeline: view()`.

- [x] `T3.1` `04 Motion` page created
- [x] `T3.2` Keyframe frames per scroll effect (0% / 50% / 100%), one row per effect
- [x] `T3.3` Smart Animate prototypes for interactive transitions: dialog open/close, sheet
      detents, tab indicator, accordion, wizard step, row expand
- [ ] `T3.4` Dev Mode annotations carrying the doc 05 §3 row on every animated element
- [ ] `T3.5` Reduced-motion frame per effect, showing the fallback

### The movement inventory — what actually moves on scroll

| Effect | Where | Type | Budget |
|---|---|---|---|
| Trellis vine draw | PUB-01, once | **Signature**, scroll-linked | the page's one moment |
| Section reveal | all public pages | ambient, one-shot | 16px + fade, 350ms, stagger 50ms cap 5 |
| Sticky nav condense | all public pages | functional | height 88→56 past a sentinel |
| Hero photograph drift | PUB-01 only | ambient | ≤ 3% translate, dropped on mobile |
| LotCard grid stagger | PUB-02, SHO-02 | ambient | 40ms, cap 5 |
| Number count-up | PUB-01 margin block | ambient | once on first view only |
| Lifecycle marker arrival | PUB-03, WIN-04 | functional | 250ms ease-out on stage change |
| Progress line under top bar | app, chain reads | functional | 2px, indeterminate |

Everything in `/app` stays restrained: no reveals, no parallax, no scroll effects.

## T4 — Screens, tier 1 (the flows that carry the product)

| # | Screen | Frames | Why first |
|---|---|---|---|
| - [x] | PUB-01 landing | **4/4 done** | The first impression |
| - [x] | PUB-03 lot detail | **4/4 done** | The object everything else refers to |
| - [x] | SHO-04 reserve | **4/4 done** | Money moves; the live code's worst bug |
| - [x] | SHO-06 allocation detail | **4/4 done** | Deposit vs ownership, the key misunderstanding |
| - [x] | WIN-04 manage lot | **4/4 done** | Producer's core screen |
| - [x] | WIN-07 finance | **4/4 done** | "How much can I take out today" |
| - [x] | ADM-05 lot verification | **4/4 done** | Evidence → decision |
| - [x] | PAS-01 passport | **4/4 done** | Reached from a bottle, by a stranger |

## T5 — Screens, tier 2 (complete the four roles)

- [x] PUB-02 catalogue · PUB-04 producers · PUB-05 producer · PUB-09 network
- [x] APP-01 role resolve · APP-02 testnet readiness
- [ ] WIN-01 overview · WIN-02 lots · WIN-03 create-lot wizard (4 steps) · WIN-05 offer form
- [ ] WIN-06 offer detail · WIN-08 deliveries · WIN-09 shipment · WIN-10 account
- [ ] SHO-01 overview · SHO-02 market · SHO-03 offer · SHO-05 allocations
- [ ] SHO-07 portfolio · SHO-08 holding · SHO-09 secondary · SHO-10 buy listing
- [ ] SHO-11 create listing · SHO-12/13 deliveries · SHO-14 account
- [ ] ADM-01 queues · ADM-02/03 participants · ADM-04 lots · ADM-06 milestones
- [ ] ADM-07/08 redemptions · ADM-09 settings · ADM-10 capabilities
- [ ] COL-01 shelf · COL-02 passport · COL-06 account
- [ ] COL-03/04/05 roadmap screens, all carrying RoadmapStrip

## T6 — Screens, tier 3 (public completeness)

- [ ] PUB-06 for wineries · PUB-07 for buyers · PUB-08 how it works
- [ ] PUB-10 pilot · PUB-11 legal · PUB-12 demo entry
- [ ] SYS-01 not found · SYS-02 no capability

## T7 — States

From the doc 05 §1 matrix. Each is a real frame, labelled, in both themes.

- [ ] `T7.1` First-run empty × 8 regions
- [ ] `T7.2` Filtered-to-zero × 4 regions
- [ ] `T7.3` Skeletons matching real geometry, desktop + mobile
- [ ] `T7.4` Recoverable error, fatal error, offline
- [ ] `T7.5` Chain states: wrong network, insufficient balance, missing claim, terms changed,
      awaiting signature, rejected, confirming, reverted, result unknown
- [ ] `T7.6` Over-full: longest French string, 50-row page, 42-char wallet

## T-contract — conformance fixes (blocking, see doc 10)

All five are fixed in the implementation — see doc 11 §2. They remain unticked
here because the **Figma frames** still show the old treatment.

Found by reading the contracts on 8 September 2026. These are design errors in built screens,
not implementation details.

- [ ] `TC.1` WIN-07 — `withdrawReleased` is per offer; the single global Withdraw button is wrong
- [ ] `TC.2` SHO-06 — `payRemainder` accepts a partial amount; the fixed-amount button hides it
- [ ] `TC.3` WIN-03 — `exportAllowed` is a bool, not a market list; reduce it or label it off-chain
- [ ] `TC.4` WIN-05 — deposit is bps not percent; `fullPaymentDeadline >= endTime` unstated; offer + milestones are two transactions
- [ ] `TC.5` APP-02 and SHO-04 — KYB is never enforced by any contract and is always false on a self-assigned wallet; state the claims that actually gate the action
- [ ] `TC.6` PUB-12 `/demo` persona switcher is unbuilt, so the operator cabinet cannot be tried without a gateway admin granting the role

## T-fix — carried forward

- [ ] `TF.1` PUB-01 desktop uses raw font sizes (64/44/17) instead of text styles, so the
      Typography mode does not drive it. Mobile was built correctly with styles. Migrate the
      desktop frame to text styles — this is a Gate A "no magic px" failure.
- [ ] `TF.2` Desktop eyebrow uses Inter Medium 12 rather than the `caption` style, so it is
      not uppercase like mobile. Same fix as TF.1.
- [ ] `TF.3` Add `TrellisLifecycleVertical` to the doc 03 grammar entry as the sub-520px form.

## T8 — Handoff

- [ ] `T8.1` Readiness audit from `figma-design-build/references/file-architecture.md`
- [ ] `T8.2` Code Connect on the 15 most-used components
- [ ] `T8.3` Phase 4 gates from doc 09 run against the file
- [ ] `T8.4` Update doc 02 / 05 / 08 with anything the build changed

---

## Lesson recorded during the build

**Do not generate mobile frames by transforming the desktop frame.** It was tried once, on six
public screens, as a programmatic pass: swap the nav, drop gutters 96 → 16, flip horizontal
rows to vertical, switch Typography to Mobile. The result was broken in three ways that a
screenshot caught immediately:

- containers that had been horizontal kept a **fixed height** from their old primary axis, so
  six lot cards stacked on top of each other inside a one-card-tall frame;
- the filter toolbar's control row flipped too, turning each filter label into a column of
  single letters;
- per-instance text overrides made on the desktop frame did not survive, so pagination went
  back to claiming "1–50 of 50+" for a six-item list.

The invariant in doc 00 — *mobile is a redesign, not a resize* — is not a style preference.
Every mobile frame in this file is hand-composed, and the filter rail becomes a sheet trigger
with an active count rather than a squeezed row.

## Rules for every item

1. Screenshot and inspect before ticking. A returned node id is not evidence.
2. Dark = mode switch. Hand-painting a dark frame means fixing a binding instead.
3. French strings are the layout test.
4. Real content only — real producers, real prices, the 42-character wallet.
5. Bind every fill, stroke, padding and radius. No raw hex in a screen.
6. Seed every paint with the resolved variable value (doc 09 R11).
