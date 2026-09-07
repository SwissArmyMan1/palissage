/**
 * Normalized domain records for the Palissage UI.
 * Source of truth: specifications/ui-mvp/04-data-contracts-and-states.md §3.
 *
 * Monetary values never use `number`. JSON carries base-unit strings; all
 * arithmetic happens on `bigint` in domain/money.ts.
 */

export type EntityId = string;
export type Address = `0x${string}`;
export type DemoWalletId = `demo-wallet-${string}`;
export type Hex = `0x${string}`;
/** Base units only: /^\d+$/ — no exponent, no decimal point. */
export type UnitString = string;

export type Locale = 'en' | 'fr';
export type Mode = 'demo' | 'testnet';
export type Role = 'buyer' | 'winery' | 'operations' | 'visitor';

export type EvidenceLevel =
  | 'illustrative'
  | 'self_reported'
  | 'document_available'
  | 'hash_anchored'
  | 'reviewed'
  | 'unavailable'
  | 'mismatch';

export type DataOrigin =
  | { kind: 'fixture'; scenarioId: string; version: number }
  | {
      kind: 'chain';
      chainId: 421614;
      contract: Address;
      blockNumber: string;
      blockHash: Hex;
      readAt: string;
      txHash?: Hex;
    }
  | { kind: 'editorial'; revision: string; reviewedAt?: string }
  | { kind: 'offchain'; recordId: string; updatedAt: string };

export type Sourced<T> = { value: T; origin: DataOrigin; evidence: EvidenceLevel };

export type Money = {
  units: UnitString;
  token: Address | 'DEMO_EUR';
  decimals: number;
  symbol: string;
  chainId: 421614 | null;
};

export type Capability = {
  allowed: boolean;
  /** Present whenever `allowed` is false, or when the read itself failed. */
  reasonCode?: CapabilityReason;
  checkedAt: string;
  dependsOnBlock?: string;
};

export type CapabilityReason =
  | 'UNKNOWN'
  | 'NOT_CONNECTED'
  | 'WRONG_ROLE'
  | 'NOT_OWNER'
  | 'NOT_ELIGIBLE'
  | 'ELIGIBILITY_EXPIRED'
  | 'LOT_NOT_VERIFIED'
  | 'LOT_SUSPENDED'
  | 'LOT_CLOSED'
  | 'MARKET_PAUSED'
  | 'OFFER_NOT_OPEN'
  | 'OFFER_SOLD_OUT'
  | 'DEADLINE_PASSED'
  | 'NOT_READY_FOR_DELIVERY'
  | 'NO_TRANSFERABLE_BALANCE'
  | 'BALANCE_FROZEN'
  | 'NOTHING_WITHDRAWABLE'
  | 'ALREADY_SETTLED'
  | 'WRONG_STATE'
  | 'MISSING_EVIDENCE'
  | 'MISSING_CONTRACT_ROLE'
  | 'INTEGRATION_UNAVAILABLE'
  | 'SELF_TRADE';

export type DocumentVisibility = 'public' | 'participants' | 'operations';

export type DocumentRef = {
  id: EntityId;
  label: string;
  kind: string;
  visibility: DocumentVisibility;
  mediaType: string;
  byteSize: number;
  digest?: Hex;
  digestAlgorithm?: 'sha256' | 'keccak256';
  evidence: EvidenceLevel;
  reviewerLabel?: string;
  reviewedAt?: string;
  uri?: string;
  origin: DataOrigin;
};

export type LotStatus = 'Draft' | 'Verified' | 'Suspended' | 'Closed';

export type ProductionStatus =
  | 'Announced'
  | 'Growing'
  | 'Harvested'
  | 'Vinification'
  | 'Aging'
  | 'Bottled'
  | 'ReadyForDelivery';

export const PRODUCTION_ORDER: ProductionStatus[] = [
  'Announced',
  'Growing',
  'Harvested',
  'Vinification',
  'Aging',
  'Bottled',
  'ReadyForDelivery',
];

