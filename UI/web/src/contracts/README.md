# `src/contracts` - protocol integration layer

The single place the UI talks to the Palissage smart contracts. Everything is
**Arbitrum-only**; the payment token is **EURe** (Monerium EUR emoney).

```ts
import { contracts, EURE, parseEure, formatEure, publicClient, PAYMENT_LABEL } from '@/contracts';

// read (live, once deployed)
const lot = await publicClient.readContract({
  ...contracts.wineLotToken,
  functionName: 'lots',
  args: [lotId],
});
```

## Files

| File          | What it holds |
|---------------|---------------|
| `config.ts`   | Arbitrum chain, EURe token (18 decimals), deployed addresses (from `.env`), `PAYMENT_LABEL`, `isContractsConfigured` |
| `client.ts`   | viem read-only `publicClient` for Arbitrum |
| `index.ts`    | `contracts` (`{address, abi}` descriptors), `parseEure`/`formatEure`, `shortAddress`, explorer link helpers - **import from here** |
| `abis/*.ts`   | Typed ABIs generated from Foundry artifacts + hand-written `Erc20.ts` |

## Configure / go live

1. Deploy: `forge script script/Deploy.s.sol --rpc-url $RPC --broadcast`.
2. Copy the printed addresses into `.env` (see `../.env.example`), plus the
   Arbitrum `EURe` address.
3. `isContractsConfigured` flips to `true`; wire flows to `publicClient` reads
   and a wallet `walletClient` for writes.

## EURe payment token

`useEure(spender?)` (`src/lib/eure.ts`) is the primitive for working with EURe:
balance, allowance and `approve`, all in 18-decimal base units via
`parseEure`/`formatEure`. It also reads the token's real `decimals()` and exposes
`decimalsMismatch` (logging an error) if the deployed token ever disagrees with the
configured `EURE.decimals` - so a mis-decimal'd token can't silently corrupt amounts.

On Arbitrum Sepolia the EURe at `0xFdEed…3b7B` reports **18 decimals / symbol `EURe`**
(matches config). The wallet chip shows the connected balance; the reserve flow does a
real `approve` of the primary market for the EUR amount due.

## Test mode & roles (RoleGateway)

`RoleGateway` is the on-chain role authority. The UI reads it via the session layer
(`lib/session.tsx`):

- `testMode()` - when true, the sign-in screen shows the test-mode banner + role chooser.
  Picking a role sends `assumeRole(role)` (self-service, test mode only). Only the gateway
  **owner** can flip test mode (`setTestMode`).
- `roleOf(account)` - resolves the wallet's role (with a fallback to its claims). When test
  mode is off, a wallet is routed to whatever role an admin granted it.
- Admins grant roles on-chain from **Participants** (`assignRole` / `revokeRole`); these work
  in both modes. The admin role also carries `VERIFIER_ROLE`, so **Verification** can verify
  Draft lots and **Lots** can create lots - all live.

Without a configured `VITE_ROLE_GATEWAY_ADDRESS` the app falls back to offline demo mode
(local role picking, static data).

## Local Arbitrum Sepolia fork (end-to-end)

```bash
# 1. fork + deploy
anvil --fork-url https://sepolia-rollup.arbitrum.io/rpc --chain-id 421614
PRIVATE_KEY=<anvil#0> ADMIN=<anvil#0> OWNER=<anvil#0> \
  PAYMENT_TOKEN=0xFdEed5cE7E281B4e0F163B70eBe2Cf0B10803b7B \
  forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast

# 2. point the UI at the fork (copy printed addresses into UI/web/.env.local)
#    VITE_CHAIN_ID=421614, VITE_ARBITRUM_RPC_URL=http://localhost:8545, VITE_ROLE_GATEWAY_ADDRESS=…

# 3. prove the contract wiring from JS (uses the generated ABIs). The EURe section
#    asserts decimals==18 / symbol=="EURe" (EURE defaults to 0xFdEed…3b7B).
RPC=http://localhost:8545 GW=<roleGateway> IR=<identityRegistry> npx tsx scripts/verify-fork.ts

# 4. browser: npm run dev - add network (RPC localhost:8545, chainId 421614) + import an
#    anvil key in your wallet, then connect and pick a role.
```

## Regenerate ABIs after a contract change

```bash
cd <repo> && forge build      # refresh out/
cd UI/web && ./scripts/gen-abis.sh
```

`abis/index.ts` and `abis/<Contract>.ts` are generated - do not edit by hand.
`abis/Erc20.ts` is hand-written and left untouched by the script.
