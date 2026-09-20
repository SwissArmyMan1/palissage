# 09 — Acceptance, risks and open questions

## 1. How phase 4 reports

Per gate: **pass · fail · not checked**, with the specific failures listed and the evidence
attached. "Not checked" is a legitimate and useful answer. A false pass is not. Gates are never
averaged into a score.

## 2. Gate A — Design integrity

- [ ] Every screen matches this plan, or the divergence is documented with a reason.
- [ ] Every component reads semantic tokens only. No raw hex, no magic px, no one-off shadows.
- [ ] Spacing comes from the scale; any arbitrary value carries a comment explaining itself.
- [ ] Nested radii are concentric (`inner = outer − padding`).
- [ ] Optical alignment checked, not just mathematical: icon/text baselines, button labels with
      ascender-heavy strings, the circular vine mark against square chrome.
- [ ] Text touches no container edge at any breakpoint.
- [ ] The longest **French** string tested in every label, cell, chip and button — not the
      English one.
- [ ] Every state in doc 05 §1 is designed and reachable.
- [ ] Exactly one signature moment on the public site, and none inside `/app`.
- [ ] No pattern is used in a condition listed in its own "when NOT to use" field (doc 03).

## 3. Gate B — Both themes

- [ ] Light and dark both designed and reviewed as first-class; screenshots compared side by
      side before anything is called done.
- [ ] No pure `#000` background, no pure `#fff` text on dark.
- [ ] Dark elevation is expressed by surface lightness; shadows are off at levels 1–2.
- [ ] `text-on-accent` inverts correctly: white on bordeaux in light, near-black on light
      bordeaux in dark.
- [ ] `text-muted` (3.32:1 light) appears **only** at ≥ 24 px or ≥ 18.66 px bold, and never
      carries a value, label, placeholder or hint.
- [ ] `border-field` used on every control boundary; `border-subtle` never used to identify a
      control.
- [ ] All contrast re-measured in both themes for: body, secondary, disabled, placeholders,
      borders, icons, focus rings and every status colour. Values match doc 02 §3 or the table
      is updated.
- [ ] `wine` accent and `signal` danger are distinguishable in context; every status carries
      icon + text.
- [ ] Brand SVGs use `currentColor` and show no halo on either surface.
- [ ] Bottle packshots show no white fringe on the limestone page.
- [ ] `color-scheme` set per theme; native scrollbars and form controls follow.
- [ ] No flash of the wrong theme on first paint (cookie + server render).
- [ ] The theme switch does not animate every colour on the page.

## 4. Gate C — Both form factors

- [ ] Mobile is its own layout, not a narrowed desktop.
- [ ] Primary action in the thumb zone; safe-area insets respected top and bottom.
- [ ] Nothing critical behind hover; every hover affordance has a tap equivalent.
- [ ] Tables become stacked cards on mobile — the declared strategy, applied everywhere.
- [ ] Dialogs become bottom sheets below 640 px; every drag has a non-drag alternative.
- [ ] Admin mobile is read-only, with the stated line replacing each write control.
- [ ] 320 px does not break; 200 % zoom does not break; 400 % zoom reflows without horizontal
      scroll.
- [ ] Tested at breakpoint **boundaries** (479/480, 767/768, 1023/1024).
- [ ] Virtual keyboard open: the focused field stays visible; sticky bars do not cover it.
- [ ] Landscape mobile checked for every full-height element.
- [ ] No horizontal page scroll at any width.

## 5. Gate D — Accessibility (WCAG 2.2 AA)

- [ ] Full keyboard operation in a logical order; no traps except intentional modal traps.
- [ ] Focus indicator ≥ 2 px and ≥ 3:1 everywhere; never clipped, never removed.
- [ ] Focused element never obscured by the sticky top bar or the mobile action bar (2.4.11),
      verified by tabbing the whole page.
- [ ] Focus enters every overlay on open and returns to the trigger — or a sensible successor —
      on close.
- [ ] Targets ≥ 24 × 24 px (2.5.8); ≥ 44 × 44 for primary touch actions.
- [ ] Every drag has a single-pointer alternative (2.5.7).
- [ ] Help is in a consistent place (3.2.6); nothing already entered is re-requested (3.3.7);
      no cognitive-function test in the auth path (3.3.8).
