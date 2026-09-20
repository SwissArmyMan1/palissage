# 02 — Design system: layout, tokens, type, motion primitives

Every value here is a decision, not a placeholder. Figma variable paths and CSS custom
property names are identical up to the separator — `color/text/primary` in Figma is
`--color-text-primary` in CSS. That mapping is mechanical, which is what makes Figma MCP
output usable in phase 3.

## 1. Token architecture

Three tiers. **Components read tier 3 only.**

1. **Primitive** — `--stone-500`, `--wine-700`, `--space-4`. No meaning, no theme awareness.
   Never referenced by a component.
2. **Semantic** — `--color-surface`, `--color-text-muted`, `--color-accent`. Theme-aware. This
   is the only tier a component consumes.
3. **Component** — `--table-row-hover`, `--button-primary-bg`. Aliases semantic tokens. Used
   only where a component has a genuinely unique need.

Naming: `category-role-variant-state`, lowercase, hyphenated. Format: DTCG JSON exported from
Figma variables, consumed by Style Dictionary, emitted as CSS custom properties.

## 2. Colour — primitives

Authored in OKLCH so the ramps step evenly to the eye. Hex values are the sRGB result and are
what ships; OKLCH is what the ramp is edited in.

### `stone` — neutral, H 75 (warm limestone, the Cabardès soil)

Slight warm chroma so it does not read dirty against the wine accent.

| Stop | OKLCH | Hex |
|---|---|---|
| 0 | `oklch(1 0 75)` | `#FFFFFF` |
| 50 | `oklch(0.972 0.006 75)` | `#F8F5F1` |
| 100 | `oklch(0.948 0.008 75)` | `#F1EDE8` |
| 200 | `oklch(0.906 0.010 75)` | `#E4DFD9` |
| 300 | `oklch(0.856 0.012 75)` | `#D4CFC7` |
| 400 | `oklch(0.740 0.014 75)` | `#B0AAA1` |
| 500 | `oklch(0.622 0.015 75)` | `#8C867D` |
| 600 | `oklch(0.514 0.014 75)` | `#6C665F` |
| 700 | `oklch(0.424 0.013 75)` | `#524D46` |
| 800 | `oklch(0.330 0.012 75)` | `#39352F` |
| 850 | `oklch(0.272 0.010 75)` | `#2A2622` |
| 900 | `oklch(0.224 0.009 75)` | `#1E1B17` |
| 950 | `oklch(0.176 0.008 75)` | `#13100D` |

### `wine` — accent, H 14 (bordeaux)

| Stop | OKLCH | Hex | | Stop | OKLCH | Hex |
|---|---|---|---|---|---|---|
| 50 | `oklch(0.973 0.012 14)` | `#FEF3F4` | | 500 | `oklch(0.608 0.168 14)` | `#D34E63` |
| 100 | `oklch(0.940 0.030 14)` | `#FFE4E5` | | 600 | `oklch(0.520 0.158 14)` | `#B1364D` |
| 200 | `oklch(0.888 0.058 14)` | `#FECBCE` | | 700 | `oklch(0.442 0.134 14)` | `#8E2A3C` |
| 300 | `oklch(0.812 0.098 14)` | `#FAA7AE` | | 800 | `oklch(0.372 0.108 14)` | `#6E212E` |
| 400 | `oklch(0.712 0.140 14)` | `#EC7A87` | | 900 | `oklch(0.312 0.086 14)` | `#541A23` |
| | | | | 975 | `oklch(0.245 0.048 14)` | `#341619` |

### Status ramps

Only the four stops each theme uses are listed; the full 11-stop ramps exist in Figma.

| Ramp | H | 200 (light tint) | 400 (dark fg) | 700 (light fg) | 975 (dark tint) |
|---|---|---|---|---|---|
| `vine` (success) | 150 | `#C5E9CB` | `#63B376` | `#2B6A3C` | `#0A2110` |
| `amber` (warning) | 85 | `#F7E6C3` | `#D7AA42` | `#836412` | `#271B01` |
| `signal` (danger) | 28 | `#FCD5CF` | `#F66E60` | `#A51F1B` | `#31100C` |
| `azur` (info) | 255 | `#D2E3F9` | `#64A1EE` | `#155AA7` | `#0A1C32` |

