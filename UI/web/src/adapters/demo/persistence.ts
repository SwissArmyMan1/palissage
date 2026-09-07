/**
 * Versioned local persistence for the demo session.
 *
 * Only the preset name and the committed commands are stored, in the single
 * namespace `palissage.demo.v1`. Replaying them reproduces the ledger exactly,
 * so nothing derived is written to disk. Free-text notes and any hand-typed
 * contact or address details never leave memory.
 */

import type { Command, ScenarioPreset } from '../types';

export const DEMO_STORAGE_KEY = 'palissage.demo.v1';
export const PERSISTED_VERSION = 1;
/** Marker written instead of free text, so a note is never serialised. */
export const REDACTED = '[not stored in this browser]';
/** Destinations created from hand-typed details live only for the session. */
export const SESSION_DESTINATION_PREFIX = 'session-address-';

export type PersistedSession = {
  version: number;
  scenarioId: string;
  preset: ScenarioPreset;
  commands: Command[];
  savedAt: string;
};

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; session: PersistedSession }
  | { status: 'incompatible'; detail: string };

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Removes anything a person typed by hand before the command is written down. */
export function sanitiseCommand(command: Command, fallbackDestinationId: string): Command {
  const args = command.args;
  switch (args.action) {
    case 'requestLotChanges':
    case 'refundRedemption':
      return { ...command, args: { ...args, reason: REDACTED } };
    case 'resolveCase':
    case 'reviewParticipant':
      return { ...command, args: { ...args, reason: REDACTED } };
    case 'reportDeliveryProblem':
      return { ...command, args: { ...args, description: REDACTED } };
    case 'requestRedemption':
      return args.destinationId.startsWith(SESSION_DESTINATION_PREFIX)
        ? { ...command, args: { ...args, destinationId: fallbackDestinationId } }
        : command;
    case 'markShipped':
      return { ...command, args: { ...args, carrier: undefined, reference: undefined } };
    default:
      return command;
  }
}

export function load(): LoadResult {
  const store = storage();
  if (!store) return { status: 'empty' };
  const raw = store.getItem(DEMO_STORAGE_KEY);
  if (!raw) return { status: 'empty' };
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.version !== PERSISTED_VERSION) {
      return { status: 'incompatible', detail: `stored version ${parsed.version}` };
    }
    if (!Array.isArray(parsed.commands)) return { status: 'incompatible', detail: 'command log' };
    return { status: 'ok', session: parsed };
  } catch (error) {
    return { status: 'incompatible', detail: error instanceof Error ? error.message : 'unreadable' };
  }
}

export function save(session: PersistedSession): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A full or blocked storage never breaks the running demo.
  }
}

/** Clears this demo's namespace only — never the whole of local storage. */
export function clear(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
