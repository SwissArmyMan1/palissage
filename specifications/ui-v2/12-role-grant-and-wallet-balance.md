# Design plan — self-service role grant on APP-01, wallet balance in the app shell

Scope: two changes inside the existing system. No new tokens, no new visual language,
no new route. The design source of truth (`02-design-system.md`, ported to `tokens.css`)
is unchanged, so the Figma phase is skipped deliberately rather than silently.

## Problem

1. APP-01 (`/app`) reports what a wallet may do and then sends the reader to APP-02
   (`/app/testnet`) to actually take a role. The grant lives two screens away from the
   decision that motivates it, so the reader has to go looking for it.
2. Nothing in a cabinet shows what the connected wallet holds. Both numbers gate real
   actions: EURC settles every reservation, Base Sepolia ETH pays for every signature.
   ST-C ("insufficient token or gas") can only be avoided if the numbers are visible
   before the action, not after the revert.

## Region → grammar entry

| Region | Entry | Why this one |
|---|---|---|
| APP-01 card, primary action, unqualified wallet | `Modal dialog` + `Destructive confirmation`, as implemented by SYS-03 `Action review` | `assumeRole` clears the previous role's claims. That is expensive and not undoable, so it is confirmed, not optimistic. |
| APP-01 card, primary action, qualified wallet | `Buttons and action hierarchy` — one primary per card | Entering is the only action left once the claim is held. |
| App shell sidebar footer | `Sidebar navigation`, pinned footer | The entry already reserves the footer for account-level chrome. The readout sits above Account, inside the same bordered group. |
| Balance readout itself | Key/value pair, **not** `Stat tile row` | The tile row's veto is decoration on a dashboard. These are two acted-on numbers in persistent chrome, not headline metrics, and the tile's large value would outweigh the nav. |

## Decisions

**APP-01.** Each card keeps its badge and standing line. The action row becomes:

- qualified → `Continue as {role}` (secondary, full width).
- not qualified, sandbox open, self-assignable role → `Take the {role} role` (primary,
  full width) opening the action review, plus `Continue read-only` (ghost) below.
- not qualified, sandbox closed, or Operations → `Continue as {role}` plus
  `What this needs`, as today. Operations carries the token verifier role and the
  contract refuses to self-assign it, so the screen must not offer it.

One dialog for the page, one `useTx`, keyed by the role being taken. The dialog names
the role, states that the previous role's claims are removed, and its confirm button is
labelled with the verb. Cancel keeps the safe default focus.

After the receipt lands, the read model is invalidated, the badge flips to *Claims
verified* and the card's primary action becomes `Continue as {role}`. Nothing
auto-navigates: the reader keeps the receipt and the explorer link until they close.

**App shell.** A `WalletBalance` block in `SidebarItems`, so it renders in the desktop
sidebar and the mobile drawer from one definition.

- Two rows: the settlement symbol read from the protocol, and gas in ETH.
- `tabular-nums`, right-aligned values, width reserved at the loading skeleton so the
  nav does not reflow when the reads land (CLS).
- Zero on either row is called out in `--warning` with one `Top up` link to APP-02,
  where both faucets already live. ST-C, without duplicating the faucet buttons.
- Disconnected renders one muted line, not an empty box, so the footer height is stable.
- Balances are read from Base Sepolia directly, so they stay correct while the wallet
  sits on the wrong network — same rule APP-02 already states.

## States

| State | APP-01 | Sidebar |
|---|---|---|
| Disconnected | connect prompt, as today | "No wallet connected" |
| Loading | card skeletons, as today | value skeletons at final width |
| Ready | badge + action row above | two numbers |
| Zero balance | n/a | warning tint + `Top up` |
| Awaiting signature / confirming / reverted / declined | `TxStatus` inside the dialog | unchanged |

## Acceptance

- Both themes: tier-2 tokens only, no hex literal in either component.
- Desktop sidebar and mobile drawer both show the readout; the bottom tab bar is untouched.
- Dialog keeps the SYS-03 focus contract; confirm is never auto-focused.
- No layout shift in the sidebar between skeleton and value.
- `tsc -b`, `eslint`, `vite build` clean.

## Built — divergences and verification

Three departures from the plan above, all deliberate:

1. **The readiness screen keeps its role buttons.** Removing them would leave the
   *What this needs* link, and the sidebar's *Readiness* entry, pointing at a screen
   that explains a claim it cannot issue. Two entry points, one contract call.
