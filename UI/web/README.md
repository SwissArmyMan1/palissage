# Palissage — web frontend

React + TypeScript + Vite implementation of the Palissage UI, built from the
Figma design system. Compliant onchain B2B wine trade — four role zones plus a
public marketing site.

## Stack

- **Vite 8 + React 19 + TypeScript** (strict)
- **Tailwind CSS 3** — design tokens are CSS variables (light/dark), mapped 1:1
  from the Figma Variables (see `src/index.css` + `tailwind.config.js`)
- **React Router 7** — zone-aware routing (subdomains in prod, path prefixes in dev)
- **Framer Motion** — page transitions, staggered reveals, theme-toggle spring,
  drawer/modal/bottom-sheet; all respect `prefers-reduced-motion`
- **lucide-react** icons, self-hosted **Fraunces / Inter / JetBrains Mono** fonts
- **viem** — typed contracts layer (`src/contracts/`); Arbitrum-only, EURe settlement

## Run

This repo's WSL Node is old; use an nvm Node 22+ build:

```bash
export PATH="$HOME/.nvm/versions/node/v23.5.0/bin:$PATH"
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve the production build
```

## Zones & subdomains

The product is split into five zones. In **production** each role lives on its
own subdomain of `palissage.net`; in **local dev** (no subdomain) the public
host also exposes every zone under a path prefix so the whole app is reachable
on one origin.

| Zone     | Production host          | Dev path     |
|----------|--------------------------|--------------|
| Public   | `palissage.net`          | `/`          |
| Winery   | `winery.palissage.net`   | `/winery`    |
| Shop     | `shop.palissage.net`     | `/shop`      |
| Admin    | `admin.palissage.net`    | `/admin`     |
| Consumer | `app.palissage.net`      | `/consumer`  |

`src/lib/zone.ts` resolves the active zone from `window.location.hostname`
(falling back to `?zone=` or `VITE_ZONE` for testing). `zoneLink(role, path)`
produces the correct href for either model, so the same code works on a
subdomain (routes at `/`) and on the dev host (routes at `/winery/...`).

**Test a single zone in dev:** open `http://localhost:5173/?zone=admin` to mount
the admin app at the root, exactly as it behaves on `admin.palissage.net`.

### Deploy model

Build once and serve the same `dist/` from every subdomain — each one resolves
its own zone at runtime from its hostname. All zones are SPAs, so configure a
catch-all rewrite to `index.html`:

- **Netlify** — `public/_redirects` (included) handles it.
- **Vercel** — add a rewrite `{ "source": "/(.*)", "destination": "/index.html" }`.
- **Nginx** — `try_files $uri /index.html;`.

Point the apex + four subdomains at the same deployment.

## Structure

```
src/
  index.css            design tokens (CSS vars, light/dark) + type styles
  contracts/           Arbitrum + EURe config, viem client, typed ABIs (see its README)
  lib/
    theme.tsx           ThemeProvider (light/dark/system, persisted, crossfade)
    session.tsx         SessionProvider — active role (test-mode sign-in), persisted
    roles.ts            role metadata (label, demo wallet, tagline) + ROLE_ORDER
    zone.ts             subdomain/zone resolution + zoneLink()
    nav.tsx             sidebar/tabbar nav per role
    mock.ts             static demo data — four real Cabardès wineries
    cn.ts
  components/
    ui/                 Button, StatusBadge, Field, LotCard, Stepper, Tabs,
                        Modal, Table, FeeBreakdown, StatCard, consumer/*
    layout/             Logo, ThemeToggle, WalletChip, LogoutButton, RoleShell,
                        ConsumerShell, PublicShell, Page (transitions)
  pages/
    public/   Landing, SignIn
    winery/   Dashboard, Lots, LotDetail, Finance
    shop/     Marketplace, LotDetail, ReserveFlow, Portfolio
    admin/    Overview, Participants, Verification
    consumer/ ScanLanding, Passport, Achievements
  router.tsx            zone-aware route tree + animated outlets
```

## Theming

Toggle in every shell. `ThemeProvider` writes `data-theme="dark"` on `<html>`;
all colors are CSS variables, so the switch is a 200ms crossfade with no
component re-render. `system` follows the OS and updates live.

## Network & contracts

Palissage runs on **Arbitrum** only; the payment token is **EURe** (Monerium
EUR emoney). The integration layer lives in [`src/contracts/`](src/contracts/)
— Arbitrum chain config, the EURe token, env-driven deployment addresses, a
read-only viem client and typed ABIs (generated from the Foundry artifacts via
`./scripts/gen-abis.sh`). Chain/token labels in the UI come from
`@/contracts/config` (`CHAIN_LABEL`, `PAYMENT_LABEL`) so there are no hardcoded
"EURC"/"Base" strings. See `src/contracts/README.md` and `.env.example`.

## Sign-in, roles & test mode

Auth is wallet-based (wagmi + RainbowKit) — no email/password. The role a wallet
resolves to decides which zone it lands in.

- **With a deployment configured** (`isRoleGatewayConfigured`) the role and the
  `testMode` flag are read on-chain from the `RoleGateway`. In test mode any wallet
  can self-assign a role from the sign-in screen (`assumeRole`); with test mode off a
  wallet is routed to its zone only if it already holds the matching role/claims.
- **With no deployment** the app runs in offline demo mode: **Connect wallet** opens a
  local role chooser — Admin / Shop / Winery / Collector — each with its own demo
  wallet identity. The choice persists; **Log out** clears it so you can sign in as
  another role.

See `src/lib/session.tsx`, `src/lib/roles.ts` and `src/pages/public/SignIn.tsx`.

## Onchain wiring

The contract layer goes live as soon as `.env` is populated
(`isContractsConfigured`): lots are read from `WineLotToken` (`src/lib/lots.ts`),
EURe balance/allowance/approve run through `src/lib/eure.ts`, and writes (role
assignment, lot creation, admin verification, the reserve flow) go through
`useChainTx` (`src/lib/tx.ts`).

The remaining business data — marketplace catalogue, finance figures, passport — is
still static mock (`src/lib/mock.ts`). Money/quantities render through the `eur()` /
`qty()` formatters (space thousands, tabular figures); EURe base units use
`parseEure` / `formatEure` from `@/contracts`. Every onchain action is modelled
through an explicit lifecycle (confirm → pending → success), so moving a mock screen
onto real reads/writes stays localised.