**Persistent vs transient accent surfaces — a rule added during the Figma build (v2.1).**
`accent-subtle` is `wine-200`, which is correct for a *transient* fill (ghost-button hover) and
for badge backgrounds, and far too saturated for a *persistent* one. Used as a selected table
row or an active nav item it reads as an error state. The rule:

| State | Token |
|---|---|
| Transient hover, badge fill | `--color-accent-subtle` |
| Persistent selected row, active nav item | `--color-surface-selected` |

Persistent selection additionally carries a shape signal — a 3 px left indicator — so it is
never conveyed by tint alone.

**Known risk — accent and danger are both red.** `wine` is H 14 at low chroma (a desaturated
bordeaux); `signal` is H 28 at high chroma (a vivid signal red). They are distinguishable, but
not by hue alone at small sizes. Mitigations, all mandatory:

- `signal` is **never** used as a large fill except on a destructive confirmation button.
- `wine` is **never** used to carry state. State is `vine` / `amber` / `signal` / `azur` only.
- Every status carries icon + text. Colour is never the only signal (WCAG 1.4.1).
- The destructive button is outlined in light theme and filled only inside a confirmation
  dialog, where the copy already names the object.

### `base-blue` — chain identity, not a UI accent

| Token | Light | Dark |
|---|---|---|
| `--color-chain-base` | `#0000FF` (Base brand blue) | `#6097FF` (lightened for dark; defined in sRGB — the equivalent OKLCH is outside sRGB gamut) |

Used **only** in the network chip, the `/network` page's chain lockup and the explorer link
icon. Never for a button, a link, a focus ring or a status. Base is a fact about the deployment,
not a brand accent competing with the wine.

## 3. Colour — semantic tokens, both themes, measured

Light is designed on `stone-50`; cards sit on `stone-0`. Dark is designed on `stone-950`;
surfaces step **lighter**, and shadow does almost nothing.

### Surfaces and lines

| Semantic token | Light | Dark | Note |
|---|---|---|---|
| `--color-page` | `stone-50` `#F8F5F1` | `stone-950` `#13100D` | Never pure white / pure black |
| `--color-surface` | `stone-0` `#FFFFFF` | `stone-900` `#1E1B17` | Cards, table body |
| `--color-surface-raised` | `stone-0` + shadow-1 | `stone-850` `#2A2622` | Dark raises by lightness, not shadow |
| `--color-surface-overlay` | `stone-0` + shadow-3 | `stone-800` `#39352F` | Dialog, sheet, popover |
| `--color-surface-sunken` | `stone-100` `#F1EDE8` | `stone-950` `#13100D` | Table header, code block, inset |
| `--color-surface-selected` | `wine-50` `#FEF3F4` | `wine-975` `#341619` | Selected table row — added v2.1; `accent-subtle` proved far too strong and read as an error row |
| `--color-border-subtle` | `stone-200` `#E4DFD9` | `stone-800` `#39352F` | Decorative separators only |
| `--color-border-strong` | `stone-300` `#D4CFC7` | `stone-700` `#524D46` | Section and card edges |
| `--color-border-field` | `stone-500` `#8C867D` | `stone-600` `#6C665F` | **Input/control boundaries — must pass 3:1** |
| `--color-focus-ring` | `stone-900` `#1E1B17` | `stone-100` `#F1EDE8` | Ring colour; see the focus construction below |

`--color-border-subtle` measures 1.32:1 (light) and 1.41:1 (dark). That is intentional and
correct for a decorative hairline, and **wrong** for anything that identifies a control. Any
element a user must perceive as interactive uses `--color-border-field`.

### Foreground, accent, status — with measured contrast

WCAG 2 ratio is the gate. APCA `Lc` is the perceptual check used to choose between two passing
options. Measured, not estimated.

