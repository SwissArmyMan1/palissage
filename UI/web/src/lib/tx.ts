/**
 * useChainTx — imperative "send a write, wait for the receipt" helper built on wagmi.
 *
 *   const { send, pending, error } = useChainTx();
 *   const ok = await send({ ...contracts.roleGateway, functionName: 'assumeRole', args: [roleEnum] });
 *
 * Resolves to `true` only once the transaction is mined, so callers can refresh
 * reads / navigate afterwards. Wallet/revert errors are surfaced via `error`.
 */
import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import type { PublicClient } from 'viem';
import { CHAIN } from '@/contracts/config';

type WriteConfig = Parameters<ReturnType<typeof useWriteContract>['writeContractAsync']>[0];

/**
 * EIP-1559 fees for the write, computed from the dapp's own (reliable) RPC.
 *
 * Why: over WalletConnect the *wallet* (e.g. MetaMask Mobile) estimates the fee,
 * and on Arbitrum it routinely picks a `maxFeePerGas` below the current block base
 * fee — the sequencer then rejects it with "fee cap cannot be lower than the block
 * base fee". (Re-signing 2-3 times eventually lands a fresh estimate that clears.)
 * Passing explicit fees makes the wallet use ours instead of estimating.
 *
 * Arbitrum's base fee is ~0.02 gwei and L2 fees are negligible, so we give 3× base
 * headroom (plus a tiny tip) — enough to absorb any base-fee tick between estimate
 * and inclusion, while still costing a fraction of a cent.
 */
async function eip1559Fees(client: PublicClient) {
  const block = await client.getBlock({ blockTag: 'latest' });
  const baseFee = block.baseFeePerGas ?? 100_000_000n; // 0.1 gwei fallback (pre-EIP-1559)
  const maxPriorityFeePerGas = 100_000_000n; // 0.1 gwei tip — effectively ignored on Arbitrum
  return { maxFeePerGas: baseFee * 3n + maxPriorityFeePerGas, maxPriorityFeePerGas };
}

export function useChainTx() {
  // Pin everything to the deployment network. Reads are pinned via the `contracts`
  // descriptors; writes additionally need the *wallet* on that chain (writeContract
  // asserts chainId and throws ChainMismatchError otherwise), so switch first.
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const { chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (config: WriteConfig): Promise<boolean> => {
      setError(null);
      setPending(true);
      try {
        if (walletChainId !== CHAIN.id) {
          await switchChainAsync({ chainId: CHAIN.id });
        }
        // Pin fees from our RPC so a wallet's low estimate can't get the tx
        // rejected for "maxFeePerGas below base fee" (falls back to wallet
        // estimation if the fee read fails).
        let fees: Awaited<ReturnType<typeof eip1559Fees>> | undefined;
        if (publicClient) {
          try {
            fees = await eip1559Fees(publicClient);
          } catch {
            fees = undefined;
          }
        }
        // Cast: adding eip1559 fee fields keeps the config valid, but TS can't
        // narrow viem's fee-`type` discriminated union through the spread.
        const hash = await writeContractAsync({ ...config, chainId: CHAIN.id, ...fees } as WriteConfig);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        return true;
      } catch (err: unknown) {
        const e = err as { shortMessage?: string; message?: string };
        setError(e.shortMessage || e.message || 'Transaction failed');
        return false;
      } finally {
        setPending(false);
      }
    },
    [publicClient, switchChainAsync, walletChainId, writeContractAsync],
  );

  return { send, pending, error, clearError: () => setError(null) };
}
