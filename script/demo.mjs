import { resolve } from 'node:path';
import { artifact, artifacts, context, preflight, transaction, call, read, root, signer, viem, writeJson } from './release-lib.mjs';

const chainId = Number(process.argv[2]);
const ctx = context(chainId, true);
await preflight(ctx);
const c = ctx.journal.contracts;
if (!c.palissageLens) throw new Error('Deploy and verify the release before seeding.');
const winery = signer(1), shop = signer(2), buyer = signer(3);
const actors = { operator: ctx.account.address, winery: winery.address, shop: shop.address, buyer: buyer.address };
for (const [name, account] of [['winery', winery], ['shop', shop], ['buyer', buyer]]) {
  // Fixed funding once; a resumed run never tops a wallet up again.
  await transaction(ctx, 'demo.fund.' + name, { to: account.address, value: viem.parseEther('0.00012') });
}
for (const [name, account, amount] of [['winery', winery, '0.0006'], ['shop', shop, '0.0002']]) {
  await transaction(ctx, 'demo.workflowGas.' + name, { to: account.address, value: viem.parseEther(amount) });
}
for (const [name, account, role] of [['winery', winery, 2], ['shop', shop, 3], ['buyer', buyer, 3]]) {
  await call(ctx, 'demo.role.' + name, 'roleGateway', 'assignRole', [account.address, role]);
}
for (const [name, account] of [['shop', shop], ['buyer', buyer]]) {
  await call(ctx, 'demo.tokens.' + name, 'testEURe', 'mint', [account.address, viem.parseEther('20000')]);
}

async function create(label, key, functionName, args, eventName, field, account) {
  const receipt = await call(ctx, label, key, functionName, args, account);
  const logs = viem.parseEventLogs({ abi: artifact(artifacts[key]).abi, logs: receipt.logs, eventName, strict: true });
  const log = logs.find((entry) => entry.address.toLowerCase() === c[key].toLowerCase());
  if (!log) throw new Error('Missing ' + eventName + ' in ' + receipt.transactionHash);
  return log.args[field];
}
const specs = [
  ['Demo — Languedoc Syrah 2025', 'Syrah', 2025, 6, 0, '8.40'],
  ['Demo — Pic Saint-Loup 2025', 'Syrah, Grenache', 2025, 6, 0, '11.20'],
  ['Demo — Mediterranean Rosé 2026', 'Grenache, Cinsault', 2026, 6, 0, '7.80'],
  ['Demo — Organic Grenache 2027', 'Grenache', 2027, 1, 1, '9.60'],
  ['Demo — Carignan Old Vines 2027', 'Carignan', 2027, 2, 1, '12.40'],
  ['Demo — White Blend 2026', 'Roussanne, Marsanne', 2026, 6, 0, '10.50'],
];
if (!ctx.journal.demoStartTime) {
  ctx.journal.demoStartTime = String((await ctx.client.getBlock()).timestamp);
  writeJson(ctx.path, ctx.journal, true);
}
const start = BigInt(ctx.journal.demoStartTime);
const lots = [];
for (let index = 0; index < specs.length; index++) {
  const [name, grapes, vintage, production, kind, price] = specs[index];
  const input = { totalBottles: 2400, vintage, royaltyBps: 250, bottleSizeMl: 750, exportAllowed: true, name, region: 'Languedoc, France — fictional test lot', grapes, metadataURI: '' };
  const lotId = await create('demo.lot.' + index, 'wineLotToken', 'createLot', [input], 'LotCreated', 'lotId', winery);
  const docsHash = viem.keccak256(viem.toHex(JSON.stringify({ ...input, notice: 'Fictional demonstration; no physical wine or commercial verification.' })));
  await call(ctx, 'demo.verify.' + index, 'wineLotToken', 'verifyLot', [lotId, docsHash]);
  await call(ctx, 'demo.production.' + index, 'wineLotToken', 'setProductionStatus', [lotId, production], winery);
  const offerId = await create('demo.offer.' + index, 'primaryMarket', 'createOffer', [lotId, c.testEURe, viem.parseEther(price), 1800, start, start + 90n * 86400n, 3000, start + 120n * 86400n, kind], 'OfferCreated', 'offerId', winery);
  await call(ctx, 'demo.milestone.' + index, 'primaryMarket', 'setMilestones', [offerId, [10000], ['Release after the operator verifies delivery readiness.']], winery);
  lots.push({ lotId, offerId, name, paymentToken: c.testEURe, pricePerBottle: viem.parseEther(price), docsHash });
}
const first = lots[0], price = first.pricePerBottle, total = price * 120n, deposit = (total * 3000n + 9999n) / 10000n;
await call(ctx, 'flow.approvePrimary', 'testEURe', 'approve', [c.primaryMarket, total + price * 18n], shop);
const allocation = await create('flow.reserveDeposit', 'primaryMarket', 'reserve', [first.offerId, 120, deposit], 'AllocationCreated', 'allocationId', shop);
if ((await read(ctx, 'wineLotToken', 'balanceOf', [shop.address, first.lotId])) !== 0n && !ctx.journal.steps['flow.payRemainder']) throw new Error('Deposit minted tokens before settlement.');
await call(ctx, 'flow.payRemainder', 'primaryMarket', 'payRemainder', [allocation, total - deposit], shop);
const canceledAllocation = await create('flow.reserveCancel', 'primaryMarket', 'reserve', [first.offerId, 6, price * 6n * 3000n / 10000n], 'AllocationCreated', 'allocationId', shop);
await call(ctx, 'flow.cancelAllocation', 'primaryMarket', 'cancelAllocation', [canceledAllocation], winery);
await create('flow.reserveFull', 'primaryMarket', 'reserve', [first.offerId, 12, price * 12n], 'AllocationCreated', 'allocationId', shop);
await call(ctx, 'flow.confirmMilestone', 'primaryMarket', 'confirmMilestone', [first.offerId, 0]);
await call(ctx, 'flow.withdrawReleased', 'primaryMarket', 'withdrawReleased', [first.offerId], winery);
await call(ctx, 'flow.approveListing', 'wineLotToken', 'setApprovalForAll', [c.secondaryMarket, true], shop);
const listing = await create('flow.list', 'secondaryMarket', 'list', [first.lotId, 24, viem.parseEther('9.20'), c.testEURe], 'Listed', 'listingId', shop);
await call(ctx, 'flow.updateListing', 'secondaryMarket', 'updateListingPrice', [listing, viem.parseEther('9.20')], shop);
await call(ctx, 'flow.approveSecondary', 'testEURe', 'approve', [c.secondaryMarket, viem.parseEther('220.80')], buyer);
await call(ctx, 'flow.buySecondary', 'secondaryMarket', 'buy', [listing, 24, viem.parseEther('9.20'), start + 86400n * 30n], buyer);
const cancelListing = await create('flow.listCancel', 'secondaryMarket', 'list', [first.lotId, 6, viem.parseEther('9.20'), c.testEURe], 'Listed', 'listingId', shop);
await call(ctx, 'flow.cancelListing', 'secondaryMarket', 'cancelListing', [cancelListing], shop);
await call(ctx, 'flow.approveRedemption', 'wineLotToken', 'setApprovalForAll', [c.redemptionManager, true], shop);
const deliveryHash = viem.keccak256(viem.toHex('Public demo fixture; no address or personal delivery data.'));
const cancel = await create('flow.redeemCancel', 'redemptionManager', 'requestRedemption', [first.lotId, 6, deliveryHash], 'RedemptionRequested', 'redemptionId', shop);
await call(ctx, 'flow.cancelRedemption', 'redemptionManager', 'cancelRedemption', [cancel], shop);
const refund = await create('flow.redeemRefund', 'redemptionManager', 'requestRedemption', [first.lotId, 6, deliveryHash], 'RedemptionRequested', 'redemptionId', shop);
await call(ctx, 'flow.shipRefund', 'redemptionManager', 'markShipped', [refund, deliveryHash], winery);
await call(ctx, 'flow.refundRedemption', 'redemptionManager', 'refundRedemption', [refund]);
const redemption = await create('flow.redeem', 'redemptionManager', 'requestRedemption', [first.lotId, 60, deliveryHash], 'RedemptionRequested', 'redemptionId', shop);
await call(ctx, 'flow.ship', 'redemptionManager', 'markShipped', [redemption, deliveryHash], winery);
await call(ctx, 'flow.confirmDelivery', 'redemptionManager', 'confirmDelivery', [redemption], shop);

