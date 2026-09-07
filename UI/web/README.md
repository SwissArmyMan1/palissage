# Palissage — web frontend

React + TypeScript + Vite implementation of the Palissage UI, built to the
specification package in [`specifications/ui-mvp/`](../../specifications/ui-mvp/).

The product is a prototype for **direct wine trade between independent wineries
and professional buyers**. It runs as a self-contained interactive demo with
fictional data; a separate, explicitly-entered testnet environment is where any
real network interaction would live.

## Stack

- **Vite 8 + React 19 + TypeScript** (strict)
- **Tailwind CSS 3** over the design tokens in `src/index.css` (fixed by
  specification 03 §2). Light theme only in P0.
- **React Router 7** — one origin, canonical routes, no subdomain zones
- Self-hosted **Fraunces / Inter / JetBrains Mono**; no external font requests
- **viem / wagmi / RainbowKit** remain installed for the future testnet adapter
  and are deliberately not imported yet, so no wallet code reaches the bundle

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build → dist/
npm run preview        # serve the production build (use this for offline demos)
npm run test           # golden-path arithmetic + every-route render checks
npm run lint
npm run prepare-media  # regenerate demo illustrations and sample PDFs
```

Requires Node 22+.

## Architecture

```text
src/
  domain/      types, integer money, validators, capability rules
  adapters/    the only data boundary
    demo/      fixtures, atomic reducer, versioned persistence, adapter
    testnet/   reserved for the validated-deployment adapter (not built yet)
  app/         locale, environment, action state machine, selectors, routes
  content/     EN/FR dictionaries, asset registry
  components/  ui primitives, trade components, layout shells
  features/    one directory per area: public, demo, buyer, winery,
               operations, fulfilment, passport, account, system
```

Screens never talk to a wallet or a contract directly: they hold a
`PalissageAdapter`. In demo that is a deterministic local simulator; in testnet
it will be the chain adapter. Mode is an explicit choice — a failure in one
environment never silently falls back to the other.

## Modes

| Mode | Entry | Behaviour |
|---|---|---|
| `demo` | `/demo` | Fictional data, deterministic reducer, no wallet, no network. References look like `DEMO-RES-001`; there are no transaction hashes. |
| `testnet` | `/testnet` | Shows the environment checks. This build carries no validated deployment manifest, so every write stays closed and the page says which check is missing. |
| `mainnet` | — | Not enabled. |

A workspace route opened without `?mode=` asks which environment to use rather
than guessing.

## Demo data

All organisations, wines, prices, documents and events are fictional and
labelled as such. The canonical dataset and the numeric scenario live in
specification 05 §6 and are enforced by `npm run test`.

Local storage holds only `palissage.demo.v1` (the preset plus a command log),
the chosen language and the chosen demo role. Free-text notes and hand-typed
addresses are never serialised.

## Media

`npm run prepare-media` regenerates every illustration and sample document from
`scripts/prepare-media.mjs`. The artwork is original vector graphics produced
for this prototype — no third-party licence is involved — and each sample PDF
carries a `SAMPLE DOCUMENT — NOT A CERTIFICATE` watermark. See
[`implementation-notes.md`](../../specifications/ui-mvp/implementation-notes.md)
for how to swap them for licensed photography.

## Status

See [`specifications/ui-mvp/implementation-notes.md`](../../specifications/ui-mvp/implementation-notes.md)
for what is implemented, what deviates from the specification and what is not
built yet. No acceptance run from specification 08 has been performed.
