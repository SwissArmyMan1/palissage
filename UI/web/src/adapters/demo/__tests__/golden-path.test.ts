/**
 * The numeric scenario from 05-content-and-demo-data.md §6 is an invariant:
 * it is what the screenshots, the guided demo and the acceptance runbook all
 * rely on. These tests reproduce it without a DOM.
 */

import { describe, expect, it } from 'vitest';
import { DemoAdapter } from '../adapter';
import { MAIN_BUYER_ID, MAIN_LOT_ID, MAIN_OFFER_ID, RESALE_BUYER_ID, SAMPLE_DESTINATION, positionKey } from '../fixtures';
import type { Command, CommandArgs, Ledger } from '../../types';
import { formatExact, formatMoney, units } from '@/domain/money';
import { offerAvailable, transferableBottles, withdrawableFor } from '@/domain/capabilities';

let requestCounter = 0;

async function run(adapter: DemoAdapter, actorId: string, args: CommandArgs) {
  requestCounter += 1;
  const command: Command = {
    actorId,
    args,
    expectedSequence: adapter.snapshot().sequence,
    clientRequestId: `test-${requestCounter}`,
  };
  const prepared = await adapter.prepare(command);
  return adapter.execute(prepared.id);
}

function fresh(): DemoAdapter {
  return new DemoAdapter('buyer-ready', { restore: false });
}

function eurOf(ledger: Ledger, id: string) {
  return formatMoney(ledger.cash[id], 'en');
}

describe('buyer-ready seed', () => {
  it('starts with the documented catalogue state', () => {
    const ledger = fresh().snapshot();
    expect(offerAvailable(ledger.offers[MAIN_OFFER_ID])).toBe(2400);
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles).toBe(0);
    expect(ledger.lots[MAIN_LOT_ID].production).toBe('Growing');
    // lot 006 arrives fully allocated to the second buyer.
    expect(offerAvailable(ledger.offers['demo-offer-006'])).toBe(0);
    expect(ledger.positions[positionKey(RESALE_BUYER_ID, 'demo-lot-006')].walletBottles).toBe(600);
    expect(eurOf(ledger, MAIN_BUYER_ID)).toBe('€10,000.00');
    expect(eurOf(ledger, RESALE_BUYER_ID)).toBe('€15,000.00');
  });
});