| token | light fg/bg | WCAG | APCA | dark fg/bg | WCAG | APCA |
|---|---|---|---|---|---|---|
| `text-primary` | `#1E1B17` on `#F8F5F1` | **15.78** | +98 | `#F1EDE8` on `#13100D` | **16.27** | -96 |
| `text-secondary` | `#6C665F` on `#F8F5F1` | **5.22** | +73 | `#B0AAA1` on `#13100D` | **8.23** | -56 |
| `text-muted` | `#8C867D` on `#F8F5F1` | **3.32** | +58 | `#8C867D` on `#13100D` | **5.26** | -38 |
| `text-on-accent` | `#FFFFFF` on `#8E2A3C` | **8.25** | -92 | `#13100D` on `#EC7A87` | **6.95** | +51 |
| `accent` (as text) | `#8E2A3C` on `#F8F5F1` | **7.59** | +82 | `#EC7A87` on `#13100D` | **6.95** | -49 |
| `border-field` | `#8C867D` on `#FFFFFF` | **3.61** | +64 | `#6C665F` on `#1E1B17` | **3.02** | -22 |
| `focus-ring` | `#1E1B17` on `#F8F5F1` | **15.78** | +98 | `#F1EDE8` on `#13100D` | **16.27** | -96 |
| `success` | `#2B6A3C` on `#F8F5F1` | **5.98** | +76 | `#63B376` on `#13100D` | **7.44** | -52 |
| `warning` | `#836412` on `#F8F5F1` | **5.09** | +72 | `#D7AA42` on `#13100D` | **8.77** | -59 |
| `danger` | `#A51F1B` on `#F8F5F1` | **6.87** | +79 | `#F66E60` on `#13100D` | **6.61** | -47 |
| `info` | `#155AA7` on `#F8F5F1` | **6.33** | +78 | `#64A1EE` on `#13100D` | **7.11** | -50 |
| `chain-base` | `#0000FF` on `#FFFFFF` | **8.59** | +86 | `#6097FF` on `#1E1B17` | **6.02** | -46 |

Three results that constrain the design:

- **`text-muted` fails 4.5:1 in light theme** (3.32). It is therefore restricted to text ≥ 24 px,
  or ≥ 18.66 px bold, and to genuinely non-essential decoration. It may **never** carry a value,
  a label, a placeholder or a hint. Where v1 used a third grey for hints, use `text-secondary`.
- **`text-on-accent` inverts between themes.** Light: white on dark bordeaux. Dark: near-black
  on light bordeaux. A dark-theme primary button is a *light* button. Designing dark by
  inverting light gets this wrong.
- **Dark `border-field` is 3.02** — passing with almost no margin. Do not darken it further, and
  do not express a disabled field by lowering its border contrast; use the dedicated
  `--color-text-disabled` and a surface change.

**Focus ring — changed during the Figma build (v2.1).** `focus-ring` was originally the wine
accent. Building the Button proved that unusable: a wine ring around a wine-filled primary
button reads as one solid mass. Measured, `stone-900` directly against `accent` is only
**2.08:1** — but that is not the pair WCAG 1.4.11 measures. With a 4 px offset gap the ring's
*adjacent* colour is the page on both sides, so the pair that matters is ring-against-page:
**15.78:1** light, **16.27:1** dark.

The focus construction is therefore fixed for the whole system:

```
outline: 2px solid var(--color-focus-ring);
outline-offset: 4px;
```

One treatment on every kind of button, input and interactive element. It also removes the
accent/danger confusion from the focus state entirely, since the ring is now achromatic.

**Figma note:** the ring cannot be built with a spread-only drop shadow — Figma does not render
a `DROP_SHADOW` whose offset, radius and blur are all zero, regardless of spread. In the Figma
library it is an absolutely-positioned ring node inset −6 px with a 2 px stroke and a
concentric 14 px radius. In CSS it is `outline` + `outline-offset`, which needs no extra node.

### Disabled

Never `opacity: 0.4`. Dedicated, measured tokens:

| Token | Light | Dark |
|---|---|---|
| `--color-text-disabled` | `stone-500` `#8C867D` | `stone-600` `#6C665F` |
| `--color-surface-disabled` | `stone-100` `#F1EDE8` | `stone-850` `#2A2622` |
| `--color-border-disabled` | `stone-300` `#D4CFC7` | `stone-700` `#524D46` |

### Theme mechanism

`:root` defines the light palette. `@media (prefers-color-scheme: dark)` guarded as
`:root:not([data-theme="light"])` redefines only what changes. `:root[data-theme="dark"]`
redefines it again so an explicit choice wins in both directions. `color-scheme` is set per
theme so native scrollbars, form controls and spellcheck underlines follow.

The choice is persisted in a **cookie**, not `localStorage`, so the server renders the right
theme and there is no flash and no post-hydration resize. Theme transition is suppressed
during the switch itself (a `.theme-switching` class removing transitions for one frame) —
animating every colour on the page is what makes a theme toggle feel cheap.

