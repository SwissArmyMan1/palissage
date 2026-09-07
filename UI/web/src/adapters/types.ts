/**
 * The single boundary between screens and data.
 *
 * Pages never choose between fixtures and a wallet: they hold a
 * `PalissageAdapter`, and the environment decides which implementation is
 * behind it. Contract shape follows 04-data-contracts-and-states.md §7.
 */

import type {
  Allocation,
  Capability,
  DisputeCase,
  DocumentRef,
  EntityId,
  LotDraft,
  LotPresentation,
  LotRecord,
  LotReviewRequest,
  Milestone,
  Mode,
  Money,
  OfferSettlement,
  ParticipantSummary,
  Position,
  PrimaryOffer,
  ProducerProfile,
  ProductionStatus,
  Redemption,
  SecondaryListing,
  TradeRecord,
  ActivityItem,
  DeliveryDestination,
  Hex,
} from '@/domain/types';
import type { MarketFlags } from '@/domain/capabilities';

/** Everything a screen can read, resolved consistently from one snapshot. */
export interface Ledger {
  scenarioId: string;
  version: number;
  /** Simulated clock in demo; last observed block time in testnet. */
  nowIso: string;
  sequence: number;
  markets: MarketFlags;
  primaryFeeBps: number;
  secondaryFeeBps: number;
  participants: Record<EntityId, ParticipantSummary>;
  producers: Record<EntityId, ProducerProfile>;
  lots: Record<EntityId, LotRecord>;
  presentations: Record<EntityId, LotPresentation>;
  offers: Record<EntityId, PrimaryOffer>;
  settlements: Record<EntityId, OfferSettlement>;
  allocations: Record<EntityId, Allocation>;
  /** Keyed `${accountId}:${lotId}`. */
  positions: Record<string, Position>;
  listings: Record<EntityId, SecondaryListing>;
  trades: Record<EntityId, TradeRecord>;
  redemptions: Record<EntityId, Redemption>;
  cases: Record<EntityId, DisputeCase>;
  documents: Record<EntityId, DocumentRef>;
  reviews: Record<EntityId, LotReviewRequest>;
  drafts: Record<EntityId, LotDraft>;
  destinations: Record<EntityId, DeliveryDestination>;
  /** Off-market cash balances, for showing what a demo buyer can still spend. */
  cash: Record<EntityId, Money>;
  activity: ActivityItem[];
  receipts: Record<string, Receipt>;
  counters: Record<string, number>;
}

export type QueryResult<T> = {
  data: T;
  origin: import('@/domain/types').DataOrigin;
  receivedAt: string;
  completeness: 'complete' | 'partial';
  warnings: string[];
  nextCursor?: string;
};

export type ActionName =
  | 'createLot'
  | 'verifyLot'
  | 'requestLotChanges'
  | 'setProductionStatus'
  | 'createOffer'
  | 'cancelOffer'
  | 'reserve'
  | 'payRemainder'
  | 'confirmMilestone'
  | 'withdrawReleased'
  | 'list'
  | 'buy'
  | 'cancelListing'
  | 'requestRedemption'
  | 'markShipped'
  | 'confirmDelivery'
  | 'cancelRedemption'
  | 'refundRedemption'
  | 'reviewParticipant'
  | 'submitLotReview'
  | 'submitMilestoneEvidence'
  | 'reportDeliveryProblem'
  | 'resolveCase'
  | 'advanceClock'
  | 'saveLotDraft';

