/**
 * Derived states and per-action capability rules.
 *
 * A capability is always specific: an entity, an action, a reason code and the
 * time it was checked. A navigation role never widens a capability — the app
 * guard exists for UX, the contract remains the authority.
 */

import type {
  Allocation,
  Capability,
  CapabilityReason,
  DisputeCase,
  EntityId,
  LotRecord,
  Milestone,
  Money,
  OfferSettlement,
  OfferState,
  ParticipantSummary,
  Position,
  PrimaryOffer,
  Redemption,
  SecondaryListing,
} from './types';
import { isZero, units, withdrawableGross } from './money';

export type MarketFlags = { primaryPaused: boolean; secondaryPaused: boolean };

export const OPEN_MARKETS: MarketFlags = { primaryPaused: false, secondaryPaused: false };

function allow(checkedAt: string): Capability {
  return { allowed: true, checkedAt };
}

function deny(reasonCode: CapabilityReason, checkedAt: string): Capability {
  return { allowed: false, reasonCode, checkedAt };
}

/* ------------------------------------------------------------------ */
/* Derived states                                                      */
/* ------------------------------------------------------------------ */

/** Priority order fixed by 04 §5.2: cancelled → ended → scheduled → sold_out → open. */
export function offerState(offer: PrimaryOffer, nowIso: string): OfferState {
  const now = Date.parse(nowIso);
  if (!offer.active) return 'cancelled';
  if (now > Date.parse(offer.endTime)) return 'ended';
  if (now < Date.parse(offer.startTime)) return 'scheduled';
  if (offer.quantity - offer.reserved <= 0) return 'sold_out';
  return 'open';
}

export function offerAvailable(offer: PrimaryOffer): number {
  return Math.max(offer.quantity - offer.reserved, 0);
}

/** Bottles that may leave the wallet: neither frozen nor held in delivery escrow. */
export function transferableBottles(position: Position | undefined): number {
  if (!position) return 0;
  return Math.max(position.walletBottles - position.frozenBottles, 0);
}

export function circulatingBottles(lot: LotRecord): number {
  return Math.max(lot.mintedBottles - lot.redeemedBottles, 0);
}

export function isEligible(participant: ParticipantSummary | undefined, nowIso: string): boolean {
  if (!participant) return false;
  if (!participant.registryVerified) return false;
  const now = Date.parse(nowIso);
  return participant.claims.every((claim) => {
    if (!claim.valid) return false;
    if (!claim.expiresAt) return true;
    return Date.parse(claim.expiresAt) > now;
  });
}

export function eligibilityReason(
  participant: ParticipantSummary | undefined,
  nowIso: string,
): CapabilityReason | undefined {
  if (!participant) return 'NOT_CONNECTED';
  if (!participant.registryVerified) return 'NOT_ELIGIBLE';
  const now = Date.parse(nowIso);
  const expired = participant.claims.some((claim) => claim.expiresAt && Date.parse(claim.expiresAt) <= now);
  if (expired) return 'ELIGIBILITY_EXPIRED';
  if (participant.claims.some((claim) => !claim.valid)) return 'NOT_ELIGIBLE';
  return undefined;
}