const lot = await read(ctx, 'wineLotToken', 'getLot', [first.lotId]);
const states = {
  lotId: first.lotId, allocationId: allocation, listingId: listing, redemptionId: redemption,
  minted: lot.mintedBottles, redeemed: lot.redeemedBottles,
  supply: await read(ctx, 'wineLotToken', 'totalSupply', [first.lotId]),
  shopBottles: await read(ctx, 'wineLotToken', 'balanceOf', [shop.address, first.lotId]),
  buyerBottles: await read(ctx, 'wineLotToken', 'balanceOf', [buyer.address, first.lotId]),
  redemptionEscrow: await read(ctx, 'wineLotToken', 'balanceOf', [c.redemptionManager, first.lotId]),
  withdrawable: await read(ctx, 'primaryMarket', 'withdrawable', [first.offerId]),
};
if (states.minted !== 132 || states.redeemed !== 60 || states.supply !== 72n || states.shopBottles !== 48n || states.buyerBottles !== 24n || states.redemptionEscrow !== 0n || states.withdrawable !== 0n) throw new Error('End-to-end accounting verification failed.');
await call(ctx, 'demo.openTestMode', 'roleGateway', 'setTestMode', [true]);
const evidence = {
  chainId, version: '1.1.0', notice: 'Fictional lots and valueless test assets. This proves transaction execution, not commercial adoption.',
  asset: { address: c.testEURe, symbol: 'tEURe', decimals: 18 }, actors, lots, states,
  observedBlock: await ctx.client.getBlockNumber(),
  transactions: Object.fromEntries(Object.entries(ctx.journal.steps).filter(([name]) => name.startsWith('flow.') || name.startsWith('demo.')).map(([name, step]) => [name, { hash: step.hash, sender: step.sender, to: step.to, blockNumber: step.blockNumber, status: step.status }])),
};
writeJson(resolve(root, 'deployments', 'palissage-' + chainId + '.flow-evidence.json'), evidence);
console.log('Full workflow verified; demo roles opened; evidence written.');