- [ ] Semantic HTML first; ARIA only where HTML cannot express it; roles match behaviour.
- [ ] One `h1` per page, no skipped levels, correct landmarks, working skip link.
- [ ] Accessible name on every control, icon button and field. Placeholder is never a label.
- [ ] Errors in text, associated with the field, announced; focus moves to the first invalid.
- [ ] Live regions used for transaction stages — one message per stage, not per poll.
- [ ] `prefers-reduced-motion` honoured per doc 05 §3 — the lifecycle vine renders fully drawn,
      never blank.
- [ ] `prefers-contrast` / `forced-colors` do not erase any border or state.
- [ ] Screen-reader pass (VoiceOver or NVDA) on the primary flow of **each** of the four roles.
- [ ] axe clean, understood as catching roughly a third of real issues.

## 6. Gate E — Performance

- [ ] LCP < 2.5 s on every route; < 1.8 s on PAS-01. LCP element named, preloaded,
      server-rendered, not lazy, not animated, not behind a font swap.
- [ ] INP < 200 ms. Local filtering is not debounced and runs in a transition; long tables
      virtualised; hover is CSS.
- [ ] CLS < 0.1. Dimensions on all media; matched fallback font metrics; skeletons match final
      geometry at each breakpoint; sidebar and stat-tile widths reserved; banners in reserved
      slots.
- [ ] Animation on `transform` / `opacity` / `stroke-dashoffset` only. No `scroll` handler
      anywhere in the codebase.
- [ ] `will-change` surgical and removed after use.
- [ ] Route JS within the doc 06 §4 budget; wallet connector lazy and absent from the public
      bundle.
- [ ] Fonts subset, `swap`, one preload, ≤ 120 KB total.
- [ ] Images AVIF/WebP with correct `sizes` and `srcset`; `fetchpriority` on the LCP image only.
- [ ] No third-party request on the public site.
- [ ] Verified on a mid-range mobile profile (4× CPU throttle), not a laptop.

## 7. Gate F — Robustness and honesty

- [ ] EN and FR complete; French strings tested as the layout case; plural rules correct.
- [ ] Dates absolute with an explicit timezone on every deadline.
- [ ] Mode markers permanent and correct; demo events never carry a transaction hash.
- [ ] No forbidden word from doc 07 §1–2 appears in any shipped string, EN or FR.
- [ ] Every `Roadmap` screen is labelled, disabled and hidden in testnet.
- [ ] Every disabled control names what is missing and the safe next step.
- [ ] No dead CTA; no `Coming soon` inside a required path.
- [ ] Capability reads come from `ParticipantView`; no UI role grants a permission.
- [ ] `balance` / `frozen` / `transferable` never merged.
- [ ] The passport's "does not prove this bottle" sentence is present in both languages, as
      body text.
- [ ] Every published image is `rights_status: granted` in the manifest; the build check is
      wired and failing correctly on a `pending` asset.
- [ ] No layout depends on scrollbar presence.
- [ ] Chain state and demo state never mix visually; a testnet read failure never falls back to
      demo data.

