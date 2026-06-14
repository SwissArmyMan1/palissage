/**
 * wagmi + RainbowKit configuration.
 *
 * Palissage targets Arbitrum (One by default; Sepolia when `VITE_CHAIN_ID=421614`,
 * including a local anvil fork of Sepolia via `VITE_ARBITRUM_RPC_URL`). The active
 * chain (see `contracts/config.ts`) is listed first so it is the default network.
 *
 * `VITE_WALLETCONNECT_PROJECT_ID` enables the WalletConnect / mobile-QR option; injected
 * wallets (MetaMask, Rabby, Coinbase) work without it. A throwaway id is used in dev.
 */
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import type { Chain } from 'viem';
import { CHAIN, RPC_URL } from '@/contracts/config';

const envProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
// RainbowKit requires a non-empty projectId. Without a real one (free from
// https://cloud.reown.com) the WalletConnect option in the modal cannot open a
// session — injected wallets (MetaMask, Rabby, Coinbase) still work.
const projectId = envProjectId || 'palissage-dev';
if (import.meta.env.DEV && !envProjectId) {
  console.warn(
    '[palissage] VITE_WALLETCONNECT_PROJECT_ID is not set — WalletConnect will not connect. ' +
      'Get a free id at https://cloud.reown.com and add it to .env.local. Injected wallets work without it.',
  );
}

const isSepolia = CHAIN.id === arbitrumSepolia.id;
// Active chain first (becomes the default), the other kept available for wallet switching.
const chains = (isSepolia ? [arbitrumSepolia, arbitrum] : [arbitrum, arbitrumSepolia]) as readonly [
  Chain,
  ...Chain[],
];

export const wagmiConfig = getDefaultConfig({
  appName: 'Palissage',
  projectId,
  chains,
  transports: {
    // The active chain honours the configured RPC (e.g. an anvil fork endpoint).
    [arbitrum.id]: http(CHAIN.id === arbitrum.id ? RPC_URL : undefined),
    [arbitrumSepolia.id]: http(isSepolia ? RPC_URL : undefined),
  },
  ssr: false,
});