describe('golden path', () => {
  it('runs reserve → pay → resell → deliver → withdraw with exact amounts', async () => {
    const adapter = fresh();

    // Step 1 — 120 bottles at €8.40 with a 30% deposit.
    await run(adapter, MAIN_BUYER_ID, { action: 'reserve', offerId: MAIN_OFFER_ID, quantity: 120, payment: 'deposit' });
    let ledger = adapter.snapshot();
    const allocation = ledger.allocations['demo-allocation-001'];
    expect(formatMoney(allocation.totalDue, 'en')).toBe('€1,008.00');
    expect(formatMoney(allocation.paidAmount, 'en')).toBe('€302.40');
    expect(formatMoney(ledger.settlements[MAIN_OFFER_ID].settledFunds, 'en')).toBe('€302.40');
    expect(allocation.state).toBe('Reserved');
    expect(offerAvailable(ledger.offers[MAIN_OFFER_ID])).toBe(2280);
    // A deposit mints nothing.
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles).toBe(0);
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)]).toBeUndefined();

    // Step 2 — advance the simulated clock, then pay the balance.
    await run(adapter, MAIN_BUYER_ID, { action: 'advanceClock', toIso: '2027-02-15T09:00:00Z', label: 'balance-due' });
    await run(adapter, MAIN_BUYER_ID, { action: 'payRemainder', allocationId: 'demo-allocation-001' });
    ledger = adapter.snapshot();
    expect(ledger.allocations['demo-allocation-001'].state).toBe('Paid');
    expect(formatMoney(ledger.settlements[MAIN_OFFER_ID].settledFunds, 'en')).toBe('€1,008.00');
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles).toBe(120);
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(120);

    // Step 3 — resell 24 bottles at €9.20.
    await run(adapter, MAIN_BUYER_ID, {
      action: 'list',
      lotId: MAIN_LOT_ID,
      quantity: 24,
      pricePerBottle: { units: (9_200_000_000_000_000_000n).toString(), token: 'DEMO_EUR', decimals: 18, symbol: 'EURe', chainId: null },
    });
    ledger = adapter.snapshot();
    const listingId = Object.keys(ledger.listings)[0];
    await run(adapter, RESALE_BUYER_ID, {
      action: 'buy',
      listingId,
      quantity: 24,
      maxPricePerBottle: ledger.listings[listingId].pricePerBottle,
      deadline: '2027-02-15T09:10:00Z',
    });
    ledger = adapter.snapshot();
    const trade = Object.values(ledger.trades)[0];
    expect(formatExact(trade.gross, 'en')).toBe('220.800 EURe');
    expect(formatExact(trade.fee, 'en')).toBe('6.624 EURe');
    expect(formatExact(trade.royalty, 'en')).toBe('5.520 EURe');
    expect(formatExact(trade.sellerNet, 'en')).toBe('208.656 EURe');
    // fee + royalty + net is exactly the gross.
    expect(units(trade.fee) + units(trade.royalty) + units(trade.sellerNet)).toBe(units(trade.gross));
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(96);
    expect(ledger.positions[positionKey(RESALE_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(24);
    expect(ledger.listings[listingId].active).toBe(false);

    // Step 4 — readiness and the authorised final milestone.
    await run(adapter, MAIN_BUYER_ID, { action: 'advanceClock', toIso: '2027-06-15T09:00:00Z', label: 'ready' });
    await run(adapter, 'demo-producer-001', {
      action: 'setProductionStatus',
      lotId: MAIN_LOT_ID,
      production: 'ReadyForDelivery',
    });
    await run(adapter, 'demo-producer-001', {
      action: 'submitMilestoneEvidence',
      offerId: MAIN_OFFER_ID,
      milestoneIndex: 0,
      documentIds: ['demo-doc-lot-001-readiness'],
    });
    ledger = adapter.snapshot();
    const milestoneReview = Object.values(ledger.reviews).find((r) => r.kind === 'milestone');
    // Before the operator confirms, nothing is withdrawable.
    expect(formatMoney(withdrawableFor(ledger.settlements[MAIN_OFFER_ID]), 'en')).toBe('€0.00');
    await run(adapter, 'demo-operator-001', { action: 'confirmMilestone', reviewId: milestoneReview!.id });
    ledger = adapter.snapshot();
    expect(formatMoney(withdrawableFor(ledger.settlements[MAIN_OFFER_ID]), 'en')).toBe('€1,008.00');

    // Step 5 — request delivery of 60 bottles.
    await run(adapter, MAIN_BUYER_ID, {
      action: 'requestRedemption',
      lotId: MAIN_LOT_ID,
      quantity: 60,
      destinationId: SAMPLE_DESTINATION.id,
    });
    ledger = adapter.snapshot();
    const position = ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)];
    expect(position.walletBottles).toBe(36);
    expect(position.redemptionEscrowBottles).toBe(60);
    expect(transferableBottles(position)).toBe(36);
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles - ledger.lots[MAIN_LOT_ID].redeemedBottles).toBe(120);

    // Step 6 — shipment then confirmed receipt burns the escrow.
    const redemptionId = Object.keys(ledger.redemptions)[0];
    await run(adapter, 'demo-producer-001', {
      action: 'markShipped',
      redemptionId,
      documentId: 'demo-doc-shipment-001',
    });
    await run(adapter, MAIN_BUYER_ID, { action: 'confirmDelivery', redemptionId });
    ledger = adapter.snapshot();
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)].redemptionEscrowBottles).toBe(0);
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(36);
    expect(ledger.positions[positionKey(RESALE_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(24);
    expect(ledger.lots[MAIN_LOT_ID].redeemedBottles).toBe(60);
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles).toBe(120);

    // Step 7 — the winery withdraws: €1,008.00 gross, €30.24 fee, €977.76 net.
    const before = ledger.cash['demo-producer-001'];
    await run(adapter, 'demo-producer-001', { action: 'withdrawReleased', offerId: MAIN_OFFER_ID });
    ledger = adapter.snapshot();
    const received = units(ledger.cash['demo-producer-001']) - units(before);
    expect(formatMoney({ ...before, units: received.toString() }, 'en')).toBe('€977.76');
    expect(formatMoney(withdrawableFor(ledger.settlements[MAIN_OFFER_ID]), 'en')).toBe('€0.00');
    // The resale royalty is credited separately from the primary withdrawal.
    expect(formatExact(ledger.trades[Object.keys(ledger.trades)[0]].royalty, 'en')).toBe('5.520 EURe');
  });
});

