import { createPublicClient, http } from 'viem';
import { CHAIN, RPC_URL } from './config';

/**
 * Read-only client for Arbitrum. Use it for `readContract` / `multicall`
 * against the deployed protocol. State-changing calls go through the user's
 * connected wallet (a `walletClient`), added when live wallet support lands.
 */
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});
