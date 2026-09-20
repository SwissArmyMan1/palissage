# 05 — States and motion

## 1. State matrix

Every data-backed region gets each of these designed. A region that only has a "full happy"
design is unfinished. `—` means the state cannot occur for that region.

| Region | First-run empty | Filtered to zero | Loading (initial) | Loading (refresh) | Recoverable error | Fatal error | Offline | Over-full |
|---|---|---|---|---|---|---|---|---|
| PUB-02 catalogue | *No lots published yet* + route to `/for-wineries` | *No lots match* + active filter chips + Clear | Skeleton grid, 6 cards, real geometry | Keep cards, show `Updating` | Region-scoped, Retry | Page error with the chain and manifest state | Stale banner + last-success time | Cursor paginate at 50 |
| PUB-03 lot | — | — | Skeleton matching the two-column detail | Keep content | Evidence fails alone; the lot still renders | 404 naming the id | Stale banner | Evidence list paginates |
| PAS-01 passport | — | — | Skeleton, single column | — | *We could not read this bottle's record* + Retry | 404 naming the code | Stale banner + last-success | — |
| WIN-01 overview | **Onboarding checklist** (3 items) | — | Skeleton tiles + list | Keep numbers | Per-tile error, page survives | Full-page | Stale banner, writes blocked | — |
| WIN-02 lots | *Create your first lot* + primary CTA | *No lots match* + Clear | Skeleton table rows | Keep rows | Inline row error | Full-page | Stale, writes blocked | Paginate; > 5 rows table, ≤ 5 dense list |
| WIN-07 finance | *No offers yet* — explains escrow before there is any | — | Skeleton with the headline reserved at max width | Keep the number, subtle indicator | Milestones fail alone | Full-page | Stale, withdraw blocked | — |
| SHO-02 market | *No offers open right now* + notify route | *No offers match* + Clear | Skeleton grid | Keep cards | Region-scoped | Full-page | Stale | Paginate |
| SHO-04 reserve | — | — | Disabled form + skeleton summary | Re-validate terms before submit | Inline at the failing field | Return to SHO-03 with quantity preserved | Block submit, keep the draft | — |
| SHO-05 allocations | *Nothing reserved yet* + route to the market | *No allocations match* | Skeleton list | Keep rows | Per-row | Full-page | Stale | Group by required action |
| SHO-07 portfolio | *No bottles yet* — explains deposit ≠ ownership | — | Skeleton table | Keep rows | Per-lot position error | Full-page | Stale | Paginate; positions capped at 50 ids per call |
| SHO-09 secondary | *No listings* + route to create one | *No listings match* | Skeleton | Keep rows | Per-row | Full-page | Stale | Paginate |
| ADM-01 queues | *All queues clear* — a success state, not an empty one | — | Skeleton, four queue headers | Keep counts | Per-queue | Full-page | Stale, actions blocked | Counts are capped reads, labelled `50+` |
| ADM-03 participant | — | — | Skeleton detail | Keep | Per-section | 404 naming the address | Stale, decisions blocked | — |
| COL-01 shelf | *Scan a bottle to start* + where the code is | — | Skeleton | Keep | Per-item | Full-page | **Works offline from local history** | Virtualise past 200 |
| APP-02 testnet | — | — | Three independent checks, each with its own state | Re-check button | Per-check | Never full-page — this screen is the diagnostic | Explicit: RPC unreachable | — |

### Additional states, applying across regions

