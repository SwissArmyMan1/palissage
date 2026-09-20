# 03 — Pattern selection

Every region names an entry from the `design-grammar` skill. The last column is the one that
matters: the condition from that entry's **"when NOT to use"** field that could bite *here*.
If a reviewer can find one of those conditions true in the built screen, the pattern is wrong.

## 1. Public site

| Screen · region | Grammar entry | Why this one | "NOT to use" risk here |
|---|---|---|---|
| PUB-01 shell | `Content page template` | Read, not operated. Named grid gives breakouts without negative margins. | *"for dense data"* — the featured-lot block must stay a summary, not a table. |
| PUB-01 header | `Top navigation bar` | 5 destinations, one CTA. | *"deep hierarchies"* — no mega-menu. If a 6th link appears, cut one. |
| PUB-01 hero | `Content page template` + editorial split | Photograph + headline + one live lot summary. **Not** a centred hero. | The headline is the LCP element, so it carries **no** entrance animation (see `Kinetic type` veto). |
| PUB-01 lifecycle | **`Trellis lifecycle`** (§3, project entry) | The site's single signature moment. | Only once per page, only public. Never in a cabinet. |
| PUB-01 audience split | `Responsive card grid`, 2 cards | Two audiences, comparable, each with an image. | *"no meaningful image"* — if the cards end up icon+title+text, delete the grid and write two paragraphs. This is exactly what v1 shipped. |
| PUB-01 numbers | `Stat tile row`, max 3 | Margin comparison. | *"as decoration"* — every tile states its comparison basis in text or it is removed. |
| PUB-01 FAQ | `Tabs` → **no**; use a disclosure list | Answers differ wildly in length. | Tabs veto: *"panels have wildly different lengths (the page jumps)"*. |
| PUB-02 catalogue | `Responsive card grid` + `Filter and search toolbar` | Comparable items with a real image; ordering is not meaningful. | *"when items are compared attribute-by-attribute"* — a compare view is a table, and it is out of scope for v2. |
| PUB-02 filters | `Filter and search toolbar` | Region, vintage, offer kind, price, availability. | *"do not add filters for a list of 12 items"* — with < 12 lots, render sort only and hide the filter rail. **This is the launch state.** |
| PUB-03 lot detail | `Detail pane / record view` | One object's full state, deep-linkable. | *"when the object has three fields"* — not a risk here; a lot has ~18. |
| PUB-03 evidence | `Dense list` | Homogeneous documents with metadata. | Swipe must never be the only action (WCAG 2.5.7). |
| PUB-03 production | **`Trellis lifecycle`**, static variant | Same component, no motion, inside a task context. | Motion is the veto: the animated variant is public-hero only. |
| PUB-05 producer | `Content page template` | Editorial. | — |
| PAS-01 passport | `Content page template`, single column, mobile-first | Reached by camera; one thumb, one hand, possibly poor signal. | *"a shell adds chrome that competes with content"* — no app shell, no sidebar, no wallet prompt. |

## 2. App cabinets

