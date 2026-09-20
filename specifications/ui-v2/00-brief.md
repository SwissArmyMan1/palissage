# 00 — Brief

Every answer is marked `[derived]` (read out of the repository), `[stated]` (decided by the
owner in this session) or `[assumed]` (my working assumption — reject it here and the rest of
the package changes).

## 1. Job to be done

There are four, one per role, and they are genuinely different jobs — which is why one shell
and one visual density cannot serve all of them.

| Role | Job (one sentence, starts with a verb) |
|---|---|
| **Winery** (producer) | Publish a verified lot, sell part of a future vintage before it is bottled, and get paid as production milestones are confirmed. |
| **Shop** (shop, importer, restaurant, bar) | Compare lots from named producers, reserve an allocation at a known price and date, and turn it into physical bottles. |
| **Admin** (protocol operator) | Clear the queues — qualify a participant, verify a lot, release a milestone, resolve a redemption — with the evidence and the authority visible for each decision. |
| **Collector** (wine lover) | Scan a bottle and read where it came from, without a wallet. |

The product-level job, the one the landing page must answer in the first screen:
**buy wine directly from the producer, and pay for part of it before it exists.**

`[derived]` from `README.md`, `base-batches-application.txt`, `src/market/PrimaryMarket.sol`.

## 2. Surface types

This is a hybrid product and the grammars must not be blended inside one screen.

| Surface | Type | Expressiveness budget |
|---|---|---|
| Public site (`/`, `/lots`, `/producers/*`, `/how-it-works`, `/for-*`, `/network`, `/pilot`) | Marketing + catalogue | **Considered** — one signature moment for the whole site |
| Bottle passport (`/p/:id`) | Consumer artefact | **Considered** — one moment, different from the site's |
| Winery / Shop / Admin cabinets (`/app/*`) | Product app, money moves through it | **Restrained** — functional motion only |
| Collector cabinet (`/app/collector/*`) | Consumer app | **Restrained** for the shelf; the roadmap loyalty screens may use one considered moment |
| `/app/testnet` | Diagnostic | **Restrained**, no motion beyond state changes |

`[stated]` The owner asked for "beautiful and modern, with smooth animations, not an ancient
bulletin board". That request is satisfied by **Considered on the public site** — a real
signature moment plus disciplined micro-interaction — and explicitly **not** by adding motion
to the cabinets. A trading cabinet that animates is a cabinet that feels slow. This split is
the veto instrument for the rest of the project: when a "cool idea" arrives for a table, the
answer is this table.

The one signature moment is specified in [03 — Pattern selection](03-pattern-selection.md)
as **Trellis lifecycle**. There is exactly one, it is derived from the logo, and it is also a
functional component (the production timeline), which is why it earns its place.

## 3. Primary device

| Surface | Leads | Reason |
|---|---|---|
| Public site | **Mobile** | Grant reviewers, producers and buyers arrive from a link, a phone, a QR code or a pitch deck. `[assumed]` — no analytics exist yet. |
| Bottle passport | **Mobile, exclusively** | It is reached by scanning a QR code on a bottle. Desktop is the compromise here, not the target. `[derived]` from the scan flow in `src/pages/consumer/ScanLanding.tsx`. |
| Winery cabinet | **Desktop**, mobile must work | A producer publishes a lot at a desk, but checks money and deliveries on a phone in the cellar. |
| Shop cabinet | **Desktop** | Comparing lots and reserving thousands of bottles is a desk task. |
| Admin cabinet | **Desktop** | Queue triage across evidence. Mobile gets a reduced read-only view, stated explicitly in doc 06. |
| Collector cabinet | **Mobile, exclusively** | It is the continuation of a scan. |

## 4. Content reality

Designed against the real data shapes in `src/periphery/PalissageLens.sol`, not against
lorem ipsum. `[derived]`

**Real longest strings** (from `UI/web/src/lib/mock.ts`, real producers):

| Field | Longest real value | Chars |
|---|---|---|
| Producer name | `Domaine Parazols Bertrou` | 24 |
| Wine name | `Naissance d'un Grand Blanc 2023` | 31 |
| Grapes | `Merlot 45% · Grenache Noir 45% · Cabernet Franc 10%` | 50 |
| Region | `Cabardès AOC · organic` | 22 |
| Wallet, untruncated | `0x0fef031115E60105c09458E4e28031DaF62D1AbD` | 42 |
| `docsHash` / tx hash | 66 with `0x` | 66 |

Design targets: producer 32, wine name 44, grapes 64, region 28. French translations run
15–25 % longer than English — the FR string is the layout test, not the EN one.

**Real numeric ranges.** Price per bottle €6.10 – €13.80. Lot size 1 500 – 12 000 bottles.
Allocation totals up to €17 798.40. Royalty 200–250 bps. `TestEURe` has **18 decimals**
`[derived from docs/chain-mvp]` — the interface formats to 2 decimal places and never
displays raw wei.