2. **The sidebar item list scrolls.** `min-h-0 flex-1 overflow-y-auto` on the list, so
   the new footer block is pinned and cannot push destinations out of view on a short
   viewport. The footer was already the entry's designated pinned region; it now has
   enough in it to matter.
3. **The balance value never truncates.** A clipped number is a wrong number, so the
   label gives way instead. The minimum width is carried by the skeleton, which keeps
   the no-shift property the plan asked for.

Checked: `tsc -b`, `eslint`, `vite build` clean; both new strings present in the built
bundle; every colour resolves through a tier-2 token, and the one new status colour
(`--color-warning` on `--color-surface`) measures 5.53:1 in light and 7.94:1 in dark,
both above AA for body text.

Not checked, for want of a browser in this environment: the side-by-side screenshot
review of both themes, the screen-reader pass, the axe scan, and the field measurements
for LCP, INP and CLS. The change adds no image, no font, no animation and no new route,
so it is not expected to move those budgets, but that is an argument, not a measurement.

## Follow-up — the held role, and the seal on APP-02

**The gateway records one role per wallet, so the picker says which.** Three additions,
no new pattern:

- A line under the lede naming the held role, so the reader does not compare four cards
  to find their own.
- An `info` `Status badge` reading *Current role* beside the standing badge on that card.
- The grant on that card rendered disabled, with the reason in text beside it. Re-taking
  a held role is a true on-chain no-op: `_setRole` writes the value already stored, and
  `_setClaim` returns early on every topic because the gateway's own issuance record
  already matches. The button would cost gas and change nothing, so it is off.

Cards now render through one `RoleCard` with a fixed shape — one primary action, one
supporting action, an optional note. Four standings share that shape, which is what lets
the disabled grant read as *this one is already yours* instead of as a broken control.

**APP-02 leads with the seal, not the mark.** A standalone screen with no app chrome has
nothing above it to say whose product this is, and the 24 px mark reads there as an icon
that failed to load. `BrandSeal` now takes a `width` and a `priority` flag, because it
becomes that page's largest paint.

Both lockups were 262 KB PNGs, fine in a footer and not fine above the fold. They are the
same alpha mask under two tints (`--stone-100` for a dark ground, `--stone-900` for a
light one), re-encoded to WebP at 145 KB with no visible loss. The PNGs stay on disk as
brand source; nothing in the app references them any more.

`width` is a CSS length on the element rather than a class, because `cn` is plain clsx
with no tailwind-merge — a width passed through `className` would collide with the
default rather than replace it.

## Follow-up — the ornate lettering in the public bar

Doc 08 set the header wordmark in Fraunces and reserved the ornate lettering for large
surfaces, on the stated grounds that it is unreadable at 32 px. Measured rather than
assumed, that threshold is wrong for this artwork: the twig serifs resolve as texture
and the silhouette stays distinctive down to about 18 px of cap height. The rule is
reversed here deliberately, and this paragraph is the record of it.

The header carries the **horizontal** lockup — one vine span, then the lettering, no
tagline. The stacked seal is not an option in a 66 px bar: its lettering is 25 % of the
artwork's height, so a seal tall enough to read would be twice the bar. Stacked seal for
large surfaces, horizontal lockup for navigation, which is the ordinary division.

New asset `wordmark-on-{light,dark}.webp`, 654 × 110, 37 KB, cropped from the seal's own
lettering band so the two can never drift apart.

**The bar owns the size, not a prop.** `--logo-h` is set on `.site-nav` per breakpoint and
per condensed state; the mark takes it and the lettering takes 68 % of it. Three reasons:

- the lockup shrinks *with* the bar instead of snapping when the condense flips;
- nothing about its size depends on a media query read in JavaScript, which would size it
  wrong on first paint and shift the header;
- at 320 px the desktop lockup plus the theme toggle and the menu button came to 294 px
  inside 288 px of content box. At `--logo-h: 24px` the row measures 278 px, and Gate C's
  320 px floor holds.

| Viewport | State | `--logo-h` | Lockup width | Header row |
|---|---|---|---|---|
| ≥ 640 px | tall | 32 px | 185 px | fits |
| ≥ 640 px | condensed | 26 px | 150 px | fits |
| < 640 px | tall | 24 px | 138 px | 278 px of 320 px |
| < 640 px | condensed | 22 px | 127 px | 267 px of 320 px |

Checked by rendering the bar at 1:1 in both tints at both sizes. Not checked: a real
browser, a screen reader, and field Core Web Vitals. The link's accessible name now comes
from the lettering's `alt`, the vine staying `alt=""` — so the name survives the change.
