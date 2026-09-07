/**
 * Read helpers over one ledger snapshot.
 *
 * Every screen derives its numbers from these functions, so a figure shown on
 * the public catalogue, in a review dialog and in the winery finance tab is
 * always the same computed value rather than a page-local copy.
 */

import type {
  Allocation,
  EntityId,
  LotRecord,
  Money,
  PrimaryOffer,
  Position,
  Redemption,
  SecondaryListing,
  TradeRecord,
  ActivityItem,
} from '@/domain/types';
import { addMoney, subMoney, totalDue, units, zero } from '@/domain/money';
import { offerAvailable, offerState, transferableBottles, withdrawableFor } from '@/domain/capabilities';
import type { Ledger } from '@/adapters/types';
import { positionKey } from '@/adapters/demo/fixtures';

export type CatalogueEntry = {
  lot: LotRecord;
  offer: PrimaryOffer | undefined;
  presentation: Ledger['presentations'][string] | undefined;
  producerName: string;
  available: number;
  state: ReturnType<typeof offerState> | 'none';
};

export function catalogue(ledger: Ledger): CatalogueEntry[] {
  return Object.values(ledger.lots)
    .filter((lot) => lot.status !== 'Draft')
    .map((lot) => {
      const offer = Object.values(ledger.offers)
        .filter((candidate) => candidate.lotId === lot.id)
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      return {
        lot,
        offer,
        presentation: ledger.presentations[lot.id],
        producerName: ledger.producers[lot.producerId]?.displayName ?? lot.producerId,
        available: offer ? offerAvailable(offer) : 0,
        state: offer ? offerState(offer, ledger.nowIso) : ('none' as const),
      };
    })
    .sort((a, b) => a.lot.id.localeCompare(b.lot.id));
}

