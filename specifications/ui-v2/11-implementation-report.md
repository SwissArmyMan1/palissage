# 11 — Implementation report (phase 3) and verification (phase 4)

Version 1.0 · 9 September 2026 · Repository `SwissArmyMan1/palissage_ui`, commit
`994b6ab`

This is the handoff the pipeline asks for: what was built against the plan, what
was skipped, what failed a gate, and where the implementation deliberately
diverges from the Figma file or from this package.

The v1 code in `UI/web` is superseded. It targeted Arbitrum and Monerium EURe
and implemented the v1 visual system; it remains in git history at `b220638`.

## 1. What was built

### The twenty screens the Figma file carries, all four frames each

| Screen id | Route | Notes |
|---|---|---|
| PUB-01 landing | `/` | Signature moment; hero carries no entrance animation |
| PUB-02 catalogue | `/lots` | Filter rail suppressed under 12 lots, as doc 03 requires |
| PUB-03 lot detail | `/lots/:lotId` | Five tabs; unknown id renders SYS-01 with the id echoed |
| PUB-04 producers | `/producers` | |
| PUB-05 producer | `/producers/:slug` | |
| PUB-09 on Base | `/network` | Every value read from `protocol()`, never hand-typed |
| PAS-01 passport | `/p/:passportId` | No shell, no wallet, one chain read |
| APP-01 role resolve | `/app` | |
| APP-02 readiness | `/app/testnet` | Three independent checks; role self-assignment |
| SHO-04 reserve | `/app/shop/reserve/:offerId` | Focused route, no sidebar |
| SHO-06 allocation | `/app/shop/allocations/:allocationId` | |
| WIN-01 overview | `/app/winery` | |
| WIN-02 lots | `/app/winery/lots` | Table above five rows, dense list below |
| WIN-03 create lot | `/app/winery/lots/new` | Four steps, each its own URL, draft kept locally |
| WIN-04 manage lot | `/app/winery/lots/:lotId` | |
| WIN-05 offer form | `/app/winery/lots/:lotId/offers/new` | |
| WIN-07 finance | `/app/winery/finance` | |
| WIN-08 deliveries | `/app/winery/deliveries` | |
| WIN-09 shipment | `/app/winery/deliveries/:redemptionId` | |
| ADM-05 lot verification | `/app/admin/lots/:lotId` | Split view, read-only below `lg` |

### Screens the Figma file does not carry, built to close the loop

Composed only from patterns doc 03 already approved — `Data table`, `Dense
list`, `Stat tile row`, `Detail pane`, `Modal dialog`. No new visual pattern was
invented.

`/for-wineries` · `/for-buyers` · `/how-it-works` · `/pilot` · `/legal/:slug`
(four pages) · `/demo` · `/app/shop/market` · `/app/shop/allocations` ·
`/app/shop/portfolio` · `/app/shop/secondary` · `/app/shop/deliveries` ·
`/app/winery/offers/:offerId` · `/app/admin` · `/app/admin/participants` ·
`/app/admin/milestones` · `/app/admin/redemptions` · `/app/admin/settings` ·
`/app/*/account` · SYS-01.

### Not built

| Item | Why |
|---|---|
| Collector cabinet, COL-01 to COL-06 | Not designed in the Figma file, and doc 00 §7 records that no contract backs the loyalty screens. The role-select card routes to a lot record instead of a shelf. |
| The wallet-free demo simulator | Doc 10 §5 records it as an open gap. `/demo` now offers the on-chain sandbox that exists and states that the operator role cannot be self-assigned. |
| French locale | EN only. The EN/FR control in the header shows FR as unavailable rather than pretending. |
| Brand deliverables BR-01 to BR-07 | Still raster. The header mark is the existing alpha PNG, theme-swapped; the trellis rule and the lifecycle geometry are drawn in code. |
| `asset-sources/manifest.json` | The register lives in `src/lib/content/assets.ts` instead, so the interface enforces it at render time. A JSON file that no code reads would not have stopped a blocked image shipping. |

## 2. Contract conformance — the five mismatches in doc 10 are fixed

| Id | Fix as built |
|---|---|
| M1 | `withdrawReleased` is per offer. The headline stays a sum with no action on it; each offer's card carries its own withdraw button, and a callout names how many transactions taking everything would send. |
| M2 | `payRemainder` takes an amount, so SHO-06 has an editable field defaulting to the full remainder, and the hint recalculates what would still be outstanding as the buyer types. |
| M3 | `exportAllowed` is one boolean, so WIN-03 shows one checkbox and says in words that a per-market list has no on-chain representation. |
| M4 | The deposit field is in basis points with its percentage beside it; `fullPaymentDeadline >= endTime` is validated inline; the screen states that publishing an offer and setting its milestones are two transactions. |
| M5 | Eligibility lines name `TOPIC_B2B_BUYER` for buying and `TOPIC_WINERY` for publishing. KYB is reported as an operator attestation, labelled "not enforced by any contract", and kept out of every gating line. |

Doc 10 §4 listed contract capabilities with no screen. Now covered:
`cancelAllocation`, `claimDefault` and `cancelOffer` on WIN-06;
`updateListingPrice` is still absent, `cancelListing` is on the secondary
screen; `unsuspendLot` on ADM-05; `refundRedemption` and the verifier's
`confirmDelivery` on ADM-08; `setTestMode` and both pauses on ADM-09.