| Code | State | What the user sees | Recovery |
|---|---|---|---|
| ST-A | Wallet disconnected | The review is preserved; `Connect wallet` | Connecting does not submit anything |
| ST-B | Wrong network | Current and required network named | Explicit switch; declining preserves the review |
| ST-C | Insufficient token or gas | Which amount is missing, current balance | Faucet route in testnet |
| ST-D | Participant unqualified / expired | The missing claim and its expiry date | Route to the account screen — never "retry" |
| ST-E | Capability missing | *You can view this but confirming needs …* | Read-only; the UI role grants nothing |
| ST-F | Balance frozen | Owned / frozen / transferable as three numbers | Actions capped at transferable |
| ST-G | Terms changed since review | Old and new side by side | Deliberate re-confirmation; nothing changes silently |
| ST-H | Awaiting wallet signature | Which signature is expected | No success shown; a second click does not duplicate |
| ST-I | Rejected in wallet | *Request declined. Nothing was submitted.* | Fields preserved; retry only on click |
| ST-J | Submitted / confirming | Tx hash (testnet only) and confirmation stage | Closing the dialog does not cancel it |
| ST-K | Confirmed, read pending | *Confirmed. Updating your allocation…* | Repeat the read, never the write |
| ST-L | Reverted | Plain cause + technical detail under a disclosure | Never auto-retry a financial write |
| ST-M | Result unknown / RPC timeout | *We have not confirmed the result yet* | Check the receipt before resubmitting |
| ST-N | Session / account changed | Owner no longer matches | Close sensitive data, invalidate reads, re-review |
| ST-O | Action already completed | The current final state | Route to the object; no second confirmation |
| ST-P | Unsaved draft | `Unsaved changes` | Leave confirmation: Stay / Discard; draft restores |

**In demo mode an off-chain event never receives a transaction hash.** It receives a
`demo-event-*` id. In testnet a real hash links only to the configured network's explorer.

## 2. Loading thresholds

| Expected duration | Treatment |
|---|---|
| < 300 ms | Nothing. A flashed spinner reads as instability. |
| 300 ms – 1 s | Inline: the button enters pending at a stable width; the row dims. No region takeover. |
| > 1 s, predictable layout | Skeleton whose geometry matches the final content **at that breakpoint**. |
| > 1 s, unpredictable layout | Spinner, scoped to the region. |
| Measurable work (a seed, a multi-step transaction) | Progress with a count and the current step. |
| > 5 s | Say what is happening and offer cancel where cancel is real. |

The delay is implemented — the skeleton is not rendered and then hidden 80 ms later. Once
shown, a skeleton stays a minimum of 300 ms. Skeletons are `aria-hidden` with one polite
`Loading …` message for the region, not dozens of announced boxes.

**Chain-specific rule:** a block-triggered re-read is a *refresh*, never an initial load. The
numbers on screen stay; a 2 px progress line under the top bar indicates the read. Replacing a
buyer's visible balance with grey boxes every time a block lands is a regression, not a
loading state.

## 3. Motion specification

Every row maps to a token from doc 02 §7. `travel` values are multiplied by `--motion-scale`,
which is `0` under `prefers-reduced-motion`.

### Global

| Element | Trigger | Property | Curve | Duration | Stagger | Reduced motion |
|---|---|---|---|---|---|---|
| Button hover | pointer enter | `background-color`, `border-color` | `--ease-out` | 150 ms | — | unchanged (colour only) |
| Button press | pointer down | `transform: scale(0.985)` | `--ease-out` | 100 ms | — | removed |
| Focus ring | `:focus-visible` | `outline-color`, `outline-offset` | `--ease-out` | 100 ms | — | unchanged |
| Link underline | hover | `text-decoration-color` | `--ease-out` | 150 ms | — | unchanged |
| Theme switch | click | — | — | **0 ms, suppressed** | — | n/a |
| Row hover | pointer enter | `background-color` | `--ease-out` | 100 ms | — | unchanged |
| Card hover (public) | pointer enter | `box-shadow` level 1→2, `transform: translateY(-2px)` | `--ease-out` | 150 ms | — | shadow only, no travel |

Card hover is wrapped in `@media (hover: hover)`. On touch it is not the affordance — the whole
card is the target.

### Overlays

| Element | Trigger | Property | Curve | Duration | Reduced motion |
|---|---|---|---|---|---|
| Tooltip | hover 500 ms / focus 0 ms | `opacity`, `translateY(4px)` | `--ease-out` | 150 ms | opacity only |
| Popover | click | `opacity`, `translateY(4px)` from the anchor side | `--ease-out` | 150 ms | opacity only |
| Dropdown menu | click / ↓ | `opacity`, `scale(0.98→1)` | `--ease-out` | 150 ms | opacity only |
| Dialog panel | explicit action | `opacity`, `scale(0.97→1)`, `translateY(8px)` | `--ease-out` in / `--ease-in` out | 250 in / 200 out | opacity only |
| Dialog scrim | with the panel | `opacity` | same timeline | 250 / 200 | unchanged |
| Bottom sheet | tap / drag | `translateY` | **spring**, velocity-tracked | ~350 ms programmatic | opacity + instant position |
| Drawer | click | `translateX` | `--ease-out` / `--ease-in` | 300 / 240 | opacity only |
| Toast | action complete | `opacity`, `translateY(12px)` from its edge | `--ease-out` / `--ease-in` | 200 / 150 | opacity only |

