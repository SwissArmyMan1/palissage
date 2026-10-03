# Published deployments

`palissage-<chainId>.manifest.json` is the public release record. `status: verified` means creation receipts, compiled runtime, source hashes, immutable wiring, privileged roles and enabled payment metadata passed the release verifier at `snapshotBlock`. It does not mean an independent audit.

`explorerSourceVerified` and `sourceExplorerUrl` record the separate source-publication result per contract. `palissage-<chainId>.flow-evidence.json` contains real fixture transaction hashes and observed final bottle accounting. The seed is fictional and uses valueless tEURe.

Supported networks are Arbitrum Sepolia (421614) and Robinhood Testnet (46630). They have independent inventory. Official test USDG is allowed on both markets, and its address and metadata are checked against the selected chain. Workflow evidence states which asset was actually used.

`abis/` contains ABIs exported from the exact release artifacts. The frontend manifest is regenerated only after verification succeeds.

Ignored `*.release-journal.json`, drafts and plans are local operational records. Never commit a mnemonic, private key, signed raw transaction or private RPC credential.
