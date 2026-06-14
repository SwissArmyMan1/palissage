/**
 * Network + deployment configuration.
 *
 * Palissage operates on a single network: **Arbitrum One**. Prices are
 * denominated in EUR and settled in **EURe** (Monerium EUR emoney). There is
 * intentionally no multi-chain support — every address and label here is
 * Arbitrum-only.
 *
 * Contract + token addresses are environment-driven (`.env`, see `.env.example`).
 * Until they are filled in the app stays in test mode (see `isContractsConfigured`).
 */
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Address, Chain } from 'viem';

const env = import.meta.env as Record<string, string | undefined>;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

/** Accepts a 0x… address from env, else falls back to the zero address. */
function addr(value: string | undefined): Address {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : ZERO_ADDRESS;
}

/**
 * Active network. Defaults to Arbitrum One; set `VITE_CHAIN_ID=421614` to target Arbitrum
 * Sepolia (incl. a local anvil fork of it — point `VITE_ARBITRUM_RPC_URL` at the fork RPC).
 */
const CHAIN_ID = Number(env.VITE_CHAIN_ID ?? arbitrum.id);
export const CHAIN: Chain = CHAIN_ID === arbitrumSepolia.id ? arbitrumSepolia : arbitrum;
/** Short, user-facing chain name shown in copy ("… on Arbitrum"). */
export const CHAIN_LABEL = CHAIN.id === arbitrumSepolia.id ? 'Arbitrum Sepolia' : 'Arbitrum';

/** JSON-RPC endpoint. Override with VITE_ARBITRUM_RPC_URL for a private node. */
export const RPC_URL: string = env.VITE_ARBITRUM_RPC_URL || CHAIN.rpcUrls.default.http[0];

/** Arbiscan base URL for tx / address links. */
export const EXPLORER_URL: string = CHAIN.blockExplorers?.default.url ?? 'https://arbiscan.io';

/** Payment stablecoin — Monerium EUR emoney (EURe) on Arbitrum (18 decimals). */
export const EURE = {
  symbol: 'EURe',
  name: 'Monerium EUR emoney',
  decimals: 18,
  address: addr(env.VITE_EURE_ADDRESS),
} as const;

/** Deployed Palissage protocol addresses (one set per environment). */
export const CONTRACTS = {
  wineLotToken: addr(env.VITE_WINE_LOT_TOKEN_ADDRESS),
  primaryMarket: addr(env.VITE_PRIMARY_MARKET_ADDRESS),
  secondaryMarket: addr(env.VITE_SECONDARY_MARKET_ADDRESS),
  redemptionManager: addr(env.VITE_REDEMPTION_MANAGER_ADDRESS),
  identityRegistry: addr(env.VITE_IDENTITY_REGISTRY_ADDRESS),
  trustedIssuersRegistry: addr(env.VITE_TRUSTED_ISSUERS_REGISTRY_ADDRESS),
  claimIssuer: addr(env.VITE_CLAIM_ISSUER_ADDRESS),
  roleGateway: addr(env.VITE_ROLE_GATEWAY_ADDRESS),
} as const;

/** True once the RoleGateway is deployed — gates live test-mode / role reads & writes. */
export const isRoleGatewayConfigured: boolean = CONTRACTS.roleGateway !== ZERO_ADDRESS;

/**
 * True once the core deployment is configured. While false the UI runs in
 * test mode (static data + simulated tx lifecycle) instead of reading the
 * chain — flip it on simply by populating the addresses in `.env`.
 */
export const isContractsConfigured: boolean =
  CONTRACTS.wineLotToken !== ZERO_ADDRESS && EURE.address !== ZERO_ADDRESS;

/** Canonical "EURe on Arbitrum" payment descriptor used across the UI. */
export const PAYMENT_LABEL = `${EURE.symbol} on ${CHAIN_LABEL}`;
