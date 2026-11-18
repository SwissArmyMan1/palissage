# Avalanche Fuji deployment records

Avalanche Fuji C-Chain uses chain ID `43113`, test AVAX for gas and Palissage tEURe with 18 decimals for demo settlement. Public Fuji deployment and verification remain pending in this checkout. The [technical guide](../TECHNICAL_README.md) covers the Foundry deployment entry point.

## Release artifacts

| File | Purpose |
| --- | --- |
| `palissage-43113.manifest.json` | Confirmed contract addresses, creation receipts, source and runtime hashes, compiler settings, roles and payment metadata |
| `palissage-43113.flow-evidence.json` | Confirmed demo transactions, fictional fixture IDs, payment accounting and final bottle balances |
| `palissage-43113.identities.json` | Participant Identity contracts, registration receipts and source-verification status |

These names describe the expected Fuji release artifacts. Publish them after their on-chain checks succeed.

`status: verified` records successful receipt, compiled-runtime, source-hash, immutable-wiring, role and payment-metadata checks at `verifiedAtBlock`. `explorerSourceVerified` and `sourceExplorerUrl` record the explorer's source-publication result for each contract. An independent security audit has its own scope and report.

`abis/` contains exported contract ABIs. The frontend uses a verified Fuji record in `UI/web/src/chain/deployments.json` for addresses and runtime checks.

Keep address drafts, transaction journals, seed plans and broadcast output locally. Credentials belong in the operator's keystore or private environment.