| Screen · region | Grammar entry | Why this one | "NOT to use" risk here |
|---|---|---|---|
| All `/app` | `App shell` | Sibling views, stable frame, chrome must not remount. | *"single-purpose flows like checkout"* — SHO-04 Reserve therefore drops the sidebar and runs as a focused route. |
| Desktop nav | `Sidebar navigation` | 5–6 destinations per role. | *"fewer than 4 destinations"* — Collector has 4 and is at the floor; do not collapse it further. |
| Mobile nav | `Mobile bottom tab bar` | 3–4 co-equal destinations, thumb zone. | *"more than 5 destinations"* — Admin exceeds it, so Admin's 5th tab is `More`, and Admin mobile is read-only (doc 06 §2). |
| Overview screens | `Stat tile row` + `Dense list` | 3 metrics, then a "what needs you" list. | *"as decoration"* — WIN-01's tiles are *withdrawable now*, *awaiting verification*, *unpaid balances*. All three are actionable. |
| WIN-02, ADM-02, ADM-04, SHO-09 | `Data table` | Attribute-by-attribute comparison down a column. | *"fewer than ~5 items"* — under 5 rows, render `Dense list` instead. Applies at launch. |
| Table on mobile | `Data table` responsive option **(b)**: row → stacked card | Chosen deliberately. Horizontal scroll loses the money column; a reduced column set hides the deadline. | Must be declared, and it is: option (b), everywhere, no exceptions. |
| SHO-05 allocations | `Dense list` grouped by required action | The user's question is "what do I owe and when", not "compare 8 attributes". | *"when attributes need column comparison"* — the *detail* view carries the columns. |
| SHO-07 portfolio | `Data table` with a 3-value cell | `balance / frozen / transferable` are three numbers that must stay three numbers. | Never collapse to one number. That is a correctness bug, not a layout choice. |
| ADM-01 queues | `Split view (list + detail)` | Triage: scan many, inspect one, keep list position. | *"on primarily-mobile products"* — Admin is desktop-primary, so this is sound; mobile degrades to a stack. |
| ADM-03/05/08 decision | `Detail pane / record view` + `Destructive confirmation` | Evidence, then a scoped decision. | Confirm button is never auto-focused; cancel is the safe default. |
| WIN-03 create lot | `Multi-step flow (wizard)` | Genuinely sequential; a lot cannot be verified before it is described. | *"when the fields fit one screen"* — they do not: 4 steps, and each step is a URL so refresh survives. |
| SHO-04 reserve | `Multi-step flow` (3 steps) + `Modal dialog` for confirm | Quantity → payment choice → review. Money moves. | Never `Optimistic update`. The entry's own veto: *"never be optimistic about money"*. |
| Any transaction | `Modal dialog` (SYS-03 Action review) | A decision that must be completed or abandoned. | *"stacked on another dialog"* — approve and reserve are two steps in **one** dialog, never two dialogs. |
| Confirm on mobile | `Bottom sheet` | Below 640 px the dialog becomes a sheet. | Drag must have a non-drag alternative (WCAG 2.5.7). |
| Filters in app | `Popover` desktop / `Bottom sheet` mobile | Page behind stays relevant. | *"not hover"* — click only; hover popovers are unreachable on touch. |
| Row actions | `Dropdown menu` | Actions on an object. | *"for navigation"* — `View lot` is a link in the row, not a menu item. |
| Field help | `Tooltip` | Icon-only affordances. | *"for essential information"* — a payment deadline is never in a tooltip. |
| Any form | `Form layout` + `Validation and errors` | Single column, labels above. | *"multi-column layouts"* — never, including the lot wizard. |
| Amount entry | `Form layout` + custom `QuantityField` | Integer bottles, ± buttons, max from `OfferView.available`. | Do not disable submit to signal an incomplete form; let it submit and show errors. |
| Loading | `Loading — threshold policy` | < 300 ms nothing; 300 ms–1 s inline; > 1 s skeleton. | *"never a skeleton for a refresh of data already on screen"* — a chain re-read keeps the old numbers and shows a subtle indicator. |
| Confirmations | `Toast` | Saved, copied, submitted. | *"for errors the user must act on"* — chain failures are inline at the cause. |
| Deletes | `Undo` where reversible, `Destructive confirmation` where not | Cancel a *draft* → undo. Cancel a *listing* → confirmation, it is a transaction. | An undo that can fail is worse than a dialog. On-chain writes therefore never use undo. |
| Empty collections | `Empty state`, two variants | First-run teaches; filtered-to-zero offers escape. | *"never ship a blank region or a bare 'No data'"*. |
| Errors | `Error state (recoverable)` | Scoped to the region that failed. | *"'Something went wrong' with no action is not an error state"*. |
| APP-02 testnet | `Detail pane / record view` | Three independent readinesses: deployment, wallet, action prerequisites. | Never merge them into one green tick — an empty wallet must still reach the faucet. |
| Command palette | **Not used in v2.** | The action inventory is small and the audience is not power users. | Its own veto: *"in consumer products where the audience will never discover it"*. |

## 3. Project grammar entry — `Trellis lifecycle`

This pattern does not exist in the global grammar. It is written here in the 12-field format
because it is project-specific (per `research-protocol.md`). It is **the** signature moment,
and it is also a working component — which is the reason it is allowed at all.