## 4. Typography

Two families plus a mono. Both are variable fonts already in the bundle — no new font cost.

| Role | Family | Axes pinned | Why |
|---|---|---|---|
| Display and headings | **Fraunces Variable** | `opsz` fluid with size, **`SOFT 0`, `WONK 0`**, `wght 400–600` | Pinning `SOFT` and `WONK` to zero removes the quirky, decorative character that reads as dated. What remains is a high-contrast editorial serif with a real optical-size axis. |
| UI, body, all data | **Inter Variable** | `opsz` fluid, `wght 400/500/600` | Excellent at 13–16 px in dense tables; has the tabular figures the money columns need. |
| Hashes, addresses, ids | **JetBrains Mono** | `wght 400` | Only for `0x…` strings, tx hashes and `docsHash`. Never for prose. |

**Numbers.** Fraunces is used for *display* metrics on marketing pages only. Every operational
number — price, quantity, balance, bps, date — is Inter with `font-variant-numeric: tabular-nums`.
The live site sets `.t-num` in the serif; that is why financial columns wobble. Fixed here.

### Scale

Fluid via `clamp()`. Ratio 1.25 for content, 1.2 inside the app. Eight steps is the whole scale.

| Token | `clamp(min, preferred, max)` | Line height | Tracking | Used for |
|---|---|---|---|---|
| `--text-display` | `clamp(2.25rem, 1.4rem + 4.2vw, 4.5rem)` | 1.04 | −0.03em | One `h1` per marketing page |
| `--text-h1` | `clamp(1.75rem, 1.3rem + 2.2vw, 2.75rem)` | 1.12 | −0.02em | Page title |
| `--text-h2` | `clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem)` | 1.2 | −0.015em | Section |
| `--text-h3` | `clamp(1.125rem, 1.05rem + 0.36vw, 1.3125rem)` | 1.3 | −0.01em | Card / group title (Inter 600) |
| `--text-body` | `1rem` | 1.55 | 0 | Body. Fixed, not fluid — 16 px min on mobile so iOS does not zoom on input focus |
| `--text-body-sm` | `0.875rem` | 1.5 | 0 | Secondary text, table cells |
| `--text-caption` | `0.75rem` | 1.4 | +0.04em | Uppercase labels, metadata |
| `--text-mono` | `0.8125rem` | 1.45 | 0 | Hashes and addresses |

**`caption` is uppercase and is for labels only** — a rule the Figma build forced. It carries
`text-transform: uppercase` and `+0.04em` tracking, which is right for `AVAILABLE`, `PRICE PER
BOTTLE` or a status label, and wrong for any sentence. Small sentences use `body-sm` with
`--color-text-secondary`. Setting a disclaimer in uppercase caption made it measurably harder
to read in review.

Reading measure `65ch` via `max-inline-size`, never a pixel width. `text-wrap: balance` on
headings, `text-wrap: pretty` on body.

Font loading: subset to Latin + Latin-Extended-A (French needs `à â ç è é ê ë î ï ô ù û ü ÿ œ`),
`font-display: swap`, preload only the one face above the fold, `size-adjust` fallback metrics
matched so the swap causes no CLS.

## 5. Space, radius, elevation

**Space scale** — one scale, everything comes from it:
`2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

Rule: space *within* a group is always smaller than space *between* groups. Component internals
use fixed steps; section rhythm on marketing pages uses `clamp()` between steps 48 and 128.

**Radius scale** — `2 · 4 · 8 · 12 · 16 · full`. Nested radii are concentric:
`inner = outer − padding`. A 16 px card with 12 px padding holds a 4 px inner element.

**Elevation** — four levels, and dark expresses them by surface lightness:

| Level | Meaning | Light | Dark |
|---|---|---|---|
| 0 | Page | `--color-page` | `--color-page` |
| 1 | Raised (card, table header) | `--color-surface` + `shadow-1` | `stone-900`, no shadow |
| 2 | Floating (dropdown, popover) | `--color-surface` + `shadow-2` + hairline | `stone-850` + hairline |
| 3 | Overlay (dialog, sheet) | `--color-surface` + `shadow-3` + scrim | `stone-800` + scrim |

Shadows are two-layer and tinted with the stone hue, never pure black:

```css
--shadow-1: 0 1px 2px oklch(0.224 0.009 75 / 0.06),
            0 1px 3px oklch(0.224 0.009 75 / 0.04);
