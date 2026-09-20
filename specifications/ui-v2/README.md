# Palissage — UI/UX design documentation (v2)

Version 2.0 · 8 September 2026 · Status: **historical design plan with a later implementation report**

This package is the written design plan required by the `ui-ux-design` pipeline before any
Figma node or any line of UI code exists. It is the contract that the Figma build (phase 2),
the React implementation (phase 3) and the verification pass (phase 4) are checked against.

**Language: English.** Every token name, component name, route, screen id and UI string in
this package is the literal string that appears in Figma variables and in the codebase. The
v1 package was written in Russian and specified English artefacts; each agent re-translated,
and the names drifted. One language, mechanically copyable, removes that failure mode.

## What this supersedes

`specifications/ui-mvp/` (v1.0, 7 September 2026) is **superseded in full** for design intent,
visual system, motion, information architecture and workflows. It is kept for its research
record only. Do not build from it.

Two things from v1 survive and are re-derived here from source rather than quoted:

- Financial formulas and permission rules — now taken directly from `src/periphery/PalissageLens.sol`
  and the market contracts, not from a prose restatement.
- The demo/testnet honesty rules — the principle was right and is restated in
  [07 — Content and copy](07-content-and-copy.md).

`docs/chain-mvp/` remains authoritative for the chain side: target network, deployment
manifest, seed plan and verification. This package never contradicts it; where the interface
needs a chain fact, it reads the manifest.

## Why v2 exists

The v1 implementation shipped a competent but generic layout: a centred hero, three equal
feature cards, a horizontal stepper, `<details>` FAQ rows and stat tiles. Every region used
the same card. Nothing on the page carried the product's actual subject — a physical lot of
wine moving through a production year — and nothing carried the brand's actual idea, which is
a trellis. The result reads as a bulletin board, not as a trading product.

v2 fixes the cause, not the symptom. The cause was that v1 specified *appearance* ("wine
colour, rounded cards, asymmetric 7/5") and left *pattern selection* to the implementer. v2
names a grammar entry for every region, with its veto condition, and names the one signature
moment the product is allowed.

## How to read

| Document | What it fixes | Who must read it |
|---|---|---|
| [00 — Brief](00-brief.md) | Job, surface, device, content reality, constraints, expressiveness budget | Everyone |
| [01 — Information architecture](01-information-architecture.md) | Object model, route inventory, navigation model, zone/origin decision | UX, frontend, QA |
| [02 — Design system](02-design-system.md) | Layout grid, spacing, the full token set with measured contrast for both themes | Design, frontend |
| [03 — Pattern selection](03-pattern-selection.md) | Region → grammar entry, with the "when NOT to use" risk for each | Design, frontend, review |
| [04 — Role workflows](04-role-workflows.md) | Admin, Shop, Winery, Collector end to end, against real contract state | Everyone |
| [05 — States and motion](05-states-and-motion.md) | State matrix per region; motion table with curve, duration and reduced-motion fallback | Design, frontend, QA |
| [06 — Responsive, accessibility, performance](06-responsive-a11y-performance.md) | Breakpoint structure, WCAG 2.2 AA plan, Core Web Vitals budget per route | Design, frontend, QA |
| [07 — Content and copy](07-content-and-copy.md) | Voice, terminology, honesty rules, error patterns, EN/FR, marketing copy | Content, frontend, legal |
| [08 — Brand and assets](08-brand-and-assets.md) | Logo handling, photography audit, rights manifest, asset production tasks | Design, asset work, legal |
| [09 — Acceptance](09-acceptance.md) | The gates phase 4 checks verbatim; open questions and risks | QA, owner |
| [10 — Contract ↔ UI conformance](10-contract-ui-conformance.md) | Verified mapping of every screen action to a real contract function; the five mismatches to fix; what demo mode actually is | Everyone |
| [11 — Implementation report](11-implementation-report.md) | What phase 3 built, the divergences and their reasons, and the measured phase 4 results | Everyone |

## Priority when documents conflict

1. An explicit later decision by the product owner.
2. Actual contract behaviour (`src/`, and `PalissageLens` as the read model). The interface may
   never promise a transition the contracts do not support.
3. Chain facts: `docs/chain-mvp/` and the published deployment manifest.
4. Scope and mode rules: 00.
5. Information architecture and workflows: 01, 04.
6. Visual system and patterns: 02, 03.
7. Motion, states, responsive, a11y, performance: 05, 06.

If you find a conflict, record it and continue with the independent part of your task. Do not
change the financial model, invent a role, promise a legal guarantee, or substitute demo data
for testnet data on your own authority.

## Pipeline position

```
  phase 0  brief                       ✅ this package, doc 00
  phase 1  written design plan         ✅ this package  ← approval gate
  phase 2  Figma build via MCP         ✅ 20 screens x 4 frames, file kinTHy7nX3rzZ2N39PHD0B
  phase 3  React implementation        ✅ doc 11
  phase 4  verification vs doc 09      ◐  doc 11 §4 — passing, with named gaps
```

Small later changes get a small amendment in this package — never no plan.

[11 — Implementation report](11-implementation-report.md) is the phase 3 and 4 handoff: what
was built, what was skipped, where the code diverges from the Figma file and why, and the
measured gate results including the ones that still fail.
