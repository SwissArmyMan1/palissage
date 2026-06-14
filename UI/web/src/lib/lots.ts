/**
 * useOnchainLots — reads the live wine lots from `WineLotToken` (lotCount + getLot loop).
 * Used by the winery (its own lots) and admin (Draft lots awaiting verification) views.
 * Returns an empty list when no deployment is configured (offline demo).
 */
import { useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { contracts, isRoleGatewayConfigured } from '@/contracts';

export const LOT_STATUS = ['Draft', 'Verified', 'Suspended', 'Closed'] as const;
export type LotStatusLabel = (typeof LOT_STATUS)[number];

export interface OnchainLot {
  id: number;
  winery: Address;
  status: number;
  statusLabel: LotStatusLabel;
  name: string;
  region: string;
  grapes: string;
  totalBottles: number;
  mintedBottles: number;
  redeemedBottles: number;
  vintage: number;
}

export function useOnchainLots() {
  const countRead = useReadContract({
    ...contracts.wineLotToken,
    functionName: 'lotCount',
    query: { enabled: isRoleGatewayConfigured },
  });

  const count = Number(countRead.data ?? 0n);
  const ids = Array.from({ length: count }, (_, i) => i + 1);

  const lotsRead = useReadContracts({
    allowFailure: true,
    contracts: ids.map((id) => ({
      ...contracts.wineLotToken,
      functionName: 'getLot' as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: isRoleGatewayConfigured && count > 0 },
  });

  const lots: OnchainLot[] = (lotsRead.data ?? [])
    .map((r, i): OnchainLot | null => {
      const l = r.result as
        | {
            winery: Address;
            status: number;
            name: string;
            region: string;
            grapes: string;
            totalBottles: number;
            mintedBottles: number;
            redeemedBottles: number;
            vintage: number;
          }
        | undefined;
      if (!l) return null;
      const status = Number(l.status);
      return {
        id: ids[i],
        winery: l.winery,
        status,
        statusLabel: LOT_STATUS[status] ?? 'Draft',
        name: l.name,
        region: l.region,
        grapes: l.grapes,
        totalBottles: Number(l.totalBottles),
        mintedBottles: Number(l.mintedBottles),
        redeemedBottles: Number(l.redeemedBottles),
        vintage: Number(l.vintage),
      };
    })
    .filter((l): l is OnchainLot => l !== null);

  const refetch = () => {
    countRead.refetch();
    lotsRead.refetch();
  };

  return { lots, loading: countRead.isLoading || lotsRead.isLoading, refetch };
}
