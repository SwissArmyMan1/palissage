/**
 * verify-fork.ts — proves the UI's contract wiring (the generated ABIs + viem
 * encode/decode) works against a live deployment, e.g. an anvil fork of Arbitrum
 * Sepolia. It re-enables test mode, self-assigns a role from a fresh wallet
 * (the exact `RoleGateway.assumeRole` write the SignIn screen sends), then reads
 * back `testMode` / `roleOf` / `isVerified` the way the session layer does.
 *
 * Run (after `forge script Deploy` against the fork):
 *   RPC=http://localhost:8545 \
 *   GW=<roleGateway> IR=<identityRegistry> EURE=<eure token> \
 *   OWNER_KEY=<anvil#0 key> USER_KEY=<anvil#4 key> \
 *   npx tsx scripts/verify-fork.ts
 *
 * EURE defaults to the Arbitrum Sepolia EURe (0xFdEed…3b7B). The EURe section
 * asserts the live token decimals match the UI's configured EURE.decimals (18),
 * so a mis-decimal'd token can never slip past silently.
 */
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { roleGatewayAbi } from '../src/contracts/abis/RoleGateway';
import { identityRegistryAbi } from '../src/contracts/abis/IdentityRegistry';
import { erc20Abi } from '../src/contracts/abis/Erc20';

// Mirrors EURE.decimals in src/contracts/config.ts (config imports import.meta.env,
// which is undefined under tsx — so the expected value is duplicated as a literal).
const EXPECTED_EURE_DECIMALS = 18;

const RPC = process.env.RPC ?? 'http://localhost:8545';
const GW = process.env.GW as Address;
const IR = process.env.IR as Address;
const EURE_ADDR = (process.env.EURE ??
  '0xFdEed5cE7E281B4e0F163B70eBe2Cf0B10803b7B') as Address;
const OWNER_KEY = (process.env.OWNER_KEY ??
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as Hex;
const USER_KEY = (process.env.USER_KEY ??
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a') as Hex;

if (!GW || !IR) throw new Error('Set GW and IR env vars to the deployed addresses');

const transport = http(RPC);
const pub = createPublicClient({ chain: arbitrumSepolia, transport });
const owner = createWalletClient({ account: privateKeyToAccount(OWNER_KEY), chain: arbitrumSepolia, transport });
const user = privateKeyToAccount(USER_KEY);
const userWallet = createWalletClient({ account: user, chain: arbitrumSepolia, transport });

const gateway = { address: GW, abi: roleGatewayAbi } as const;
const registry = { address: IR, abi: identityRegistryAbi } as const;
const eure = { address: EURE_ADDR, abi: erc20Abi } as const;

let failures = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = got === want;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${label} (${String(got)})`);
  if (!ok) failures++;
};

async function main() {
  // 1) Owner re-enables test mode (write path the admin owner uses).
  const h1 = await owner.writeContract({ ...gateway, functionName: 'setTestMode', args: [true] });
  await pub.waitForTransactionReceipt({ hash: h1 });
  check('testMode() reads true', await pub.readContract({ ...gateway, functionName: 'testMode' }), true);

  // 2) Fresh wallet self-assigns Consumer (4) — the SignIn assumeRole write.
  const h2 = await userWallet.writeContract({ ...gateway, functionName: 'assumeRole', args: [4] });
  await pub.waitForTransactionReceipt({ hash: h2 });

  // 3) Read back exactly like the session layer.
  check('roleOf(user) == Consumer(4)', await pub.readContract({ ...gateway, functionName: 'roleOf', args: [user.address] }), 4);
  check(
    'isVerified(user) == true',
    await pub.readContract({ ...registry, functionName: 'isVerified', args: [user.address] }),
    true,
  );

  // 4) EURe payment token — confirm decimals/symbol match the UI config so
  //    parseEure/formatEure are correct on this chain.
  const [eDecimals, eSymbol, eBalance] = await Promise.all([
    pub.readContract({ ...eure, functionName: 'decimals' }),
    pub.readContract({ ...eure, functionName: 'symbol' }),
    pub.readContract({ ...eure, functionName: 'balanceOf', args: [user.address] }),
  ]);
  check(`EURe decimals == ${EXPECTED_EURE_DECIMALS}`, Number(eDecimals), EXPECTED_EURE_DECIMALS);
  check('EURe symbol == "EURe"', eSymbol, 'EURe');
  console.log(`  INFO: EURe balance(user) = ${eBalance} base units`);

  console.log(`\nverify-fork: ${failures === 0 ? 'OK' : failures + ' FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