Deliberately still absent, with the reason stated on the screen:
`recoverEscrow` (needs an EIP-712 signature from the buyer), `forcedTransfer`
and `setFrozenTokens` (move or freeze someone else's balance), and the fee,
treasury and allowlist setters (they change what every future trade costs).

## 3. Divergences from the Figma file

Each one is a decision, not a slip.

| Where | Figma | Built | Why |
|---|---|---|---|
| Header CTA | `Explore the demo` | `Try it on Base Sepolia` | The wallet-free demo does not exist. A header CTA to a page that cannot deliver what it promises is worse than a truthful label. |
| Hero secondary link | `Try the demo — no wallet needed` | `Try it on Base Sepolia` | Same reason. |
| Passport second action | `Keep this bottle on my shelf` | `How verification works` | The shelf is the unbuilt collector cabinet. |
| Nav condense | 88 → 56 px per the motion inventory | 66 → 56 px | 66 px is the resting height in the built frames; the condense target is unchanged. |
| Network page deployment table | `TestEURe · 18 decimals`, `manifest: not published` | Read live from `protocol()` | The frame was built before the EURC migration. The page's own rule is that it renders from the deployment it reads. |
| Marketing figures | `€13 700` | `€13 700` | Matches; the first build printed `.00` and was corrected. |
| Estate and packshot images | Grey plates, "rights pending" | Plates, except the two files doc 08 clears | `estate/deumie-panorama.jpg` is named there as the best hero candidate and the four `wine/cazaban-*.jpg` as the producer's own packshots. Everything else still renders the plate with its reason. |

## 4. Gate results — measured, not estimated

Run on the production build served by `vite preview`, against the live Base
Sepolia deployment.

### Passing

| Gate | Result |
|---|---|
| `tsc -b` | clean |
| `eslint .` | clean |
| `vite build` | clean |
| DOM audit: headings, accessible names, field labels, alt text, duplicate ids, landmarks, horizontal scroll | clean on 30 routes at 1440 px, 390 px and 320 px |
| Console errors and uncaught exceptions | none on any route |
| Keyboard walk, landing and lot detail | 34 focus stops each, every one with a 2 px indicator, none obscured by the sticky bar |
| Both themes | Token values sampled from the rendered page: `page` `#13100d`, `surface` `#1e1b17` in dark; `#f8f5f1` / `#ffffff` in light, exactly as doc 02 specifies |
| `prefers-reduced-motion` | `--motion-scale: 0`; the vine renders static at the current stage; hero drift off; count-up shows its final value; reveals fully visible |
| Money maths | Offer 7 at 100 bottles: `€840.00` gross, `€252.00` deposit at 3000 bps, `€588.00` balance, `€25.20` fee at 300 bps — from live chain values |
| PUB-01 JS budget ≤ 90 KB gzipped | **89.5 KB.** The chain stack is a lazy layout route, so pages that read nothing from Base never download wagmi, viem or the read model; the wallet connector and the cabinet chrome are split again on top of that. CSS is 17.3 KB. |
| Settlement asset | EURC, 6 decimals, allowed on both markets, read from `protocol()` |

### Failing, or not yet checked

| Gate | State |
|---|---|
| Screen-reader pass | **Not run.** Doc 06 §3 makes it part of the gate, not optional. The scripted audit catches roughly a third of real issues. |
| LCP, INP, CLS at p75 on a throttled mid-range profile | **Not measured.** The hero image is preloaded, `fetchpriority="high"` and unanimated, and every image has fixed dimensions, but no field or lab number exists yet. |
| French strings | **Absent**, as above. |
| `forced-colors` mode | **Not checked.** |
| 400 % zoom reflow | **Not checked.** 320 px and 200 % were checked through the 320 px pass. |

## 5. Two bugs the verification pass caught, recorded so they are not reintroduced

**The reveal animation left content invisible.** `animation-timeline: view()` with
`animation-fill-mode: both` starts at opacity 0, and under
`prefers-reduced-motion` only the travel was neutralised — so every section
below the fold sat at opacity 0 and never revealed. The same happened inside the
app shell, whose content scrolls in its own container where the view timeline
never resolves: five of the market's offers were rendered and invisible.

Fixed two ways: reduced motion and print now remove the reveal outright rather
than neutralising its travel, and `.app-shell` neutralises any reveal inside it.
The cabinets are Restrained by doc 00 §2 and should never have carried one.

**`vector-effect: non-scaling-stroke` moves dash maths into screen space.** The
lifecycle vine is drawn with `stroke-dasharray`. With that vector effect set,
the dash was computed after transformation, so on the horizontal variant the
vine ran a whole segment past the current stage. The wires keep the effect — a
hairline has no dash to get wrong — and the vine does not. The dash length is
now computed by sampling the Bézier chain at module load, rather than trusting
`pathLength` normalisation, which behaved differently between the two
orientations.

## 6. Follow-ups, in the order they matter

1. Screen-reader pass on the primary flow of each role.
2. A throttled performance profile. The payload is inside budget, but no LCP,
   INP or CLS number has been measured.
3. BR-01 `mark.svg` and BR-06 `favicon.svg`, so the brand stops shipping as a
   raster with a theme swap.
4. Clear or re-shoot the blocked images: `wine/botica-*.jpg` need the
   photographer's clearance, `wine/mijane-galea-*.png` need originals.
5. French translation.
6. `status` in `deployments/palissage-84532.addresses.json` still reads `draft`.
   Nothing in the interface depends on it, because the readiness screen reads
   the chain — but the manifest and the deployment now disagree.
7. The collector cabinet, or a decision to drop it.
