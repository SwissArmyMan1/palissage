/**
 * The demonstration adapter: a deterministic local simulator.
 *
 * It requires no wallet, no RPC and no backend. Actions go through
 * prepare → execute so the review step is a real gate, and every execution is
 * a single atomic reduction that also gets appended to the persisted command
 * log for an identical replay after reload.
 */

import type { EntityId } from '@/domain/types';
import type { Command, Ledger, PalissageAdapter, PreparedAction, Receipt, ScenarioPreset } from '../types';
import { AdapterFailure } from '../types';
import { ledgerForPreset, SAMPLE_DESTINATION, SCENARIO_ID } from './fixtures';
import { reduce } from './reducer';
import { clear, load, PERSISTED_VERSION, sanitiseCommand, save, type PersistedSession } from './persistence';

/** Prepared reviews go stale so a confirmation can never use old numbers. */
const PREPARE_TTL_MS = 10 * 60 * 1000;

export type DemoAdapterState = {
  preset: ScenarioPreset;
  restored: boolean;
  /** Set when a stored session could not be replayed and was discarded. */
  recovery?: string;
};

export class DemoAdapter implements PalissageAdapter {
  readonly mode = 'demo' as const;

  private ledger: Ledger;
  private commands: Command[] = [];
  private listeners = new Set<() => void>();
  private prepared = new Map<string, PreparedAction>();
  private seenRequestIds = new Set<string>();
  private presetName: ScenarioPreset;
  private prepareCounter = 0;

  state: DemoAdapterState;

  constructor(preset: ScenarioPreset = 'buyer-ready', options: { restore?: boolean } = {}) {
    this.presetName = preset;
    this.ledger = ledgerForPreset(preset);
    this.state = { preset, restored: false };
    if (options.restore !== false) this.restore();
  }

  get preset(): ScenarioPreset {
    return this.presetName;
  }

  snapshot(): Ledger {
    return this.ledger;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private restore(): void {
    const result = load();
    if (result.status === 'empty') return;
    if (result.status === 'incompatible') {
      this.state = { ...this.state, recovery: result.detail };
      clear();
      return;
    }
    const session = result.session;
    if (session.scenarioId !== SCENARIO_ID) {
      this.state = { ...this.state, recovery: 'scenario' };
      clear();
      return;
    }
    let ledger = ledgerForPreset(session.preset);
    const replayed: Command[] = [];
    try {
      for (const command of session.commands) {
        ledger = reduce(ledger, { ...command, expectedSequence: ledger.sequence }).ledger;
        replayed.push(command);
      }
    } catch (error) {
      // A partially replayable log keeps what succeeded and reports the rest.
      this.state = { ...this.state, recovery: error instanceof Error ? error.message : 'replay' };
    }
    this.presetName = session.preset;
    this.ledger = ledger;
    this.commands = replayed;
    replayed.forEach((command) => this.seenRequestIds.add(command.clientRequestId));
    this.state = { ...this.state, preset: session.preset, restored: replayed.length > 0 };
  }

  private persist(): void {
    const session: PersistedSession = {
      version: PERSISTED_VERSION,
      scenarioId: SCENARIO_ID,
      preset: this.presetName,
      commands: this.commands.map((command) => sanitiseCommand(command, SAMPLE_DESTINATION.id)),
      savedAt: new Date().toISOString(),
    };
    save(session);
  }

  async prepare(command: Command): Promise<PreparedAction> {
    if (this.seenRequestIds.has(command.clientRequestId)) {
      throw new AdapterFailure({ code: 'DUPLICATE_REQUEST', reason: command.clientRequestId });
    }
    if (command.expectedSequence !== this.ledger.sequence) {
      throw new AdapterFailure({ code: 'STALE_SNAPSHOT', reason: 'sequence' });
    }
    // Dry-run the reduction so an impossible action fails in review, not after
    // a confirmation that already claimed success.
    const trial = reduce(this.ledger, command);
    this.prepareCounter += 1;
    const prepared: PreparedAction = {
      id: `demo-prepared-${this.prepareCounter}`,
      mode: 'demo',
      command,
      capability: { allowed: true, checkedAt: this.ledger.nowIso },
      expiresAt: new Date(Date.now() + PREPARE_TTL_MS).toISOString(),
      snapshotFingerprint: `${this.ledger.scenarioId}:${this.ledger.sequence}`,
      // No wallet permission exists in the simulator.
      approvals: [],
      summary: [
        { key: 'action', value: command.args.action },
        { key: 'entity', value: trial.receipt.entityId ?? '' },
      ],
    };
    this.prepared.set(prepared.id, prepared);
    return prepared;
  }

  async execute(preparedId: string): Promise<Receipt> {
    const prepared = this.prepared.get(preparedId);
    if (!prepared) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'prepared' });
    if (Date.parse(prepared.expiresAt) < Date.now()) {
      this.prepared.delete(preparedId);
      throw new AdapterFailure({ code: 'STALE_SNAPSHOT', reason: 'expired' });
    }
    if (this.seenRequestIds.has(prepared.command.clientRequestId)) {
      throw new AdapterFailure({ code: 'DUPLICATE_REQUEST', reason: prepared.command.clientRequestId });
    }
    const command: Command = { ...prepared.command, expectedSequence: this.ledger.sequence };
    const { ledger, receipt } = reduce(this.ledger, command);
    this.ledger = ledger;
    this.commands.push(command);
    this.seenRequestIds.add(command.clientRequestId);
    this.prepared.delete(preparedId);
    this.persist();
    this.emit();
    return receipt;
  }

  receipt(receiptId: string): Receipt | undefined {
    return this.ledger.receipts[receiptId];
  }

  /** Registers a destination typed during this session; it is never persisted. */
  addSessionDestination(destination: import('@/domain/types').DeliveryDestination): void {
    this.ledger = { ...this.ledger, destinations: { ...this.ledger.destinations, [destination.id]: destination } };
    this.emit();
  }

  async resetDemo(preset: ScenarioPreset = this.presetName): Promise<void> {
    this.presetName = preset;
    this.ledger = ledgerForPreset(preset);
    this.commands = [];
    this.seenRequestIds.clear();
    this.prepared.clear();
    this.state = { preset, restored: false };
    clear();
    this.emit();
  }

  async loadPreset(preset: ScenarioPreset): Promise<void> {
    await this.resetDemo(preset);
    this.persist();
  }

  /** Used by the account screen to explain exactly what is stored locally. */
  storedCommandCount(): number {
    return this.commands.length;
  }

  actorLabel(id: EntityId): string {
    return this.ledger.participants[id]?.displayLabel ?? id;
  }
}