**Smallest realistic dataset:** a freshly seeded testnet has 0 lots, 0 allocations, 0 listings,
0 redemptions. Every collection must have a designed first-run empty state, because on day one
of the pilot every collection is empty. This is the single most likely state a grant reviewer
will actually see.

**Largest realistic dataset:** `PalissageLens.MAX_LIMIT = 50` per page, `MAX_SCAN = 500` per
call, cursor pagination. The interface is therefore **cursor-paginated, never infinite-scrolled
over an unbounded set**, and never claims a total count it has not read.

**Locales:** English primary, French secondary. Both must exist before any public release.
No RTL in scope `[assumed]`. Currency `€` with a non-breaking narrow space as thousands
separator; dates absolute with an explicit timezone (`28 February 2027, 23:59 Europe/Paris`) —
relative dates ("in 3 days") are forbidden on anything that is a payment deadline.

## 5. Constraints

| Constraint | Value | Source |
|---|---|---|
| Stack | React 19, Vite 8, TypeScript, React Router 7, Tailwind, Framer Motion 12, wagmi/viem/RainbowKit | `[derived]` `UI/web/package.json` |
| Target chain | **Base Sepolia, chainId 84532** now; Base mainnet after audit. Base is the declared primary network. | `[stated]` + `[derived]` `TECHNICAL_README.md` |
| Historical chain | Arbitrum Sepolia addresses in `TECHNICAL_README.md` are historical. The interface must never present them as Base. | `[derived]` |
| Payment token | `TestEURe`, 18 decimals, testnet faucet | `[derived]` |
| Read model | `PalissageLens` — one `view` call per screen. The interface derives no financial value the Lens already computes. | `[derived]` `src/periphery/PalissageLens.sol` |
| Repository layout | `UI/web` is a **separate git repository** (`SwissArmyMan1/palissage_ui`), gitignored by the parent | `[derived]` `.gitignore:23` |
| Brand | Vine-on-trellis mark and ornate `PALISSAGE` wordmark exist as raster only. Direction: **Editorial modern** — see doc 08. | `[stated]` |
| Legal floor | WCAG 2.2 AA. No investment, yield or return language anywhere. No "audited", "insured", "guaranteed" without a cited basis. | `[stated]` |
| Browser floor | Evergreen Chromium, Firefox, Safari 17+. `light-dark()`, container queries, `@starting-style`, scroll-driven animation all usable with the fallbacks named in doc 06. `[assumed]` |

## 6. Modes — and why they are a design problem, not a config flag

Three environments, and the interface must never blur them. `[derived]` from v1's mode rules,
which were correct.

| Mode | Entry | Header marker | Write behaviour |
|---|---|---|---|
| **DEMO** | `/demo`, no wallet | `Demo · sample data` | Deterministic local simulator. Local events get `demo-event-*` ids, **never a fake tx hash**. Every payment CTA reads `Simulate …`. |
| **TESTNET** | `/app/testnet`, wallet required | `Base Sepolia · test assets only` | Real transactions against the verified manifest. A missing integration is shown read-only with the reason — never a mock success. |
| **MAINNET** | Not reachable in this version | — | Writes disabled. A configuration error must fail closed, never fall back to demo or to mainnet. |

Mode, role, participant verification, lot state and actual contract capability are **five
independent facts**. Reaching `/app/admin` grants nothing; the screen reads
`ParticipantView.primaryVerifier`, `.tokenVerifier`, `.redemptionVerifier`, `.gatewayAdmin`
and disables what this wallet genuinely cannot do. This is a design requirement, not an
implementation detail, and it is why doc 04 lists a capability per action.

## 7. Red flags raised in phase 0

Raised once, then the work proceeds as asked.

1. **Four jobs, one product.** They do not share a density or a navigation model. Resolved by
   giving each role its own shell configuration inside one app shell — doc 01.
2. **The Collector role has no contract behind it.** `PalissageLens` returns no achievement,
   quest or scan data; no contract mints a loyalty token. `[stated]` decision: design the full
   loyalty cabinet, mark every unbacked screen `Roadmap · not implemented`, and hard-disable it
   in testnet mode. The passport and the shelf are real; the rewards are a designed intention.
   Doc 04 §4 draws that line per screen.
3. **Brand assets are raster with baked backgrounds.** The four supplied logo files are JPEGs
   with a wall texture and a drop shadow. They cannot be placed on the limestone page or the
   dark surface without a visible box. Vectorisation is a blocking asset task — doc 08 §1.
4. **Estate photography is documentary, not editorial.** The three estate images are phone
   snapshots; one is a close portrait of an identifiable person at work. `[stated]` people may
   appear where they are incidental to the scene, not as portraits, and Domaine de Cazaban's
   horse-and-plough image is cleared by the owner. Rights per file — doc 08 §3.
5. **`0 lots` is the likely first impression.** A freshly seeded Base Sepolia deployment is
   empty. The first-run empty state of the marketplace is a **primary** screen in this package,
   not an afterthought — doc 05.