--shadow-2: 0 2px 4px oklch(0.224 0.009 75 / 0.06),
            0 8px 20px oklch(0.224 0.009 75 / 0.09);
--shadow-3: 0 4px 8px oklch(0.224 0.009 75 / 0.07),
            0 24px 56px oklch(0.224 0.009 75 / 0.16);
```

In dark theme `--shadow-*` resolve to `none` at levels 1–2 and to a soft scrim-only treatment
at level 3. In `forced-colors` mode all layers keep a border so the layer still reads.

## 6. Layout system

### Grid

| Form factor | Columns | Gutter | Margin | Max content |
|---|---|---|---|---|
| ≥ 1440 px | 12 | 32 | fluid | 1200 px (marketing), 1440 px (app, fluid) |
| 1024–1439 | 12 | 24 | 40 | 1120 px |
| 768–1023 | 8 | 24 | 32 | fluid |
| 480–767 | 4 | 16 | 20 | fluid |
| 320–479 | 4 | 16 | 16 | fluid |

Marketing pages use a three-track named grid so breakout blocks need no negative margins:

```css
.page { display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter),1fr)
    [breakout-start] minmax(0, 12rem)
    [content-start] min(100% - var(--gutter)*2, 65ch) [content-end]
    minmax(0, 12rem) [breakout-end]
    minmax(var(--gutter),1fr) [full-end]; }
```

### App shell

CSS Grid with named areas. The shell is a layout route and does **not** remount on navigation.
Sidebar width is reserved before nav data loads, so nothing shifts.

```
grid-template-areas: "topbar topbar" "sidenav content";
grid-template-columns: var(--sidenav-w) 1fr;   /* 240px, 64px collapsed */
grid-template-rows: 56px 1fr;
```

The content region owns its own scroll container with `overscroll-behavior: contain`. The top
bar is 56 px and uses a hairline, not a shadow — never both.

### Container queries, not viewport queries

Any component that appears at more than one width is driven by its container:
`LotCard`, `AllocationRow`, `StatTile`, `EvidenceItem`, `PositionSummary`, `TrellisLifecycle`.
Each sits in a `container-type: inline-size` wrapper. This is what lets one `LotCard` work in a
4-up marketing grid, a 2-up sidebar and a full-width mobile list without three variants.

Viewport media queries are reserved for **structural** changes only: sidebar → tab bar,
dialog → sheet, table → stacked card.

### Density

Two densities in the app, chosen per surface, not per user preference (no toggle in v2):

- **Compact** — 36 px rows. Admin queues, allocation lists, listing tables.
- **Comfortable** — 48 px rows. Winery lots, buyer portfolio, deliveries.

## 7. Motion primitives

```css
--duration-instant: 100ms;   /* state colour, icon swap, press feedback */
--duration-fast:    150ms;   /* hover, focus, tooltip, popover, chip */
--duration-base:    250ms;   /* dropdown, tab indicator, accordion, toast, dialog */
--duration-slow:    350ms;   /* sheet, drawer, page section */
--duration-slower:  500ms;   /* reserved; requires a written reason */

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);    /* entering, expanding, responding */
--ease-in:     cubic-bezier(0.7, 0, 0.84, 0);    /* exiting, collapsing, dismissing */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* moving between two known states */
--ease-linear: linear;                            /* loops and scroll-linked progress only */

--motion-scale: 1;   /* multiplied into every travel distance */
```

```css
@media (prefers-reduced-motion: reduce) { :root { --motion-scale: 0; } }
```

Every translate in the system is written as `translateY(calc(var(--travel) * var(--motion-scale)))`.
One rule neutralises all travel without deleting the opacity fades that carry meaning. The full
per-element motion table is in [05 — States and motion](05-states-and-motion.md).

## 8. Iconography

One family, 24 px grid, 1.5 px stroke: **Lucide** (already in the bundle). Icons align to cap
height, not to the line box. Decorative icons get `aria-hidden`; icon-only buttons get an
accessible name. An icon is never the only label for a destructive or ambiguous action.

Two project-specific glyphs are drawn, not imported, because no icon set has them: the
**trellis post** (lifecycle marker) and the **vine mark** (brand). Both live in the sprite as
inline SVG. See doc 08.
