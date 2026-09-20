# 06 — Responsive, accessibility, performance

## 1. Breakpoints and what changes structurally

Breakpoints exist for **structural** change only. Anything that merely resizes uses container
queries or intrinsic sizing instead.

| Family | Range | What changes |
|---|---|---|
| `xs` | 320–479 | Single column everywhere. Bottom tab bar. Tables become stacked cards. Dialogs become bottom sheets. Filters become a sheet. Action bar docks to the bottom above the safe area. |
| `sm` | 480–767 | Two-up card grids. Stat tiles 2-up. Otherwise as `xs`. |
| `md` | 768–1023 | Sidebar appears as a **drawer** (off-canvas, toggled). Tab bar disappears. Tables gain horizontal scroll with a sticky identity column as an intermediate. Split view still stacks. |
| `lg` | 1024–1439 | Persistent sidebar at 240 px. Split view becomes two panes. Detail screens gain the right-hand summary column. |
| `xl` | ≥ 1440 | Content capped at 1200 px (marketing) / fluid to 1440 px (app). Wider gutters only. No new structure. |

Tested at the **boundaries** — 479/480, 767/768, 1023/1024 — not in the middle of each range.

### Components that use container queries, not breakpoints

`LotCard`, `AllocationRow`, `StatTile`, `PositionSummary`, `EvidenceItem`, `TrellisLifecycle`,
`FeeBreakdown`, `ProducerCard`. Each sits in a `container-type: inline-size` wrapper. This is
what lets one `LotCard` serve a 4-up marketing grid, a 2-up sidebar slot and a full-width
mobile list without three variants — and it is what the v1 implementation lacked, which is why
its cards only looked right at one width.

## 2. Mobile decisions, stated rather than discovered

| Decision | Value |
|---|---|
| Primary action position | Bottom of the viewport, in a sticky action bar, above `env(safe-area-inset-bottom)`. Content gets matching bottom padding so nothing is covered. |
| Table strategy | **Row → stacked card** with label/value pairs. Chosen over horizontal scroll (loses the money column) and reduced columns (hides the deadline). One strategy, everywhere. |
| Dialog strategy | Below 640 px every modal dialog becomes a `Bottom sheet`. |
| Filters | Bottom sheet with an Apply button and a badge on the trigger showing the active count. |
| Destructive actions | Never at the thumb's resting position, never at a screen edge where a swipe lands. |
| Keyboard open | The focused field scrolls into view accounting for the keyboard inset; the sticky action bar does not cover it. Inputs are ≥ 16 px so iOS Safari does not zoom. |
| Landscape | Every full-height element (sheet, passport hero, dialog) is checked in landscape. |
| **Admin on mobile** | **Read-only by design.** Queues, participants, lots and cases are readable; every write control is replaced by one line: *Decisions are made on a larger screen.* This is a deliberate omission — evidence review on a 375 px screen produces bad decisions about other people's money. |
| Hover | Nothing critical is behind hover. Every hover affordance has a tap equivalent. Hover-only styling is wrapped in `@media (hover: hover)`. |
| Zoom | 320 px width does not break; 200 % zoom does not break; 400 % zoom reflows with no horizontal scroll (WCAG 1.4.10). |
| Horizontal scroll | Never at page level. Wide content scrolls inside its own `overflow-x: auto` container with a visible affordance. |

## 3. Accessibility plan — WCAG 2.2 AA

### Landmarks and headings

Every page: one `<h1>`, no skipped levels, headings used for structure and never for size.
`<header>` / `<nav>` / `<main>` / `<aside>` / `<footer>`. A skip link to `<main>` is the first
focusable element on every page. The app shell's `<nav aria-label="Main">` and the public
site's `<nav aria-label="Main">` are distinct landmarks from the breadcrumb
`<nav aria-label="Breadcrumb">`.

### Focus

- Visible everywhere: ≥ 2 px, `--color-focus-ring`, measured at **7.59:1** light and **6.95:1**
  dark against the page — well past the 3:1 requirement.
- Never removed without a stronger replacement. Never clipped by `overflow: hidden`.
- **Never obscured** by the sticky top bar or the mobile action bar (SC 2.4.11) — enforced with
  `scroll-margin-block` equal to bar height plus 8 px, and verified by tabbing the whole page
  with the bars sticky.
- Overlays: focus moves in on open, returns to the trigger on close, or to a sensible successor
  if the trigger is gone (a resolved queue row → the next row).
- Modal = trapped focus, background `inert`, scroll locked with `scrollbar-gutter: stable` so
  the lock causes no shift. Non-modal = no trap.
- Escape closes anything dismissible, innermost first.
- A destructive action is **never** auto-focused.

### Keyboard maps

| Widget | Keys |
|---|---|
| Tabs | ← → move, Home/End jump, Enter/Space activate (manual activation; some panels read the chain) |
| Data table | Tab to the row link; sortable headers are buttons with `aria-sort` |
| Queue split view | ↑ ↓ move selection with roving tabindex; Enter opens; the list keeps its scroll position |
| Combobox | ↑ ↓ move `aria-activedescendant` while DOM focus **stays in the input**; Enter selects; Escape closes |
| Dropdown menu | ↑ ↓ Home End, typeahead, Escape closes and returns focus |
| Bottom sheet | Tapping the handle or the chevron cycles detents — the drag gesture is never the only path (SC 2.5.7) |
| Quantity field | ↑ ↓ step by 1, Page↑/↓ by 10, typed entry always allowed |
| Wizard | Enter advances from the last field only when the input is unambiguous; otherwise explicit Next |

### Announcements

