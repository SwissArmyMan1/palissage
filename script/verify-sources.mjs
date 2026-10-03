import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, artifact, writeJson } from './release-lib.mjs';
const chainId = Number(process.argv[2]);
if (![421614, 46630].includes(chainId)) throw new Error('Unsupported chain.');
const path = resolve(root, 'deployments', `palissage-${chainId}.manifest.json`);
const manifest = JSON.parse(readFileSync(path, 'utf8'));
const explorer = chainId === 421614 ? 'https://arbitrum-sepolia.blockscout.com' : 'https://explorer.testnet.chain.robinhood.com';
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
for (const contract of Object.values(manifest.contracts)) {
  const compiled = artifact(contract.name);
  const [source, name] = Object.entries(compiled.metadata.settings.compilationTarget)[0];
  const url = explorer + '/api/v2/smart-contracts/' + contract.address;
  async function confirmed() {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return false;
    const record = await response.json();
    return record.is_verified && record.name === name && record.file_path === source && record.source_code === readFileSync(resolve(root, source), 'utf8');
  }
  console.log('Verifying ' + name + ' at ' + contract.address);
  try {
    if (!await confirmed()) {
      const settings = { ...compiled.metadata.settings };
      delete settings.compilationTarget;
      settings.outputSelection = { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } };
      const input = { language: 'Solidity', sources: Object.fromEntries(Object.keys(compiled.metadata.sources).map((path) => [path, { content: readFileSync(resolve(root, path), 'utf8') }])), settings };
      const data = new FormData();
      data.set('compiler_version', 'v' + compiled.metadata.compiler.version);
      data.set('contract_name', name);
      data.set('autodetect_constructor_args', 'false');
      data.set('constructor_args', contract.constructorArgs.slice(2));
      data.set('license_type', 'mit');
      data.set('files[0]', new Blob([JSON.stringify(input)], { type: 'application/json' }), 'standard-input.json');
      const response = await fetch(url + '/verification/via/standard-input', { method: 'POST', body: data, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Source submission failed: HTTP ' + response.status);
      // Queuing is not verification. Poll the explorer's actual source record.
      let done = false;
      for (let attempt = 0; attempt < 20; attempt++) { await pause(3000); if (await confirmed()) { done = true; break; } }
      if (!done) throw new Error('Source verification has not been confirmed yet.');
    }
    contract.explorerSourceVerified = true;
    contract.sourceExplorerUrl = explorer + '/address/' + contract.address + '?tab=contract';
    writeJson(path, manifest);
    console.log(name + ': source confirmed.');
  } catch (error) { console.log(name + ': ' + error.message); }
}
const verified = Object.values(manifest.contracts).filter((contract) => contract.explorerSourceVerified).length;
console.log('Explorer verified: ' + verified + '/10.');
if (verified !== 10) process.exitCode = 1;
