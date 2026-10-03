import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, artifact, context, viem, writeJson } from './release-lib.mjs';

const chainId = Number(process.argv[2]);
const ctx = context(chainId, false);
if (await ctx.client.getChainId() !== chainId) throw new Error('RPC chain mismatch.');
const manifest = JSON.parse(readFileSync(resolve(root, 'deployments', `palissage-${chainId}.manifest.json`), 'utf8'));
const flow = JSON.parse(readFileSync(resolve(root, 'deployments', `palissage-${chainId}.flow-evidence.json`), 'utf8'));
const path = resolve(root, 'deployments', `palissage-${chainId}.identities.json`);
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
const compiled = artifact('Identity');
const registry = manifest.contracts.identityRegistry.address;
const gateway = manifest.contracts.roleGateway.address;
const registryAbi = artifact('IdentityRegistry').abi;
const observedBlock = await ctx.client.getBlockNumber({ cacheTime: 0 });
const contracts = {};

for (const role of ['winery', 'shop', 'buyer']) {
  const wallet = flow.actors[role];
  const address = await ctx.client.readContract({ address: registry, abi: registryAbi, functionName: 'identityOf', args: [wallet], blockNumber: observedBlock });
  if (address === viem.zeroAddress) throw new Error(`Missing identity for ${role}.`);
  const code = await ctx.client.getCode({ address, blockNumber: observedBlock });
  if (code !== compiled.deployedBytecode.object) throw new Error('Identity runtime differs from the artifact.');
  const constructorArgs = viem.encodeAbiParameters([{ type: 'address' }], [gateway]);
  const management = await ctx.client.readContract({ address, abi: compiled.abi, functionName: 'keyHasPurpose', args: [viem.keccak256(constructorArgs), 1n], blockNumber: observedBlock });
  if (!management) throw new Error('Gateway is not the identity management key.');
  const creationTx = flow.transactions[`demo.role.${role}`].hash;
  const receipt = await ctx.client.getTransactionReceipt({ hash: creationTx });
  const registrations = viem.parseEventLogs({ abi: registryAbi, logs: receipt.logs, eventName: 'IdentityRegistered', strict: true });
  if (receipt.status !== 'success' || !registrations.some((log) => log.address.toLowerCase() === registry.toLowerCase() && log.args.wallet.toLowerCase() === wallet.toLowerCase() && log.args.identity.toLowerCase() === address.toLowerCase())) {
    throw new Error('Fixture registration receipt does not identify this contract.');
  }
  const contract = {
    name: 'Identity', address, wallet, creationTx, creationBlock: receipt.blockNumber.toString(), constructorArgs,
    compiler: compiled.metadata.compiler.version,
    sourceHashes: Object.fromEntries(Object.entries(compiled.metadata.sources).map(([path, entry]) => [path, entry.keccak256])),
    runtimeCodeHash: viem.keccak256(code),
  };
  const prior = previous?.contracts?.[role];
  if (prior?.address === address && prior.runtimeCodeHash === contract.runtimeCodeHash && prior.compiler === contract.compiler && prior.constructorArgs === constructorArgs && prior.explorerSourceVerified) {
    for (const field of ['explorerSourceVerified', 'sourceExplorerUrl', 'explorerVerificationKind', 'matchedSourceAddress']) {
      if (prior[field] !== undefined) contract[field] = prior[field];
    }
  }
  contracts[role] = contract;
}
writeJson(path, {
  schemaVersion: 1, chainId, status: 'verified', observedBlock: observedBlock.toString(),
  notice: 'Fixture participant identities created internally by RoleGateway; registration receipts, exact runtime and gateway management key checked on-chain. Explorer source verification is recorded separately per address.',
  contracts,
});
console.log(`${chainId}: three fixture identities confirmed at block ${observedBlock}.`);