> ### Trellis lifecycle
>
> - **When to use** — showing the position of a lot in the seven-stage production sequence
>   (Announced → In the vineyard → Harvested → Vinification → Ageing → Bottled → Ready for
>   delivery), and, once per public page, as the hero explanation of the product's lifecycle.
>   Two variants share one component: `animated` (public marketing, one instance per page) and
>   `static` (everywhere else).
> - **Composition** — three horizontal wires; upright posts at each stage boundary; a vine that
>   has grown along the wires up to the current stage; stage labels below the posts; a
>   `you are here` marker. The vine's grown portion is `--color-accent`; the ungrown wire is
>   `--color-border-strong`. Required: wires, posts, labels, current-stage marker. Optional:
>   dates under completed stages, leaves and grape clusters (decorative, `aria-hidden`).
> - **Visual rules** — wire stroke 1.5 px at ≥ 768 px, 1 px below. Post height 24 px, cap
>   aligned to the top wire. Vine stroke 2 px. Completed stages use `--color-text-primary`
>   labels; the current stage adds weight 600 and a filled post; future stages use
>   `--color-text-secondary` — never `--color-text-muted`, which fails contrast in light theme.
>   The grown/ungrown boundary is marked by the post **and** the marker, never by colour alone.
> - **Interaction trigger** — `static`: none; it renders at its final state on paint.
>   `animated`: the vine's draw is bound to scroll position via `animation-timeline: view()`,
>   beginning at `entry 10%` and completing at `cover 45%`.
> - **Motion curve** — `linear` against the scroll timeline (the animation *is* the scroll
>   position, so easing would fight the input). The `you are here` marker's arrival uses
>   `--ease-out`.
> - **Duration** — expressed as a scroll range, not milliseconds; the whole section stays under
>   1.2 viewport heights. The marker settles in `--duration-base` (250 ms).
> - **Implementation** — one inline SVG. The vine is a single `<path>` animated with
>   `stroke-dasharray` / `stroke-dashoffset`, which is compositor-safe. CSS scroll-driven
>   animation, no scroll listener, no library. The `static` variant sets `stroke-dashoffset`
>   from the stage index and animates nothing. The component reads `LotView.production` and
>   maps it through the stage table in doc 01 §1 — it never receives a pre-computed percentage.
> - **Responsive behavior** — driven by its container, not the viewport. Below ~520 px of
>   container width it rotates to **vertical**: the wires become one vertical line, posts become
>   left-edge markers, labels sit to the right. Stage labels abbreviate only in the vertical
>   variant, and the full label stays in the accessible name.
> - **Accessibility** — the component is an ordered list (`<ol>`) in the DOM with the SVG
>   `aria-hidden`; each stage is an `<li>` whose text states the stage and whether it is
>   complete, current or upcoming. The current stage carries `aria-current="step"`. Under
>   `prefers-reduced-motion` the `animated` variant renders identically to `static` — fully
>   grown to the current stage, no draw. Content is never gated on the animation firing.
> - **Performance** — `stroke-dashoffset` on one path; no layout reads; unobserved once
>   complete. It must **not** be the LCP element, so on PUB-01 it sits below the fold. The SVG
>   is inline (≈ 3 KB) — no sprite fetch, no CLS, because its `viewBox` fixes the aspect ratio.
> - **When NOT to use** — inside a data table cell (use a text label plus a badge); for any
>   sequence that can move backwards; for offer phase or allocation state, which are **not**
>   ordered progressions and must not be drawn as one; more than once per page; and in the
>   `animated` variant anywhere inside `/app`.

## 4. The three patterns v2 explicitly refuses

Recorded so a later reviewer does not "add them back".

1. **Scroll narrative / pinned sequence.** The lifecycle explanation is tempting to pin. Its
   veto applies: *"if the content is a list of features, a grid communicates it faster"*, and
   the page's job is comprehension speed for a grant reviewer on a phone. `Trellis lifecycle`
   is a scroll-linked *reveal*, not a pinned stage, and it never captures scroll velocity.
2. **Custom cursor system.** Vetoed: *"any product UI, any site with forms or dense reading"*.
   Palissage is both.
3. **Ambient floating object / WebGL.** The page already has its one signature moment. Two
   equals zero.

A fourth is refused for a product reason: **no live "someone just reserved 240 bottles" toasts**.
Fabricated social proof on a platform whose entire claim is verifiability.