export function offerForLot(ledger: Ledger, lotId: EntityId): PrimaryOffer | undefined {
  return Object.values(ledger.offers)
    .filter((offer) => offer.lotId === lotId)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

export function offersForLot(ledger: Ledger, lotId: EntityId): PrimaryOffer[] {
  return Object.values(ledger.offers)
    .filter((offer) => offer.lotId === lotId)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function lotsForProducer(ledger: Ledger, producerId: EntityId): LotRecord[] {
  return Object.values(ledger.lots)
    .filter((lot) => lot.producerId === producerId)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function allocationsFor(ledger: Ledger, buyerId: EntityId): Allocation[] {
  return Object.values(ledger.allocations)
    .filter((allocation) => allocation.buyerId === buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function positionsFor(ledger: Ledger, accountId: EntityId): Position[] {
  return Object.values(ledger.positions)
    .filter((position) => position.accountId === accountId)
    .filter((position) => position.walletBottles > 0 || position.redemptionEscrowBottles > 0)
    .sort((a, b) => a.lotId.localeCompare(b.lotId));
}

export function positionFor(ledger: Ledger, accountId: EntityId, lotId: EntityId): Position | undefined {
  return ledger.positions[positionKey(accountId, lotId)];
}

export function listingsFor(ledger: Ledger, sellerId: EntityId): SecondaryListing[] {
  return Object.values(ledger.listings)
    .filter((listing) => listing.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export function openListings(ledger: Ledger): SecondaryListing[] {
  return Object.values(ledger.listings)
    .filter((listing) => listing.active && listing.quantity > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function redemptionsForBuyer(ledger: Ledger, buyerId: EntityId): Redemption[] {
  return Object.values(ledger.redemptions)
    .filter((redemption) => redemption.buyerId === buyerId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt) || b.id.localeCompare(a.id));
}

export function redemptionsForWinery(ledger: Ledger, producerId: EntityId): Redemption[] {
  return Object.values(ledger.redemptions)
    .filter((redemption) => ledger.lots[redemption.lotId]?.producerId === producerId)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id));
}

export function tradesForLot(ledger: Ledger, lotId: EntityId): TradeRecord[] {
  return Object.values(ledger.trades)
    .filter((trade) => trade.lotId === lotId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
}

export function tradesForAccount(ledger: Ledger, accountId: EntityId): TradeRecord[] {
  return Object.values(ledger.trades)
    .filter((trade) => trade.buyerId === accountId || trade.sellerId === accountId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
}

export function royaltiesForProducer(ledger: Ledger, producerId: EntityId): TradeRecord[] {
  return Object.values(ledger.trades)
    .filter((trade) => ledger.lots[trade.lotId]?.producerId === producerId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
}

export function activityFor(ledger: Ledger, predicate: (item: ActivityItem) => boolean, limit = 20): ActivityItem[] {
  return ledger.activity
    .filter(predicate)
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, limit);
}

export function activityForEntity(ledger: Ledger, entityId: EntityId, limit = 50): ActivityItem[] {
  return activityFor(ledger, (item) => item.entityId === entityId, limit);
}

/** Total still owed across a buyer's reserved allocations. */
export function balanceDue(ledger: Ledger, buyerId: EntityId): Money {
  return allocationsFor(ledger, buyerId)
    .filter((allocation) => allocation.state === 'Reserved')
    .reduce((sum, allocation) => addMoney(sum, subMoney(allocation.totalDue, allocation.paidAmount)), zero());
}

export function bottlesHeld(ledger: Ledger, accountId: EntityId): number {
  return positionsFor(ledger, accountId).reduce((sum, position) => sum + position.walletBottles, 0);
}

export function bottlesInEscrow(ledger: Ledger, accountId: EntityId): number {
  return positionsFor(ledger, accountId).reduce((sum, position) => sum + position.redemptionEscrowBottles, 0);
}

export type WineryFinance = {
  receivedGross: Money;
  withdrawnGross: Money;
  netCredited: Money;
  feesDeducted: Money;
  locked: Money;
  withdrawable: Money;
  royalties: Money;
  perOffer: {
    offer: PrimaryOffer;
    lot: LotRecord | undefined;
    settlement: Ledger['settlements'][string];
    withdrawable: Money;
  }[];
};

/**
 * Winery finance derives entirely from the settlement ledger. Royalties are
 * reported separately: they are never added to a primary withdrawal.
 */
export function wineryFinance(ledger: Ledger, producerId: EntityId): WineryFinance {
  const perOffer = Object.values(ledger.settlements)
    .map((settlement) => ({
      settlement,
      offer: ledger.offers[settlement.offerId],
    }))
    .filter((entry) => entry.offer && ledger.lots[entry.offer.lotId]?.producerId === producerId)
    .map((entry) => ({
      offer: entry.offer,
      lot: ledger.lots[entry.offer.lotId],
      settlement: entry.settlement,
      withdrawable: withdrawableFor(entry.settlement),
    }))
    .sort((a, b) => a.offer.id.localeCompare(b.offer.id));

  const receivedGross = perOffer.reduce((sum, entry) => addMoney(sum, entry.settlement.settledFunds), zero());
  const withdrawnGross = perOffer.reduce((sum, entry) => addMoney(sum, entry.settlement.withdrawnGross), zero());
  const withdrawable = perOffer.reduce((sum, entry) => addMoney(sum, entry.withdrawable), zero());
  const feesDeducted = perOffer.reduce((sum, entry) => {
    const fee = (units(entry.settlement.withdrawnGross) * BigInt(entry.settlement.primaryFeeBps)) / 10_000n;
    return addMoney(sum, { ...zero(), units: fee.toString() });
  }, zero());
  const royalties = royaltiesForProducer(ledger, producerId).reduce(
    (sum, trade) => addMoney(sum, trade.royalty),
    zero(),
  );
  return {
    receivedGross,
    withdrawnGross,
    netCredited: subMoney(withdrawnGross, feesDeducted),
    feesDeducted,
    locked: subMoney(receivedGross, withdrawnGross),
    withdrawable,
    royalties,
    perOffer,
  };
}

export type ReviewQueues = {
  participants: EntityId[];
  lots: Ledger['reviews'][string][];
  milestones: Ledger['reviews'][string][];
  cases: Ledger['cases'][string][];
};

export function reviewQueues(ledger: Ledger): ReviewQueues {
  const reviews = Object.values(ledger.reviews);
  return {
    participants: Object.values(ledger.participants)
      .filter((participant) => participant.reviewState === 'submitted')
      .map((participant) => participant.id),
    lots: reviews.filter((review) => review.kind === 'lot' && review.state === 'submitted'),
    milestones: reviews.filter((review) => review.kind === 'milestone' && review.state === 'submitted'),
    cases: Object.values(ledger.cases).filter((item) => item.state === 'open' || item.state === 'under_review'),
  };
}

export function reviewForLot(ledger: Ledger, lotId: EntityId) {
  return Object.values(ledger.reviews)
    .filter((review) => review.kind === 'lot' && review.lotId === lotId)
    .sort((a, b) => b.revision - a.revision)[0];
}

/** Bottles a winery may still put on offer for a lot. */
export function offerableBottles(ledger: Ledger, lot: LotRecord): number {
  const offered = Object.values(ledger.offers)
    .filter((offer) => offer.lotId === lot.id && offer.active)
    .reduce((sum, offer) => sum + offer.quantity, 0);
  return Math.max(lot.totalBottles - offered, 0);
}

/** Reserved but not yet issued, for the public lot accounting block. */
export function reservedNotMinted(ledger: Ledger, lot: LotRecord): number {
  return Object.values(ledger.allocations)
    .filter((allocation) => ledger.offers[allocation.offerId]?.lotId === lot.id && allocation.state === 'Reserved')
    .reduce((sum, allocation) => sum + allocation.quantity, 0);
}

export function escrowedBottles(ledger: Ledger, lotId: EntityId): number {
  return Object.values(ledger.positions)
    .filter((position) => position.lotId === lotId)
    .reduce((sum, position) => sum + position.redemptionEscrowBottles, 0);
}

export function allocationTotal(allocation: Allocation): Money {
  return totalDue(allocation.pricePerBottle, allocation.quantity);
}

export function transferableFor(ledger: Ledger, accountId: EntityId, lotId: EntityId): number {
  return transferableBottles(positionFor(ledger, accountId, lotId));
}

export function passportForLot(ledger: Ledger, passportId: EntityId): LotRecord | undefined {
  // Public passport identifiers are opaque and mapped explicitly.
  const map: Record<string, EntityId> = {
    'demo-passport-001': 'demo-lot-001',
    'demo-passport-002': 'demo-lot-002',
    'demo-passport-003': 'demo-lot-003',
    'demo-passport-004': 'demo-lot-004',
    'demo-passport-005': 'demo-lot-005',
    'demo-passport-006': 'demo-lot-006',
  };
  const lotId = map[passportId];
  return lotId ? ledger.lots[lotId] : undefined;
}

export function passportIdForLot(lotId: EntityId): string {
  return lotId.replace('demo-lot-', 'demo-passport-');
}