function lotTradeReason(lot: LotRecord | undefined): CapabilityReason | undefined {
  if (!lot) return 'WRONG_STATE';
  if (lot.status === 'Suspended') return 'LOT_SUSPENDED';
  if (lot.status === 'Closed') return 'LOT_CLOSED';
  if (lot.status !== 'Verified') return 'LOT_NOT_VERIFIED';
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Buyer capabilities                                                  */
/* ------------------------------------------------------------------ */

export function canReserve(input: {
  offer: PrimaryOffer;
  lot: LotRecord | undefined;
  buyer: ParticipantSummary | undefined;
  markets: MarketFlags;
  nowIso: string;
}): Capability {
  const { offer, lot, buyer, markets, nowIso } = input;
  if (markets.primaryPaused) return deny('MARKET_PAUSED', nowIso);
  const lotReason = lotTradeReason(lot);
  if (lotReason) return deny(lotReason, nowIso);
  const state = offerState(offer, nowIso);
  if (state === 'sold_out') return deny('OFFER_SOLD_OUT', nowIso);
  if (state !== 'open') return deny('OFFER_NOT_OPEN', nowIso);
  if (buyer?.role !== 'buyer') return deny(buyer ? 'WRONG_ROLE' : 'NOT_CONNECTED', nowIso);
  const eligibility = eligibilityReason(buyer, nowIso);
  if (eligibility) return deny(eligibility, nowIso);
  return allow(nowIso);
}

export function canPayRemainder(input: {
  allocation: Allocation;
  offer: PrimaryOffer;
  actorId: EntityId | undefined;
  markets: MarketFlags;
  nowIso: string;
}): Capability {
  const { allocation, offer, actorId, markets, nowIso } = input;
  if (markets.primaryPaused) return deny('MARKET_PAUSED', nowIso);
  if (allocation.buyerId !== actorId) return deny('NOT_OWNER', nowIso);
  if (allocation.state !== 'Reserved') return deny('WRONG_STATE', nowIso);
  // Inclusive boundary: the deadline second itself still allows payment.
  if (Date.parse(nowIso) > Date.parse(offer.fullPaymentDeadline)) return deny('DEADLINE_PASSED', nowIso);
  return allow(nowIso);
}

export function isOverdue(allocation: Allocation, offer: PrimaryOffer, nowIso: string): boolean {
  return allocation.state === 'Reserved' && Date.parse(nowIso) > Date.parse(offer.fullPaymentDeadline);
}

export function canListForResale(input: {
  lot: LotRecord | undefined;
  position: Position | undefined;
  seller: ParticipantSummary | undefined;
  markets: MarketFlags;
  nowIso: string;
}): Capability {
  const { lot, position, seller, markets, nowIso } = input;
  if (markets.secondaryPaused) return deny('MARKET_PAUSED', nowIso);
  const lotReason = lotTradeReason(lot);
  if (lotReason) return deny(lotReason, nowIso);
  const eligibility = eligibilityReason(seller, nowIso);
  if (eligibility) return deny(eligibility, nowIso);
  const transferable = transferableBottles(position);
  if (transferable <= 0) {
    return deny(position && position.frozenBottles > 0 ? 'BALANCE_FROZEN' : 'NO_TRANSFERABLE_BALANCE', nowIso);
  }
  return allow(nowIso);
}

export function canBuyListing(input: {
  listing: SecondaryListing;
  lot: LotRecord | undefined;
  buyer: ParticipantSummary | undefined;
  sellerPosition: Position | undefined;
  markets: MarketFlags;
  nowIso: string;
}): Capability {
  const { listing, lot, buyer, sellerPosition, markets, nowIso } = input;
  if (markets.secondaryPaused) return deny('MARKET_PAUSED', nowIso);
  if (!listing.active || listing.quantity <= 0) return deny('WRONG_STATE', nowIso);
  const lotReason = lotTradeReason(lot);
  if (lotReason) return deny(lotReason, nowIso);
  if (!buyer) return deny('NOT_CONNECTED', nowIso);
  if (buyer.id === listing.sellerId) return deny('SELF_TRADE', nowIso);
  if (buyer.role !== 'buyer') return deny('WRONG_ROLE', nowIso);
  const eligibility = eligibilityReason(buyer, nowIso);
  if (eligibility) return deny(eligibility, nowIso);
  // A listing never escrows tokens, so the seller balance is re-read here.
  if (transferableBottles(sellerPosition) <= 0) return deny('NO_TRANSFERABLE_BALANCE', nowIso);
  return allow(nowIso);
}

/** Live remainder of a lazy listing: the lower of listed and seller-transferable. */
export function listingAvailable(listing: SecondaryListing, sellerPosition: Position | undefined): number {
  return Math.max(Math.min(listing.quantity, transferableBottles(sellerPosition)), 0);
}

export function canRequestDelivery(input: {
  lot: LotRecord | undefined;
  position: Position | undefined;
  buyer: ParticipantSummary | undefined;
  nowIso: string;
}): Capability {
  const { lot, position, buyer, nowIso } = input;
  if (!lot) return deny('WRONG_STATE', nowIso);
  if (lot.production !== 'ReadyForDelivery') return deny('NOT_READY_FOR_DELIVERY', nowIso);
  const lotReason = lotTradeReason(lot);
  if (lotReason) return deny(lotReason, nowIso);
  const eligibility = eligibilityReason(buyer, nowIso);
  if (eligibility) return deny(eligibility, nowIso);
  const transferable = transferableBottles(position);
  if (transferable <= 0) {
    return deny(position && position.frozenBottles > 0 ? 'BALANCE_FROZEN' : 'NO_TRANSFERABLE_BALANCE', nowIso);
  }
  return allow(nowIso);
}

export function canCancelRedemption(input: {
  redemption: Redemption;
  actorId: EntityId | undefined;
  openCase: DisputeCase | undefined;
  nowIso: string;
}): Capability {
  const { redemption, actorId, openCase, nowIso } = input;
  if (redemption.buyerId !== actorId) return deny('NOT_OWNER', nowIso);
  // Shipped removes the buyer's own cancellation; the issue path takes over.
  if (redemption.state !== 'Requested') return deny('WRONG_STATE', nowIso);
  if (openCase && (openCase.state === 'open' || openCase.state === 'under_review')) {
    return deny('WRONG_STATE', nowIso);
  }
  return allow(nowIso);
}

export function canConfirmDelivery(input: {
  redemption: Redemption;
  actorId: EntityId | undefined;
  nowIso: string;
}): Capability {
  const { redemption, actorId, nowIso } = input;
  if (redemption.buyerId !== actorId) return deny('NOT_OWNER', nowIso);
  if (redemption.state !== 'Shipped') return deny('WRONG_STATE', nowIso);
  return allow(nowIso);
}

/* ------------------------------------------------------------------ */
/* Winery capabilities                                                 */
/* ------------------------------------------------------------------ */

export function canCreateLot(winery: ParticipantSummary | undefined, nowIso: string): Capability {
  if (!winery) return deny('NOT_CONNECTED', nowIso);
  if (winery.role !== 'winery') return deny('WRONG_ROLE', nowIso);
  const eligibility = eligibilityReason(winery, nowIso);
  if (eligibility) return deny(eligibility, nowIso);
  return allow(nowIso);
}

export function canCreateOffer(input: {
  lot: LotRecord | undefined;
  actor: ParticipantSummary | undefined;
  offerableBottles: number;
  markets: MarketFlags;
  nowIso: string;
}): Capability {
  const { lot, actor, offerableBottles, markets, nowIso } = input;
  if (markets.primaryPaused) return deny('MARKET_PAUSED', nowIso);
  if (!lot) return deny('WRONG_STATE', nowIso);
  if (lot.producerId !== actor?.id) return deny('NOT_OWNER', nowIso);
  if (lot.status !== 'Verified') return deny('LOT_NOT_VERIFIED', nowIso);
  if (offerableBottles <= 0) return deny('OFFER_SOLD_OUT', nowIso);
  return allow(nowIso);
}

export function canAdvanceProduction(input: {
  lot: LotRecord | undefined;
  actor: ParticipantSummary | undefined;
  nowIso: string;
}): Capability {
  const { lot, actor, nowIso } = input;
  if (!lot) return deny('WRONG_STATE', nowIso);
  if (lot.producerId !== actor?.id) return deny('NOT_OWNER', nowIso);
  if (lot.production === 'ReadyForDelivery') return deny('ALREADY_SETTLED', nowIso);
  return allow(nowIso);
}

export function canWithdraw(input: {
  settlement: OfferSettlement | undefined;
  offer: PrimaryOffer | undefined;
  actor: ParticipantSummary | undefined;
  nowIso: string;
}): Capability {
  const { settlement, offer, actor, nowIso } = input;
  if (!settlement || !offer) return deny('WRONG_STATE', nowIso);
  if (!actor || actor.role !== 'winery') return deny(actor ? 'WRONG_ROLE' : 'NOT_CONNECTED', nowIso);
  const available = withdrawableGross(settlement.settledFunds, settlement.releasedBps, settlement.withdrawnGross);
  if (isZero(available)) return deny('NOTHING_WITHDRAWABLE', nowIso);
  return allow(nowIso);
}

export function withdrawableFor(settlement: OfferSettlement): Money {
  return withdrawableGross(settlement.settledFunds, settlement.releasedBps, settlement.withdrawnGross);
}

export function canMarkShipped(input: {
  redemption: Redemption;
  lot: LotRecord | undefined;
  actor: ParticipantSummary | undefined;
  nowIso: string;
}): Capability {
  const { redemption, lot, actor, nowIso } = input;
  if (!lot || lot.producerId !== actor?.id) return deny('NOT_OWNER', nowIso);
  if (redemption.state !== 'Requested') return deny('WRONG_STATE', nowIso);
  return allow(nowIso);
}

/* ------------------------------------------------------------------ */
/* Operations capabilities                                             */
/* ------------------------------------------------------------------ */

/** Grant keys mirror the contract that actually holds the role. */
export const GRANT = {
  tokenVerifier: 'WineLotToken.VERIFIER_ROLE',
  tokenEnforcer: 'WineLotToken.ENFORCER_ROLE',
  primaryVerifier: 'PrimaryMarket.VERIFIER_ROLE',
  primaryAdmin: 'PrimaryMarket.DEFAULT_ADMIN_ROLE',
  redemptionVerifier: 'RedemptionManager.VERIFIER_ROLE',
  gatewayAdmin: 'RoleGateway.Admin',
} as const;

export function hasGrant(actor: ParticipantSummary | undefined, grant: string): boolean {
  return actor?.contractGrants[grant]?.allowed === true;
}

export function canVerifyLot(input: {
  lot: LotRecord | undefined;
  actor: ParticipantSummary | undefined;
  evidenceComplete: boolean;
  nowIso: string;
}): Capability {
  const { lot, actor, evidenceComplete, nowIso } = input;
  if (!lot) return deny('WRONG_STATE', nowIso);
  if (lot.status !== 'Draft') return deny('WRONG_STATE', nowIso);
  // A gateway admin badge is not a token verifier role.
  if (!hasGrant(actor, GRANT.tokenVerifier)) return deny('MISSING_CONTRACT_ROLE', nowIso);
  if (!evidenceComplete) return deny('MISSING_EVIDENCE', nowIso);
  return allow(nowIso);
}

export function canConfirmMilestone(input: {
  milestone: Milestone | undefined;
  actor: ParticipantSummary | undefined;
  evidenceComplete: boolean;
  nowIso: string;
}): Capability {
  const { milestone, actor, evidenceComplete, nowIso } = input;
  if (!milestone) return deny('WRONG_STATE', nowIso);
  if (milestone.released) return deny('ALREADY_SETTLED', nowIso);
  if (!hasGrant(actor, GRANT.primaryVerifier)) return deny('MISSING_CONTRACT_ROLE', nowIso);
  if (!evidenceComplete) return deny('MISSING_EVIDENCE', nowIso);
  return allow(nowIso);
}

export function canResolveRedemption(input: {
  redemption: Redemption;
  actor: ParticipantSummary | undefined;
  nowIso: string;
}): Capability {
  const { redemption, actor, nowIso } = input;
  if (redemption.state !== 'Requested' && redemption.state !== 'Shipped') return deny('WRONG_STATE', nowIso);
  if (!hasGrant(actor, GRANT.redemptionVerifier)) return deny('MISSING_CONTRACT_ROLE', nowIso);
  return allow(nowIso);
}

export function canReviewParticipant(actor: ParticipantSummary | undefined, nowIso: string): Capability {
  if (!hasGrant(actor, GRANT.gatewayAdmin)) return deny('MISSING_CONTRACT_ROLE', nowIso);
  return allow(nowIso);
}

/**
 * Enforcement (freeze / forced transfer) and escrow recovery stay read-only in
 * this MVP: they need a separate specialist workflow, not an approve button.
 */
export function enforcementCapability(nowIso: string): Capability {
  return deny('INTEGRATION_UNAVAILABLE', nowIso);
}

export function settlementProgress(settlement: OfferSettlement): {
  entitledBps: number;
  releasedMilestones: number;
  totalMilestones: number;
} {
  return {
    entitledBps: settlement.releasedBps,
    releasedMilestones: settlement.milestones.filter((m) => m.released).length,
    totalMilestones: settlement.milestones.length,
  };
}

export function hasSettledFunds(settlement: OfferSettlement | undefined): boolean {
  return settlement ? units(settlement.settledFunds) > 0n : false;
}
