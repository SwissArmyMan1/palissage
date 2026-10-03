import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, artifact, context, viem, writeJson } from './release-lib.mjs';

const chainId = 421614;
const identities = process.argv.includes('--identities');
const manifestPath = resolve(root, 'deployments', `palissage-${chainId}.${identities ? 'identities' : 'manifest'}.json`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.chainId !== chainId || manifest.status !== 'verified') throw new Error('A verified Arbitrum Sepolia manifest is required.');
const identityContext = identities ? context(chainId, false) : null;
if (identityContext && await identityContext.client.getChainId() !== chainId) throw new Error('RPC chain mismatch.');

function localKey() {
  if (!existsSync(resolve(root, '.env'))) return undefined;
  const values = Object.fromEntries(readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:export\s+)?(ETHERSCAN_API_KEY|API_KEY)\s*=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  return values.ETHERSCAN_API_KEY || values.API_KEY;
}
const apiKey = process.env.ETHERSCAN_API_KEY || process.env.API_KEY || localKey();
if (!apiKey) throw new Error('Configure ETHERSCAN_API_KEY or API_KEY locally.');
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const safe = (message) => String(message).replaceAll(apiKey, '[redacted]');

async function api(action, fields, post = false) {
  // Etherscan V2 requires chainid in the URL even for POST submissions.
  // Never print the request URL or network errors that may include its key.
  const values = new URLSearchParams({ chainid: String(chainId), module: 'contract', action, apikey: apiKey, ...fields });
  const query = post ? new URLSearchParams({ chainid: String(chainId), apikey: apiKey }) : values;
  for (let attempt = 0; attempt < 4; attempt++) {
    let response;
    try {
      response = await fetch('https://api.etherscan.io/v2/api?' + query, {
        ...(post ? { method: 'POST', body: values } : {}), signal: AbortSignal.timeout(30000),
      });
    } catch { throw new Error('Explorer API request failed.'); }
    if (!response.ok) throw new Error(`Explorer API HTTP ${response.status}.`);
    const result = await response.json();
    if (/rate limit/i.test(String(result.result))) { await pause(2000); continue; }
    return result;
  }
  throw new Error('Explorer API rate limit persists.');
}

async function confirmed(contract, compiled) {
  const response = await api('getsourcecode', { address: contract.address });
  if (response.status !== '1' || !Array.isArray(response.result)) throw new Error(safe(response.result));
  const record = response.result[0];
  if (!record?.SourceCode) return false;
  const raw = record.SourceCode.trim();
  const input = JSON.parse(raw.startsWith('{{') ? raw.slice(1, -1) : raw);
  if (record.ContractName !== contract.name || record.CompilerVersion !== 'v' + compiled.metadata.compiler.version) {
    throw new Error('Explorer contract/compiler does not exactly match this release.');
  }
  // Keep similar-match publication distinct from exact address verification.
  if (record.SimilarMatch && !identities) return false;
  for (const path of Object.keys(compiled.metadata.sources)) {
    if (input.sources?.[path]?.content !== readFileSync(resolve(root, path), 'utf8')) throw new Error(`Explorer source mismatch: ${path}.`);
  }
  if (!record.SimilarMatch && record.ConstructorArguments.toLowerCase().replace(/^0x/, '') !== contract.constructorArgs.toLowerCase().slice(2)) {
    throw new Error('Explorer constructor arguments differ from the release.');
  }
  if (input.settings?.evmVersion !== compiled.metadata.settings.evmVersion || input.settings?.viaIR !== compiled.metadata.settings.viaIR ||
      input.settings?.optimizer?.enabled !== compiled.metadata.settings.optimizer.enabled || input.settings?.optimizer?.runs !== compiled.metadata.settings.optimizer.runs) {
    throw new Error('Explorer compiler settings differ from the release.');
  }
  if (record.SimilarMatch) {
    const code = await identityContext.client.getCode({ address: contract.address });
    if (code !== compiled.deployedBytecode.object) throw new Error('Similar-match identity runtime differs from this release.');
    const management = await identityContext.client.readContract({ address: contract.address, abi: compiled.abi, functionName: 'keyHasPurpose', args: [viem.keccak256(contract.constructorArgs), 1n] });
    if (!management) throw new Error('Similar-match identity management key differs from this release.');
    contract.matchedSourceAddress = record.SimilarMatch;
  }
  contract.explorerVerificationKind = record.SimilarMatch ? 'similar-match' : 'exact-match';
  return true;
}

let count = 0;
for (const contract of Object.values(manifest.contracts)) {
  console.log(`Arbiscan: ${contract.name} ${contract.address}`);
  try {
    const compiled = artifact(contract.name);
    if (compiled.metadata.compiler.version !== contract.compiler || Object.entries(contract.sourceHashes).some(([path, hash]) => compiled.metadata.sources[path]?.keccak256 !== hash)) {
      throw new Error('Artifact differs from the deployed release.');
    }
    if (!await confirmed(contract, compiled)) {
      const [source, name] = Object.entries(compiled.metadata.settings.compilationTarget)[0];
      const settings = { ...compiled.metadata.settings };
      delete settings.compilationTarget;
      settings.outputSelection = { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } };
      const input = { language: 'Solidity', sources: Object.fromEntries(Object.keys(compiled.metadata.sources).map((path) => [path, { content: readFileSync(resolve(root, path), 'utf8') }])), settings };
      const submitted = await api('verifysourcecode', {
        contractaddress: contract.address, sourceCode: JSON.stringify(input), codeformat: 'solidity-standard-json-input',
        contractname: `${source}:${name}`, compilerversion: 'v' + compiled.metadata.compiler.version,
        optimizationUsed: '1', runs: String(settings.optimizer.runs), evmVersion: settings.evmVersion,
        constructorArguments: contract.constructorArgs.slice(2), licenseType: '3',
      }, true);
      if (submitted.status !== '1') {
        if (!/already verified/i.test(String(submitted.result))) throw new Error(safe(submitted.result));
      } else {
        console.log(`${contract.name}: submitted; waiting for verification.`);
        let passed = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          await pause(3000);
          const result = await api('checkverifystatus', { guid: submitted.result });
          if (result.status === '1' && /verified/i.test(String(result.result))) { passed = true; break; }
          if (!/pending|queue/i.test(String(result.result))) throw new Error(safe(result.result));
        }
        if (!passed) throw new Error('Verification remains pending; rerun to check the source record.');
      }
      // An accepted submission alone is insufficient: read the published source.
      let ready = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        if (await confirmed(contract, compiled)) { ready = true; break; }
        await pause(3000);
      }
      if (!ready) throw new Error('Verified source record is not available yet.');
    }
    contract.explorerSourceVerified = true;
    contract.sourceExplorerUrl = `https://sepolia.arbiscan.io/address/${contract.address}#code`;
    writeJson(manifestPath, manifest);
    count++;
    console.log(`${contract.name}: ${contract.explorerVerificationKind}; published source and compiler settings confirmed.`);
  } catch (error) { console.log(`${contract.name}: ${safe(error.message)}`); }
}
const expected = Object.keys(manifest.contracts).length;
console.log(`Arbiscan sources confirmed in this run: ${count}/${expected}.`);
if (count !== expected) process.exitCode = 1;
