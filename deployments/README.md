# Deployment artifacts

This directory contains the schema, generated contract ABIs and a seed-plan template.
None of these files is proof that a deployment is live or verified.

| Path | Purpose |
| --- | --- |
| `schema/deployment.schema.json` | Expected format of a published manifest |
| `abis/*.json` | ABI arrays for the contract version in this repository |
| `fixtures/base-sepolia.seed-plan.template.json` | Example inputs for a testnet seed |

Local address drafts, seed plans, journals and Foundry broadcasts are ignored by Git.
They may contain provisional or failed execution data. A published manifest should be
added only after independent checks of transaction receipts, deployed bytecode and
source, contract wiring, roles, payment-token allowlists and seed post-state.

No private keys, mnemonics, keystore passwords or RPC credentials belong here.
Public actor addresses and keystore *aliases* in a template are not signing authority.