export interface LotRecord {
  id: EntityId;
  producerId: EntityId;
  winery: Address | DemoWalletId;
  name: string;
  region: string;
  grapes: string;
  vintage: number;
  totalBottles: number;
  /** Cumulative ever-minted supply. Never decreases. */
  mintedBottles: number;
  /** Burned on completed redemption. */
  redeemedBottles: number;
  bottleSizeMl: number;
  royaltyBps: number;
  exportAllowed: boolean;
  status: LotStatus;
  production: ProductionStatus;
  verifier?: Address | DemoWalletId;
  metadataUri?: string;
  docsHash?: Hex;
  origin: DataOrigin;
}

export type WineColor = 'red' | 'white' | 'rose' | 'sparkling';

export interface LotPresentation {
  lotId: EntityId;
  revision: number;
  title: Record<Locale, string>;
  producerSlug: string;
  color: WineColor;
  appellation?: Sourced<string>;
  description: Record<Locale, string>;
  imageAssetIds: string[];
  documents: DocumentRef[];
  expectedAvailability?: Sourced<string>;
  caseSize: number;
  minOrderBottles: number;
  warehouseLabel?: Sourced<string>;
  originCountry?: string;
  abv?: Sourced<string>;
  certifications: Sourced<string>[];
  tradeTerms: {
    incoterm?: Sourced<string>;
    shipping: 'quote_required' | 'included';
    taxes: 'not_calculated' | 'included';
    allowedDestinations: string[];
  };
}

export type OfferKind = 'Standard' | 'EnPrimeur';

export interface PrimaryOffer {
  id: EntityId;
  lotId: EntityId;
  winery: Address | DemoWalletId;
  paymentToken: Money['token'];
  pricePerBottle: Money;
  quantity: number;
  reserved: number;
  startTime: string;
  endTime: string;
  depositBps: number;
  fullPaymentDeadline: string;
  kind: OfferKind;
  active: boolean;
  origin: DataOrigin;
}

/** Derived UI state; priority cancelled → ended → scheduled → sold_out → open. */
export type OfferState = 'cancelled' | 'ended' | 'scheduled' | 'sold_out' | 'open';

export type AllocationState = 'Reserved' | 'Paid' | 'Cancelled' | 'Defaulted';

export interface Allocation {
  id: EntityId;
  offerId: EntityId;
  buyerId: EntityId;
  quantity: number;
  pricePerBottle: Money;
  totalDue: Money;
  paidAmount: Money;
  createdAt: string;
  state: AllocationState;
  origin: DataOrigin;
}

export interface Position {
  accountId: EntityId;
  lotId: EntityId;
  walletBottles: number;
  frozenBottles: number;
  redemptionEscrowBottles: number;
  origin: DataOrigin;
}

export interface SecondaryListing {
  id: EntityId;
  sellerId: EntityId;
  lotId: EntityId;
  quantity: number;
  /** Quantity at creation time; used to show remaining vs initial. */
  initialQuantity: number;
  pricePerBottle: Money;
  paymentToken: Money['token'];
  active: boolean;
  createdAt: string;
  closedAt?: string;
  closedReason?: 'sold' | 'cancelled';
  origin: DataOrigin;
}

export type RedemptionState = 'Requested' | 'Shipped' | 'Completed' | 'Cancelled';

export interface Redemption {
  id: EntityId;
  buyerId: EntityId;
  lotId: EntityId;
  quantity: number;
  deliveryDataHash: Hex;
  shipmentDocsHash?: Hex;
  requestedAt: string;
  shippedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  carrier?: string;
  trackingReference?: string;
  state: RedemptionState;
  /** Offchain overlay; never a fifth Solidity enum value. */
  caseId?: EntityId;
  destinationRef?: EntityId;
  origin: DataOrigin;
}

export type DisputeState = 'open' | 'under_review' | 'resolved_delivery' | 'resolved_return';

export interface DisputeCase {
  id: EntityId;
  redemptionId: EntityId;
  category: 'missing' | 'damaged' | 'documentation' | 'other';
  reason: string;
  state: DisputeState;
  createdAt: string;
  updatedAt: string;
  evidenceIds: EntityId[];
  resolutionNote?: string;
  origin: DataOrigin;
}

export interface Milestone {
  index: number;
  bps: number;
  released: boolean;
  description: string;
  releasedAt?: string;
  evidenceIds?: EntityId[];
}

export interface OfferSettlement {
  offerId: EntityId;
  settledFunds: Money;
  withdrawnGross: Money;
  releasedBps: number;
  primaryFeeBps: number;
  milestones: Milestone[];
  origin: DataOrigin;
}