/** Discriminated payloads — a component can never pass raw calldata. */
export type CommandArgs =
  | { action: 'createLot'; draftId: EntityId }
  | { action: 'submitLotReview'; lotId: EntityId; documentIds: EntityId[] }
  | { action: 'requestLotChanges'; reviewId: EntityId; reason: string }
  | { action: 'verifyLot'; reviewId: EntityId }
  | { action: 'setProductionStatus'; lotId: EntityId; production: ProductionStatus; documentId?: EntityId }
  | {
      action: 'createOffer';
      lotId: EntityId;
      kind: 'Standard' | 'EnPrimeur';
      quantity: number;
      pricePerBottle: Money;
      startTime: string;
      endTime: string;
      depositBps: number;
      fullPaymentDeadline: string;
      milestones: Pick<Milestone, 'bps' | 'description'>[];
    }
  | { action: 'cancelOffer'; offerId: EntityId }
  | { action: 'reserve'; offerId: EntityId; quantity: number; payment: 'full' | 'deposit' }
  | { action: 'payRemainder'; allocationId: EntityId }
  | { action: 'submitMilestoneEvidence'; offerId: EntityId; milestoneIndex: number; documentIds: EntityId[] }
  | { action: 'confirmMilestone'; reviewId: EntityId }
  | { action: 'withdrawReleased'; offerId: EntityId }
  | { action: 'list'; lotId: EntityId; quantity: number; pricePerBottle: Money }
  | { action: 'cancelListing'; listingId: EntityId }
  | { action: 'buy'; listingId: EntityId; quantity: number; maxPricePerBottle: Money; deadline: string }
  | { action: 'requestRedemption'; lotId: EntityId; quantity: number; destinationId: EntityId }
  | { action: 'markShipped'; redemptionId: EntityId; documentId: EntityId; carrier?: string; reference?: string }
  | { action: 'confirmDelivery'; redemptionId: EntityId }
  | { action: 'cancelRedemption'; redemptionId: EntityId }
  | { action: 'refundRedemption'; redemptionId: EntityId; reason: string }
  | {
      action: 'reportDeliveryProblem';
      redemptionId: EntityId;
      category: DisputeCase['category'];
      description: string;
    }
  | { action: 'resolveCase'; caseId: EntityId; outcome: 'delivery' | 'return'; reason: string }
  | { action: 'reviewParticipant'; participantId: EntityId; decision: 'approve' | 'changes' | 'reject'; reason: string }
  | { action: 'advanceClock'; toIso: string; label: string }
  | { action: 'saveLotDraft'; draft: LotDraft };

export type Command = {
  actorId: EntityId;
  args: CommandArgs;
  /** Guards against acting on a snapshot the user is no longer looking at. */
  expectedSequence: number;
  clientRequestId: string;
};

export type PreparedAction = {
  id: string;
  mode: Mode;
  command: Command;
  capability: Capability;
  expiresAt: string;
  snapshotFingerprint: string;
  approvals: {
    token: Money['token'];
    spender: string;
    kind: 'erc20' | 'erc1155';
    amount?: string;
    required: boolean;
    label: string;
  }[];
  /** Business summary rows shown in the review dialog, already resolved. */
  summary: { key: string; value: string; emphasis?: boolean }[];
};

export type ReceiptState = 'submitted' | 'confirmed' | 'reverted' | 'replaced' | 'unknown';

export type Receipt = {
  id: string;
  mode: Mode;
  action: ActionName;
  entityId?: EntityId;
  state: ReceiptState;
  /** Only ever set in testnet. Demo carries `reference` instead. */
  txHash?: Hex;
  reference?: string;
  blockNumber?: string;
  errorCode?: string;
  activityIds: EntityId[];
  occurredAt: string;
};

export type AdapterError = {
  code:
    | 'CAPABILITY_DENIED'
    | 'STALE_SNAPSHOT'
    | 'VALIDATION_FAILED'
    | 'NOT_FOUND'
    | 'INTEGRATION_UNAVAILABLE'
    | 'CONFIGURATION_ERROR'
    | 'RPC_UNAVAILABLE'
    | 'DUPLICATE_REQUEST';
  reason?: string;
  detail?: string;
};

export class AdapterFailure extends Error {
  readonly failure: AdapterError;

  constructor(failure: AdapterError) {
    super(`${failure.code}${failure.reason ? `: ${failure.reason}` : ''}`);
    this.name = 'AdapterFailure';
    this.failure = failure;
  }
}

export type ScenarioPreset = 'buyer-ready' | 'producer-start' | 'delivery-ready' | 'issues';

export interface PalissageAdapter {
  readonly mode: Mode;
  /** Current consistent snapshot. Reads inside one render never tear. */
  snapshot(): Ledger;
  subscribe(listener: () => void): () => void;
  prepare(command: Command): Promise<PreparedAction>;
  execute(preparedId: string): Promise<Receipt>;
  receipt(receiptId: string): Receipt | undefined;
  resetDemo?(preset: ScenarioPreset): Promise<void>;
  loadPreset?(preset: ScenarioPreset): Promise<void>;
  readonly preset?: ScenarioPreset;
}