Toasts live 4–6 s; 8–10 s when they carry an action; the timer pauses on hover, on focus and on
tab blur. Focus moves into an overlay on open **regardless of animation state** — the animation
never delays focus.

### App structure

| Element | Trigger | Property | Curve | Duration | Reduced motion |
|---|---|---|---|---|---|
| Sidebar collapse | click | `grid-template-columns` | `--ease-in-out` | 200 ms | instant |
| Nav active marker | route change | `transform` on the indicator | `--ease-in-out` | 150 ms | instant |
| Tab indicator | tab change | `transform`, `width` | `--ease-in-out` | 200 ms | instant |
| Accordion | click | `grid-template-rows: 0fr → 1fr` | `--ease-in-out` | 200 ms | instant |
| Table sort | click header | **none — 0 ms** | — | — | — |
| Row expand | click | `grid-template-rows` | `--ease-out` | 200 ms | instant |
| Wizard step | next / back | `opacity`, `translateX(16px)`, direction matches travel | `--ease-in-out` | 250 ms | opacity only |
| Route change in `/app` | navigation | **none** | — | — | — |

Sorting a table never animates the rows. Watching 40 rows slide is slower to read than a jump,
and the entry says so.

### Public site — where the budget is spent

| Element | Trigger | Property | Curve | Duration | Stagger | Reduced motion |
|---|---|---|---|---|---|---|
| Hero headline | — | **none** | — | — | — | — |
| Hero image | — | **none** (LCP) | — | — | — | — |
| Section reveal | `view()` at ~20% entry | `opacity 0→1`, `translateY(16px→0)` | `--ease-out` | 350 ms | 50 ms, max 5 siblings | already visible |
| **Trellis lifecycle vine** | scroll, `entry 10%` → `cover 45%` | `stroke-dashoffset` | `linear` (scroll-linked) | scroll range | — | fully drawn, static |
| Lifecycle stage marker | stage enters range | `opacity`, `scale(0.9→1)` | `--ease-out` | 250 ms | — | static |
| Lot card grid entry | `view()` | `opacity`, `translateY(12px)` | `--ease-out` | 300 ms | 40 ms, max 5 | already visible |
| Number in a stat tile | first view | count-up | `--ease-out` | 600 ms | — | final value immediately |

The hero headline is deliberately unanimated: it is the LCP element, and the
`Kinetic type / text reveal` entry vetoes animating it. The live site animates it with a
staggered fade — that is the LCP cost being paid for nothing.

The count-up runs **once**, on first view, never on refetch.

### Reduced motion, precisely

`prefers-reduced-motion: reduce` sets `--motion-scale: 0`, which neutralises every travel
distance in the system. It does **not** remove opacity fades, colour transitions or any state
change that carries meaning. Removing all feedback makes the interface worse.

Specifically removed: the vine draw, all `translate`, all `scale`, spring bounce, staggered
cascades, the count-up. Specifically kept: short opacity fades, colour and border transitions,
focus indicator changes, progress indicators.

`prefers-reduced-transparency` drops every `backdrop-filter`. `forced-colors` keeps motion but
requires every state to be conveyed by border or text — shadows disappear in that mode, so no
layer may depend on one.

## 4. Choreography rules

- **One subject per transition.** Two competing subjects read as a glitch.
- **Enter from where it came from.** A menu opens from its trigger; a sheet from the bottom
  edge; a toast from the edge it lives on.
- **Exit is 0.7–0.8× the enter duration.** The user has already decided.
- **Never block input during motion.** A second click during a 250 ms dialog animation is
  honoured, not dropped.
- **Duration scales with distance**, roughly as its square root. A popover moving 4 px and a
  sheet moving 600 px cannot share a duration.
- **Never animate the acknowledgement of input.** Press feedback is ≤ 100 ms; the *result* may
  animate.
