import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { artifact, artifacts, context, preflight, transaction, call, read, role, root, viem, writeJson } from './release-lib.mjs';

function constructorArgs(key, address, contracts) {
  switch (key) {
    case 'trustedIssuersRegistry': case 'testEURe': case 'claimIssuer': return [address];
    case 'identityRegistry': return [address, contracts.trustedIssuersRegistry];
    case 'wineLotToken': return [address, contracts.identityRegistry];
    case 'primaryMarket': case 'secondaryMarket': return [address, contracts.wineLotToken, contracts.identityRegistry, address];
    case 'redemptionManager': return [address, contracts.wineLotToken];
    case 'roleGateway': return [address, contracts.identityRegistry, contracts.wineLotToken];
    case 'palissageLens': return [contracts.wineLotToken, contracts.primaryMarket, contracts.secondaryMarket, contracts.redemptionManager, contracts.identityRegistry, contracts.roleGateway];
    default: throw new Error(`Unknown contract ${key}`);
  }
}

async function deploy(ctx) {
  for (const [key, name] of Object.entries(artifacts)) {
    const compiled = artifact(name);
    const args = constructorArgs(key, ctx.account.address, ctx.journal.contracts);
    const data = viem.encodeDeployData({ abi: compiled.abi, bytecode: compiled.bytecode.object, args });
    const receipt = await transaction(ctx, `deploy.${key}`, { data, args, name });
    if (!receipt.contractAddress) throw new Error(`No creation address for ${key}.`);
    ctx.journal.contracts[key] = receipt.contractAddress;
    writeJson(ctx.path, ctx.journal, true);
  }
  const c = ctx.journal.contracts;
  const admin = ctx.account.address;
  for (const [name, account] of [
    ['MINTER_ROLE', c.primaryMarket], ['BURNER_ROLE', c.redemptionManager],
    ['TRANSFER_AGENT_ROLE', c.primaryMarket], ['TRANSFER_AGENT_ROLE', c.secondaryMarket],
    ['TRANSFER_AGENT_ROLE', c.redemptionManager], ['ENFORCER_ROLE', c.redemptionManager],
    ['DEFAULT_ADMIN_ROLE', c.roleGateway],
  ]) await call(ctx, `wire.token.${name}.${account}`, 'wineLotToken', 'grantRole', [role(name), account]);
  await call(ctx, 'wire.system', 'wineLotToken', 'setSystemAddress', [c.redemptionManager, true]);
  for (const [key, names] of [['primaryMarket', ['VERIFIER_ROLE', 'PAUSER_ROLE']], ['secondaryMarket', ['PAUSER_ROLE']], ['redemptionManager', ['VERIFIER_ROLE']]]) {
    for (const name of names) await call(ctx, `wire.${key}.${name}`, key, 'grantRole', [role(name), admin]);
  }
  for (const key of ['primaryMarket', 'secondaryMarket']) await call(ctx, `allow.${key}.eur`, key, 'setPaymentTokenAllowed', [c.testEURe, true]);
  for (const key of ['claimIssuer', 'roleGateway']) await call(ctx, `trust.${key}`, 'trustedIssuersRegistry', 'addTrustedIssuer', [c[key], [1n, 2n, 3n, 4n, 5n]]);
  await call(ctx, 'wire.registryAgent', 'identityRegistry', 'grantRole', [role('REGISTRY_AGENT_ROLE'), c.roleGateway]);
  await call(ctx, 'wire.admin', 'roleGateway', 'assignRole', [admin, 1]);

  const erc20 = viem.erc20Abi;
  const usdgCode = await ctx.client.getCode({ address: ctx.network.usdg });
  if (!usdgCode || usdgCode === '0x') throw new Error('The official USDG address has no code on this network.');
  const decimals = await ctx.client.readContract({ address: ctx.network.usdg, abi: erc20, functionName: 'decimals' });
  const symbol = await ctx.client.readContract({ address: ctx.network.usdg, abi: erc20, functionName: 'symbol' });
  if (decimals !== 6 || symbol !== 'USDG') throw new Error('Official USDG metadata mismatch.');
  for (const key of ['primaryMarket', 'secondaryMarket']) await call(ctx, `allow.${key}.usdg`, key, 'setPaymentTokenAllowed', [ctx.network.usdg, true]);
  await verify(ctx, true);
}

function assert(condition, message) { if (!condition) throw new Error(message); }
const same = (a, b) => a?.toLowerCase() === b?.toLowerCase();

