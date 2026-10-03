import { resolve } from 'node:path';
import { artifact, artifacts, context, preflight, transaction, call, read, root, signer, viem, writeJson } from './release-lib.mjs';
const ctx = context(Number(process.argv[2]), true);
await preflight(ctx);
const c = ctx.journal.contracts, asset = ctx.network.usdg;
const winery = signer(1), shop = signer(2), buyer = signer(3);
if (await ctx.client.readContract({ address: asset, abi: viem.erc20Abi, functionName: 'decimals' }) !== 6 || await ctx.client.readContract({ address: asset, abi: viem.erc20Abi, functionName: 'symbol' }) !== 'USDG') throw new Error('Official USDG metadata mismatch.');
if (!ctx.journal.usdgStartTime) {
  const balance = await ctx.client.readContract({ address: asset, abi: viem.erc20Abi, functionName: 'balanceOf', args: [shop.address] });
  if (balance < 40_000_000n) throw new Error('Fund the controlled shop with at least 40 test USDG from Paxos first.');
  ctx.journal.usdgStartTime = String((await ctx.client.getBlock()).timestamp);
  writeJson(ctx.path, ctx.journal, true);
}
const start = BigInt(ctx.journal.usdgStartTime);
async function create(label, key, functionName, args, eventName, field, account) {
  const receipt = await call(ctx, label, key, functionName, args, account);
  const log = viem.parseEventLogs({ abi: artifact(artifacts[key]).abi, logs: receipt.logs, eventName }).find((entry) => entry.address.toLowerCase() === c[key].toLowerCase());
  if (!log) throw new Error('Missing creation event ' + eventName);
  return log.args[field];
}
async function payment(label, functionName, args, account) {
  const data = viem.encodeFunctionData({ abi: viem.erc20Abi, functionName, args });
  if (!ctx.journal.steps[label]) await ctx.client.simulateContract({ address: asset, abi: viem.erc20Abi, functionName, args, account });
  return transaction(ctx, label, { to: asset, data, args, account, name: 'Official Paxos test USDG' });
}
const input = { totalBottles: 120, vintage: 2026, royaltyBps: 250, bottleSizeMl: 750, exportAllowed: true, name: 'Demo — USDG ready wine 2026', region: 'Languedoc, France — fictional test lot', grapes: 'Syrah', metadataURI: '' };
const lotId = await create('usdg.lot', 'wineLotToken', 'createLot', [input], 'LotCreated', 'lotId', winery);
const docsHash = viem.keccak256(viem.toHex(JSON.stringify(input)));
await call(ctx, 'usdg.verify', 'wineLotToken', 'verifyLot', [lotId, docsHash]);
await call(ctx, 'usdg.production', 'wineLotToken', 'setProductionStatus', [lotId, 6], winery);
const offerId = await create('usdg.offer', 'primaryMarket', 'createOffer', [lotId, asset, 1_000_000n, 120, start, start + 90n * 86400n, 3000, start + 120n * 86400n, 0], 'OfferCreated', 'offerId', winery);
await call(ctx, 'usdg.milestone', 'primaryMarket', 'setMilestones', [offerId, [10000], ['Operator verifies readiness before payment release.']], winery);
await payment('usdg.fundBuyer', 'transfer', [buyer.address, 25_000_000n], shop);
await payment('usdg.approvePrimary', 'approve', [c.primaryMarket, 12_000_000n], shop);
const allocationId = await create('usdg.reserve', 'primaryMarket', 'reserve', [offerId, 12, 12_000_000n], 'AllocationCreated', 'allocationId', shop);
await call(ctx, 'usdg.confirmMilestone', 'primaryMarket', 'confirmMilestone', [offerId, 0]);
await call(ctx, 'usdg.withdraw', 'primaryMarket', 'withdrawReleased', [offerId], winery);
const listingId = await create('usdg.list', 'secondaryMarket', 'list', [lotId, 3, 1_200_000n, asset], 'Listed', 'listingId', shop);
await payment('usdg.approveSecondary', 'approve', [c.secondaryMarket, 3_600_000n], buyer);
await call(ctx, 'usdg.buy', 'secondaryMarket', 'buy', [listingId, 3, 1_200_000n, start + 30n * 86400n], buyer);
await call(ctx, 'usdg.approveRedemption', 'wineLotToken', 'setApprovalForAll', [c.redemptionManager, true], buyer);
const redemptionId = await create('usdg.redeem', 'redemptionManager', 'requestRedemption', [lotId, 3, docsHash], 'RedemptionRequested', 'redemptionId', buyer);
await call(ctx, 'usdg.ship', 'redemptionManager', 'markShipped', [redemptionId, docsHash], winery);
await call(ctx, 'usdg.delivery', 'redemptionManager', 'confirmDelivery', [redemptionId], buyer);
const lot = await read(ctx, 'wineLotToken', 'getLot', [lotId]);
const supply = await read(ctx, 'wineLotToken', 'totalSupply', [lotId]);
if (lot.mintedBottles !== 12 || lot.redeemedBottles !== 3 || supply !== 9n || await read(ctx, 'wineLotToken', 'balanceOf', [shop.address, lotId]) !== 9n || await read(ctx, 'wineLotToken', 'balanceOf', [buyer.address, lotId]) !== 0n || await read(ctx, 'primaryMarket', 'withdrawable', [offerId]) !== 0n) throw new Error('USDG bottle accounting failed.');
const paymentBalance = (address) => ctx.client.readContract({ address: asset, abi: viem.erc20Abi, functionName: 'balanceOf', args: [address] });
const record = { chainId: ctx.chainId, version: '1.1.0', asset: { address: asset, symbol: 'USDG', decimals: 6, issuer: 'Paxos', currency: 'USD' }, notice: 'Official valueless test USDG and fictional bottles; this is execution evidence, not real commerce.', lotId, offerId, allocationId, listingId, redemptionId, supply, minted: lot.mintedBottles, redeemed: lot.redeemedBottles, observedBlock: await ctx.client.getBlockNumber({ cacheTime: 0 }), actors: { winery: winery.address, shop: shop.address, buyer: buyer.address, treasury: ctx.account.address }, paymentBalances: { winery: await paymentBalance(winery.address), shop: await paymentBalance(shop.address), buyer: await paymentBalance(buyer.address), treasury: await paymentBalance(ctx.account.address) }, transactions: Object.fromEntries(Object.entries(ctx.journal.steps).filter(([label]) => label.startsWith('usdg.')).map(([label, step]) => [label, { hash: step.hash, to: step.to, sender: step.sender, status: step.status, blockNumber: step.blockNumber }])) };
writeJson(resolve(root, 'deployments', 'palissage-' + ctx.chainId + '.usdg-evidence.json'), record);
console.log('Official USDG primary purchase, resale royalties and redemption verified.');
