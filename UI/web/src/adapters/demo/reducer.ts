/**
 * Atomic transitions over the demo ledger.
 *
 * Every command is validated against the capability rules first, then applied
 * as one indivisible mutation that emits an activity event and a simulation
 * receipt. There is no timer-based success anywhere: a screen only ever shows
 * a result that this reducer actually produced.
 */

import type {
  ActivityAction,
  ActivityItem,
  Allocation,
  DisputeCase,
  EntityId,
  LotRecord,
  Money,
  OfferSettlement,
  Position,
  PrimaryOffer,
  ProductionStatus,
  Redemption,
  SecondaryListing,
  TradeRecord,
} from '@/domain/types';
import { PRODUCTION_ORDER } from '@/domain/types';
import {
  addMoney,
  cmpMoney,
  depositAmount,
  isZero,
  primaryFee,
  secondarySplit,
  subMoney,
  totalDue,
  units,
  zero,
} from '@/domain/money';
import {
  canBuyListing,
  canCancelRedemption,
  canConfirmDelivery,
  canConfirmMilestone,
  canCreateOffer,
  canListForResale,
  canMarkShipped,
  canPayRemainder,
  canRequestDelivery,
  canReserve,
  canResolveRedemption,
  canReviewParticipant,
  canVerifyLot,
  canWithdraw,
  listingAvailable,
  transferableBottles,
  withdrawableFor,
} from '@/domain/capabilities';
import type { Command, CommandArgs, Ledger, Receipt } from '../types';
import { AdapterFailure } from '../types';
import { DEMO_ROYALTY_BPS, PRICE_PER_BOTTLE, SCENARIO_ID, SCENARIO_VERSION, positionKey } from './fixtures';

const fixtureOrigin = { kind: 'fixture', scenarioId: SCENARIO_ID, version: SCENARIO_VERSION } as const;

const RECEIPT_PREFIX: Partial<Record<CommandArgs['action'], string>> = {
  reserve: 'RES',
  payRemainder: 'PAY',
  list: 'LST',
  buy: 'TRD',
  cancelListing: 'LCX',
  requestRedemption: 'RDM',
  markShipped: 'SHP',
  confirmDelivery: 'DLV',
  cancelRedemption: 'RCX',
  refundRedemption: 'RFD',
  withdrawReleased: 'WTD',
  confirmMilestone: 'MST',
  verifyLot: 'VER',
  createLot: 'LOT',
  createOffer: 'OFR',
};

function fail(reason: string, code: AdapterFailureCode = 'CAPABILITY_DENIED', detail?: string): never {
  throw new AdapterFailure({ code, reason, detail });
}

type AdapterFailureCode = import('../types').AdapterError['code'];

function nextCounter(ledger: Ledger, key: string): number {
  const value = (ledger.counters[key] ?? 0) + 1;
  ledger.counters[key] = value;
  return value;
}

function pad(value: number, size = 3): string {
  return String(value).padStart(size, '0');
}

function ensurePosition(ledger: Ledger, accountId: EntityId, lotId: EntityId): Position {
  const key = positionKey(accountId, lotId);
  if (!ledger.positions[key]) {
    ledger.positions[key] = {
      accountId,
      lotId,
      walletBottles: 0,
      frozenBottles: 0,
      redemptionEscrowBottles: 0,
      origin: fixtureOrigin,
    };
  }
  return ledger.positions[key];
}

function cashOf(ledger: Ledger, accountId: EntityId): Money {
  return ledger.cash[accountId] ?? zero();
}

function debit(ledger: Ledger, accountId: EntityId, amount: Money): void {
  const balance = cashOf(ledger, accountId);
  if (cmpMoney(balance, amount) < 0) {
    throw new AdapterFailure({ code: 'CAPABILITY_DENIED', reason: 'INSUFFICIENT_FUNDS' });
  }
  ledger.cash[accountId] = subMoney(balance, amount);
}

function credit(ledger: Ledger, accountId: EntityId, amount: Money): void {
  ledger.cash[accountId] = addMoney(cashOf(ledger, accountId), amount);
}

function record(
  ledger: Ledger,
  entry: {
    entityType: ActivityItem['entityType'];
    entityId: EntityId;
    action: ActivityAction;
    actorId: EntityId;
    quantity?: number;
    amount?: Money;
    receiptId?: string;
  },
): ActivityItem {
  const sequence = nextCounter(ledger, 'activity');
  const item: ActivityItem = {
    id: `demo-event-${pad(sequence, 4)}`,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    actorLabel: ledger.participants[entry.actorId]?.displayLabel ?? entry.actorId,
    occurredAt: ledger.nowIso,
    sequence,
    quantity: entry.quantity,
    amount: entry.amount,
    receiptId: entry.receiptId,
    origin: fixtureOrigin,
  };
  ledger.activity.push(item);
  return item;
}

