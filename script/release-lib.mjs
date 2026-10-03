import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(new URL('../UI/web/package.json', import.meta.url));
export const viem = require('viem');
const { privateKeyToAccount, mnemonicToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

export const networks = {
  421614: { chain: arbitrumSepolia, rpc: 'https://sepolia-rollup.arbitrum.io/rpc', explorer: 'https://sepolia.arbiscan.io', usdg: '0xFFC95faa3d63Cde504a05B567C600B78C0b41892' },
  46630: {
    chain: viem.defineChain({ id: 46630, name: 'Robinhood Testnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } }, testnet: true }),
    rpc: 'https://rpc.testnet.chain.robinhood.com', explorer: 'https://explorer.testnet.chain.robinhood.com', usdg: '0x7E955252E15c84f5768B83c41a71F9eba181802F',
  },
};

export const artifacts = {
  trustedIssuersRegistry: 'TrustedIssuersRegistry', identityRegistry: 'IdentityRegistry',
  wineLotToken: 'WineLotToken', primaryMarket: 'PrimaryMarket', secondaryMarket: 'SecondaryMarket',
  redemptionManager: 'RedemptionManager', testEURe: 'TestEURe', claimIssuer: 'ClaimIssuer',
  roleGateway: 'RoleGateway', palissageLens: 'PalissageLens',
};

export function artifact(name) {
  const result = JSON.parse(readFileSync(resolve(root, 'out', `${name}.sol`, `${name}.json`), 'utf8'));
  // Refuse to deploy an artifact whose source has changed since compilation.
  for (const [path, source] of Object.entries(result.metadata.sources)) {
    if (viem.keccak256(viem.toHex(readFileSync(resolve(root, path), 'utf8'))) !== source.keccak256) throw new Error(`Rebuild: ${path} differs from the compiled artifact.`);
  }
  return result;
}

export function writeJson(path, value, privateFile = false) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { mode: privateFile ? 0o600 : 0o644 });
  renameSync(temporary, path);
}

function localEnvironment() {
  if (!existsSync(resolve(root, '.env'))) return {};
  return Object.fromEntries(readFileSync(resolve(root, '.env'), 'utf8').split('\n').filter((line) => line.includes('=') && !line.trim().startsWith('#')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}

export function signer(index = 0) {
  const env = localEnvironment();
  const secret = process.env.PRIVATE_KEY ?? process.env.MNEMONIC ?? env.MK;
  if (!secret) throw new Error('Configure PRIVATE_KEY or MNEMONIC locally; never commit either.');
  try {
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(secret)) {
      const key = secret.startsWith('0x') ? secret : `0x${secret}`;
      return privateKeyToAccount(index === 0 ? key : viem.keccak256(viem.encodeAbiParameters([{ type: 'bytes32' }, { type: 'string' }, { type: 'uint256' }], [key, 'Palissage testnet actors v1', BigInt(index)])));
    }
    return mnemonicToAccount(secret, { addressIndex: index });
  } catch { throw new Error('The local signing configuration is invalid.'); }
}

export function context(chainId, signing = false) {
  const network = networks[chainId];
  if (!network) throw new Error('Only Arbitrum Sepolia (421614) and Robinhood Testnet (46630) are allowed.');
  const client = viem.createPublicClient({ chain: network.chain, transport: viem.http(process.env.RPC_URL ?? network.rpc, { timeout: 20_000, retryCount: 1 }) });
  const path = resolve(root, 'deployments', `palissage-${chainId}.release-journal.json`);
  const journal = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { chainId, version: '1.1.0', steps: {}, contracts: {} };
  if (journal.chainId !== chainId || journal.version !== '1.1.0') throw new Error('Journal belongs to a different release.');
  const account = signing ? signer() : undefined;
  if (account && journal.deployer && journal.deployer !== account.address) throw new Error('The journal belongs to another signer.');
  if (account) journal.deployer = account.address;
  return { chainId, network, client, path, journal, account, spent: 0n };
}

export async function preflight(ctx) {
  if (await ctx.client.getChainId() !== ctx.chainId) throw new Error('RPC chain ID mismatch.');
  if (ctx.account) {
    const balance = await ctx.client.getBalance({ address: ctx.account.address });
    const pending = await ctx.client.getTransactionCount({ address: ctx.account.address, blockTag: 'pending' });
    const mined = await ctx.client.getTransactionCount({ address: ctx.account.address, blockTag: 'latest' });
    console.log(`${ctx.network.chain.name}: signer ${ctx.account.address}; balance ${viem.formatEther(balance)} ETH; nonce ${mined}`);
    if (pending !== mined) throw new Error('Signer has a pending transaction. Reconcile it before proceeding.');
    if (balance === 0n) throw new Error('The signer needs test ETH from the network faucet.');
  }
}

/** Sign -> persist hash/nonce -> submit once -> receipt. An uncertain step is never replayed. */
export async function transaction(ctx, label, { account = ctx.account, to, data = '0x', value = 0n, args = [], name }) {
  if (!account) throw new Error('A signer is required.');
  const payloadHash = viem.keccak256(viem.encodeAbiParameters([{ type: 'address' }, { type: 'bytes' }, { type: 'uint256' }], [to ?? viem.zeroAddress, data, value]));
  let step = ctx.journal.steps[label];
  if (step && step.payloadHash !== payloadHash) throw new Error(`Step ${label} changed; do not reuse this journal.`);
  if (step) {
    const receipt = await ctx.client.getTransactionReceipt({ hash: step.hash }).catch(() => null);
    if (!receipt) throw new Error(`Step ${label} is uncertain (${step.hash}); reconcile it before continuing.`);
    if (receipt.status !== 'success') throw new Error(`Step ${label} reverted: ${step.hash}`);
    step.status = 'confirmed';
    writeJson(ctx.path, ctx.journal, true);
    return receipt;
  }
  const gas = await ctx.client.estimateGas({ account: account.address, to, data, value });
  const nonce = await ctx.client.getTransactionCount({ address: account.address, blockTag: 'pending' });
  const request = await ctx.client.prepareTransactionRequest({ account, to, data, value, gas: gas * 120n / 100n, nonce });
  const worstCost = request.gas * (request.maxFeePerGas ?? request.gasPrice) + value;
  const balance = await ctx.client.getBalance({ address: account.address });
  const budget = viem.parseEther(process.env.MAX_TEST_ETH_SPEND ?? '0.01');
  if (worstCost > balance || ctx.spent + worstCost > budget) throw new Error(`Insufficient test ETH or run budget before ${label}.`);
  const serializedTransaction = await account.signTransaction(request);
  const hash = viem.keccak256(serializedTransaction);
  step = ctx.journal.steps[label] = { hash, nonce, sender: account.address, to: to ?? null, value: value.toString(), payloadHash, status: 'signed', args, name };
  writeJson(ctx.path, ctx.journal, true);
  // The signed transaction is not stored or printed. Its hash is public evidence.
  await ctx.client.sendRawTransaction({ serializedTransaction });
  step.status = 'submitted';
  writeJson(ctx.path, ctx.journal, true);
  const receipt = await ctx.client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  step.status = receipt.status === 'success' ? 'confirmed' : 'reverted';
  step.blockNumber = receipt.blockNumber.toString();
  step.contractAddress = receipt.contractAddress;
  step.gasUsed = receipt.gasUsed.toString();
  writeJson(ctx.path, ctx.journal, true);
  if (receipt.status !== 'success') throw new Error(`${label} reverted; inspect ${hash}.`);
  ctx.spent += receipt.gasUsed * receipt.effectiveGasPrice + value;
  console.log(`${label}: ${hash}`);
  return receipt;
}

export async function call(ctx, label, key, functionName, args = [], account = ctx.account) {
  const name = artifacts[key] ?? key;
  const abi = artifact(name).abi;
  const address = ctx.journal.contracts[key];
  if (!address) throw new Error(`Missing address for ${key}.`);
  const data = viem.encodeFunctionData({ abi, functionName, args });
  if (!ctx.journal.steps[label]) await ctx.client.simulateContract({ account, address, abi, functionName, args });
  return transaction(ctx, label, { account, to: address, data, args, name });
}

export async function read(ctx, key, functionName, args = [], blockNumber) {
  return ctx.client.readContract({ address: ctx.journal.contracts[key], abi: artifact(artifacts[key] ?? key).abi, functionName, args, blockNumber });
}

export function role(name) { return name === 'DEFAULT_ADMIN_ROLE' ? viem.zeroHash : viem.keccak256(viem.toHex(name)); }
