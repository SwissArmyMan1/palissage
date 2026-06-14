/**
 * Contracts integration layer — the single entry point the UI imports from.
 *
 *   import { contracts, EURE, formatEure, publicClient } from '@/contracts';
 *
 * Today the app runs in test mode (static data); this layer holds the wiring
 * — Arbitrum config, the EURe token, deployed addresses and typed ABIs — so
 * flows can be switched to live reads/writes once a deployment exists.
 */
import { formatUnits, parseUnits, getAddress } from 'viem';
import { CONTRACTS, EURE, EXPLORER_URL, CHAIN } from './config';
import {
  wineLotTokenAbi,
  primaryMarketAbi,
  secondaryMarketAbi,
  redemptionManagerAbi,
  identityRegistryAbi,
  trustedIssuersRegistryAbi,
  claimIssuerAbi,
  roleGatewayAbi,
} from './abis';
import { erc20Abi } from './abis/Erc20';

export * from './config';
export { publicClient } from './client';
export * from './abis';
export { erc20Abi } from './abis/Erc20';

/**
 * `{ address, abi, chainId }` descriptors, ready to spread into viem/wagmi calls:
 *   publicClient.readContract({ ...contracts.wineLotToken, functionName: 'lots', args: [id] })
 *
 * `chainId` is pinned to the configured network (`VITE_CHAIN_ID`) on every entry.
 * This matters for the wagmi hooks (`useReadContract`/`useReadContracts`/`useWriteContract`):
 * without it they default to the *wallet's* currently-connected chain, so a wallet
 * sitting on Arbitrum One (both chains are registered for switching) would read the
 * RoleGateway at an address that holds no contract — making every wallet look
 * "not verified". Pinning the id forces all reads/writes onto the deployment network.
 */
const chainId = CHAIN.id;

export const contracts = {
  wineLotToken: { address: CONTRACTS.wineLotToken, abi: wineLotTokenAbi, chainId },
  primaryMarket: { address: CONTRACTS.primaryMarket, abi: primaryMarketAbi, chainId },
  secondaryMarket: { address: CONTRACTS.secondaryMarket, abi: secondaryMarketAbi, chainId },
  redemptionManager: { address: CONTRACTS.redemptionManager, abi: redemptionManagerAbi, chainId },
  identityRegistry: { address: CONTRACTS.identityRegistry, abi: identityRegistryAbi, chainId },
  trustedIssuersRegistry: { address: CONTRACTS.trustedIssuersRegistry, abi: trustedIssuersRegistryAbi, chainId },
  claimIssuer: { address: CONTRACTS.claimIssuer, abi: claimIssuerAbi, chainId },
  roleGateway: { address: CONTRACTS.roleGateway, abi: roleGatewayAbi, chainId },
  eure: { address: EURE.address, abi: erc20Abi, chainId },
} as const;

/** Human EURe amount (e.g. 7.2 or "7.20") → base units (18 decimals). */
export const parseEure = (amount: string | number): bigint =>
  parseUnits(typeof amount === 'number' ? amount.toString() : amount, EURE.decimals);

/** EURe base units → human number string. */
export const formatEure = (units: bigint): string => formatUnits(units, EURE.decimals);

/** Truncate an address for display: `0x3Fa4…9C21`. */
export function shortAddress(address: string): string {
  try {
    const a = getAddress(address);
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  } catch {
    return address;
  }
}

export const explorerTx = (hash: string): string => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddress = (address: string): string => `${EXPLORER_URL}/address/${address}`;
