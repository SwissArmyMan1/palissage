# Avalanche Fuji validation

Documentation updated on 18 November 2026 for the Avalanche Fuji demonstration. Protocol version is `1.1.0`. The target is Fuji C-Chain `43113`, with test AVAX for gas and Palissage tEURe for settlement.

## Recorded local checks

The Fuji preparation run recorded on 29 October 2026 passed 184 Foundry unit, fuzz and integration tests across 13 suites. Compiler settings were Solidity 0.8.28, Cancun, optimizer 200 runs and via IR.

The same preparation exercised ten protocol contracts on an isolated Anvil with chain ID 43113. The workflow covered deployment wiring, primary settlement, refunds, milestone withdrawal, resale with fees and royalties, and delivery redemption. Its final bottle accounting was 132 lifetime minted, 60 burned and 72 circulating, with zero redemption escrow and zero withdrawable primary proceeds. Repeating the runner preserved the completed transaction state.

The recorded frontend checks passed ESLint, TypeScript, tour-target checks and a Fuji-mode Vite build. Local browser checks covered Fuji selection, AVAX labels, tEURe precision and a 390px viewport. These results describe the local preparation at the recorded date.

## Public Fuji status

The checkout's Fuji release is awaiting confirmed public creation receipts, runtime and role-wiring verification, an explorer source-verification result and a published frontend deployment record. A wallet-connected Fuji purchase, resale and redemption must be checked after those artifacts are available.

Before presenting the live flow, confirm the chain ID, deployed bytecode, payment-token metadata, participant roles and transaction receipts. Reconcile primary proceeds, platform fees, winery royalties, circulating bottle units and redemption escrow against the same Fuji fixture. The [reviewer guide](REVIEWER_GUIDE.md) gives the demonstration route.

## Reproduce contract checks

```sh
git submodule update --init --recursive lib/forge-std lib/openzeppelin-contracts
forge fmt --check
forge build --sizes
forge test --summary
```

The frontend has its own [build instructions](../UI/web/README.md). Internal regression checks support prototype development. Independent security review, physical-wine verification and commercial-pilot validation remain separate work.