async function verify(ctx, publish = false) {
  const manifestPath = resolve(root, 'deployments', `palissage-${ctx.chainId}.manifest.json`);
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  const snapshotBlock = await ctx.client.getBlockNumber({ cacheTime: 0 });
  const c = ctx.journal.contracts;
  const admin = ctx.journal.deployer;
  const contracts = {};
  const runtimeCodeHashes = {};
  for (const [key, name] of Object.entries(artifacts)) {
    assert(c[key], `Missing ${key}.`);
    const compiled = artifact(name);
    const code = await ctx.client.getCode({ address: c[key], blockNumber: snapshotBlock });
    assert(code && code !== '0x', `${key} has no runtime code.`);
    // Only compiler-declared immutable slots are masked. Creation calldata and getters
    // bind their values independently, so an unrelated runtime cannot pass this check.
    const masked = code.slice(2).split('');
    for (const slots of Object.values(compiled.deployedBytecode.immutableReferences ?? {})) {
      for (const { start, length } of slots) masked.fill('0', start * 2, (start + length) * 2);
    }
    assert(`0x${masked.join('')}`.toLowerCase() === compiled.deployedBytecode.object.toLowerCase(), `${key} runtime differs from compiled source.`);
    const step = ctx.journal.steps[`deploy.${key}`];
    assert(step, `Missing creation receipt for ${key}.`);
    const receipt = await ctx.client.getTransactionReceipt({ hash: step.hash });
    assert(receipt.status === 'success' && same(receipt.contractAddress, c[key]), `${key} creation receipt mismatch.`);
    const tx = await ctx.client.getTransaction({ hash: step.hash });
    const args = constructorArgs(key, admin, c);
    const expected = viem.encodeDeployData({ abi: compiled.abi, bytecode: compiled.bytecode.object, args });
    assert(tx.input.toLowerCase() === expected.toLowerCase() && same(tx.from, admin), `${key} creation calldata or deployer mismatch.`);
    assert(await read(ctx, key, 'VERSION', [], snapshotBlock) === '1.1.0', `${key} version mismatch.`);
    runtimeCodeHashes[key] = viem.keccak256(code);
    const inputs = compiled.abi.find((entry) => entry.type === 'constructor')?.inputs ?? [];
    contracts[key] = {
      name, address: c[key], creationTx: step.hash, creationBlock: receipt.blockNumber.toString(),
      constructorArgs: viem.encodeAbiParameters(inputs, args),
      abiHash: viem.keccak256(viem.toHex(JSON.stringify(compiled.abi))),
      runtimeCodeHash: runtimeCodeHashes[key], compiler: compiled.metadata.compiler.version,
      sourceHashes: Object.fromEntries(Object.entries(compiled.metadata.sources).map(([path, entry]) => [path, entry.keccak256])),
      explorerSourceVerified: false,
    };
    const prior = previous?.contracts?.[key];
    if (same(prior?.address, c[key]) && prior.runtimeCodeHash === runtimeCodeHashes[key] && prior.creationTx === step.hash && prior.explorerSourceVerified) {
      contracts[key].explorerSourceVerified = true;
      contracts[key].sourceExplorerUrl = prior.sourceExplorerUrl;
    }
    writeJson(resolve(root, 'deployments', 'abis', `${name}.json`), compiled.abi);
  }

  const references = [
    ['identityRegistry', 'trustedIssuersRegistry', 'trustedIssuersRegistry'], ['wineLotToken', 'identityRegistry', 'identityRegistry'],
    ['primaryMarket', 'wineLotToken', 'wineLotToken'], ['primaryMarket', 'identityRegistry', 'identityRegistry'],
    ['secondaryMarket', 'wineLotToken', 'wineLotToken'], ['secondaryMarket', 'identityRegistry', 'identityRegistry'],
    ['redemptionManager', 'wineLotToken', 'wineLotToken'], ['roleGateway', 'token', 'wineLotToken'], ['roleGateway', 'identityRegistry', 'identityRegistry'],
    ['palissageLens', 'token', 'wineLotToken'], ['palissageLens', 'primary', 'primaryMarket'], ['palissageLens', 'secondary', 'secondaryMarket'],
    ['palissageLens', 'redemptionManager', 'redemptionManager'], ['palissageLens', 'registry', 'identityRegistry'], ['palissageLens', 'gateway', 'roleGateway'],
  ];
  for (const [key, getter, target] of references) assert(same(await read(ctx, key, getter, [], snapshotBlock), c[target]), `${key}.${getter} wiring mismatch.`);
  const grants = [
    ['wineLotToken', 'MINTER_ROLE', c.primaryMarket], ['wineLotToken', 'BURNER_ROLE', c.redemptionManager],
    ['wineLotToken', 'TRANSFER_AGENT_ROLE', c.primaryMarket], ['wineLotToken', 'TRANSFER_AGENT_ROLE', c.secondaryMarket],
    ['wineLotToken', 'TRANSFER_AGENT_ROLE', c.redemptionManager], ['wineLotToken', 'ENFORCER_ROLE', c.redemptionManager],
    ['wineLotToken', 'DEFAULT_ADMIN_ROLE', c.roleGateway], ['wineLotToken', 'VERIFIER_ROLE', admin],
    ['identityRegistry', 'REGISTRY_AGENT_ROLE', c.roleGateway], ['primaryMarket', 'VERIFIER_ROLE', admin],
    ['primaryMarket', 'PAUSER_ROLE', admin], ['secondaryMarket', 'PAUSER_ROLE', admin], ['redemptionManager', 'VERIFIER_ROLE', admin],
  ];
  for (const key of ['trustedIssuersRegistry', 'identityRegistry', 'wineLotToken', 'primaryMarket', 'secondaryMarket', 'redemptionManager']) grants.push([key, 'DEFAULT_ADMIN_ROLE', admin]);
  for (const [key, name, account] of grants) assert(await read(ctx, key, 'hasRole', [role(name), account], snapshotBlock), `Missing ${key}.${name} for ${account}.`);
  for (const [key, name] of [['secondaryMarket', 'MINTER_ROLE'], ['secondaryMarket', 'BURNER_ROLE']]) {
    assert(!await read(ctx, 'wineLotToken', 'hasRole', [role(name), c[key]], snapshotBlock), `Unexpected ${key}.${name}.`);
  }
  for (const key of ['claimIssuer', 'roleGateway']) {
    assert(await read(ctx, 'trustedIssuersRegistry', 'isTrustedIssuer', [c[key]], snapshotBlock), `${key} is not trusted.`);
    for (let topic = 1n; topic <= 5n; topic++) assert(await read(ctx, 'trustedIssuersRegistry', 'hasClaimTopic', [c[key], topic], snapshotBlock), `${key} topic ${topic} missing.`);
  }
  assert(await read(ctx, 'wineLotToken', 'isSystemAddress', [c.redemptionManager], snapshotBlock), 'Redemption escrow is not a system address.');
  assert(same(await read(ctx, 'roleGateway', 'owner', [], snapshotBlock), admin), 'Gateway ownership mismatch.');
  assert(same(await read(ctx, 'testEURe', 'owner', [], snapshotBlock), admin), 'Faucet ownership mismatch.');
  for (const key of ['primaryMarket', 'secondaryMarket']) {
    assert(same(await read(ctx, key, 'treasury', [], snapshotBlock), admin), `${key} treasury mismatch.`);
    assert(!await read(ctx, key, 'paused', [], snapshotBlock), `${key} is paused.`);
  }
  const assets = {};
  for (const [key, address, symbol, decimals] of [['eur', c.testEURe, 'tEURe', 18], ['usdg', ctx.network.usdg, 'USDG', 6]]) {
    const protocol = await read(ctx, 'palissageLens', 'protocol', [address], snapshotBlock);
    assert(Number(protocol.chainId) === ctx.chainId && protocol.version === '1.1.0', 'Lens chain/version mismatch.');
    assert(protocol.paymentAllowedPrimary && protocol.paymentAllowedSecondary && protocol.paymentMetadataOk, `${key} payment configuration failed.`);
    assert(protocol.paymentSymbol === symbol && protocol.paymentDecimals === decimals, `${key} payment metadata mismatch.`);
    assets[key] = { address, symbol, decimals, primaryAllowed: true, secondaryAllowed: true };
  }
  const manifest = {
    schemaVersion: 2, deploymentId: `palissage-${ctx.chainId}-v1.1.0`, chainId: ctx.chainId,
    protocolVersion: '1.1.0', status: 'verified', verifiedAtBlock: snapshotBlock.toString(),
    verification: 'Creation receipts, source hashes, compiled runtime and wiring checked at one snapshot; explorer verification is tracked separately per contract.',
    deployer: admin, explorerUrl: ctx.network.explorer, contracts, runtimeCodeHashes, assets,
    roleGrants: grants.map(([contract, name, account]) => ({ contract, role: name, account })),
  };
  writeJson(resolve(root, 'deployments', `palissage-${ctx.chainId}.manifest.json`), manifest);
  if (publish) {
    const path = resolve(root, 'UI/web/src/chain/deployments.json');
    const ui = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    ui[ctx.chainId] = { deploymentId: manifest.deploymentId, chainId: ctx.chainId, status: 'verified', contracts: c, runtimeCodeHashes, usdgEnabled: true };
    writeJson(path, ui);
  }
  console.log(`Verified ${Object.keys(contracts).length} contracts at block ${snapshotBlock}; manifest written.`);
  return manifest;
}

const [command, chain] = process.argv.slice(2);
try {
  if (!['deploy', 'verify', 'publish', 'preflight'].includes(command)) throw new Error('Usage: node script/release.mjs deploy|verify|publish|preflight 421614|46630');
  const ctx = context(Number(chain), command === 'deploy' || command === 'preflight');
  await preflight(ctx);
  if (command === 'deploy') await deploy(ctx);
  if (command === 'verify' || command === 'publish') await verify(ctx, command === 'publish');
} catch (error) {
  console.error(error.shortMessage ?? error.message);
  process.exitCode = 1;
}