function requireLot(ledger: Ledger, lotId: EntityId): LotRecord {
  const lot = ledger.lots[lotId];
  if (!lot) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'lot' });
  return lot;
}

function requireOffer(ledger: Ledger, offerId: EntityId): PrimaryOffer {
  const offer = ledger.offers[offerId];
  if (!offer) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'offer' });
  return offer;
}

function requireSettlement(ledger: Ledger, offerId: EntityId): OfferSettlement {
  const settlement = ledger.settlements[offerId];
  if (!settlement) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'settlement' });
  return settlement;
}

function requireAllocation(ledger: Ledger, allocationId: EntityId): Allocation {
  const allocation = ledger.allocations[allocationId];
  if (!allocation) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'allocation' });
  return allocation;
}

function requireListing(ledger: Ledger, listingId: EntityId): SecondaryListing {
  const listing = ledger.listings[listingId];
  if (!listing) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'listing' });
  return listing;
}

function requireRedemption(ledger: Ledger, redemptionId: EntityId): Redemption {
  const redemption = ledger.redemptions[redemptionId];
  if (!redemption) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'redemption' });
  return redemption;
}

function assertCapability(capability: import('@/domain/types').Capability): void {
  if (!capability.allowed) fail(capability.reasonCode ?? 'UNKNOWN');
}

/** A deterministic stand-in for a keccak commitment over canonical JSON. */
export function demoCommitment(payload: unknown): `0x${string}` {
  const canonical = JSON.stringify(payload, Object.keys(payload as object).sort());
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < canonical.length; i += 1) {
    h1 = Math.imul(h1 ^ canonical.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + canonical.charCodeAt(i) + i, 0x85ebca6b) >>> 0;
  }
  const chunk = (seed: number) => {
    let value = seed >>> 0;
    let out = '';
    for (let i = 0; i < 8; i += 1) {
      value = Math.imul(value ^ (value >>> 15), 0x2545f491) >>> 0;
      out += value.toString(16).padStart(8, '0');
    }
    return out;
  };
  return `0x${(chunk(h1) + chunk(h2)).slice(0, 64)}`;
}

export type ReduceResult = { ledger: Ledger; receipt: Receipt };

