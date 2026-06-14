/**
 * Session — the connected wallet and the protocol role it resolves to.
 *
 * When the RoleGateway is deployed (`isRoleGatewayConfigured`), the role and the
 * test-mode flag are read live from chain:
 *   - `testMode`        ← `RoleGateway.testMode()`
 *   - `role`            ← `RoleGateway.roleOf(account)`, with a fallback to the
 *                         wallet's claims (so legacy-onboarded wallets resolve too).
 * Switching role is an on-chain action (`assumeRole` / admin `assignRole`) done in
 * the page components via wagmi; `refresh()` re-reads after the tx confirms.
 *
 * When no gateway is configured the app stays in offline demo mode: `testMode` is
 * true and a role is picked locally (persisted) so the static UI is still browsable.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAccount, watchAccount } from '@wagmi/core';
import { useDisconnect, useReadContract, useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { contracts, isRoleGatewayConfigured } from '@/contracts';
import { wagmiConfig } from './wagmi';
import { CLAIM_TOPIC, ROLE_META, roleFromEnum, type Role, type RoleMeta } from './roles';

interface SessionCtx {
  account?: Address;
  isConnected: boolean;
  /** Whether the RoleGateway address is set (live mode) vs offline demo. */
  gatewayConfigured: boolean;
  /** On-chain test mode flag (true in offline demo). */
  testMode: boolean;
  role: Role | null;
  meta: RoleMeta | null;
  /** Connected and resolved to a role. */
  isAuthed: boolean;
  loading: boolean;
  /** Re-read on-chain role/test-mode (call after a role-changing tx confirms). */
  refresh: () => void;
  /** Offline-demo only: pick a role locally (no chain). */
  connectLocal: (role: Role) => void;
  /** Disconnect the wallet and clear any local role. */
  disconnect: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);
const STORAGE_KEY = 'palissage-session';

function readStored(): Role | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && saved in ROLE_META ? (saved as Role) : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accountState, setAccountState] = useState(() => getAccount(wagmiConfig));
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [localRole, setLocalRole] = useState<Role | null>(readStored);

  useEffect(() => {
    setAccountState(getAccount(wagmiConfig));
    return watchAccount(wagmiConfig, {
      onChange: setAccountState,
    });
  }, []);

  const { address, isConnected } = accountState;
  const gatewayConfigured = isRoleGatewayConfigured;

  // Test mode is account-independent — readable as soon as the gateway exists.
  const testModeRead = useReadContract({
    ...contracts.roleGateway,
    functionName: 'testMode',
    query: { enabled: gatewayConfigured },
  });

  // Role + claim fallback, read once a wallet is connected.
  const roleReads = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...contracts.roleGateway, functionName: 'roleOf', args: [address as Address] },
      { ...contracts.identityRegistry, functionName: 'hasValidClaim', args: [address as Address, CLAIM_TOPIC.winery] },
      { ...contracts.identityRegistry, functionName: 'hasValidClaim', args: [address as Address, CLAIM_TOPIC.b2bBuyer] },
      { ...contracts.identityRegistry, functionName: 'isVerified', args: [address as Address] },
    ],
    query: { enabled: gatewayConfigured && isConnected && !!address },
  });

  const refresh = useCallback(() => {
    testModeRead.refetch();
    roleReads.refetch();
  }, [testModeRead, roleReads]);

  const value = useMemo<SessionCtx>(() => {
    // Offline demo: no gateway → local role + test mode on.
    if (!gatewayConfigured) {
      return {
        account: address,
        isConnected,
        gatewayConfigured: false,
        testMode: true,
        role: localRole,
        meta: localRole ? ROLE_META[localRole] : null,
        isAuthed: localRole !== null,
        loading: false,
        refresh,
        connectLocal: (r: Role) => {
          localStorage.setItem(STORAGE_KEY, r);
          setLocalRole(r);
        },
        disconnect: () => {
          localStorage.removeItem(STORAGE_KEY);
          setLocalRole(null);
          wagmiDisconnect();
        },
      };
    }

    const testMode = (testModeRead.data as boolean | undefined) ?? false;

    let role: Role | null = null;
    if (isConnected && roleReads.data) {
      const [roleOf, isWinery, isBuyer, verified] = roleReads.data;
      role = roleFromEnum(Number(roleOf.result ?? 0));
      if (!role) {
        if (isWinery.result === true) role = 'winery';
        else if (isBuyer.result === true) role = 'shop';
        else if (verified.result === true) role = 'consumer';
      }
    }

    return {
      account: address,
      isConnected,
      gatewayConfigured: true,
      testMode,
      role,
      meta: role ? ROLE_META[role] : null,
      isAuthed: isConnected && role !== null,
      loading: testModeRead.isLoading || roleReads.isLoading,
      refresh,
      connectLocal: () => {},
      disconnect: () => {
        localStorage.removeItem(STORAGE_KEY);
        setLocalRole(null);
        wagmiDisconnect();
      },
    };
  }, [
    gatewayConfigured,
    address,
    isConnected,
    localRole,
    testModeRead.data,
    testModeRead.isLoading,
    roleReads.data,
    roleReads.isLoading,
    refresh,
    wagmiDisconnect,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
