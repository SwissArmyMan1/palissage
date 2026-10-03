# Published deployments

`palissage-<chainId>.manifest.json` is the public release record. `status: verified` means creation receipts, compiled runtime, source hashes, immutable wiring, privileged roles and enabled payment metadata passed the release verifier at `verifiedAtBlock`. It does not mean an independent audit.

`schema/deployment.schema.json` describes the version 2 release format and its supported chain IDs. Schema validation checks the record's structure; the release verifier separately checks receipts, code and state against the network.

`sourceCommit` pins the source revision of the published addresses. Build that revision for repeat verification; the current branch's comment cleanup produces different compiler metadata.

`explorerSourceVerified` and `sourceExplorerUrl` record the separate source-publication result per contract. `palissage-<chainId>.flow-evidence.json` contains real fixture transaction hashes and observed final bottle accounting. The seed is fictional and uses valueless tEURe.

Supported networks are Arbitrum Sepolia (421614) and Robinhood Testnet (46630). They have independent inventory. Official test USDG is allowed on both markets, and its address and metadata are checked against the selected chain. Workflow evidence states which asset was actually used.

`abis/` contains ABIs exported from the exact release artifacts. The frontend manifest is regenerated only after verification succeeds.

`palissage-<chainId>.identities.json` lists the three fixture participants' contracts created internally by RoleGateway. It records their registration receipts, exact runtime, constructor argument and separately confirmed explorer source URLs. These dynamic identities are additional to the ten protocol contracts in each main manifest.

The Arbitrum protocol contracts have Arbiscan Exact Match verification. Arbiscan publishes two repeated fixture Identity addresses through Similar Match to the first verified Identity; `explorerVerificationKind` and `matchedSourceAddress` preserve that distinction. Their source and ABI are visible, and their runtime and gateway management key are checked separately on-chain. [Etherscan verification types](https://info.etherscan.com/types-of-contract-verification/) explains these explorer labels.

Ignored `*.release-journal.json`, drafts and plans are local operational records. Never commit a mnemonic, private key, signed raw transaction or private RPC credential.