## 8. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Accent and danger are both red.** | A user misreads a destructive action. | Doc 02 §2 rules — mandatory icon + text, `signal` never a large fill outside a confirm dialog, `wine` never carries state. Verify in Gate B in context, not in a swatch. |
| R2 | **Brand vectorisation is on the critical path.** No shippable logo exists today. | Blocks the Figma build's component library and every header. | BR-01…BR-07 in doc 08 §2 are the first asset task, before Figma components. |
| R3 | **Photo rights are unresolved**, including a third-party photographer credit in EXIF. | A public launch with uncleared imagery. | Manifest + build check (doc 08 §3). `pending` is the default; nothing publishes without `granted`. |
| R4 | **The pilot's first impression is an empty deployment.** | A reviewer sees zero lots and concludes it does not work. | First-run empty states are primary screens in this package. WIN-01's is an onboarding checklist; PUB-02's routes to `/for-wineries`; ADM-01's reads as success. |
| R5 | **Collector roadmap screens could be mistaken for shipped features.** | The project's honesty claim collapses at the exact place it is easiest to check. | Persistent bordered strip, disabled controls with reasons, hidden in testnet, forbidden inside any required path (doc 04 §4). |
| R6 | **The `/app` bundle grows with four role cabinets.** | INP and JS budget failure. | Route-level code splitting per role; wallet connector lazy; measured in Gate E, not assumed. |
| R7 | **Figma variables and CSS tokens drift apart.** | Phase 3 eyeballs values that exist as variables. | One naming convention, DTCG export, Style Dictionary. Phase 3 pulls `get_variable_defs` and never types a hex. |
| R8 | **`UI/web` is a separate git repository.** | Design changes land in a repo the parent does not track; specs and code diverge again. | This package lives in the parent under `specifications/ui-v2/`. The UI repo gets a `DESIGN.md` pointing here with the commit SHA of the approved version. |
| R9 | **French is treated as a translation pass at the end.** | Layouts break at review time. | FR is the layout test case in Figma from the first frame, not at the end. |
| R10 | **The lifecycle component is used where the sequence can move backwards.** | A misleading progress display. | Its "when NOT to use" field is explicit; checked in Gate A. |
| R11 | **Figma-only rendering quirks silently change a design.** Spread-only drop shadows do not render; reassigning a bound fill on an existing node keeps a stale cached base colour and paints black. | A component looks correct in the plan and wrong in the file, or vice versa. | Seed every paint with the variable's resolved value before binding; verify every component with a screenshot and pixel sample, never by assuming the API succeeded. Both quirks are recorded in doc 02 §3. |

## 9. Open questions

Answer these before or during phase 2. None blocks starting phase 2.

| # | Question | Why it matters | Working assumption if unanswered |
|---|---|---|---|
| Q1 | Is `palissage.net` moving to a single origin, or must the role subdomains stay? | Doc 01 §2 assumes single origin; keeping subdomains changes the app shell and the wallet session model. | Single origin, subdomains redirect |
| Q2 | Which producers have given written permission for name and imagery? | Gates every producer page and the whole catalogue's imagery. | All `pending`; nothing publishes |
| Q3 | Who is the legal entity behind the site, for `/legal/*` and the pilot form? | Privacy and terms pages cannot be written without it. | Placeholder plus a visible prototype notice |
| Q4 | Is a Base Sepolia manifest published and verified yet? | PUB-09 and APP-02 render from it. | Screens render an honest "no verified deployment" state |
| Q5 | Production fee and royalty values for the pilot. | Shown in every fee breakdown. | Read live from `ProtocolView`; never hard-coded |
| Q6 | Will the pilot form actually send, or stay a downloadable draft? | Changes PUB-10's success state and its copy. | Downloadable draft, stated above the button |
| Q7 | Does a producer-facing French-first variant matter for the pilot? | Producers are French; the interface defaults to English. | EN default, FR complete, locale remembered |
| Q8 | Is there budget for a commissioned photo shoot? | The estate images are documentary phone photography; the hero carries the whole first impression. | Work with `deumie-panorama.jpg` graded, plus the cleared Cazaban horse image |

## 10. What phase 2 does next

1. Connect Figma MCP: `claude mcp add --transport http figma https://mcp.figma.com/mcp --scope user`, then `/mcp` to authenticate.
2. Build in this order: **tokens → both theme modes → primitives → components → screens →
   both form factors.** Variables first; a component built before its tokens gets hard-coded values.
3. Token names come from doc 02 verbatim. Figma variable path `color/text/primary` ⇄ CSS
   `--color-text-primary`. One mechanical transform.
4. Screens in this order, because each unblocks the next: PUB-01 → PUB-03 → SHO-04 (the money
   flow, and the hardest) → WIN-04 → ADM-05 → PAS-01 → the empty and error states → mobile.
5. Every frame exists in light and dark, desktop and mobile, before the next screen starts.
   Doing themes "after" is how a dark theme becomes an inversion.
6. The French string is the layout test in every frame.

Phase 2 does not begin until this package is approved.