describe('rules that must not be simulated away', () => {
  it('refuses a second reservation from a replayed request id', async () => {
    const adapter = fresh();
    const command: Command = {
      actorId: MAIN_BUYER_ID,
      args: { action: 'reserve', offerId: MAIN_OFFER_ID, quantity: 12, payment: 'full' },
      expectedSequence: 0,
      clientRequestId: 'duplicate-check',
    };
    const prepared = await adapter.prepare(command);
    await adapter.execute(prepared.id);
    await expect(adapter.prepare(command)).rejects.toThrow(/DUPLICATE_REQUEST/);
  });

  it('rejects a prepared action built on a stale snapshot', async () => {
    const adapter = fresh();
    const stale: Command = {
      actorId: MAIN_BUYER_ID,
      args: { action: 'reserve', offerId: MAIN_OFFER_ID, quantity: 12, payment: 'full' },
      expectedSequence: 99,
      clientRequestId: 'stale-check',
    };
    await expect(adapter.prepare(stale)).rejects.toThrow(/STALE_SNAPSHOT/);
  });

  it('never lets a buyer purchase their own listing', async () => {
    const adapter = fresh();
    await run(adapter, MAIN_BUYER_ID, { action: 'reserve', offerId: 'demo-offer-002', quantity: 10, payment: 'full' });
    await run(adapter, MAIN_BUYER_ID, {
      action: 'list',
      lotId: 'demo-lot-002',
      quantity: 4,
      pricePerBottle: { units: (12_000_000_000_000_000_000n).toString(), token: 'DEMO_EUR', decimals: 18, symbol: 'EURe', chainId: null },
    });
    const listingId = Object.keys(adapter.snapshot().listings)[0];
    await expect(
      run(adapter, MAIN_BUYER_ID, {
        action: 'buy',
        listingId,
        quantity: 1,
        maxPricePerBottle: adapter.snapshot().listings[listingId].pricePerBottle,
        deadline: '2026-09-07T09:00:00Z',
      }),
    ).rejects.toThrow(/SELF_TRADE/);
  });

  it('blocks the buyer from cancelling a shipped delivery', async () => {
    const adapter = new DemoAdapter('delivery-ready', { restore: false });
    await run(adapter, MAIN_BUYER_ID, {
      action: 'requestRedemption',
      lotId: MAIN_LOT_ID,
      quantity: 12,
      destinationId: SAMPLE_DESTINATION.id,
    });
    const redemptionId = Object.keys(adapter.snapshot().redemptions)[0];
    await run(adapter, 'demo-producer-001', { action: 'markShipped', redemptionId, documentId: 'demo-doc-shipment-001' });
    await expect(run(adapter, MAIN_BUYER_ID, { action: 'cancelRedemption', redemptionId })).rejects.toThrow(
      /WRONG_STATE/,
    );
  });

  it('returns escrowed bottles — not money — when a case resolves as a return', async () => {
    const adapter = new DemoAdapter('delivery-ready', { restore: false });
    const cashBefore = adapter.snapshot().cash[MAIN_BUYER_ID];
    await run(adapter, MAIN_BUYER_ID, {
      action: 'requestRedemption',
      lotId: MAIN_LOT_ID,
      quantity: 30,
      destinationId: SAMPLE_DESTINATION.id,
    });
    const redemptionId = Object.keys(adapter.snapshot().redemptions)[0];
    await run(adapter, MAIN_BUYER_ID, {
      action: 'reportDeliveryProblem',
      redemptionId,
      category: 'missing',
      description: 'Sample case for the demonstration.',
    });
    const caseId = Object.keys(adapter.snapshot().cases)[0];
    await run(adapter, 'demo-operator-001', { action: 'resolveCase', caseId, outcome: 'return', reason: 'Sample outcome.' });
    const ledger = adapter.snapshot();
    expect(ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)].walletBottles).toBe(120);
    expect(ledger.redemptions[redemptionId].state).toBe('Cancelled');
    expect(ledger.lots[MAIN_LOT_ID].redeemedBottles).toBe(0);
    expect(units(ledger.cash[MAIN_BUYER_ID])).toBe(units(cashBefore));
  });

  it('keeps a deposit from minting and a milestone from paying out', async () => {
    const adapter = fresh();
    await run(adapter, MAIN_BUYER_ID, { action: 'reserve', offerId: MAIN_OFFER_ID, quantity: 60, payment: 'deposit' });
    const ledger = adapter.snapshot();
    expect(ledger.lots[MAIN_LOT_ID].mintedBottles).toBe(0);
    expect(withdrawableFor(ledger.settlements[MAIN_OFFER_ID]).units).toBe('0');
  });

  it('reproduces the same ledger after a reset', async () => {
    const adapter = fresh();
    const before = JSON.stringify(adapter.snapshot());
    await run(adapter, MAIN_BUYER_ID, { action: 'reserve', offerId: MAIN_OFFER_ID, quantity: 36, payment: 'full' });
    await adapter.resetDemo('buyer-ready');
    expect(JSON.stringify(adapter.snapshot())).toBe(before);
  });
});