export interface ProducerProfile {
  id: EntityId;
  slug: string;
  displayName: string;
  country: string;
  region: string;
  story: Record<Locale, string[]>;
  approach: Record<Locale, string>;
  assetIds: string[];
  evidence: EvidenceLevel;
  origin: DataOrigin;
}

export type ParticipantType = 'winery' | 'restaurant' | 'wine_shop' | 'importer' | 'operations';
export type ReviewState = 'draft' | 'submitted' | 'needs_changes' | 'accepted' | 'rejected';

export interface ClaimSummary {
  topic: string;
  issuerLabel: string;
  issuedAt?: string;
  expiresAt?: string;
  valid: boolean;
  origin: DataOrigin;
}

export interface ParticipantSummary {
  id: EntityId;
  role: Role;
  type: ParticipantType;
  displayLabel: string;
  country: string;
  wallet: Address | DemoWalletId;
  registryVerified: boolean;
  claims: ClaimSummary[];
  /** Per-contract grants, keyed `Contract.ROLE`. */
  contractGrants: Record<string, Capability>;
  reviewState: ReviewState;
  lastUpdatedAt: string;
  origin: DataOrigin;
}

export type ActivityAction =
  | 'lot.created'
  | 'lot.submitted'
  | 'lot.changes_requested'
  | 'lot.verified'
  | 'lot.production'
  | 'offer.published'
  | 'offer.cancelled'
  | 'allocation.reserved'
  | 'allocation.paid'
  | 'milestone.evidence'
  | 'milestone.confirmed'
  | 'funds.withdrawn'
  | 'listing.created'
  | 'listing.cancelled'
  | 'listing.filled'
  | 'redemption.requested'
  | 'redemption.shipped'
  | 'redemption.completed'
  | 'redemption.cancelled'
  | 'redemption.refunded'
  | 'case.opened'
  | 'case.resolved'
  | 'participant.reviewed'
  | 'clock.advanced';

export interface ActivityItem {
  id: EntityId;
  entityType: 'lot' | 'offer' | 'allocation' | 'listing' | 'redemption' | 'case' | 'participant' | 'scenario';
  entityId: EntityId;
  action: ActivityAction;
  actorId: EntityId;
  actorLabel: string;
  occurredAt: string;
  /** Ordering counter: demo timestamps can repeat, sequence never does. */
  sequence: number;
  quantity?: number;
  amount?: Money;
  receiptId?: string;
  origin: DataOrigin;
}

export interface TradeRecord {
  id: EntityId;
  listingId: EntityId;
  lotId: EntityId;
  buyerId: EntityId;
  sellerId: EntityId;
  quantity: number;
  gross: Money;
  fee: Money;
  royalty: Money;
  sellerNet: Money;
  receiptId: string;
  occurredAt: string;
  origin: DataOrigin;
}

export interface PassportView {
  id: EntityId;
  lotId: EntityId;
  producerId: EntityId;
  events: { label: Record<Locale, string>; occurredAt?: string; recorded: boolean }[];
  assetIds: string[];
  documents: DocumentRef[];
  illustrative: true;
  origin: DataOrigin;
}

export interface LotDraft {
  id: EntityId;
  ownerId: EntityId;
  name: string;
  vintage: number | null;
  region: string;
  country: string;
  grapes: { name: string; percentage: number | null }[];
  bottleSizeMl: number;
  abv: string;
  totalBottles: number | null;
  production: ProductionStatus;
  expectedReadyAt: string;
  royaltyBps: number;
  documentIds: EntityId[];
  revision: number;
  reviewState: ReviewState;
  reviewNotes: { at: string; by: string; text: string }[];
  savedAt: string;
  createdLotId?: EntityId;
}

export interface LotReviewRequest {
  id: EntityId;
  kind: 'lot' | 'milestone';
  lotId: EntityId;
  offerId?: EntityId;
  milestoneIndex?: number;
  submittedBy: EntityId;
  submittedAt: string;
  revision: number;
  documentIds: EntityId[];
  state: ReviewState;
  decidedAt?: string;
  decidedBy?: EntityId;
  reason?: string;
}

/** Fictional destination stored by reference only — never serialised free text. */
export interface DeliveryDestination {
  id: EntityId;
  recipient: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
}
