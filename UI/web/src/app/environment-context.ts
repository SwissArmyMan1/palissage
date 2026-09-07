/**
 * Environment context, hooks and the testnet manifest.
 *
 * Mode is an explicit choice held in a discriminated union: a missing contract
 * address, an RPC failure or a disconnected wallet never turns testnet into
 * demo, and demo never claims to be a network. Role is stored separately from
 * mode — switching persona changes nothing about the environment.
 */

import { createContext, useCallback, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EntityId, Mode, ParticipantSummary, Role } from '@/domain/types';
import type { DemoAdapter } from '@/adapters/demo/adapter';
import { MAIN_BUYER_ID, MAIN_PRODUCER_ID, OPERATOR_ID } from '@/adapters/demo/fixtures';
import type { Ledger, PalissageAdapter, ScenarioPreset } from '@/adapters/types';

export type Environment =
  | { mode: 'demo'; adapter: DemoAdapter }
  | { mode: 'testnet'; adapter: PalissageAdapter | undefined; configuration: TestnetConfiguration };

/**
 * The testnet manifest is validated, never inferred. Until a verified
 * deployment is supplied, every write capability stays closed and the entry
 * screen explains exactly which check is missing.
 */
export type TestnetConfiguration = {
  status: 'unconfigured' | 'ready';
  chainId: 421614;
  networkLabel: string;
  checks: { id: string; state: 'observed' | 'missing' | 'failed' | 'unavailable'; detail?: string }[];
};

export const TESTNET_CONFIGURATION: TestnetConfiguration = {
  status: 'unconfigured',
  chainId: 421614,
  networkLabel: 'Arbitrum Sepolia',
  checks: [
    { id: 'chain', state: 'observed', detail: '421614' },
    { id: 'rpc', state: 'unavailable', detail: 'No endpoint is configured in this build.' },
    { id: 'addresses', state: 'missing', detail: 'No validated deployment manifest is bundled.' },
    { id: 'bytecode', state: 'unavailable', detail: 'Cannot be checked without addresses and an endpoint.' },
    { id: 'token', state: 'missing', detail: 'Payment token and decimals are not confirmed.' },
    { id: 'account', state: 'missing', detail: 'No account is connected.' },
    { id: 'qualification', state: 'unavailable', detail: 'Requires a connected account and a reachable registry.' },
  ],
};

export const DEMO_ACTORS: Record<Exclude<Role, 'visitor'>, EntityId> = {
  buyer: MAIN_BUYER_ID,
  winery: MAIN_PRODUCER_ID,
  operations: OPERATOR_ID,
};

export const ROLE_KEY = 'palissage.demo.role';

export type EnvironmentValue = {
  mode: Mode | undefined;
  environment: Environment | undefined;
  demo: DemoAdapter;
  ledger: Ledger;
  role: Role;
  actorId: EntityId;
  actor: ParticipantSummary | undefined;
  setRole: (role: Role) => void;
  /** Lets a buyer screen act as the second demo buyer for the resale step. */
  setActorId: (id: EntityId) => void;
  enterDemo: (preset?: ScenarioPreset) => Promise<void>;
  resetDemo: (preset?: ScenarioPreset) => Promise<void>;
  preset: ScenarioPreset;
  recovery?: string;
  testnet: TestnetConfiguration;
};

export const EnvironmentContext = createContext<EnvironmentValue | undefined>(undefined);

export function useEnvironment(): EnvironmentValue {
  const value = useContext(EnvironmentContext);
  if (!value) throw new Error('useEnvironment must be used inside EnvironmentProvider');
  return value;
}

/** Preserves the current mode when navigating inside the workspace. */
export function useModeLink(): (path: string) => string {
  const { mode } = useEnvironment();
  return useCallback(
    (path: string) => {
      if (!mode || !path.startsWith('/app/')) return path;
      return path.includes('?') ? `${path}&mode=${mode}` : `${path}?mode=${mode}`;
    },
    [mode],
  );
}

/** Moves focus to the page heading after a route change. */
export function useFocusHeading(title: string) {
  const location = useLocation();
  useEffect(() => {
    document.title = `${title} · Palissage`;
    const heading = document.querySelector<HTMLElement>('main h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [location.pathname, location.search, title]);
}

export function useNavigateWithMode() {
  const navigate = useNavigate();
  const link = useModeLink();
  return useCallback((path: string, options?: { replace?: boolean }) => navigate(link(path), options), [navigate, link]);
}