export function reduce(current: Ledger, command: Command): ReduceResult {
  if (command.expectedSequence !== current.sequence) {
    throw new AdapterFailure({ code: 'STALE_SNAPSHOT', reason: 'sequence' });
  }
  const ledger: Ledger = structuredClone(current);
  const actorId = command.actorId;
  const actor = ledger.participants[actorId];
  const args = command.args;
  const activityIds: EntityId[] = [];
  let entityId: EntityId | undefined;

  const receiptNumber = nextCounter(ledger, 'receipt');
  const reference = `DEMO-${RECEIPT_PREFIX[args.action] ?? 'ACT'}-${pad(receiptNumber)}`;

  switch (args.action) {
    /* ---------------------------------------------------------- */
    /* Primary purchase                                           */
    /* ---------------------------------------------------------- */
    case 'reserve': {
      const offer = requireOffer(ledger, args.offerId);
      const lot = requireLot(ledger, offer.lotId);
      assertCapability(canReserve({ offer, lot, buyer: actor, markets: ledger.markets, nowIso: ledger.nowIso }));
      const available = offer.quantity - offer.reserved;
      if (args.quantity <= 0 || args.quantity > available) fail('OFFER_SOLD_OUT');
      if (args.payment === 'deposit' && offer.depositBps === 0) fail('WRONG_STATE');

      const total = totalDue(offer.pricePerBottle, args.quantity);
      const payNow = args.payment === 'full' ? total : depositAmount(total, offer.depositBps);
      if (isZero(payNow)) fail('WRONG_STATE');
      debit(ledger, actorId, payNow);

      const allocationId = `demo-allocation-${pad(nextCounter(ledger, 'allocation'))}`;
      const paidInFull = cmpMoney(payNow, total) === 0;
      const allocation: Allocation = {
        id: allocationId,
        offerId: offer.id,
        buyerId: actorId,
        quantity: args.quantity,
        pricePerBottle: offer.pricePerBottle,
        totalDue: total,
        paidAmount: payNow,
        createdAt: ledger.nowIso,
        state: paidInFull ? 'Paid' : 'Reserved',
        origin: fixtureOrigin,
      };
      ledger.allocations[allocationId] = allocation;
      offer.reserved += args.quantity;

      const settlement = requireSettlement(ledger, offer.id);
      settlement.settledFunds = addMoney(settlement.settledFunds, payNow);

      // A deposit creates no bottle tokens. Only full payment mints.
      if (paidInFull) {
        lot.mintedBottles += args.quantity;
        ensurePosition(ledger, actorId, lot.id).walletBottles += args.quantity;
      }

      entityId = allocationId;
      activityIds.push(
        record(ledger, {
          entityType: 'allocation',
          entityId: allocationId,
          action: 'allocation.reserved',
          actorId,
          quantity: args.quantity,
          amount: payNow,
          receiptId: reference,
        }).id,
      );
      if (paidInFull) {
        activityIds.push(
          record(ledger, {
            entityType: 'allocation',
            entityId: allocationId,
            action: 'allocation.paid',
            actorId,
            quantity: args.quantity,
            amount: payNow,
            receiptId: reference,
          }).id,
        );
      }
      break;
    }

    case 'payRemainder': {
      const allocation = requireAllocation(ledger, args.allocationId);
      const offer = requireOffer(ledger, allocation.offerId);
      const lot = requireLot(ledger, offer.lotId);
      assertCapability(canPayRemainder({ allocation, offer, actorId, markets: ledger.markets, nowIso: ledger.nowIso }));
      const due = subMoney(allocation.totalDue, allocation.paidAmount);
      if (isZero(due)) fail('ALREADY_SETTLED');
      debit(ledger, actorId, due);
      allocation.paidAmount = allocation.totalDue;
      allocation.state = 'Paid';
      requireSettlement(ledger, offer.id).settledFunds = addMoney(
        requireSettlement(ledger, offer.id).settledFunds,
        due,
      );
      lot.mintedBottles += allocation.quantity;
      ensurePosition(ledger, actorId, lot.id).walletBottles += allocation.quantity;
      entityId = allocation.id;
      activityIds.push(
        record(ledger, {
          entityType: 'allocation',
          entityId: allocation.id,
          action: 'allocation.paid',
          actorId,
          quantity: allocation.quantity,
          amount: due,
          receiptId: reference,
        }).id,
      );
      break;
    }

    /* ---------------------------------------------------------- */
    /* Secondary market                                           */
    /* ---------------------------------------------------------- */
    case 'list': {
      const lot = requireLot(ledger, args.lotId);
      const position = ledger.positions[positionKey(actorId, args.lotId)];
      assertCapability(canListForResale({ lot, position, seller: actor, markets: ledger.markets, nowIso: ledger.nowIso }));
      const transferable = transferableBottles(position);
      if (args.quantity <= 0 || args.quantity > transferable) fail('NO_TRANSFERABLE_BALANCE');
      if (units(args.pricePerBottle) <= 0n) fail('WRONG_STATE');
      const listingId = `demo-listing-${pad(nextCounter(ledger, 'listing'))}`;
      ledger.listings[listingId] = {
        id: listingId,
        sellerId: actorId,
        lotId: args.lotId,
        quantity: args.quantity,
        initialQuantity: args.quantity,
        pricePerBottle: args.pricePerBottle,
        paymentToken: args.pricePerBottle.token,
        active: true,
        createdAt: ledger.nowIso,
        origin: fixtureOrigin,
      };
      entityId = listingId;
      activityIds.push(
        record(ledger, {
          entityType: 'listing',
          entityId: listingId,
          action: 'listing.created',
          actorId,
          quantity: args.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'cancelListing': {
      const listing = requireListing(ledger, args.listingId);
      if (listing.sellerId !== actorId) fail('NOT_OWNER');
      if (!listing.active) fail('WRONG_STATE');
      listing.active = false;
      listing.closedAt = ledger.nowIso;
      listing.closedReason = 'cancelled';
      entityId = listing.id;
      activityIds.push(
        record(ledger, {
          entityType: 'listing',
          entityId: listing.id,
          action: 'listing.cancelled',
          actorId,
          quantity: listing.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'buy': {
      const listing = requireListing(ledger, args.listingId);
      const lot = requireLot(ledger, listing.lotId);
      const sellerPosition = ledger.positions[positionKey(listing.sellerId, listing.lotId)];
      assertCapability(
        canBuyListing({ listing, lot, buyer: actor, sellerPosition, markets: ledger.markets, nowIso: ledger.nowIso }),
      );
      if (Date.parse(args.deadline) < Date.parse(ledger.nowIso)) fail('DEADLINE_PASSED');
      // The confirmed quote binds the price: a changed listing invalidates it.
      if (cmpMoney(listing.pricePerBottle, args.maxPricePerBottle) > 0) fail('QUOTE_CHANGED');
      const available = listingAvailable(listing, sellerPosition);
      if (args.quantity <= 0 || args.quantity > available) fail('NO_TRANSFERABLE_BALANCE');

      const split = secondarySplit(listing.pricePerBottle, args.quantity, ledger.secondaryFeeBps, lot.royaltyBps);
      debit(ledger, actorId, split.gross);
      credit(ledger, listing.sellerId, split.sellerNet);
      credit(ledger, lot.producerId, split.royalty);

      ensurePosition(ledger, listing.sellerId, lot.id).walletBottles -= args.quantity;
      ensurePosition(ledger, actorId, lot.id).walletBottles += args.quantity;

      listing.quantity -= args.quantity;
      if (listing.quantity === 0) {
        listing.active = false;
        listing.closedAt = ledger.nowIso;
        listing.closedReason = 'sold';
      }

      const tradeId = `demo-trade-${pad(nextCounter(ledger, 'trade'))}`;
      const trade: TradeRecord = {
        id: tradeId,
        listingId: listing.id,
        lotId: lot.id,
        buyerId: actorId,
        sellerId: listing.sellerId,
        quantity: args.quantity,
        gross: split.gross,
        fee: split.fee,
        royalty: split.royalty,
        sellerNet: split.sellerNet,
        receiptId: reference,
        occurredAt: ledger.nowIso,
        origin: fixtureOrigin,
      };
      ledger.trades[tradeId] = trade;
      entityId = tradeId;
      activityIds.push(
        record(ledger, {
          entityType: 'listing',
          entityId: listing.id,
          action: 'listing.filled',
          actorId,
          quantity: args.quantity,
          amount: split.gross,
          receiptId: reference,
        }).id,
      );
      break;
    }

    /* ---------------------------------------------------------- */
    /* Delivery                                                   */
    /* ---------------------------------------------------------- */
    case 'requestRedemption': {
      const lot = requireLot(ledger, args.lotId);
      const position = ledger.positions[positionKey(actorId, args.lotId)];
      assertCapability(canRequestDelivery({ lot, position, buyer: actor, nowIso: ledger.nowIso }));
      const transferable = transferableBottles(position);
      if (args.quantity <= 0 || args.quantity > transferable) fail('NO_TRANSFERABLE_BALANCE');
      const destination = ledger.destinations[args.destinationId];
      if (!destination) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'destination' });

      const held = ensurePosition(ledger, actorId, lot.id);
      held.walletBottles -= args.quantity;
      held.redemptionEscrowBottles += args.quantity;

      const redemptionId = `demo-redemption-${pad(nextCounter(ledger, 'redemption'))}`;
      ledger.redemptions[redemptionId] = {
        id: redemptionId,
        buyerId: actorId,
        lotId: lot.id,
        quantity: args.quantity,
        // A commitment to off-chain data — not a way to publish an address.
        deliveryDataHash: demoCommitment({ destinationId: destination.id, lotId: lot.id, quantity: args.quantity }),
        requestedAt: ledger.nowIso,
        state: 'Requested',
        destinationRef: destination.id,
        origin: fixtureOrigin,
      };
      entityId = redemptionId;
      activityIds.push(
        record(ledger, {
          entityType: 'redemption',
          entityId: redemptionId,
          action: 'redemption.requested',
          actorId,
          quantity: args.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'markShipped': {
      const redemption = requireRedemption(ledger, args.redemptionId);
      const lot = requireLot(ledger, redemption.lotId);
      assertCapability(canMarkShipped({ redemption, lot, actor, nowIso: ledger.nowIso }));
      const document = ledger.documents[args.documentId];
      if (!document) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'document' });
      redemption.state = 'Shipped';
      redemption.shippedAt = ledger.nowIso;
      redemption.shipmentDocsHash = demoCommitment({ documentId: document.id, redemptionId: redemption.id });
      redemption.carrier = args.carrier;
      redemption.trackingReference = args.reference;
      entityId = redemption.id;
      activityIds.push(
        record(ledger, {
          entityType: 'redemption',
          entityId: redemption.id,
          action: 'redemption.shipped',
          actorId,
          quantity: redemption.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'confirmDelivery': {
      const redemption = requireRedemption(ledger, args.redemptionId);
      assertCapability(canConfirmDelivery({ redemption, actorId, nowIso: ledger.nowIso }));
      burnEscrow(ledger, redemption);
      redemption.state = 'Completed';
      redemption.completedAt = ledger.nowIso;
      entityId = redemption.id;
      activityIds.push(
        record(ledger, {
          entityType: 'redemption',
          entityId: redemption.id,
          action: 'redemption.completed',
          actorId,
          quantity: redemption.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'cancelRedemption': {
      const redemption = requireRedemption(ledger, args.redemptionId);
      const openCase = redemption.caseId ? ledger.cases[redemption.caseId] : undefined;
      assertCapability(canCancelRedemption({ redemption, actorId, openCase, nowIso: ledger.nowIso }));
      returnEscrow(ledger, redemption);
      redemption.state = 'Cancelled';
      redemption.cancelledAt = ledger.nowIso;
      entityId = redemption.id;
      activityIds.push(
        record(ledger, {
          entityType: 'redemption',
          entityId: redemption.id,
          action: 'redemption.cancelled',
          actorId,
          quantity: redemption.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'refundRedemption': {
      const redemption = requireRedemption(ledger, args.redemptionId);
      assertCapability(canResolveRedemption({ redemption, actor, nowIso: ledger.nowIso }));
      returnEscrow(ledger, redemption);
      redemption.state = 'Cancelled';
      redemption.cancelledAt = ledger.nowIso;
      entityId = redemption.id;
      activityIds.push(
        record(ledger, {
          entityType: 'redemption',
          entityId: redemption.id,
          action: 'redemption.refunded',
          actorId,
          quantity: redemption.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'reportDeliveryProblem': {
      const redemption = requireRedemption(ledger, args.redemptionId);
      if (redemption.buyerId !== actorId) fail('NOT_OWNER');
      if (redemption.state !== 'Requested' && redemption.state !== 'Shipped') fail('WRONG_STATE');
      const caseId = `demo-case-${pad(nextCounter(ledger, 'case'))}`;
      const record_: DisputeCase = {
        id: caseId,
        redemptionId: redemption.id,
        category: args.category,
        reason: args.description,
        state: 'open',
        createdAt: ledger.nowIso,
        updatedAt: ledger.nowIso,
        evidenceIds: [],
        origin: fixtureOrigin,
      };
      ledger.cases[caseId] = record_;
      redemption.caseId = caseId;
      entityId = caseId;
      activityIds.push(
        record(ledger, {
          entityType: 'case',
          entityId: caseId,
          action: 'case.opened',
          actorId,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'resolveCase': {
      const disputeCase = ledger.cases[args.caseId];
      if (!disputeCase) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'case' });
      const redemption = requireRedemption(ledger, disputeCase.redemptionId);
      assertCapability(canResolveRedemption({ redemption, actor, nowIso: ledger.nowIso }));
      if (args.outcome === 'delivery') {
        burnEscrow(ledger, redemption);
        redemption.state = 'Completed';
        redemption.completedAt = ledger.nowIso;
        disputeCase.state = 'resolved_delivery';
      } else {
        // Returning escrowed bottle tokens — never a money refund.
        returnEscrow(ledger, redemption);
        redemption.state = 'Cancelled';
        redemption.cancelledAt = ledger.nowIso;
        disputeCase.state = 'resolved_return';
      }
      disputeCase.resolutionNote = args.reason;
      disputeCase.updatedAt = ledger.nowIso;
      entityId = disputeCase.id;
      activityIds.push(
        record(ledger, {
          entityType: 'case',
          entityId: disputeCase.id,
          action: 'case.resolved',
          actorId,
          quantity: redemption.quantity,
          receiptId: reference,
        }).id,
      );
      break;
    }

    /* ---------------------------------------------------------- */
    /* Winery lifecycle                                           */
    /* ---------------------------------------------------------- */
    case 'saveLotDraft': {
      ledger.drafts[args.draft.id] = { ...args.draft, savedAt: ledger.nowIso };
      entityId = args.draft.id;
      break;
    }

    case 'createLot': {
      const draft = ledger.drafts[args.draftId];
      if (!draft) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'draft' });
      if (draft.ownerId !== actorId) fail('NOT_OWNER');
      if (draft.createdLotId) fail('ALREADY_SETTLED');
      if (!draft.vintage || !draft.totalBottles) throw new AdapterFailure({ code: 'VALIDATION_FAILED' });
      // The first lot created in producer-start deterministically becomes demo-lot-001.
      const lotNumber = nextCounter(ledger, 'lot');
      const lotId = ledger.lots['demo-lot-001'] ? `demo-lot-${pad(lotNumber)}` : 'demo-lot-001';
      const producer = ledger.producers[actorId];
      ledger.lots[lotId] = {
        id: lotId,
        producerId: actorId,
        winery: ledger.participants[actorId].wallet,
        name: draft.name,
        region: draft.region,
        grapes: draft.grapes.map((g) => g.name).join(', '),
        vintage: draft.vintage,
        totalBottles: draft.totalBottles,
        mintedBottles: 0,
        redeemedBottles: 0,
        bottleSizeMl: draft.bottleSizeMl,
        royaltyBps: draft.royaltyBps,
        exportAllowed: true,
        status: 'Draft',
        production: draft.production,
        origin: fixtureOrigin,
      };
      ledger.presentations[lotId] = {
        lotId,
        revision: 1,
        title: { en: draft.name, fr: draft.name },
        producerSlug: producer?.slug ?? actorId,
        color: 'red',
        description: { en: '', fr: '' },
        imageAssetIds: [`BOTTLE-0${((lotNumber - 1) % 6) + 1}`],
        documents: draft.documentIds.map((id) => ledger.documents[id]).filter(Boolean),
        expectedAvailability: draft.expectedReadyAt
          ? { value: draft.expectedReadyAt, origin: fixtureOrigin, evidence: 'self_reported' }
          : undefined,
        caseSize: 6,
        minOrderBottles: 6,
        originCountry: draft.country,
        abv: draft.abv ? { value: draft.abv, origin: fixtureOrigin, evidence: 'self_reported' } : undefined,
        certifications: [],
        tradeTerms: { shipping: 'quote_required', taxes: 'not_calculated', allowedDestinations: ['FR'] },
      };
      draft.createdLotId = lotId;
      entityId = lotId;
      activityIds.push(
        record(ledger, { entityType: 'lot', entityId: lotId, action: 'lot.created', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'submitLotReview': {
      const lot = requireLot(ledger, args.lotId);
      if (lot.producerId !== actorId) fail('NOT_OWNER');
      if (lot.status !== 'Draft') fail('WRONG_STATE');
      const reviewId = `demo-review-${pad(nextCounter(ledger, 'review'))}`;
      const previous = Object.values(ledger.reviews).filter((r) => r.lotId === lot.id && r.kind === 'lot');
      ledger.reviews[reviewId] = {
        id: reviewId,
        kind: 'lot',
        lotId: lot.id,
        submittedBy: actorId,
        submittedAt: ledger.nowIso,
        revision: previous.length + 1,
        documentIds: args.documentIds,
        state: 'submitted',
      };
      entityId = reviewId;
      activityIds.push(
        record(ledger, { entityType: 'lot', entityId: lot.id, action: 'lot.submitted', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'requestLotChanges': {
      const review = ledger.reviews[args.reviewId];
      if (!review) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'review' });
      assertCapability(canReviewParticipant(actor, ledger.nowIso));
      if (review.state !== 'submitted') fail('WRONG_STATE');
      review.state = 'needs_changes';
      review.reason = args.reason;
      review.decidedAt = ledger.nowIso;
      review.decidedBy = actorId;
      entityId = review.id;
      activityIds.push(
        record(ledger, {
          entityType: 'lot',
          entityId: review.lotId,
          action: 'lot.changes_requested',
          actorId,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'verifyLot': {
      const review = ledger.reviews[args.reviewId];
      if (!review) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'review' });
      const lot = requireLot(ledger, review.lotId);
      assertCapability(
        canVerifyLot({ lot, actor, evidenceComplete: review.documentIds.length > 0, nowIso: ledger.nowIso }),
      );
      lot.status = 'Verified';
      lot.verifier = ledger.participants[actorId].wallet;
      // The anchor covers the submitted bundle only; later documents get their own.
      lot.docsHash = demoCommitment({ lotId: lot.id, revision: review.revision, documents: review.documentIds });
      review.state = 'accepted';
      review.decidedAt = ledger.nowIso;
      review.decidedBy = actorId;
      entityId = lot.id;
      activityIds.push(
        record(ledger, { entityType: 'lot', entityId: lot.id, action: 'lot.verified', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'setProductionStatus': {
      const lot = requireLot(ledger, args.lotId);
      if (lot.producerId !== actorId) fail('NOT_OWNER');
      const from = PRODUCTION_ORDER.indexOf(lot.production);
      const to = PRODUCTION_ORDER.indexOf(args.production as ProductionStatus);
      // Strictly forward, skipping allowed; a skipped stage is never invented.
      if (to <= from) fail('WRONG_STATE');
      lot.production = args.production;
      entityId = lot.id;
      activityIds.push(
        record(ledger, { entityType: 'lot', entityId: lot.id, action: 'lot.production', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'createOffer': {
      const lot = requireLot(ledger, args.lotId);
      const offeredPerLot = Object.values(ledger.offers)
        .filter((o) => o.lotId === lot.id && o.active)
        .reduce((sum, o) => sum + o.quantity, 0);
      const offerable = lot.totalBottles - offeredPerLot;
      assertCapability(canCreateOffer({ lot, actor, offerableBottles: offerable, markets: ledger.markets, nowIso: ledger.nowIso }));
      if (args.quantity <= 0 || args.quantity > offerable) fail('OFFER_SOLD_OUT');
      const totalBps = args.milestones.reduce((sum, m) => sum + m.bps, 0);
      if (args.milestones.length > 0 && totalBps !== 10_000) throw new AdapterFailure({ code: 'VALIDATION_FAILED' });
      const offerId = `demo-offer-${pad(nextCounter(ledger, 'offer'))}`;
      ledger.offers[offerId] = {
        id: offerId,
        lotId: lot.id,
        winery: ledger.participants[actorId].wallet,
        paymentToken: args.pricePerBottle.token,
        pricePerBottle: args.pricePerBottle,
        quantity: args.quantity,
        reserved: 0,
        startTime: args.startTime,
        endTime: args.endTime,
        depositBps: args.depositBps,
        fullPaymentDeadline: args.fullPaymentDeadline,
        kind: args.kind,
        active: true,
        origin: fixtureOrigin,
      };
      const milestones =
        args.milestones.length > 0
          ? args.milestones
          : [{ bps: 10_000, description: 'Full release on delivery readiness' }];
      ledger.settlements[offerId] = {
        offerId,
        settledFunds: zero(args.pricePerBottle),
        withdrawnGross: zero(args.pricePerBottle),
        releasedBps: 0,
        primaryFeeBps: ledger.primaryFeeBps,
        milestones: milestones.map((m, index) => ({ index, bps: m.bps, released: false, description: m.description })),
        origin: fixtureOrigin,
      };
      entityId = offerId;
      activityIds.push(
        record(ledger, { entityType: 'offer', entityId: offerId, action: 'offer.published', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'cancelOffer': {
      const offer = requireOffer(ledger, args.offerId);
      const lot = requireLot(ledger, offer.lotId);
      if (lot.producerId !== actorId) fail('NOT_OWNER');
      if (!offer.active) fail('WRONG_STATE');
      // Existing allocations survive: only new reservations stop.
      offer.active = false;
      entityId = offer.id;
      activityIds.push(
        record(ledger, { entityType: 'offer', entityId: offer.id, action: 'offer.cancelled', actorId, receiptId: reference }).id,
      );
      break;
    }

    /* ---------------------------------------------------------- */
    /* Milestones and funds                                       */
    /* ---------------------------------------------------------- */
    case 'submitMilestoneEvidence': {
      const offer = requireOffer(ledger, args.offerId);
      const lot = requireLot(ledger, offer.lotId);
      if (lot.producerId !== actorId) fail('NOT_OWNER');
      const settlement = requireSettlement(ledger, offer.id);
      const milestone = settlement.milestones[args.milestoneIndex];
      if (!milestone) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'milestone' });
      if (milestone.released) fail('ALREADY_SETTLED');
      const reviewId = `demo-review-${pad(nextCounter(ledger, 'review'))}`;
      ledger.reviews[reviewId] = {
        id: reviewId,
        kind: 'milestone',
        lotId: lot.id,
        offerId: offer.id,
        milestoneIndex: args.milestoneIndex,
        submittedBy: actorId,
        submittedAt: ledger.nowIso,
        revision: 1,
        documentIds: args.documentIds,
        state: 'submitted',
      };
      entityId = reviewId;
      activityIds.push(
        record(ledger, { entityType: 'offer', entityId: offer.id, action: 'milestone.evidence', actorId, receiptId: reference }).id,
      );
      break;
    }

    case 'confirmMilestone': {
      const review = ledger.reviews[args.reviewId];
      if (!review || review.kind !== 'milestone' || review.offerId === undefined) {
        throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'review' });
      }
      const settlement = requireSettlement(ledger, review.offerId);
      const milestone = settlement.milestones[review.milestoneIndex ?? -1];
      assertCapability(
        canConfirmMilestone({ milestone, actor, evidenceComplete: review.documentIds.length > 0, nowIso: ledger.nowIso }),
      );
      milestone.released = true;
      milestone.releasedAt = ledger.nowIso;
      milestone.evidenceIds = review.documentIds;
      // Confirming a milestone creates an entitlement; money still needs a withdrawal.
      settlement.releasedBps += milestone.bps;
      review.state = 'accepted';
      review.decidedAt = ledger.nowIso;
      review.decidedBy = actorId;
      entityId = settlement.offerId;
      activityIds.push(
        record(ledger, {
          entityType: 'offer',
          entityId: settlement.offerId,
          action: 'milestone.confirmed',
          actorId,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'withdrawReleased': {
      const offer = requireOffer(ledger, args.offerId);
      const settlement = requireSettlement(ledger, offer.id);
      const lot = requireLot(ledger, offer.lotId);
      if (lot.producerId !== actorId) fail('NOT_OWNER');
      assertCapability(canWithdraw({ settlement, offer, actor, nowIso: ledger.nowIso }));
      const gross = withdrawableFor(settlement);
      const fee = primaryFee(gross, settlement.primaryFeeBps);
      const net = subMoney(gross, fee);
      settlement.withdrawnGross = addMoney(settlement.withdrawnGross, gross);
      credit(ledger, actorId, net);
      entityId = offer.id;
      activityIds.push(
        record(ledger, {
          entityType: 'offer',
          entityId: offer.id,
          action: 'funds.withdrawn',
          actorId,
          amount: net,
          receiptId: reference,
        }).id,
      );
      break;
    }

    /* ---------------------------------------------------------- */
    /* Operations and scenario                                    */
    /* ---------------------------------------------------------- */
    case 'reviewParticipant': {
      assertCapability(canReviewParticipant(actor, ledger.nowIso));
      const participant = ledger.participants[args.participantId];
      if (!participant) throw new AdapterFailure({ code: 'NOT_FOUND', reason: 'participant' });
      if (args.decision === 'approve') {
        participant.registryVerified = true;
        participant.reviewState = 'accepted';
        participant.claims = participant.claims.map((c) => ({
          ...c,
          valid: true,
          issuedAt: c.issuedAt ?? ledger.nowIso,
          expiresAt: c.expiresAt ?? '2027-12-31T22:59:59Z',
        }));
      } else {
        participant.reviewState = args.decision === 'changes' ? 'needs_changes' : 'rejected';
      }
      participant.lastUpdatedAt = ledger.nowIso;
      entityId = participant.id;
      activityIds.push(
        record(ledger, {
          entityType: 'participant',
          entityId: participant.id,
          action: 'participant.reviewed',
          actorId,
          receiptId: reference,
        }).id,
      );
      break;
    }

    case 'advanceClock': {
      const target = Date.parse(args.toIso);
      if (!Number.isFinite(target) || target <= Date.parse(ledger.nowIso)) fail('WRONG_STATE');
      ledger.nowIso = new Date(target).toISOString();
      entityId = 'scenario';
      activityIds.push(
        record(ledger, { entityType: 'scenario', entityId: 'clock', action: 'clock.advanced', actorId, receiptId: reference }).id,
      );
      break;
    }

    default: {
      const never: never = args;
      throw new AdapterFailure({ code: 'VALIDATION_FAILED', detail: JSON.stringify(never) });
    }
  }

  ledger.sequence += 1;
  const receipt: Receipt = {
    id: `demo-receipt-${pad(receiptNumber, 4)}`,
    mode: 'demo',
    action: args.action,
    entityId,
    state: 'confirmed',
    // A simulated action never receives a transaction hash or explorer link.
    reference,
    activityIds,
    occurredAt: ledger.nowIso,
  };
  ledger.receipts[receipt.id] = receipt;
  return { ledger, receipt };
}

function burnEscrow(ledger: Ledger, redemption: Redemption): void {
  const position = ensurePosition(ledger, redemption.buyerId, redemption.lotId);
  if (position.redemptionEscrowBottles < redemption.quantity) {
    throw new AdapterFailure({ code: 'VALIDATION_FAILED', reason: 'escrow' });
  }
  position.redemptionEscrowBottles -= redemption.quantity;
  const lot = requireLot(ledger, redemption.lotId);
  lot.redeemedBottles += redemption.quantity;
}

function returnEscrow(ledger: Ledger, redemption: Redemption): void {
  const position = ensurePosition(ledger, redemption.buyerId, redemption.lotId);
  if (position.redemptionEscrowBottles < redemption.quantity) {
    throw new AdapterFailure({ code: 'VALIDATION_FAILED', reason: 'escrow' });
  }
  position.redemptionEscrowBottles -= redemption.quantity;
  position.walletBottles += redemption.quantity;
}

/** Convenience for screens that need a fresh royalty figure without a trade lookup. */
export function royaltyBpsFor(lot: LotRecord | undefined): number {
  return lot?.royaltyBps ?? DEMO_ROYALTY_BPS;
}

export { PRICE_PER_BOTTLE };