| Event | Politeness |
|---|---|
| Filter results changed | polite, with the count |
| Transaction submitted / confirming / confirmed | polite, one message per stage — not per poll |
| Transaction reverted | `role="alert"` |
| Form submit failure | `role="alert"` on the summary; focus moves to the first invalid field |
| Async loading complete | polite, once per region |
| Toast confirmation | `role="status"` |
| Toast error | `role="alert"` |
| Offline / reconnected | polite, on state change only, never per retry |

### Forms

Every field has a `<label for>`. **Placeholders are never labels.** Required is marked in text,
not by an asterisk alone. Errors are identified in text, associated with their field via
`aria-describedby`, carry `aria-invalid`, and say what happened *and* what to do:
*Enter a quantity between 1 and 640* — never *Invalid quantity*.

Validation timing: not while first typing; on blur once the field is left; on every input once
the field has errored; and always everything on submit.

`autocomplete` tokens on every applicable field — `organization`, `email`, `country`,
`postal-code`, `street-address`. Correct `inputmode` and `type` so mobile keyboards match.

WCAG 2.2 additions specifically checked: **3.2.6** help is in the same place on every page (the
`?` in the top bar); **3.3.7** nothing already entered is asked for again — the reserve flow
carries quantity forward from the catalogue, the wizard carries fields between steps;
**3.3.8** no cognitive-function test in the auth path — wallet connection has no puzzle.

### Target sizes

≥ 24 × 24 CSS px for every interactive element (SC 2.5.8); ≥ 44 × 44 for primary touch targets.
Small icons keep their optical size and gain hit area through padding or a pseudo-element.

### Content and colour

Never colour alone: every status carries icon + text. This matters most here because the
accent and the danger colour are both reds (doc 02 §2). Charts, if any, follow the `dataviz`
skill and carry a non-colour encoding.

### Modes

`prefers-reduced-motion` per doc 05 §3. `prefers-reduced-transparency` drops `backdrop-filter`.
`forced-colors` keeps borders and text as the state carriers — nothing depends on a shadow or
a fill. Verified at 200 % and 400 % zoom.

### Verification

An axe scan is necessary and insufficient — it catches roughly a third of real issues, and
pages with ARIA average *more* detectable errors than pages without, because roles get applied
that do not match behaviour. A screen-reader pass (VoiceOver or NVDA) on the primary flow of
each role is therefore part of the gate, not optional.

## 4. Performance budget

Targets at p75 on a mid-range mobile device profile (4× CPU throttle, Slow 4G), not on a laptop.

| Route | LCP element | Target | JS budget (route, gzipped) |
|---|---|---|---|
| PUB-01 | Hero photograph | < 2.0 s | ≤ 90 KB |
| PUB-02 | First lot card image | < 2.2 s | ≤ 110 KB |
| PUB-03 | Lot image | < 2.2 s | ≤ 110 KB |
| PAS-01 | Bottle image | **< 1.8 s** | ≤ 60 KB |
| `/app/*` | Page `h1` or first stat tile | < 2.5 s | ≤ 180 KB + wallet chunk |

PAS-01 has the tightest budget because it is reached from a phone camera, often on a shop's
poor connection, by someone with no reason to wait.

### LCP

The hero photograph is server-rendered, `fetchpriority="high"`, preloaded, **not** lazy-loaded,
**not** behind a client fetch, **not** gated behind a font swap, and **not** animated. The hero
headline carries no entrance animation for the same reason.

### CLS

- `width`/`height` or `aspect-ratio` on every image, video and iframe.
- Fallback font metrics matched with `size-adjust` / `ascent-override` so the swap shifts
  nothing.
- Skeleton geometry matches final geometry **at each breakpoint**, not only at desktop.
- The sidebar width is reserved before nav data resolves.
- Stat tile values reserve their maximum expected width so tiles do not resize when data lands.
- The theme is read from a cookie and rendered server-side — no post-hydration resize.
- Banners (offline, testnet, roadmap) are laid out in reserved slots, never injected above
  existing content after paint.

### INP

| Risk | Strategy |
|---|---|
| Catalogue filtering | Local filtering is **never** debounced; it runs inside a React transition so typing never blocks |
| Server/chain-backed search | Debounced 200–300 ms, superseded requests aborted |
| Long tables | Virtualised past a few hundred rows; hover is CSS, never state |
| Chain polling | Reads batched through one `PalissageLens` call per screen; a re-read never re-renders every row |
| Controlled forms | Field state stays local; a large form does not re-render per keystroke |
| Wallet connection | RainbowKit and the connector chunk are **lazy** — not in the public bundle at all |

### Animation cost

Only `transform` and `opacity`, plus `stroke-dashoffset` on the lifecycle path, plus CSS
scroll-driven animation. No animated `width`, `height`, `top`, `left`, `box-shadow` or `filter`
in a hot path. `will-change` is applied surgically and removed after. Scroll-driven animations
run on the compositor; there is no `scroll` event handler anywhere in the codebase.

`backdrop-filter` on the sticky header is measured on a mid-range Android before it ships; if
it costs a repaint per scroll frame, it becomes a solid translucent surface.

### Fonts

Two variable families plus one mono. Subset to Latin + Latin-Extended-A. `font-display: swap`.
Only the above-the-fold face is preloaded. Total font payload target ≤ 120 KB.

### Images

AVIF with WebP fallback and a JPEG floor. Correct `sizes` and responsive `srcset` per slot.
`loading="lazy"` below the fold; `fetchpriority="high"` on the LCP image only. All assets are
served from the application origin — no CDN hotlinking at runtime, so the site works in a local
offline demo and sends no visitor requests to a third party.

### Third parties

**None on the public site.** No analytics, no fonts from a third-party CDN, no chat widget, no
embedded video player in the critical path. Every byte on PUB-01 is first-party.
