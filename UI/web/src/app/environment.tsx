/**
 * Binds the demo adapter, the selected environment and the active persona to
 * React. The ledger is read through `useSyncExternalStore`, so every screen in
 * a render sees exactly one consistent snapshot.
 */

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { EntityId, Mode, Role } from '@/domain/types';
import { DemoAdapter } from '@/adapters/demo/adapter';
import type { ScenarioPreset } from '@/adapters/types';
import {
  DEMO_ACTORS,
  EnvironmentContext,
  ROLE_KEY,
  TESTNET_CONFIGURATION,
  type Environment,
  type EnvironmentValue,
} from './environment-context';

function readStoredRole(): Role {
  try {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored === 'buyer' || stored === 'winery' || stored === 'operations') return stored;
  } catch {
    /* ignore */
  }
  return 'visitor';
}

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [adapter] = useState(() => new DemoAdapter('buyer-ready'));
  const [role, setRoleState] = useState<Role>(() => readStoredRole());
  const [actorOverride, setActorOverride] = useState<EntityId | undefined>();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const ledger = useSyncExternalStore(
    useCallback((listener: () => void) => adapter.subscribe(listener), [adapter]),
    useCallback(() => adapter.snapshot(), [adapter]),
    useCallback(() => adapter.snapshot(), [adapter]),
  );

  const requestedMode = searchParams.get('mode');
  // A workspace route without an explicit mode asks rather than guessing.
  const mode: Mode | undefined =
    requestedMode === 'testnet'
      ? 'testnet'
      : requestedMode === 'demo'
        ? 'demo'
        : location.pathname.startsWith('/app/')
          ? undefined
          : 'demo';

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    setActorOverride(undefined);
    try {
      window.localStorage.setItem(ROLE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const enterDemo = useCallback(
    async (preset?: ScenarioPreset) => {
      if (preset && preset !== adapter.preset) await adapter.loadPreset(preset);
    },
    [adapter],
  );

  const resetDemo = useCallback(
    async (preset?: ScenarioPreset) => {
      await adapter.resetDemo(preset ?? adapter.preset);
      setActorOverride(undefined);
    },
    [adapter],
  );

  const actorId = actorOverride ?? (role === 'visitor' ? DEMO_ACTORS.buyer : DEMO_ACTORS[role]);

  const value = useMemo<EnvironmentValue>(() => {
    const environment: Environment | undefined =
      mode === 'demo'
        ? { mode: 'demo', adapter }
        : mode === 'testnet'
          ? { mode: 'testnet', adapter: undefined, configuration: TESTNET_CONFIGURATION }
          : undefined;
    return {
      mode,
      environment,
      demo: adapter,
      ledger,
      role,
      actorId,
      actor: ledger.participants[actorId],
      setRole,
      setActorId: setActorOverride,
      enterDemo,
      resetDemo,
      preset: adapter.preset,
      recovery: adapter.state.recovery,
      testnet: TESTNET_CONFIGURATION,
    };
  }, [mode, adapter, ledger, role, actorId, setRole, enterDemo, resetDemo]);

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
