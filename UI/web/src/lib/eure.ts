/**
 * useEure — the EURe payment-token primitive the UI uses to "work with EURe".
 *
 *   const eure = useEure(contracts.primaryMarket.address); // spender optional
 *   eure.balance            // raw base units (bigint, 18 decimals)
 *   eure.balanceFormatted   // human string, e.g. "1234.56"
 *   eure.hasBalance(units)  // bigint comparison
 *   eure.hasAllowance(units)
 *   await eure.approve(spender, units)
 *
 * Reads `decimals` / `balanceOf` / `allowance` from the EURe ERC-20 in one
 * multicall and writes `approve` through the connected wallet (`useChainTx`).
 *
 * Decimals safety: the UI hard-codes `EURE.decimals` (18, the production EURe on
 * Arbitrum). This hook reads the token's real `decimals()` and exposes
 * `decimalsMismatch` (+ a console error) if they ever disagree — because every
 * `parseEure`/`formatEure` would then be off by a power of ten. On Arbitrum
 * Sepolia the token reports 18, so this stays quiet.
 */
import { useEffect } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { contracts, EURE, ZERO_ADDRESS, parseEure, formatEure } from '@/contracts';
import { useChainTx } from './tx';

const EURE_CONFIGURED = EURE.address !== ZERO_ADDRESS;

export function useEure(spender?: Address) {
  const { address } = useAccount();
  const owner = (address ?? ZERO_ADDRESS) as Address;
  const spenderAddr = (spender ?? ZERO_ADDRESS) as Address;

  // Stable 3-read shape so result indices never shift. decimals() needs no
  // wallet, so we enable as soon as EURe is configured (the self-check runs even
  // before connect); balanceOf(0x0)/allowance(0x0,…) harmlessly return 0.
  const reads = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...contracts.eure, functionName: 'decimals' },
      { ...contracts.eure, functionName: 'balanceOf', args: [owner] },
      { ...contracts.eure, functionName: 'allowance', args: [owner, spenderAddr] },
    ],
    query: { enabled: EURE_CONFIGURED },
  });

  const onchainDecimals = reads.data?.[0]?.result as number | undefined;
  const balance = address ? ((reads.data?.[1]?.result as bigint | undefined) ?? 0n) : 0n;
  const allowance = spender ? ((reads.data?.[2]?.result as bigint | undefined) ?? 0n) : 0n;

  const decimalsMismatch = onchainDecimals !== undefined && onchainDecimals !== EURE.decimals;
  useEffect(() => {
    if (decimalsMismatch) {
      console.error(
        `[palissage] EURe decimals mismatch: token at ${EURE.address} reports ${onchainDecimals}, ` +
          `but the UI is configured for ${EURE.decimals}. All amounts will be wrong — ` +
          `fix EURE.decimals in src/contracts/config.ts.`,
      );
    }
  }, [decimalsMismatch, onchainDecimals]);

  const { send, pending, error, clearError } = useChainTx();

  const approve = (to: Address, amount: bigint) =>
    send({ ...contracts.eure, functionName: 'approve', args: [to, amount] });

  return {
    /** True once a non-zero EURe address is configured. */
    configured: EURE_CONFIGURED,
    /** Decimals the deployed token actually reports (undefined until read). */
    onchainDecimals,
    /** On-chain decimals != configured EURE.decimals — amounts would be wrong. */
    decimalsMismatch,
    /** Connected wallet's EURe balance in base units. */
    balance,
    balanceFormatted: formatEure(balance),
    /** Allowance the connected wallet granted `spender` (0 when no spender). */
    allowance,
    hasBalance: (amount: bigint) => balance >= amount,
    hasAllowance: (amount: bigint) => allowance >= amount,
    /** Send an ERC-20 approve; resolves true once mined. */
    approve,
    approving: pending,
    approveError: error,
    clearApproveError: clearError,
    /** Re-encode a human EUR amount to base units (kept here for convenience). */
    parse: parseEure,
    loading: reads.isLoading,
    refetch: reads.refetch,
  };
}
